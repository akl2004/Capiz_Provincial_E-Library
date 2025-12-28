<?php

namespace Database\Seeders;

use App\Models\MaterialType;
use Illuminate\Database\Seeder;

class MaterialTypeSeeder extends Seeder {
    public function run(): void {
        $types = [
            ['name' => 'Book'],
            ['name' => 'Magazine'],
            ['name' => 'Journal'],
            ['name' => 'Thesis'],
            ['name' => 'Newspaper'],
            ['name' => 'Audio-Visual'],
            ['name' => 'E-Resource'],
            ['name' => 'Manuscript'],
            ['name' => 'Map'],
            ['name' => 'Microform'],
            ['name' => 'Other']
        ];

        foreach ($types as $type) {
            MaterialType::create($type);
        }
    }
}

