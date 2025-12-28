<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Book;
use App\Models\BookCopy;
use App\Models\Circulation;
use App\Models\LibrarySetting;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class BookController extends Controller
{
    public function store(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'title' => 'required|string',
            'author' => 'nullable|string',
            'editor' => 'nullable|string',
            'other_author_editor' => 'nullable|string',
            'edition' => 'nullable|string',
            'series_name' => 'nullable|string',
            'volume' => 'nullable|string',
            'publisher' => 'nullable|string',
            'place_of_publication' => 'nullable|string',
            'copyright' => 'nullable|string',
            'number_of_pages' => 'nullable|integer',
            'book_language' => 'nullable|string',
            'person_as_subject' => 'nullable|string',
            'location_of_book' => 'nullable|string',
            'material_type' => 'nullable|string',
            'cataloging_note' => 'nullable|string',
            'internal_note' => 'nullable|string',
            'includes_index' => 'boolean',
            'includes_appendix' => 'boolean',
            'includes_glossary' => 'boolean',
            'includes_bibliographical_references' => 'boolean',
            'isbn' => 'nullable|string',
            'topical_subject' => 'nullable|array',
            'topical_subject.*' => 'string',
            'geographical_subject' => 'nullable|string',
            'section' => 'required|string',
            'dewey_decimal' => 'required|string',
            'author_number' => 'nullable|string',
            'price' => 'nullable|numeric',
            'condition' => 'required|string',
            'source' => 'required|in:Purchased,Donation,Exchange,Legal Deposit,Other',
            'source_person' => 'nullable|string',
            'copies' => 'required|integer|min:1',
            'cover_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'copies_data' => 'nullable|array',
        ]);

        /// Map section → abbreviation
        $sectionMap = [
            'Filipiniana' => 'FIL',
            'Gen. Circulation' => 'GC',
            'Gen. Reference' => 'REF',
        ];
        $sectionAbbr = $sectionMap[$validated['section']];

        // Build call number
        $callNumber = $sectionAbbr . "\n" .
                    $validated['dewey_decimal'] . "\n" .
                    ($validated['author_number'] ?? '') . "\n" .
                    ($validated['copyright'] ?? '');

        // Handle cover image
        if ($request->hasFile('cover_image')) {
            $validated['cover_image'] = $request->file('cover_image')->store('books', 'public');
        }

        $book = Book::create([
            ...$validated,
            'topical_subject' => $validated['topical_subject'] ? json_encode($validated['topical_subject']) : json_encode([]),
            'call_number' => $callNumber,
        ]);

        // Get last global accession number
        $lastCopy = BookCopy::orderBy('id', 'desc')->first();
        $startAccession = $lastCopy ? (int)$lastCopy->accession_number : 0;

        // Get existing copies for this book
        $frontendCopies = $request->input('copies_data', []);

        foreach ($frontendCopies as $index => $copyData) {
            $accessionNumber = str_pad($startAccession + ($index + 1), 5, '0', STR_PAD_LEFT);

            $book->copies()->create([
                'copy_number'      => $copyData['copy_number'], 
                'barcode'          => $copyData['barcode'],    
                'condition'        => $copyData['condition'] ?? 'Fine', 
                'accession_number' => $accessionNumber,     
                'price'            => $copyData['price'],
                'cataloging_note'  => $request->cataloging_note,
                'internal_note'    => $request->internal_note,
                'source_person'    => $request->source_person,
                'source'           => $request->source,
                'material_type'    => $request->material_type,
            ]);
        }

        // Log activity
            $this->logActivity(
                'Add Book',
                'Added new book: ' . $book->title,
                $user,
                'Catalog'
            );

        return response()->json([
            'message' => 'Book added successfully',
            'book' => $book->load('copies'),
        ], 201);
    }


    // List all books
    public function index()
    {
        $books = Book::with('copies')->get();

        $books->each(function($book) {
            $subjectsArray = json_decode($book->topical_subject, true);
            if (!is_array($subjectsArray)) {
                $subjectsArray = [];
            }
            $book->topical_subject = implode(", ", $subjectsArray); 
        });

        return response()->json($books);
    }

    // Show book details
    public function show($id)
    {
        $book = Book::with('copies')->find($id);

        if (!$book) {
            return response()->json(['message' => 'Book not found'], 404);
        }

        $fineRate = (int) LibrarySetting::getValue('fine_per_day', 5);

        // Map each copy to include current status & on loan info
        $book->copies = $book->copies->map(function ($copy) use ($fineRate) {
            $circulation = Circulation::with('patron')
                ->where('book_copy_id', $copy->id)
                ->where('status', 'On Loan')
                ->latest('issue_date')
                ->first();

            if ($circulation) {
                $dueDate = $circulation->due_date instanceof Carbon
                    ? $circulation->due_date
                    : Carbon::parse($circulation->due_date);
                $now = now();
                $overdueBy = $now->gt($dueDate) ? $dueDate->diffInDays($now) : 0;

                return [
                    'id' => $copy->id,
                    'copy_number' => $copy->copy_number,
                    'barcode' => $copy->barcode,
                    'accession_number' => $copy->accession_number,
                    'status' => 'On Loan',
                    'borrowed_by' => [
                        'patron_id' => $circulation->patron->patron_id,
                        'first_name' => $circulation->patron->first_name,
                        'last_name' => $circulation->patron->last_name,
                    ],
                    'overdue_by' => $overdueBy,
                    'fine' => $overdueBy * $fineRate,
                    'issue_date' => $circulation->issue_date,
                    'due_date' => $circulation->due_date,
                ];
            } else {
                return [
                    'id' => $copy->id,
                    'copy_number' => $copy->copy_number,
                    'barcode' => $copy->barcode,
                    'accession_number' => $copy->accession_number,
                    'status' => 'Available',
                ];
            }
        });

        return response()->json($book);
    }



    public function getByBarcode($barcode)
    {
        $bookCopy = \App\Models\BookCopy::with('book')
            ->where('barcode', $barcode)
            ->first();

        if (!$bookCopy) {
            return response()->json(['message' => 'Book not found'], 404);
        }

        return response()->json($bookCopy);
    }

    public function latest()
    {
        // Get the 7 most recently added books
        $books = Book::orderBy('created_at', 'desc')
                    ->take(8)
                    ->get(['id', 'title', 'cover_image', 'copyright']);

        if ($books->isEmpty()) {
            return response()->json(['message' => 'No books found'], 404);
        }

        return response()->json($books);
    }


    // Searching for a book
    public function search(Request $request)
    {
        $query = $request->query('query');
        $dewey = $request->query('dewey');

        if (!$query && !$dewey) {
            return response()->json([], 200);
        }

        $booksQuery = Book::with('copies');

        if ($dewey) {
            $prefix = substr($dewey, 0, 1);
            $booksQuery->where('dewey_decimal', 'like', $prefix . '%');
        } else {
            // General search logic
            $booksQuery->where(function($q) use ($query) {
                $q->where('title', 'like', '%' . $query . '%')
                ->orWhere('author', 'like', '%' . $query . '%')
                ->orWhere('section', 'like', '%' . $query . '%')
                ->orWhere('dewey_decimal', 'like', $query . '%')
                ->orWhere(function ($subQ) use ($query) {
                    $subQ->whereRaw("JSON_VALID(topical_subject)")
                        ->whereRaw("JSON_SEARCH(topical_subject, 'one', ?) IS NOT NULL", ["%".$query."%"]);
                });
            });
        }

        $books = $booksQuery->get();

        // Convert topical_subject from JSON to readable string
        $books->each(function ($book) {
            $subjectsArray = json_decode($book->topical_subject, true) ?? [];
            $book->topical_subject = implode(', ', $subjectsArray);
            $book->material_type = $book->copies->first()->material_type ?? 'N/A';
        });

        return response()->json($books, 200);
    }



    public function addCopy(Request $request, $id)
    {
        $user = $request->user();

        $request->validate([
            'source' => 'required|string',
            'material_type' => 'nullable|string',
            'source_person' => 'nullable|string',
            'cataloging_note' => 'nullable|string',
            'internal_note' => 'nullable|string',
            'copies' => 'required|integer|min:1',
            'price' => 'nullable|numeric',
            'condition' => 'required|string',
        ]);

        $book = Book::find($id);
        if (!$book) {
            return response()->json(['message' => 'Book not found'], 404);
        }

        $newCopiesCollection = [];

        $lastCopy = BookCopy::orderBy('id', 'desc')->first();
        $startAccession = $lastCopy ? (int)$lastCopy->accession_number : 0;
        $existingCopies = $book->copies()->count();

        $frontendBarcodes = $request->input('barcodes', []);

        for ($i = 1; $i <= $request->copies; $i++) {
            $barcodeValue = isset($frontendBarcodes[$i - 1]) 
                        ? $frontendBarcodes[$i - 1] 
                        : 'BC' . mt_rand(1000000000, 9999999999);

            $copy = $book->copies()->create([
                'copy_number' => $existingCopies + $i,
                'accession_number' => str_pad($startAccession + $i, 5, '0', STR_PAD_LEFT),
                'barcode' => $barcodeValue,
                'cataloging_note' => $request->cataloging_note,
                'internal_note' => $request->internal_note,
                'source_person' => $request->source_person,
                'source' => $request->source,
                'material_type' => $request->material_type,
                'status' => 'available',
                'price' => $request->price,
                'condition' => $request->condition,
            ]);

            $newCopiesCollection[] = $copy;
        }

        // Log activity
        $this->logActivity(
            'Add Copy',
            'Added ' . $request->copies . ' copy/copies for book: ' . $book->title,
            $user,
            'Accession'
        );

        // return response()->json($book->load('copies'));
        return response()->json([
        'message' => 'Copies added',
        'copies' => $newCopiesCollection 
    ]);
    }


    // Reuse the same helper function as PatronController
    private function logActivity($action, $description = null, $user, $module)
    {
        ActivityLog::create([
            'user_id' => $user->id,
            'role' => $user->role,
            'module' => $module,
            'action' => $action,
            'description' => $description,
        ]);
    }


}