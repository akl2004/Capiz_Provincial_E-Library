<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Book;
use App\Models\Circulation;
use App\Models\LibrarySetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportsController extends Controller
{
    public function collection()
    {
        // 1. Donut chart: Count materials per type (from book_copies)
        $materialsByType = DB::table('book_copies')
            ->join('material_types', 'book_copies.material_type_id', '=', 'material_types.id')
            ->select('material_types.name as material_type', DB::raw('COUNT(*) as total'))
            ->groupBy('material_types.name')
            ->get();

        // 2. Line chart: Books added per month (from books)
        if (DB::getDriverName() === 'sqlite') {
            $booksPerMonth = DB::table('book_copies')
                ->select(
                    DB::raw("strftime('%m', created_at) as month"), 
                    DB::raw('COUNT(*) as total')
                )
                ->groupBy('month')
                ->orderBy('month')
                ->get();
        } else {
            $booksPerMonth = DB::table('book_copies')
                ->select(
                    DB::raw("MONTH(created_at) as month"), 
                    DB::raw('COUNT(*) as total')
                )
                ->groupBy('month')
                ->orderBy('month')
                ->get();
        }


        // 3. Pie chart: Sources (from book_copies)
        $sources = DB::table('book_copies')
            ->select('source', DB::raw('COUNT(*) as total'))
            ->whereNotNull('source')
            ->groupBy('source')
            ->get();

        // 4. Bar chart: Books per category (from books)
        $ddcCategories = [
            '000' => 'General Works',
            '100' => 'Philosophy',
            '200' => 'Religion',
            '300' => 'Social Sciences',
            '400' => 'Language',
            '500' => 'Science',
            '600' => 'Technology',
            '700' => 'Arts',
            '800' => 'Literature',
            '900' => 'History & Geography',
        ];

        $booksByCategory = DB::table('book_copies')
            ->join('books', 'book_copies.book_id', '=', 'books.id')
            ->select('books.dewey_decimal', DB::raw('COUNT(book_copies.id) as total'))
            ->groupBy('books.dewey_decimal')
            ->get()
            ->map(function ($item) use ($ddcCategories) {
                $code = str_pad($item->dewey_decimal, 3, '0', STR_PAD_LEFT);
                $key = substr($code, 0, 1) . '00';
                return [
                    'category' => $ddcCategories[$key] ?? 'Other',
                    'total' => $item->total,
                ];
            })
            ->groupBy('category')
            ->map(function ($group) {
                return [
                    'category' => $group[0]['category'],
                    'total' => array_sum(array_column($group->toArray(), 'total')),
                ];
            })
            ->values();

        // 5. Collection Overview Summary
        $totalCopies = DB::table('book_copies')->count();

        // Define the statuses you consider "Active"
        $activeStatuses = ['On Loan', 'Returned', 'Reserved', 'Renewed'];

        $borrowedByType = DB::table('circulations')
            ->join('book_copies', 'circulations.book_copy_id', '=', 'book_copies.id')
            ->join('material_types', 'book_copies.material_type_id', '=', 'material_types.id')
            ->select('material_types.name as material_type_name', DB::raw('COUNT(DISTINCT book_copies.id) as borrowed_total'))
            ->whereIn('circulations.status', $activeStatuses)
            ->whereYear('circulations.created_at', now()->year)
            ->groupBy('material_types.name')
            ->pluck('borrowed_total', 'material_type_name');

        $collectionOverview = $materialsByType->map(function ($item) use ($totalCopies, $borrowedByType) {
            $active = $borrowedByType[$item->material_type] ?? 0;

            return [
                'material_type' => $item->material_type,
                'total' => $item->total,
                'percent_of_total' => $totalCopies > 0
                    ? round(($item->total / $totalCopies) * 100, 2)
                    : 0,
                'percent_active' => $item->total > 0
                    ? round(($active / $item->total) * 100, 2)
                    : 0,
            ];
        });

        return response()->json([
            'materialsByType' => $materialsByType,
            'booksPerMonth' => $booksPerMonth,
            'sources' => $sources,
            'booksByCategory' => $booksByCategory,
            'collectionOverview' => $collectionOverview,
        ]);
    }

    public function collectionMasterlist()
    {
        $copies = \App\Models\BookCopy::with('book')->get();
        return response()->json($copies);
    }


    public function lostBooksDetail()
    {
        $lostBooks = DB::table('circulations')
            ->join('book_copies', 'circulations.book_copy_id', '=', 'book_copies.id')
            ->join('books', 'book_copies.book_id', '=', 'books.id')
            ->join('patrons', 'circulations.patron_id', '=', 'patrons.id')
            ->select(
                'book_copies.accession_number',
                'book_copies.copy_number',
                'books.title',
                'books.call_number',
                'books.author',
                'patrons.first_name',
                'patrons.last_name',
                'circulations.updated_at as date_lost'
            )
            ->where('circulations.status', 'Lost')
            ->get();

        return response()->json($lostBooks);
    }


    public function circulation(Request $request)
    {
        $totalInventory = DB::table('book_copies')->whereNull('deleted_at')->count();
        $now = Carbon::now();
        $today = today();
        $timeRange = $request->query('timeRange', 'all-time');

        // --- 1. DYNAMIC TOP BOOKS QUERY ---
        $topBooksQuery = Circulation::join('book_copies', 'circulations.book_copy_id', '=', 'book_copies.id')
            ->join('books', 'book_copies.book_id', '=', 'books.id');

        // Apply filters based on the selection from your React Modal
        $topBooksQuery->when($timeRange, function ($q) use ($timeRange, $now) {
            if ($timeRange === 'this-week') {
                $q->whereDate('issue_date', '>=', $now->startOfWeek());
            } elseif ($timeRange === 'this-month') {
                $q->whereMonth('issue_date', $now->month)
                ->whereYear('issue_date', $now->year);
            } elseif ($timeRange === 'this-year') {
                $q->whereYear('issue_date', $now->year);
            }
        });

        $topBooks = $topBooksQuery->select(
                'books.title', 
                'books.author', 
                DB::raw('COUNT(*) as borrowed_count')
            )
            ->groupBy('books.title', 'books.author')
            ->orderByDesc('borrowed_count')
            ->limit(5)
            ->get();

        $actualOverdueCount = Circulation::where('status', '!=', 'Lost')
            ->where(function ($query) use ($today) {
                $query->where('status', 'Returned Late')
                      ->orWhere(function ($sub) use ($today) {
                          $sub->where('status', 'On Loan')
                              ->whereDate('due_date', '<', $today);
                      });
            })
            ->get()
            ->filter(function ($loan) use ($today) {
                $due = Carbon::parse($loan->due_date)->startOfDay();
                $end = $loan->date_returned ? Carbon::parse($loan->date_returned) : $today;
                
                // Only count as overdue if there is at least 1 weekday between due and now/return
                return $due->diffInDaysFiltered(function (Carbon $date) {
                    return !$date->isWeekend();
                }, $end) > 0;
            })
            ->count();

        $actualLostCount = DB::table('circulations')->where('status', 'Lost')->count();
        $actualTotalFines = DB::table('circulations')->where('is_paid', true)->sum('fine');

        // --- MONTHLY ROWS ---
        $months = [];
        for ($i = 11; $i >= 0; $i--) {
            $m = $now->copy()->subMonths($i);
            $months[] = [
                'display' => $m->format('M Y'),
                'year' => (int)$m->format('Y'),
                'month' => (int)$m->format('n'),
                'year_month' => $m->format('Y-m'), 
                'full_date' => $m->endOfMonth()->toDateString(),
            ];
        }

        $rows = [];
        foreach ($months as $m) {
            $y = $m['year'];
            $mo = $m['month'];
            $monthEnd = Carbon::parse($m['full_date']);

            // Monthly Borrowed
            $onLoan = DB::table('circulations')
                ->whereYear('issue_date', $y)
                ->whereMonth('issue_date', $mo)
                ->count();

            // Monthly Returned
            $returned = DB::table('circulations')
                ->whereNotNull('date_returned')
                ->whereYear('date_returned', $y)
                ->whereMonth('date_returned', $mo)
                ->count();

            // Monthly Overdue
            $monthlyOverdue = Circulation::whereYear('due_date', $y)
                ->whereMonth('due_date', $mo)
                ->where('status', '!=', 'Lost')
                ->get()
                ->filter(function ($loan) use ($today) {
                    $due = Carbon::parse($loan->due_date)->startOfDay();
                    $end = $loan->date_returned ? Carbon::parse($loan->date_returned) : $today;
                    return $due->diffInDaysFiltered(function (Carbon $date) {
                        return !$date->isWeekend();
                    }, $end) > 0;
                })
                ->count();


            // Monthly Lost
            $lost = DB::table('circulations')
                ->where('status', 'Lost')
                ->whereYear('updated_at', $y)
                ->whereMonth('updated_at', $mo)
                ->count();

            // Monthly Fines
            $fines = DB::table('circulations')
                ->where('is_paid', true)
                ->whereYear('updated_at', $y)
                ->whereMonth('updated_at', $mo)
                ->sum('fine');

            $rows[] = [
                'month' => $m['display'],
                'year_month' => $m['year_month'], 
                'onLoan' => (int)$onLoan,
                'returned' => (int)$returned,
                'overdue' => (int)$monthlyOverdue,
                'lost' => (int)$lost,
                'fines' => (float)$fines,
            ];
        }

        return response()->json([
            'rows' => $rows,
            'topBooks' => $topBooks,
            'summary' => [
                'totalInventory' => $totalInventory,
                'lost' => (int)$actualLostCount,
                'finesPaid' => (float)$actualTotalFines,
                'overdue' => (int)$actualOverdueCount,
            ],
        ]);
    }

    // Attendance Report Endpoints
    public function attendanceSummary()
    {
        $startOfWeek = Carbon::now()->startOfWeek();
        $endOfWeek = Carbon::now()->endOfWeek();

        // Group by date
        $rows = Attendance::selectRaw('DATE(time_in) as date')
            ->selectRaw("SUM(CASE WHEN patron_id IS NULL THEN 1 ELSE 0 END) as guest")
            ->selectRaw("SUM(CASE WHEN patron_id IS NOT NULL THEN 1 ELSE 0 END) as patron")
            ->selectRaw("COUNT(*) as total")
            ->whereBetween('time_in', [$startOfWeek, $endOfWeek])
            ->groupBy('date')
            ->orderBy('date', 'asc')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => Carbon::parse($item->date)->format('D'),
                    'guest' => (int)$item->guest,
                    'patron' => (int)$item->patron,
                    'total' => (int)$item->total,
                ];
            });

        // Calculate overall summary
        $summary = [
            'guest' => $rows->sum('guest'),
            'patron' => $rows->sum('patron'),
            'total' => $rows->sum('total'),
        ];

        return response()->json([
            'rows' => $rows,
            'summary' => $summary,
        ]);
    }

    public function attendanceLog()
    {
        $logs = Attendance::orderBy('time_in', 'desc')
            ->get([
                'id',
                'patron_id',
                'first_name',
                'middle_name',
                'last_name',
                'suffix',
                'gender',
                'province',
                'city',
                'barangay',
                'number',
                'visitor_type',
                'affiliation',
                'purpose_of_visit',
                'time_in',
                'time_out',
            ])
            ->map(function ($log) {
                // Construct full address
                $addressParts = array_filter([
                    $log->barangay,
                    $log->city,
                    $log->province,
                ]);
                $fullAddress = implode(', ', $addressParts);

                // Construct full name
                $fullname = trim(
                    $log->first_name . ' ' .
                    ($log->middle_name ? $log->middle_name[0] . '. ' : '') .
                    $log->last_name . ' ' .
                    ($log->suffix ?? '')
                );

                // Extract date from time_in
                $date = $log->time_in ? Carbon::parse($log->time_in)->format('Y-m-d') : null;

                // Format times
                $timeIn = $log->time_in ? Carbon::parse($log->time_in)->format('H:i') : null;
                $timeOut = $log->time_out ? Carbon::parse($log->time_out)->format('H:i') : null;

                return [
                    'id' => $log->id,
                    'type' => $log->patron_id ? 'Patron' : 'Guest',
                    'fullname' => $fullname,
                    'gender' => $log->gender ?? null,
                    'address' => $fullAddress ?: null,
                    'contact_number' => $log->number ?? null,
                    'purpose' => $log->purpose_of_visit ?? null,
                    'visitor_type' => $log->visitor_type ?? null,
                    'affiliation' => $log->affiliation ?? null,
                    'date' => $date,
                    'time_in' => $timeIn,
                    'time_out' => $timeOut,
                ];
            });

        return response()->json([
            'logs' => $logs,
            'total_logs' => $logs->count(),
        ]);
    }


    public function accounts()
    {
        // Get expiration setting (default to 3 years)
        $expirationYears = (int) LibrarySetting::getValue('patron_expiration_years', 3);

        // Bar Graph: Patron Accounts by Status
        $accountStatus = DB::table('patrons')
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->get();

        // Donut Chart: Role Distribution (Patron, Staff, Admin)
        $roles = DB::table('users')
            ->select('role', DB::raw('COUNT(*) as total'))
            ->groupBy('role')
            ->get();

        // Add patrons as a separate "role" count
        $patronCount = DB::table('patrons')->count();
        $roles->push((object)[
            'role' => 'patron',
            'total' => $patronCount,
        ]);

        // Calculate percentage for each role
        $totalRoles = $roles->sum('total'); // sum of all roles
        $roles = $roles->map(function ($role) use ($totalRoles) {
            $role->percentage = $totalRoles > 0
                ? round(($role->total / $totalRoles) * 100, 2)
                : 0;
            return $role;
        });

        // Line Graph: Newly Added Accounts per Month (Users + Patrons)
        if (DB::getDriverName() === 'sqlite') {
        $userAccounts = DB::table('users')
            ->select(DB::raw("strftime('%Y-%m', created_at) as month"), DB::raw('COUNT(*) as total'))
            ->groupBy('month');
            

        $patronAccounts = DB::table('patrons')
            ->select(DB::raw("strftime('%Y-%m', created_at) as month"), DB::raw('COUNT(*) as total'))
            ->groupBy('month');

        } else {
            $userAccounts = DB::table('users')
                ->select(DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'), DB::raw('COUNT(*) as total'))
                ->groupBy('month');

            $patronAccounts = DB::table('patrons')
                ->select(DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'), DB::raw('COUNT(*) as total'))
                ->groupBy('month');
        }


        $newAccountsPerMonth = $userAccounts
            ->unionAll($patronAccounts)
            ->get()
            ->groupBy('month')
            ->map(function ($group, $month) {
                return [
                    'month' => $month,
                    'total' => $group->sum('total'),
                ];
            })
            ->values();

        // Accounts Registry Table (Users + Patrons)
        if (DB::getDriverName() === 'sqlite') {
            $registry = collect(DB::select("
                SELECT id AS user_id,
                    first_name || ' ' || last_name AS full_name,
                    email,
                    phone_number AS number,
                    role,
                    status,
                    created_at,
                    NULL AS expiration_date
                FROM users
                UNION ALL
                SELECT patron_id AS user_id,
                    first_name || ' ' || last_name AS full_name,
                    email,
                    number,
                    'patron' AS role,
                    status,
                    created_at,
                    DATE(created_at, '+{$expirationYears} years') AS expiration_date
                FROM patrons
                ORDER BY created_at DESC
            "));
        } else {
            $registry = collect(DB::select("
                (SELECT id AS user_id,
                        CONCAT(first_name, ' ', last_name) AS full_name,
                        email,
                        phone_number AS number,
                        role,
                        status,
                        created_at,
                        NULL AS expiration_date
                FROM users)
                UNION ALL
                (SELECT patron_id AS user_id,
                        CONCAT(first_name, ' ', last_name) AS full_name,
                        email,
                        number,
                        'patron' AS role,
                        status,
                        created_at,
                        DATE_ADD(created_at, INTERVAL {$expirationYears} YEAR) AS expiration_date
                FROM patrons)
                ORDER BY created_at DESC
            "));
        }
        $registry = $registry->map(function ($item) {
            $item->created_at = Carbon::parse($item->created_at)->format('Y-m-d');
            $item->expiration_date = $item->expiration_date 
                ? Carbon::parse($item->expiration_date)->format('Y-m-d')
                : null;
            return $item;
        });

        return response()->json([
            'accountStatus' => $accountStatus,
            'roleDistribution' => $roles,
            'newAccountsPerMonth' => $newAccountsPerMonth,
            'registry' => $registry,
        ]);
    }
}
