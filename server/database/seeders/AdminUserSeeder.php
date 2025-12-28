<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        // Admin user
        if (!User::where('email', 'admin@library.com')->exists()) {
            User::create([
                'first_name' => 'Admin',
                'middle_name' => '',
                'last_name' => 'User',
                'suffix' => '',
                'email' => 'admin@library.com',
                'password' => 'admin123',
                'role' => 'admin',
                'status' => 'Active',
            ]);
        }

        // Sample staff user
        if (!User::where('email', 'staff@library.com')->exists()) {
            User::create([
                'first_name' => 'John',
                'middle_name' => 'M.',
                'last_name' => 'Doe',
                'suffix' => 'Jr.',
                'email' => 'staff@library.com',
                'password' => 'staff123',
                'role' => 'staff',
                'status' => 'Active',
            ]);
        }
    }
}
