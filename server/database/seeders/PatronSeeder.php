<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Patron;
use Illuminate\Support\Facades\DB;

class PatronSeeder extends Seeder
{
    public function run(): void
    {
        $patrons = [
            [
                'patron_id'    => 'P001',
                'first_name'   => 'Juan',
                'middle_name'  => 'S.',
                'last_name'    => 'Dela Cruz',
                'email'        => 'juan@example.com',
                'city'         => 'Mambusao',
                'province'     => 'Capiz',
                'barangay'     => 'Poblacion Proper',
                'number'       => '09171234567',
                'registered_by'=> 'Admin User',
            ],
            [
                'patron_id'    => 'P002',
                'first_name'   => 'Maria',
                'middle_name'  => 'L.',
                'last_name'    => 'Santos',
                'email'        => 'maria@example.com',
                'city'         => 'Roxas City',
                'province'     => 'Capiz',
                'barangay'     => 'Lawa-an',
                'number'       => '09987654321',
                'registered_by'=> 'Admin User',
            ],
        ];

        foreach ($patrons as $patron) {
            Patron::create(array_merge($patron, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }
}
