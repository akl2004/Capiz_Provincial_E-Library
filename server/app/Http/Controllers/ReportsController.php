<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Book;
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
            ->select('material_type', DB::raw('COUNT(*) as total'))
            ->whereNotNull('material_type')
            ->groupBy('material_type')
            ->get();

        // 2. Line chart: Books added per month (from books)
        if (DB::getDriverName() === 'sqlite') {
            $booksPerMonth = DB::table('books')
                ->select(DB::raw("strftime('%m', created_at) as month"), DB::raw('COUNT(*) as total'))
                ->groupBy('month')
                ->orderBy('month')
                ->get();
        } else {
            $booksPerMonth = DB::table('books')
                ->select(DB::raw("MONTH(created_at) as month"), DB::raw('COUNT(*) as total'))
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
            '000' => 'Technology',
            '100' => 'Religion',
            '200' => 'Philosophy',
            '300' => 'General Works',
            '400' => 'Arts',
            '500' => 'Languages',
            '600' => 'Literature',
            '700' => 'Social Sciences',
            '800' => 'Science',
            '900' => 'History and geography',
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

        // Count total on loan per material type
        $borrowedByType = DB::table('circulations')
            ->join('book_copies', 'circulations.book_copy_id', '=', 'book_copies.id')
            ->select('book_copies.material_type', DB::raw('COUNT(*) as borrowed_total'))
            ->where('circulations.status', 'On Loan')
            ->groupBy('book_copies.material_type')
            ->pluck('borrowed_total', 'book_copies.material_type');

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


    // for the circulation report
    public function circulation()
    {
        // get current fine per day
        $finePerDay = (int) \App\Models\LibrarySetting::getValue('fine_per_day', 5);

        // We'll return last 12 months (including current)
        $months = [];
        $now = Carbon::now();
        for ($i = 11; $i >= 0; $i--) {
            $m = $now->copy()->subMonths($i);
            $months[] = [
                'label' => $m->format('Y-m'), 
                'display' => $m->format('M Y'), 
                'year' => (int)$m->format('Y'),
                'month' => (int)$m->format('n'),
            ];
        }

        $rows = [];
        $totals = [
            'onLoan' => 0,
            'returned' => 0,
            'renewed' => 0,
            'overdue' => 0,
            'fines' => 0.0,
        ];

        foreach ($months as $m) {
            $y = $m['year'];
            $mo = $m['month'];

            // on loan = circulations issued in that month
            $onLoan = DB::table('circulations')
                ->whereYear('issue_date', $y)
                ->whereMonth('issue_date', $mo)
                ->count();

            // Returned = circulations returned in that month
            $returned = DB::table('circulations')
                ->whereNotNull('date_returned')
                ->whereYear('date_returned', $y)
                ->whereMonth('date_returned', $mo)
                ->count();

            // Renewed = circulations with renewal_date in that month
            $renewed = DB::table('circulations')
                ->whereNotNull('renewal_date')
                ->whereYear('renewal_date', $y)
                ->whereMonth('renewal_date', $mo)
                ->count();

            // Overdue:
            $overdue = DB::table('circulations')
                ->where(function($query) use ($y, $mo) {
                    // Case A: Still overdue and the due date was in this month
                    $query->where('status', 'Overdue')
                        ->whereYear('due_date', $y)
                        ->whereMonth('due_date', $mo);
                })
                ->orWhere(function($query) use ($y, $mo) {
                    // Case B: Returned in this month but was late
                    $query->whereNotNull('date_returned')
                        ->whereYear('date_returned', $y)
                        ->whereMonth('date_returned', $mo)
                        ->whereRaw('date_returned > due_date');
                })
                ->count();

            // Fines: calculate dynamically
            $finesSum = DB::table('circulations')
                ->select(DB::raw("
                    SUM(
                        CASE 
                            WHEN date_returned IS NOT NULL AND date_returned > due_date 
                                THEN DATEDIFF(date_returned, due_date) * $finePerDay
                            WHEN date_returned IS NULL AND due_date < NOW()
                                THEN DATEDIFF(NOW(), due_date) * $finePerDay
                            ELSE 0
                        END
                    ) as total_fines
                "))
                ->whereYear('due_date', $y)
                ->whereMonth('due_date', $mo)
                ->value('total_fines');


            $finesSum = (float) $finesSum;

            // Add to totals
            $totals['onLoan'] += $onLoan;
            $totals['returned'] += $returned;
            $totals['renewed'] += $renewed;
            $totals['overdue'] += $overdue;
            $totals['fines'] += $finesSum;

            $rows[] = [
                'month' => $m['display'],
                'year_month' => $m['label'],
                'onLoan' => (int)$onLoan,
                'returned' => (int)$returned,
                'renewed' => (int)$renewed,
                'overdue' => (int)$overdue,
                'fines' => $finesSum,
            ];
        }

        // summary
        $summary = [
            'onLoan' => $totals['onLoan'],
            'returned' => $totals['returned'],
            'renewed' => $totals['renewed'],
            'overdue' => $totals['overdue'],
            'fines' => $totals['fines'],
        ];

        return response()->json([
            'rows' => $rows,
            'summary' => $summary,
        ]);
    }

    // Attendance Report Endpoints
    public function attendanceSummary()
    {
        // Group by date
        $rows = Attendance::selectRaw('DATE(time_in) as date')
            ->selectRaw("SUM(CASE WHEN patron_id IS NULL THEN 1 ELSE 0 END) as guest")
            ->selectRaw("SUM(CASE WHEN patron_id IS NOT NULL THEN 1 ELSE 0 END) as patron")
            ->selectRaw("COUNT(*) as total")
            ->groupBy('date')
            ->orderBy('date', 'asc')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => $item->date,
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
                'province',
                'city',
                'barangay',
                'number',
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
                    'type' => $log->patron_id ? 'patron' : 'guest',
                    'fullname' => $fullname,
                    'address' => $fullAddress ?: null,
                    'contact_number' => $log->number ?? null,
                    'purpose' => $log->purpose_of_visit ?? null,
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
                    role,
                    status,
                    created_at,
                    NULL AS expiration_date
                FROM users
                UNION ALL
                SELECT patron_id AS user_id,
                    first_name || ' ' || last_name AS full_name,
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
                        role,
                        status,
                        created_at,
                        NULL AS expiration_date
                FROM users)
                UNION ALL
                (SELECT patron_id AS user_id,
                        CONCAT(first_name, ' ', last_name) AS full_name,
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
