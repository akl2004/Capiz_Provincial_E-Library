<?php

namespace Database\Seeders;

use App\Models\Source;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SourceSeeder extends Seeder
{
    public function run(): void {
        $sources = [
            ['name' => 'Purchased'],
            ['name' => 'Donation'],
            ['name' => 'Exchange'],
            ['name' => 'Legal Deposit'],
            ['name' => 'Other']
        ];

        foreach ($sources as $source) {
            Source::create($source);
        }
    }
}
