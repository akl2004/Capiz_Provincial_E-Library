<?php

namespace Database\Seeders;

use App\Models\Circulation;
use App\Models\Patron;
use App\Models\BookCopy;
use App\Models\LibrarySetting;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class CirculationSeeder extends Seeder
{
    public function run()
    {
        // 1. Get Dynamic Settings
        $fineRate = (int) LibrarySetting::getValue('fine_per_day', 5);
        $processingFee = (float) LibrarySetting::getValue('lost_book_processing_fee', 50);
        $loanDays = (int) LibrarySetting::getValue('default_loan_days', 5);
        $missingThreshold = (int) LibrarySetting::getValue('missing_book_threshold_days', 365);
        
        // 2. Prerequisites
        $patron = Patron::first() ?? Patron::factory()->create();
        $staff = User::first() ?? User::factory()->create();

        // --- SECTION 1: OVERDUE RECORD ---
        $overdueCopy = BookCopy::where('status', 'Available')->first() ?? BookCopy::factory()->create();
        $overdueCopy->update(['status' => 'On Loan']);
        $issueDate1 = now()->subDays(15);
        $dueDate1 = $issueDate1->copy()->addWeekdays($loanDays);
        $overdueDays1 = $this->calculateOverdueDays($dueDate1, now());
        
        Circulation::create([
            'book_copy_id' => $overdueCopy->id,
            'patron_id'    => $patron->id,
            'user_id'      => $staff->id,
            'issue_date'   => $issueDate1,
            'due_date'     => $dueDate1,
            'status'       => 'Overdue',
            'overdue_by'   => $overdueDays1,
            'fine'         => $overdueDays1 * $fineRate,
        ]);

        // --- SECTION 2: RETURNED LATE RECORD ---
        $historyCopy = BookCopy::where('status', 'Available')->first() ?? BookCopy::factory()->create();
        $issueDate2 = now()->subDays(25);
        $dueDate2 = $issueDate2->copy()->addWeekdays($loanDays);
        $returnDate = now()->subDays(10);
        $lateDays = $this->calculateOverdueDays($dueDate2, $returnDate);

        Circulation::create([
            'book_copy_id' => $historyCopy->id,
            'patron_id'    => $patron->id,
            'user_id'      => $staff->id,
            'issue_date'   => $issueDate2,
            'due_date'     => $dueDate2,
            'date_returned'=> $returnDate,
            'status'       => 'Returned Late',
            'overdue_by'   => $lateDays,
            'fine'         => $lateDays * $fineRate,
            'is_paid'      => true
        ]);

        // --- SECTION 3: LOST RECORD ---
        $lostCopy = BookCopy::where('status', 'Available')->first() ?? BookCopy::factory()->create();
        $lostCopy->update(['status' => 'Lost']);
        $issueDate3 = now()->subDays(30);
        $dueDate3 = $issueDate3->copy()->addWeekdays($loanDays);

        Circulation::create([
            'book_copy_id'    => $lostCopy->id,
            'patron_id'       => $patron->id,
            'user_id'         => $staff->id,
            'issue_date'      => $issueDate3,
            'due_date'        => $dueDate3,
            'status'          => 'Lost',
            'lost_resolution' => 'Replacement',
            'fine'            => (float)($lostCopy->price ?? 0) + $processingFee,
        ]);

        // --- SECTION 4: MISSING RECORD (Way past overdue) ---
        $missingCopy = BookCopy::where('status', 'Available')->first() ?? BookCopy::factory()->create();
        
        // We set the issue date way back (Threshold + 30 days)
        $issueDate4 = now()->subDays($missingThreshold + 30);
        $dueDate4 = $issueDate4->copy()->addWeekdays($loanDays);
        
        // According to your controller: fine = missingThreshold * fineRate
        Circulation::create([
            'book_copy_id' => $missingCopy->id,
            'patron_id'    => $patron->id,
            'user_id'      => $staff->id,
            'issue_date'   => $issueDate4,
            'due_date'     => $dueDate4,
            'status'       => 'Missing',
            'overdue_by'   => $this->calculateOverdueDays($dueDate4, now()),
            'fine'         => $missingThreshold * $fineRate, 
        ]);
        $missingCopy->update(['status' => 'Missing']);
    }

    private function calculateOverdueDays($dueDate, $comparisonDate)
    {
        $due = Carbon::parse($dueDate)->startOfDay();
        $comp = Carbon::parse($comparisonDate)->startOfDay();
        if ($comp->lte($due)) return 0;
        
        return $due->diffInDaysFiltered(fn(Carbon $date) => !$date->isWeekend(), $comp);
    }
}