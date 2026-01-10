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
            'books' => 'required|array|min:1',
            'books.*.title' => 'required|string',
            'books.*.author' => 'nullable|string',
            'books.*.editor' => 'nullable|string',
            'books.*.other_author_editor' => 'nullable|string',
            'books.*.edition' => 'nullable|string',
            'books.*.series_name' => 'nullable|string',
            'books.*.volume' => 'nullable|string',
            'books.*.publisher' => 'nullable|string',
            'books.*.place_of_publication' => 'nullable|string',
            'books.*.copyright' => 'nullable|string',
            'books.*.number_of_pages' => 'nullable|integer',
            'books.*.book_language' => 'nullable|string',
            'books.*.person_as_subject' => 'nullable|string',
            'books.*.location_of_book' => 'nullable|string',
            'books.*.materialType' => 'required|integer',
            'books.*.cataloging_note' => 'nullable|string',
            'books.*.internal_note' => 'nullable|string',
            'books.*.includes_index' => 'boolean',
            'books.*.includes_appendix' => 'boolean',
            'books.*.includes_glossary' => 'boolean',
            'books.*.includes_bibliographical_references' => 'boolean',
            'books.*.isbn_paperback' => 'nullable|string',
            'books.*.isbn_hardcover' => 'nullable|string',
            'books.*.issn' => 'nullable|string',
            'books.*.topical_subject' => 'nullable|array',
            'books.*.topical_subject.*' => 'string',
            'books.*.geographical_subject' => 'nullable|string',
            'books.*.section' => 'required|string',
            'books.*.deweyDecimal' => 'required|string',
            'books.*.author_number' => 'nullable|string',
            'books.*.price' => 'nullable|numeric',
            'books.*.source' => 'required|in:Purchased,Donation,Exchange,Legal Deposit,Other',
            'books.*.source_person' => 'nullable|string',
            'books.*.copies' => 'required|integer|min:1',
            'books.*.cover_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'books.*.copies_data' => 'nullable|array',
            'books.*.bookCopies' => 'required|array|min:1',
            'books.*.bookCopies.*.barcode' => 'required|string|unique:book_copies,barcode',
            'books.*.bookCopies.*.condition' => 'required|string',
            'books.*.bookCopies.*.copy_number' => 'required|integer',
            'books.*.bookCopies.*.price' => 'nullable',
            'books.*.bookCopies.*.source_person' => 'nullable|string',
        ]);

        $savedBooks = [];

        DB::beginTransaction();
        try {
            foreach ($validated['books'] as $index => $bookData) {
                
                // 2. Generate Call Number
                $sectionAbbr = $this->getSectionAbbreviation($bookData['section']);
                $callNumber = $sectionAbbr . "\n" . 
                              $bookData['deweyDecimal'] . "\n" . 
                              ($bookData['author_number'] ?? '') . "\n" . 
                              ($bookData['copyright'] ?? '');

                $imagePath = null;
                // Check if a file was uploaded for this specific book index
                if ($request->hasFile("books.{$index}.cover_image")) {
                    $imagePath = $request->file("books.{$index}.cover_image")->store('covers', 'public');
                }

                // 3. Create the Main Book Record
                $book = Book::create([
                    'title'                => $bookData['title'],
                    'author'               => $bookData['author'] ?? null,
                    'editor'               => $bookData['editor'] ?? null,
                    'other_author_editor'  => $bookData['other_author_editor'] ?? null,
                    'cover_image'          => $imagePath,
                    'edition'              => $bookData['edition'] ?? null,
                    'series_name'          => $bookData['series_name'] ?? null,
                    'volume'               => $bookData['volume'] ?? null,
                    'publisher'            => $bookData['publisher'] ?? null,
                    'isbn_paperback'       => $bookData['isbn_paperback'] ?? null,
                    'isbn_hardcover'       => $bookData['isbn_hardcover'] ?? null,
                    'issn'                 => $bookData['issn'] ?? null,
                    'section'              => $bookData['section'],
                    'dewey_decimal'        => $bookData['deweyDecimal'],
                    'call_number'          => $callNumber,
                    
                    // FIXES BELOW:
                    'number_of_pages'      => $bookData['number_of_pages'] ?? null,
                    'copyright'            => $bookData['copyright'] ?? null,
                    'author_number'        => $bookData['author_number'] ?? null,
                    'place_of_publication' => $bookData['place_of_publication'] ?? null,
                    'cataloging_note'      => $bookData['cataloging_note'] ?? null,
                    'internal_note'        => $bookData['internal_note'] ?? null,
                    
                    // FIX: Match the 'topical_subject' key from validator
                    'topical_subject'      => json_encode($bookData['topical_subject'] ?? []),
                    
                    'person_as_subject'   => $bookData['person_as_subject'] ?? null,
                    'geographical_subject'=> $bookData['geographical_subject'] ?? null,

                    // Booleans (Ensure names match your validator's typos if they exist)
                    'includes_index'       => $bookData['includes_index'] ?? 0, 
                    'includes_appendix'    => $bookData['includes_appendix'] ?? 0,
                    'includes_glossary'    => $bookData['includes_glossary'] ?? 0,
                    'includes_bibliographical_references' => $bookData['includes_bibliographical_references'] ?? 0,
                    
                    'material_type_id'     => $bookData['materialType'],
                ]);

                // 4. Handle Copies
                foreach ($bookData['bookCopies'] as $copyData) {
                    // Get latest global accession number
                    $lastCopy = BookCopy::orderBy('id', 'desc')->lockForUpdate()->first();
                    $nextAccession = $lastCopy ? (int)$lastCopy->accession_number + 1 : 1;
                    $accessionNumber = str_pad($nextAccession, 5, '0', STR_PAD_LEFT);

                    // Determine Binding automatically
                    $binding = 'Paperback';
                    if (!empty($bookData['issn'])) $binding = 'Serial';
                    elseif (!empty($bookData['isbnHardcover'])) $binding = 'Hardcover';

                    $book->copies()->create([
                        'copy_number'      => $copyData['copy_number'] ?? ($index + 1),
                        'barcode'          => $copyData['barcode'],
                        'condition'        => $copyData['condition'],
                        'accession_number' => $accessionNumber,
                        'price'            => $copyData['price'] ?? $bookData['price'],
                        'source'           => $copyData['source'] ?? $bookData['source'],
                        'source_person'    => $copyData['source_person'] ?? $bookData['source_person'] ?? null,
                        'material_type_id' => $copyData['material_type'] ?? $bookData['materialType'],
                        'binding'          => $binding,
                        'cataloging_note'  => $copyData['cataloging_note'] ?? $bookData['cataloging_note'] ?? null,
                        'internal_note'    => $copyData['internal_note'] ?? $bookData['internal_note'] ?? null,
                    ]);
                }

                $savedBooks[] = $book->load('copies');
            }

            // 5. Log Activity
            $this->logActivity(
                'Batch Add Books',
                'Added ' . count($savedBooks) . ' books in a batch.',
                $user,
                'Catalog'
            );

            DB::commit();
            return response()->json(['message' => 'Batch added successfully', 'data' => $savedBooks], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    private function getSectionAbbreviation($section)
    {
        $map = [
            'Filipiniana'        => 'FIL',
            'General Collection' => 'GC',
            'General Reference'  => 'REF',
        ];
        return $map[$section] ?? 'GEN';
    }

        public function index()
    {
        $books = Book::with(['copies.materialType'])->get();

        $books->each(function($book) {
            $subjectsArray = json_decode($book->topical_subject, true);
            if (!is_array($subjectsArray)) {
                $subjectsArray = [];
            }
            $book->topical_subject = implode(", ", $subjectsArray); 

            $book->copies = $book->copies->map(function($copy) {
                $copy->material_type = $copy->materialType->name ?? 'N/A';
                return $copy;
            });
        });

        return response()->json($books);
    }



    // Show book details
    public function show($id)
    {
        $book = Book::with(['copies.materialType'])->find($id);

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
            
            $data = [
                'id' => $copy->id,
                'copy_number' => $copy->copy_number,
                'barcode' => $copy->barcode,
                'accession_number' => $copy->accession_number,
                'price' => $copy->price,
                'source' => $copy->source,
                'source_person' => $copy->source_person,
                'cataloging_note' => $copy->cataloging_note,
                'date_added' => $copy->date_added,
                'material_type' => $copy->materialType ? $copy->materialType->name : 'N/A',
            ];

            if ($circulation) {
                $dueDate = $circulation->due_date instanceof Carbon
                    ? $circulation->due_date
                    : Carbon::parse($circulation->due_date);
                $now = now();
                $overdueBy = $now->gt($dueDate) ? $dueDate->diffInDays($now) : 0;

                return array_merge($data, [
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
                ]);
            } else {
                return array_merge($data, [
                    'id' => $copy->id,
                    'copy_number' => $copy->copy_number,
                    'barcode' => $copy->barcode,
                    'accession_number' => $copy->accession_number,
                    'status' => 'Available',
                ]);
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
                    ->take(7)
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
            $book->material_type = $book->copies->first()->materialType->name ?? 'N/A';
        });

        return response()->json($books, 200);
    }



    public function addCopy(Request $request, $id)
    {
        $user = $request->user();

        $request->validate([
            'source' => 'required|string',
            'material_type_id' => 'required|exists:material_types,id',
            'source_person' => 'nullable|string',
            'cataloging_note' => 'nullable|string',
            'internal_note' => 'nullable|string',
            'copies' => 'required|integer|min:1',
            'price' => 'nullable|numeric',
            'condition' => 'required|string',
            'binding' => 'required|string',
            'isbn_paperback' => 'nullable|string',
            'isbn_hardcover' => 'nullable|string',
            'issn' => 'nullable|string',
        ]);

        $book = Book::find($id);
        if (!$book) {
            return response()->json(['message' => 'Book not found'], 404);
        }

        $book->update($request->only(['isbn_paperback', 'isbn_hardcover', 'issn']));

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
                'material_type_id' => $request->material_type_id,
                'status' => 'Available',
                'price' => $request->price,
                'condition' => $request->condition,
                'binding' => $request->binding,
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