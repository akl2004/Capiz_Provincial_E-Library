<?php

namespace Database\Seeders;

// use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            SectionSeeder::class,
            MaterialTypeSeeder::class,
            ConditionSeeder::class,
            SourceSeeder::class,
            BookSeeder::class,
            PatronSeeder::class,
            AttendanceSeeder::class,
            AdminUserSeeder::class,
            LibrarySettingsSeeder::class,
            CirculationSeeder::class,
        ]);
    }
}
