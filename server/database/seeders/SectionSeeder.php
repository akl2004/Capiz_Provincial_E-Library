<?php

namespace Database\Seeders;

use App\Models\Section;
use Illuminate\Database\Seeder;

class SectionSeeder extends Seeder {
    public function run(): void {
        $sections = [
            ['name' => 'Filipiniana', 'code' => 'FIL'],
            ['name' => 'Gen. Reference', 'code' => 'REF'],
            ['name' => 'Gen. Circulation', 'code' => 'GC']
        ];

        foreach ($sections as $section) {
            Section::create($section);
        }
    }
}