<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Patron;
use Carbon\Carbon;

class PatronSeeder extends Seeder
{
    public function run(): void
    {
        $yearsSetting = 3; // Standard duration
        $oldCreatedAt = Carbon::now()->subYears(1);

        $patrons = [
            // --- ACTIVE PATRONS ---
            [
                'patron_id'     => 'P001',
                'first_name'    => 'Juan',
                'middle_name'   => 'S.',
                'last_name'     => 'Dela Cruz',
                'email'         => 'juan@example.com',
                'city'          => 'Mambusao',
                'province'      => 'Capiz',
                'barangay'      => 'Poblacion Proper',
                'number'        => '09171234567',
                'gender'        => 'Male',
                'status'        => 'Active', 
                'registered_by' => 'Admin User',
                'expires_at'    => Carbon::now()->addYears($yearsSetting), // Expires in the future
                'created_at'    => $oldCreatedAt,
            ],
            [
                'patron_id'     => 'P002',
                'first_name'    => 'Maria',
                'middle_name'   => 'L.',
                'last_name'     => 'Santos',
                'email'         => 'maria@example.com',
                'city'          => 'Roxas City',
                'province'      => 'Capiz',
                'barangay'      => 'Lawa-an',
                'number'        => '09987654321',
                'gender'        => 'Female',
                'status'        => 'Active',
                'registered_by' => 'Admin User',
                'expires_at'    => Carbon::now()->addYears($yearsSetting), // Expires in the future
                'created_at'    => $oldCreatedAt,
            ],

            // --- EXPIRED PATRONS ---
            [
                'patron_id'     => 'P003',
                'first_name'    => 'Jose',
                'middle_name'   => 'P.',
                'last_name'     => 'Rizal',
                'email'         => 'jose@example.com',
                'city'          => 'Calamba',
                'province'      => 'Laguna',
                'barangay'      => 'District 1',
                'number'        => '09123456789',
                'gender'        => 'Male',
                'status'        => 'Expired', 
                'registered_by' => 'Admin User',
                'expires_at'    => Carbon::now()->subMonths(2), // Expired 2 months ago
                'created_at'    => Carbon::now()->subYears(4),
            ],
            [
                'patron_id'     => 'P004',
                'first_name'    => 'Elena',
                'middle_name'   => 'G.',
                'last_name'     => 'Gilbert',
                'email'         => 'elena@example.com',
                'city'          => 'Dumarao',
                'province'      => 'Capiz',
                'barangay'      => 'Dacuton',
                'number'        => '09112223334',
                'gender'        => 'Female',
                'status'        => 'Expired', 
                'registered_by' => 'Admin User',
                'expires_at'    => Carbon::now()->subDays(15), // Expired 15 days ago
                'created_at'    => Carbon::now()->subYears(3),
            ],
            [
                'patron_id'     => 'P005',
                'first_name'    => 'Clark',
                'middle_name'   => 'K.',
                'last_name'     => 'Kent',
                'email'         => 'clark@example.com',
                'city'          => 'Panay',
                'province'      => 'Capiz',
                'barangay'      => 'Bago Chiquito',
                'number'        => '09556667778',
                'gender'        => 'Male',
                'status'        => 'Expired',
                'registered_by' => 'Admin User',
                'expires_at'    => Carbon::now()->subDays(1), // Expired yesterday
                'created_at'    => Carbon::now()->subYears(3),
            ],

            // --- DEACTIVATED (PAUSED) PATRONS ---
            [
                'patron_id'     => 'P006',
                'first_name'    => 'Bruce',
                'middle_name'   => 'W.',
                'last_name'     => 'Wayne',
                'email'         => 'bruce@example.com',
                'city'          => 'Mambusao',
                'province'      => 'Capiz', // Just for fun
                'barangay'      => 'Manibad',
                'number'        => '09990001111',
                'gender'        => 'Male',
                'status'        => 'Deactivated', 
                'registered_by' => 'Admin User',
                'expires_at'    => null, 
                'seconds_remaining' => 31536000, 
                'created_at'    => Carbon::now()->subYears(2),
            ],
        ];

        foreach ($patrons as $data) {
            Patron::create($data);
        }
    }
}