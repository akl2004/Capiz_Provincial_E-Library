<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Attendance;
use App\Models\Patron;
use Carbon\Carbon;
use Faker\Factory as Faker;

class AttendanceSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create();
        $patrons = Patron::all();
        
        // Settings
        $monthsToSeed = 6;
        $startDate = Carbon::now()->subMonths($monthsToSeed);
        $endDate = Carbon::now();

        $purposes = ['Research', 'Borrowing Books', 'Study', 'Internet Usage', 'Printing'];
        $affiliations = ['Student', 'Professional', 'Unemployed', 'Senior Citizen'];

        $attendances = [];

        for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
            if ($date->isWeekend()) {
                continue;
            }

            // Random number of visitors per day
            $dailyCount = rand(5, 15);

            for ($i = 0; $i < $dailyCount; $i++) {
                $isGuest = rand(1, 100) <= 30; // 30% are guests
                
                // Set the Time In between 8 AM and 4 PM
                $timeIn = $date->copy()->setHour(rand(8, 16))->setMinute(rand(0, 59));
                // Set Time Out 1 to 4 hours after Time In
                $timeOut = $timeIn->copy()->addHours(rand(1, 4));

                if (!$isGuest && $patrons->isNotEmpty()) {
                    $patron = $patrons->random();

                    $attendances[] = [
                        'patron_id'        => $patron->id, // Assuming 'id' is the PK in your table
                        'first_name'       => $patron->first_name,
                        'middle_name'      => $patron->middle_name,
                        'last_name'        => $patron->last_name,
                        'suffix'           => null,
                        'gender'           => $patron->gender,
                        'province'         => $patron->province,
                        'city'             => $patron->city,
                        'barangay'         => $patron->barangay,
                        'number'           => $patron->number,
                        'email'            => $patron->email,
                        'visitor_type'     => 'Registered',
                        'affiliation'      => $faker->randomElement($affiliations),
                        'purpose_of_visit' => $faker->randomElement($purposes),
                        'time_in'          => $timeIn,
                        'time_out'         => $timeOut,
                        'created_at'       => $timeIn,
                        'updated_at'       => $timeIn,
                    ];
                } else {
                    // Generate random data for Guest
                    $attendances[] = [
                        'patron_id'        => null,
                        'first_name'       => $faker->firstName,
                        'middle_name'      => strtoupper($faker->lexify('?.')),
                        'last_name'        => $faker->lastName,
                        'suffix'           => $faker->randomElement([null, null, 'Jr.', 'III']),
                        'gender'           => $faker->randomElement(['Male', 'Female']),
                        'province'         => 'Capiz',
                        'city'             => $faker->randomElement(['Roxas City', 'Panay', 'Mambusao']),
                        'barangay'         => 'Poblacion',
                        'number'           => '09' . $faker->numerify('#########'),
                        'email'            => $faker->unique()->safeEmail,
                        'visitor_type'     => 'Guest',
                        'affiliation'      => $faker->randomElement($affiliations),
                        'purpose_of_visit' => $faker->randomElement($purposes),
                        'time_in'          => $timeIn,
                        'time_out'         => $timeOut,
                        'created_at'       => $timeIn,
                        'updated_at'       => $timeIn,
                    ];
                }

                // Batch insert to prevent memory issues
                if (count($attendances) >= 50) {
                    Attendance::insert($attendances);
                    $attendances = [];
                }
            }
        }

        // Final insert
        if (!empty($attendances)) {
            Attendance::insert($attendances);
        }
    }
}