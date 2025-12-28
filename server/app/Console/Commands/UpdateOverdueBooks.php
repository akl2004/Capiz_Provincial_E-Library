<?php

namespace App\Console\Commands;

use App\Models\Circulation;
use App\Models\LibrarySetting;
use Carbon\Carbon;
use Illuminate\Console\Command;

class UpdateOverdueBooks extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:update-overdue-books';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Command description';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $fineRate = (int) LibrarySetting::getValue('fine_per_day', 5);
        $today = now()->startOfDay();

        // Find all borrowed books that passed their due date
        $overdueRecords = Circulation::where('status', 'Borrowed')
            ->where('due_date', '<', $today)
            ->get();

        foreach ($overdueRecords as $record) {
            $daysLate = Carbon::parse($record->due_date)->diffInDays($today);
            
            $record->update([
                'status' => 'Overdue',
                'overdue_by' => $daysLate,
                'fine' => $daysLate * $fineRate
            ]);
        }

        $this->info('Overdue books updated successfully!');
    }
}
