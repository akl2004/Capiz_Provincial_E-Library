<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class LibrarySettingsSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        // Define all default settings
        $settings = [
            ['key' => 'default_loan_days', 'value' => '5'],
            ['key' => 'max_items_per_transaction', 'value' => '3'],
            ['key' => 'borrow_limit_per_person', 'value' => '10'],
            ['key' => 'renewal_limit', 'value' => '2'],
            ['key' => 'fine_per_day', 'value' => '5'],
            ['key' => 'suspension_overdue_count', 'value' => '3'],
            ['key' => 'suspension_fine_amount', 'value' => '100'],
            ['key' => 'patron_expiration_years', 'value' => '3'],
            ['key' => 'lost_book_processing_fee', 'value' => '50'],
        ];

        foreach ($settings as $setting) {
            DB::table('library_settings')->updateOrInsert(
                ['key' => $setting['key']],
                [
                    'value' => $setting['value'],
                    'updated_at' => $now,
                    'created_at' => $now,
                ]
            );
        }
    }
}
