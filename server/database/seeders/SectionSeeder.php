<?php

namespace Database\Seeders;

use App\Models\Section;
use Illuminate\Database\Seeder;

class SectionSeeder extends Seeder {
    public function run(): void {
        $sections = [
            ['name' => 'Filipiniana', 'code' => 'FIL'],
            ['name' => 'General Reference', 'code' => 'REF'],
            ['name' => 'General Collection', 'code' => 'GC']
        ];

        foreach ($sections as $section) {
            Section::create($section);
        }
    }
}