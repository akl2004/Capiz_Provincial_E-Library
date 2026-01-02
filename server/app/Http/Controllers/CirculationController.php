<?php 

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Circulation;
use App\Models\BookCopy;
use App\Models\LibrarySetting;
use App\Models\Patron;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;


class CirculationController extends Controller
{
    public function index()
    {
        $records = Circulation::with(['bookCopy.book', 'patron'])->get();
        $fineRate = (int) LibrarySetting::getValue('fine_per_day', 5);
        $now = now()->startOfDay();

        $records = $records->map(function ($rec) use ($fineRate, $now) {
            if ($rec->is_paid || in_array($rec->status, ['Returned', 'Returned Late', 'Lost'])) {
                return $rec;
            }
            $dueDate = Carbon::parse($rec->due_date)->startOfDay();
            

            if ($now->gt($dueDate)) {
                $overdueBy = $dueDate->diffInDays($now);
                $rec->status = 'Overdue';
                $rec->overdue_by = $overdueBy;
                $rec->fine = $overdueBy * $fineRate;
            }

            return $rec;
        });

        return response()->json($records);
    }


    // Private helper to get borrowing policy for a patron
    private function calculateBorrowingPolicy(Patron $patron)
    {
        $loanDays = (int) LibrarySetting::getValue('default_loan_days', 5);
        $maxItemsPerDay = (int) LibrarySetting::getValue('max_items_per_transaction', 3);
        $borrowLimit = (int) LibrarySetting::getValue('borrow_limit_per_person', 5);
        $today = now()->toDateString();

        // Count how many books the patron has on loan today
        $borrowedToday = $patron->circulations()
            ->whereDate('issue_date', $today)
            ->whereIn('status', ['On Loan', 'Overdue'])
            ->count();

        // Count total currently on loan (on loan + overdue) books
        $currentBorrowed = $patron->circulations()
            ->whereIn('status', ['On Loan', 'Overdue'])
            ->count();

        // How many more books the patron can borrow today
        $allowedToday = max($maxItemsPerDay - $borrowedToday, 0);

        // Check if they reached total borrow limit
        $canBorrow = $currentBorrowed < $borrowLimit && $allowedToday > 0;

        return [
            'loan_days' => $loanDays,
            'max_items' => $maxItemsPerDay,
            'borrow_limit' => $borrowLimit,
            'borrowed_today' => $borrowedToday,
            'current_borrowed' => $currentBorrowed,
            'allowed_today' => $allowedToday,
            'can_borrow' => $canBorrow
        ];
    }

    // Public API to get borrowing policy for any patron
    public function getBorrowingPolicy(Request $request)
    {
        $request->validate([
            'patron_id' => 'required|exists:patrons,patron_id',
        ]);

        $patron = Patron::where('patron_id', $request->patron_id)->firstOrFail();
        $policy = $this->calculateBorrowingPolicy($patron);

        return response()->json($policy);
    }


    // Borrow a specific book copy
    public function borrow(Request $request)
    {
        $validated = $request->validate([
            'book_copy_id' => 'required|exists:book_copies,id',
            'patron_id'    => 'required|exists:patrons,patron_id',
        ]);

        $user = $request->user();
        $bookCopy = BookCopy::findOrFail($validated['book_copy_id']);
        $patron   = Patron::where('patron_id', $validated['patron_id'])->firstOrFail();

        // Check patron status
        if ($patron->status !== 'Active') {
            return response()->json([
                'message' => 'Cannot issue book: Patron is deactivated or blocked.'
            ], 403);
        }

        // Check condition logic
        if ($bookCopy->condition === 'Damaged') {
            return response()->json([
                'message' => 'This copy is damaged and cannot be loaned out.'
            ], 400);
        }

        // Check book status for Lost
        if ($bookCopy->status === 'Lost') {
            return response()->json([
                'message' => 'Cannot issue book: This copy is marked as LOST.'
            ], 400);
        }

        // Check book availability
        if ($bookCopy->status !== 'Available') {
            return response()->json([
                'message' => 'Cannot issue book: Book is already borrowed.'
            ], 400);
        }

        // Reuse policy calculation
        $policy = $this->calculateBorrowingPolicy($patron);
        if (!$policy['can_borrow']) {
            if ($policy['allowed_today'] <= 0) {
                return response()->json([
                    'message' => "Cannot borrow more books today: Maximum of {$policy['max_items']} per transaction/day reached."
                ], 400);
            }

            if ($policy['current_borrowed'] >= $policy['borrow_limit']) {
                return response()->json([
                    'message' => "Cannot borrow more books: Patron have reached their total borrow limit of {$policy['borrow_limit']} books."
                ], 400);
            }
        }

        // Set issue date and loan days
        $issueDate = now();
        $loanDays = $policy['loan_days'];

        $circulation = null;
        DB::transaction(function () use ($bookCopy, $patron, $issueDate, $loanDays, $user, &$circulation) {
            $dueDate = Carbon::parse($issueDate)->addDays($loanDays);

            $circulation = Circulation::create([
                'book_copy_id' => $bookCopy->id,
                'patron_id' => $patron->id,
                'user_id'      => $user->id,
                'issue_date' => $issueDate,
                'due_date' => $dueDate,
                'status' => 'On Loan',
            ]);

            $bookCopy->update(['status' => 'On Loan']);
        });

        // Log activity
        ActivityLog::create([
            'user_id' => $user->id,
            'role' => $user->role ?? 'staff',
            'module' => 'Circulation Module',
            'action' => 'Processed Issue',
            'description' => "Borrowed copy of '{$bookCopy->book->title}'"
        ]);

        return response()->json([
            'message' => 'Book copy has been loaned successfully',
            'circulation' => $circulation
        ], 201);
    }


    // Return an on loan book copy
    public function return(Request $request)
    {
        $request->validate([
            'book_copy_id' => 'required|exists:book_copies,id',
        ]);

        $user = $request->user();

        $circulation = Circulation::where('book_copy_id', $request->book_copy_id)
            ->whereIn('status', ['On Loan', 'Overdue'])
            ->latest('issue_date')
            ->firstOrFail();

        $returnDate = now();
        $comparisonDate = now()->startOfDay(); 
        $dueDate = Carbon::parse($circulation->due_date)->startOfDay();

        $overdueBy = $comparisonDate->gt($dueDate) 
            ? $dueDate->diffInDays($comparisonDate) 
            : 0;

        $fineRate = (int) LibrarySetting::getValue('fine_per_day', 5);
        $fine = $overdueBy * $fineRate;

        $finalStatus = ($overdueBy > 0) ? 'Returned Late' : 'Returned';

        $circulation->update([
            'date_returned' => $returnDate,
            'overdue_by'    => $overdueBy,
            'fine'          => $fine,
            'status'        => $finalStatus,
            'user_id'       => $user->id,
        ]);

        $circulation->bookCopy->update(['status' => 'Available']);

        // Log activity
        ActivityLog::create([
            'user_id' => $user->id,
            'role' => $user->role ?? 'staff',
            'module' => 'Circulation Module',
            'action' => 'Processed Return',
            'description' => "Returned copy of '{$circulation->bookCopy->book->title}'"
        ]);

        return response()->json(['message' => 'Book copy returned successfully', 'status' => $finalStatus]);
    }

    public function markAsLost(Request $request)
    {
        $request->validate([
            'book_copy_id' => 'required|exists:book_copies,id',
            'settlement_type' => 'required|in:payment,replacement'
        ]);
        
        $user = $request->user();
        $settlementType = $request->settlement_type;
        
        $circulation = Circulation::where('book_copy_id', $request->book_copy_id)
            ->whereIn('status', ['On Loan', 'Overdue'])
            ->firstOrFail();

        $replacementCost = ($settlementType === 'payment') 
        ? (float) ($circulation->bookCopy->price ?? 0) 
        : 0;

        $processingFee = (float) LibrarySetting::getValue('lost_book_processing_fee', 50);

        $dueDate = \Carbon\Carbon::parse($circulation->due_date)->startOfDay();
        $now = now()->startOfDay();
        $overdueDays = $now->gt($dueDate) ? $dueDate->diffInDays($now) : 0;
        $fineRate = (int) LibrarySetting::getValue('fine_per_day', 5);
        $currentOverdueFine = $overdueDays * $fineRate;

        $totalFine = $replacementCost + $processingFee + $currentOverdueFine;

        DB::transaction(function () use ($circulation, $totalFine, $settlementType, $user) {
            $circulation->update([
                'status' => 'Lost',
                'fine' => $totalFine,
                'overdue_by' => 0, 
                'is_paid' => true,
                'lost_resolution' => ucfirst($settlementType),
                'user_id' => $user->id,
            ]);
        $circulation->bookCopy->update(['status' => 'Lost']);
    });

        // Log the activity
        ActivityLog::create([
            'user_id' => $user->id,
            'role' => $user->role ?? 'staff',
            'module' => 'Circulation Module',
            'action' => 'Marked Lost',
            'description' => "Marked '{$circulation->bookCopy->book->title}' as lost ({$settlementType}). Total: P{$totalFine}."
        ]);

        return response()->json([
            'message' => 'Book marked as Lost.',
            'total_bill' => $totalFine,
            'book_id' => $circulation->bookCopy->book_id
        ]);
    }


    // Renew a loaned book copy (extend due date)
    public function renew(Request $request)
    {
        // Validate input
        $request->validate([
            'book_copy_id' => 'required|exists:book_copies,id',
        ]);

        $user = $request->user();

        // Find the latest on loan circulation for this book copy
        $circulation = Circulation::where('book_copy_id', $request->book_copy_id)
            ->whereIn('status', ['On Loan', 'Overdue'])
            ->latest('issue_date')
            ->firstOrFail();

        // Ensure the book is currently on loan
        if ($circulation->status === 'Overdue' || $circulation->fine > 0) {
            return response()->json([
                'message' => 'Cannot renew book: Please settle the outstanding fine first.',
                'fine' => $circulation->fine
            ], 400);
        }

        // Get loan days & renewal limit from settings
        $loanDays = (int) LibrarySetting::getValue('default_loan_days', 5);
        $renewalLimit = (int) LibrarySetting::getValue('renewal_limit', 2);

        // Check renewal count
        if ($circulation->renewal_count >= $renewalLimit) {
            return response()->json(['message' => 'Maximum renewal limit reached'], 400);
        }

        // Extend due date
        $dueDate = $circulation->due_date instanceof Carbon
            ? $circulation->due_date
            : Carbon::parse($circulation->due_date);

        $newDueDate = $dueDate->copy()->addDays($loanDays);

        // Update circulation
        $circulation->update([
            'renewal_date' => now(),
            'renewal_count' => $circulation->renewal_count + 1,
            'due_date' => $newDueDate,
            'status' => 'On Loan',
        ]);

        // Log activity
        ActivityLog::create([
            'user_id' => $user->id,
            'role' => $user->role ?? 'staff',
            'module' => 'Circulation Module',
            'action' => 'Processed Renewal',
            'description' => "Renewed copy of '{$circulation->bookCopy->book->title}'"
        ]);

        return response()->json([
            'message' => 'Book copy renewed successfully',
            'circulation' => $circulation
        ]);
    }

    // Reports: number of on loan, returned, overdue
    public function reports()
    {
        return response()->json([
            'On Loan' => Circulation::where('status', 'On Loan')->count(),
            'Returned' => Circulation::whereIn('status', ['Returned', 'Returned Late'])->count(),
            'Overdue' => Circulation::where('status', 'Overdue')->count(),
            'Lost' => Circulation::where('status', 'Lost')->count(),
        ]);
    }

    // Get all transactions for a specific patron
    public function patronTransactions(Request $request, $patronId)
    {
        $currentFee = (float) LibrarySetting::getValue('lost_book_processing_fee', 50);

        $transactions = Circulation::with([
                'bookCopy' => function($query) {
                    $query->withTrashed()->with('book'); 
                }, 
                'user'
            ])
            ->where('patron_id', $patronId)
            ->get()
            ->map(function ($t) use ($currentFee) {
            $isLost = $t->status === 'Lost';

            $materialPrice = (float) ($t->bookCopy->price ?? 0);

                return [
                    'id'          => $t->id,
                    'book_title'  => $t->bookCopy->book->title ?? 'Unknown',
                    'call_number' => $t->bookCopy->book->call_number ?? 'N/A',
                    'copy_number' => $t->bookCopy->copy_number ?? 'N/A',
                    'is_withdrawn'=> $t->bookCopy ? $t->bookCopy->trashed() : false,
                    'status'      => $t->status,
                    'date_issued' => $t->issue_date,
                    'due_date'    => $t->due_date,
                    'return_date' => $t->date_returned,
                    'fine'        => $isLost ? 0 : (float) ($t->fine ?? 0),
                    'paid_amount' => $isLost ? (float)$t->fine : 0,
                    'material_price' => $materialPrice,
                    'processing_fee_used' => $isLost ? $currentFee : 0,
                    'settlement_type' => $t->lost_resolution,
                    'processed_by' => $t->user->name ?? 'System Admin',
                ];
            });

        return response()->json($transactions);
    }

    
    public function getBorrowedBookByBarcode($barcode)
    {
        $bookCopy = BookCopy::with('book')->where('barcode', $barcode)->first();

        if (!$bookCopy) {
            return response()->json([
                'message' => "Barcode [{$barcode}] does not exist in the library records."
            ], 404);
        }

        // Find the latest on loan circulation record for this copy
        $circulation = Circulation::with('patron')
            ->where('book_copy_id', $bookCopy->id)
            ->whereIn('status', ['On Loan', 'Overdue'])
            ->latest('issue_date')
            ->first();

        if (!$circulation) {
            return response()->json([
                'message' => 'This book is not currently on loan.'
            ], 404);
        }

        $dueDate = Carbon::parse($circulation->due_date)->startOfDay();
        $now = now()->startOfDay(); 

        $overdueBy = $now->gt($dueDate) ? $dueDate->diffInDays($now) : 0;

        $fineRate = (int) LibrarySetting::getValue('fine_per_day', 5);
        $fine = $overdueBy * $fineRate;

        // Attach patron info and overdue/fine
        $bookCopyArray = $bookCopy->toArray();
        $bookCopyArray['borrowed_by'] = [
            'patron_id'   => $circulation->patron->patron_id,
            'first_name'  => $circulation->patron->first_name,
            'middle_name' => $circulation->patron->middle_name,
            'last_name'   => $circulation->patron->last_name,
            'suffix'      => $circulation->patron->suffix,
        ];
        $bookCopyArray['overdue_by'] = $overdueBy;
        $bookCopyArray['fine'] = $fine;
        $bookCopyArray['issue_date'] = $circulation->issue_date;
        $bookCopyArray['due_date'] = $circulation->due_date;
        $bookCopyArray['renewal_date'] = $circulation->renewal_date;


        return response()->json($bookCopyArray);
    }

    // Get circulation history of a specific book copy
    public function copyHistory($copyId)
    {
        $fineRate = (int) LibrarySetting::getValue('fine_per_day', 5);

        $history = Circulation::with('patron')
            ->where('book_copy_id', $copyId)
            ->orderBy('issue_date', 'desc')
            ->get()
            ->map(function ($rec) use ($fineRate) {
                $dueDate = $rec->due_date instanceof \Carbon\Carbon
                    ? $rec->due_date
                    : \Carbon\Carbon::parse($rec->due_date);

                $returnDate = $rec->date_returned
                    ? ($rec->date_returned instanceof \Carbon\Carbon
                        ? $rec->date_returned
                        : \Carbon\Carbon::parse($rec->date_returned))
                    : null;

                $now = now();
                $overdueBy = ($rec->status === 'On Loan' && $now->gt($dueDate))
                    ? $dueDate->diffInDays($now)
                    : 0;

                $fine = $rec->status === 'returned'
                    ? ($rec->fine ?? 0)
                    : $overdueBy * $fineRate;

                return [
                    'id'           => $rec->id,
                    'borrower'     => $rec->patron->first_name . ' ' . $rec->patron->last_name,
                    'issue_date'   => $rec->issue_date,
                    'due_date'     => $rec->due_date,
                    'return_date'  => $returnDate,
                    'fine'         => $fine,
                    'status'       => $rec->status,
                ];
            });

        return response()->json($history);
    }

    // Get top 5 most loaned books this week
    public function topBooksThisWeek()
    {
        $startOfWeek = Carbon::now()->startOfWeek();

        $topBooks = Circulation::whereDate('issue_date', '>=', $startOfWeek)
            ->join('book_copies', 'circulations.book_copy_id', '=', 'book_copies.id')
            ->join('books', 'book_copies.book_id', '=', 'books.id')
            ->select('books.title', DB::raw('COUNT(*) as borrowed_count'))
            ->groupBy('books.title')
            ->orderByDesc('borrowed_count')
            ->limit(5)
            ->get();

        return response()->json($topBooks);
    }

    // Get today's tally with percentage change from yesterday
    public function todayTallyWithPercentage()
    {
        $today = Carbon::today();
        $yesterday = Carbon::yesterday();

        $calcPercent = function ($today, $yesterday) {
            if ($yesterday == 0 && $today == 0) {
                return 0;
            }

            if ($yesterday == 0 && $today > 0) {
                return 100;
            }

            return round((($today - $yesterday) / $yesterday) * 100);
        };


        $borrowedToday = Circulation::whereDate('issue_date', $today)->count();
        $borrowedYesterday = Circulation::whereDate('issue_date', $yesterday)->count();

        $returnedToday = Circulation::whereDate('date_returned', $today)->count();
        $returnedYesterday = Circulation::whereDate('date_returned', $yesterday)->count();

        $overdueToday = Circulation::where('status', 'On Loan')
            ->whereDate('due_date', '<', $today)
            ->count();
        $overdueYesterday = Circulation::where('status', 'On Loan')
            ->whereDate('due_date', '<', $yesterday)
            ->count();

        return response()->json([
            'On Loan' => [
                'count' => $borrowedToday,
                'percent' => $calcPercent($borrowedToday, $borrowedYesterday),
            ],
            'Returned' => [
                'count' => $returnedToday,
                'percent' => $calcPercent($returnedToday, $returnedYesterday),
            ],
            'Overdue' => [
                'count' => $overdueToday,
                'percent' => $calcPercent($overdueToday, $overdueYesterday),
            ],
        ]);
    }



    public function withdraw(Request $request)
    {
        // Validate that we received an array of IDs
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:book_copies,id'
        ]);

        $ids = $request->ids;
        $withdrawnCount = 0;
        $errors = [];

        // Fetch the copies with their book titles for the log
        $copies = BookCopy::with('book')->whereIn('id', $ids)->get();

        foreach ($copies as $copy) {
            // 1. SECURITY CHECK: Skip if book is currently borrowed
            if (in_array($copy->status, ['On Loan', 'Overdue'])) {
                $errors[] = "Accession {$copy->accession_number} is currently active in a transaction.";
                continue;
            }

            // 2. Perform Soft Delete
            $copy->delete();
            $withdrawnCount++;

            // 3. Log each withdrawal
            ActivityLog::create([
                'user_id' => $request->user()->id,
                'role' => $request->user()->role ?? 'staff',
                'module' => 'Inventory',
                'action' => 'Withdrawn',
                'description' => "Withdrew Copy #{$copy->copy_number} of '{$copy->book->title}' (Accession: {$copy->accession_number})"
            ]);
        }

        return response()->json([
            'message' => "Successfully withdrew $withdrawnCount copies.",
            'errors' => $errors
        ], count($errors) > 0 ? 207 : 200); 
    }
}
