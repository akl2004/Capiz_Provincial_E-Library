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
        $missingThreshold = (int) LibrarySetting::getValue('missing_book_threshold_days', 365);
        $now = now()->startOfDay();

        $records->transform(function ($rec) use ($fineRate, $now, $missingThreshold) {
            if (in_array($rec->status, ['Returned', 'Returned Late', 'Lost', 'Missing'])) {
                return $rec;
            }

            $overdueBy = $this->calculateOverdueDays($rec->due_date, $now);

            if ($overdueBy > 0) {
                if ($overdueBy >= $missingThreshold) {
                    $rec->status = 'Missing';
                    $rec->overdue_by = $overdueBy;
                    $rec->fine = $missingThreshold * $fineRate;
                    $rec->save();

                    $rec->bookCopy->update(['status' => 'Missing']);
                } 
                else if ($rec->status !== 'Overdue' || (int)$rec->overdue_by !== $overdueBy) {
                    $rec->status = 'Overdue';
                    $rec->overdue_by = $overdueBy;
                    $rec->fine = $overdueBy * $fineRate;
                    $rec->save();
                }
            } else {
                $rec->status = 'On Loan';
                $rec->overdue_by = 0;
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

        $dueDatePreview = now()->addWeekdays($loanDays)->toDateString();

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
            'due_date_preview' => $dueDatePreview,
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


    public function borrow(Request $request)
    {
        $validated = $request->validate([
            'book_copy_ids'   => 'required|array|min:1',
            'book_copy_ids.*' => 'exists:book_copies,id',
            'patron_id'       => 'required|exists:patrons,patron_id',
        ]);

        $user = $request->user();
        $patron = Patron::where('patron_id', $validated['patron_id'])->firstOrFail();

        // 2. Check Patron Status (Keep your existing switch logic)
        if ($patron->status !== 'Active') {
            $errorMessage = 'Cannot issue books: ';
            switch ($patron->status) {
                case 'Expired': $errorMessage .= 'Membership expired.'; break;
                case 'Blocked': $errorMessage .= 'Patron is blocked.'; break;
                case 'Deactivated': $errorMessage .= 'Account is deactivated.'; break;
                default: $errorMessage .= 'Account is not active.'; break;
            }
            return response()->json(['message' => $errorMessage], 403);
        }

        // 3. Reuse policy calculation
        $policy = $this->calculateBorrowingPolicy($patron);
        $requestedCount = count($validated['book_copy_ids']);

        // Check if the number of books requested exceeds the "Transaction Limit"
        if ($requestedCount > $policy['max_items']) {
            return response()->json([
                'message' => "Transaction limit exceeded. You can only borrow {$policy['max_items']} books at once."
            ], 400);
        }

        // Check if adding these books exceeds their "Total Borrow Limit"
        if (($policy['current_borrowed'] + $requestedCount) > $policy['borrow_limit']) {
            return response()->json([
                'message' => "Limit reached. Patron already has {$policy['current_borrowed']} books and cannot exceed {$policy['borrow_limit']} total."
            ], 400);
        }

        $circulations = [];
        $bookTitles = [];

        // 4. Process all books inside a single Database Transaction
        try {
            DB::transaction(function () use ($validated, $patron, $policy, $user, &$circulations, &$bookTitles) {
                $issueDate = now();
                $dueDate = $issueDate->copy()->addWeekdays($policy['loan_days']);

                foreach ($validated['book_copy_ids'] as $copyId) {
                    $bookCopy = BookCopy::with('book')->lockForUpdate()->findOrFail($copyId);

                    // Individual Book Checks
                    if ($bookCopy->status !== 'Available') {
                        throw new \Exception("Book '{$bookCopy->book->title}' is already borrowed or unavailable.");
                    }
                    if ($bookCopy->condition === 'Damaged') {
                        throw new \Exception("Book '{$bookCopy->book->title}' is damaged and cannot be loaned.");
                    }

                    // Reference Copy Check
                    $totalCopiesCount = BookCopy::where('book_id', $bookCopy->book_id)->count();
                    if ($totalCopiesCount <= 1) {
                        throw new \Exception("'{$bookCopy->book->title}' is the library's only copy (Reference Only).");
                    }

                    // Create Circulation Record
                    $circulations[] = Circulation::create([
                        'book_copy_id' => $bookCopy->id,
                        'patron_id'    => $patron->id,
                        'user_id'      => $user->id,
                        'issue_date'   => $issueDate,
                        'due_date'     => $dueDate,
                        'status'       => 'On Loan',
                    ]);

                    // Update Book Status
                    $bookCopy->update(['status' => 'On Loan']);
                    $bookTitles[] = $bookCopy->book->title;
                }
            });

            // 5. Log Activity for the whole batch
            ActivityLog::create([
                'user_id' => $user->id,
                'role' => $user->role ?? 'staff',
                'module' => 'Circulation Module',
                'action' => 'Processed Multiple Issues',
                'description' => "Borrowed " . count($bookTitles) . " books: " . implode(', ', $bookTitles)
            ]);

            return response()->json([
                'message' => count($circulations) . ' books loaned successfully',
                'circulations' => $circulations
            ], 201);

        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 400);
        }
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
        $overdueBy = $this->calculateOverdueDays($circulation->due_date, $returnDate);

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
            'settlement_type' => 'required|in:payment,replacement',
            'replacement_mode' => 'nullable|in:Immediate,Deferred',
            'due_date' => 'nullable|date',
            'barcode' => 'nullable|string|unique:book_copies,barcode',
            'accession_no' => 'nullable|string',
            'source_person' => 'nullable|string',
            'cataloging_note'   => 'nullable|string',
            'internal_note'  => 'nullable|string',
        ]);
        
        $user = $request->user();
        $settlementType = $request->settlement_type;
        $mode = $request->replacement_mode;
        
        $circulation = Circulation::where('book_copy_id', $request->book_copy_id)
            ->whereIn('status', ['On Loan', 'Overdue'])
            ->firstOrFail();

        $replacementCost = ($settlementType === 'payment') 
        ? (float) ($circulation->bookCopy->price ?? 0) 
        : 0;
        $processingFee = (float) LibrarySetting::getValue('lost_book_processing_fee', 50);

        $overdueDays = $this->calculateOverdueDays($circulation->due_date, now());
        $fineRate = (int) LibrarySetting::getValue('fine_per_day', 5);
        $currentOverdueFine = $overdueDays * $fineRate;

        $totalFine = $replacementCost + $processingFee + $currentOverdueFine;

        DB::transaction(function () use ($request, $circulation, $totalFine, $settlementType, $mode, $user) {
            // Update the book copy status regardless of mode
            $circulation->bookCopy->update(['status' => 'Lost']);

            if ($mode === 'Deferred') {
                $circulation->update([
                    'status' => 'Lost',
                    'due_date' => $request->due_date,
                    'fine' => $totalFine, 
                    'lost_resolution' => 'Replacement',
                    'remarks' => 'Replacement Deferred until ' . $request->due_date,
                    'date_returned' => null,
                ]);
            } else {
                // IMMEDIATE/PAYMENT: Close the transaction
                $circulation->update([
                    'status' => 'Lost',
                    'fine' => $totalFine,
                    'overdue_by' => 0,
                    'is_paid' => true,
                    'lost_resolution' => ucfirst($settlementType),
                    'user_id' => $user->id,
                    'date_returned' => now(),
                ]);

                if ($settlementType === 'replacement' && $mode === 'Immediate') {
                    $this->registerReplacementCopy($circulation->bookCopy, $request->all());
                }
            }
        });

        // Log the activity
        ActivityLog::create([
            'user_id' => $user->id,
            'role' => $user->role ?? 'staff',
            'module' => 'Circulation Module',
            'action' => 'Marked Lost',
            'description' => "Marked '{$circulation->bookCopy->book->title}' as lost via {$settlementType} ({$mode})."
        ]);

        return response()->json([
            'message' => $mode === 'Deferred' ? 'Replacement deferred.' : 'Book marked as Lost.',
            'total_bill' => $totalFine,
        ]);
    }

    private function registerReplacementCopy($oldCopy, $data)
    {
        // Find the current highest copy number for this book
        $nextCopyNumber = BookCopy::where('book_id', $oldCopy->book_id)->max('copy_number') + 1;

        return BookCopy::create([
            'book_id' => $oldCopy->book_id,
            'material_type_id' => $oldCopy->material_type_id,
            'barcode'          => $data['barcode'] ?? null,
            'accession_number' => $data['accession_no'] ?? null,
            'copy_number' => $nextCopyNumber,
            'status' => 'Available',
            'condition' => 'New',
            'price' => $oldCopy->price,
            'source' => 'Replacement',
            'source_person'    => $data['source_person'] ?? null,
            'cataloging_note'  => $data['cataloging_note'] ?? null,
            'internal_note'    => $data['internal_note'] ?? null,
        ]);
    }

    public function getPendingSettlements()
    {
        // Fetch loans marked 'Lost' but haven't been 'Returned' (closed)
        $pending = Circulation::with(['patron', 'bookCopy.book', 'bookCopy'])
            ->where('status', 'Lost')
            ->whereNull('date_returned')
            ->where('lost_resolution', 'Replacement')
            ->get();

        return response()->json($pending);
    }

    public function resolveLostBook(Request $request, $id)
    {
        $circulation = Circulation::findOrFail($id);
        $action = $request->action;

        return DB::transaction(function () use ($request, $circulation, $action) {
            if ($action === 'complete') {
                $nextCopyNumber = BookCopy::where('book_id', $request->book_id)->max('copy_number') + 1;
                // 1. Create the new book copy record
                BookCopy::create([
                    'book_id'               => $request->book_id,
                    'barcode'               => $request->barcode,
                    'accession_number'      => $request->accession_no,
                    'material_type_id'      => $request->material_type_id,
                    'copy_number'           => $nextCopyNumber,
                    'condition'             => 'New',
                    'status'                => 'Available',
                    'source'                => 'Replacement',
                    'source_person'         => $request->source_person,
                    'cataloging_note'       => $request->cataloging_note,
                    'price'                 => $request->price,
                ]);

                // 2. Close the circulation record
                $circulation->update([
                    'status' => 'Lost',
                    'date_returned' => now(),
                    'is_paid' => true,
                    'lost_resolution' => 'Replacement',
                    'remarks' => $circulation->remarks . " | Resolved by replacement."
                ]);
            } 
            elseif ($action === 'extend') {
                $circulation->update(['due_date' => $request->due_date]);
            } 
            elseif ($action === 'fail') {
                // Charge the price + penalty
                $bookPrice = $circulation->bookCopy->price;
                $circulation->update([
                    'status' => 'Lost',
                    'fine' => $circulation->fine + $bookPrice,
                    'lost_resolution' => 'Payment',
                    'date_returned' => now(), 
                    'remarks' => $circulation->remarks . " | Failed replacement promise."
                ]);
            }

            return response()->json(['message' => 'Success']);
        });
    }

    public function getActiveLoansByPatron($patronId)
    {
        $fineRate = (int) LibrarySetting::getValue('fine_per_day', 5);
        $now = now()->startOfDay();

        $activeLoans = Circulation::with(['bookCopy.book'])
            ->where('patron_id', $patronId)
            ->whereIn('status', ['On Loan', 'Overdue'])
            ->get()
            ->map(function ($loan) use ($fineRate, $now) {
                $overdueDays = $this->calculateOverdueDays($loan->due_date, $now);
                $calculatedFine = $overdueDays * $fineRate;

                return [
                    'id' => $loan->bookCopy->id, 
                    'barcode' => $loan->bookCopy->barcode,
                    'price' => $loan->bookCopy->price,
                    'copy_number' => $loan->bookCopy->copy_number,
                    'accession_no' => $loan->bookCopy->accession_number, 
                    'issue_date' => \Carbon\Carbon::parse($loan->issue_date)->format('Y-m-d'),
                    'due_date' => \Carbon\Carbon::parse($loan->due_date)->format('Y-m-d'),
                    'days_overdue' => $overdueDays,
                    'fine' => number_format($calculatedFine, 2, '.', ''),
                    'book' => [
                        'title' => $loan->bookCopy->book->title,
                        'call_number' => $loan->bookCopy->book->call_number,
                    ]
                ];
            });

        return response()->json($activeLoans);
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

    
    public function reports()
    {
        return response()->json([
            'On Loan' => Circulation::where('status', 'On Loan')->count(),
            'Returned' => Circulation::whereIn('status', ['Returned', 'Returned Late'])->count(),
            'Overdue' => Circulation::where('status', 'Overdue')->count(),
            'Lost' => Circulation::where('status', 'Lost')->count(),
            'Missing'  => Circulation::where('status', 'Missing')->count(),
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
                    'is_paid'     => $t->fine_paid_date ? true : false,
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

        $overdueBy = $this->calculateOverdueDays($circulation->due_date, now());
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
                if ($rec->status === 'On Loan' || $rec->status === 'Overdue') {
                    $overdueBy = $this->calculateOverdueDays($rec->due_date, now());
                    $fine = $overdueBy * $fineRate;
                } else {
                    $fine = $rec->fine ?? 0;
                }

                return [
                    'id'           => $rec->id,
                    'borrower'     => $rec->patron->first_name . ' ' . $rec->patron->last_name,
                    'issue_date'   => $rec->issue_date,
                    'due_date'     => $rec->due_date,
                    'return_date'  => $rec->date_returned,
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

        $overdueToday = Circulation::whereIn('status', ['On Loan', 'Overdue'])
            ->whereDate('due_date', '<', Carbon::today())
            ->count();

        $overdueYesterday = Circulation::whereIn('status', ['On Loan', 'Overdue'])
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


    /**
     * Private helper to calculate overdue days excluding weekends.
     */
    private function calculateOverdueDays($dueDate, $comparisonDate)
    {
        $due = Carbon::parse($dueDate)->startOfDay();
        $comp = Carbon::parse($comparisonDate)->startOfDay();

        if ($comp->lte($due)) {
            return 0;
        }

        // diffInDaysFiltered counts only days where the callback returns true
        return $due->diffInDaysFiltered(function (Carbon $date) {
            return !$date->isWeekend();
        }, $comp);
    }
}
