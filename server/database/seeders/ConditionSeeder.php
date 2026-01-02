<?php

namespace Database\Seeders;

use App\Models\Condition;
use Illuminate\Database\Seeder;

class ConditionSeeder extends Seeder {
    public function run(): void {
        $condition = [
            ['name' => 'New'],
            ['name' => 'Fine'],
            ['name' => 'Damaged'],
        ];

        foreach ($condition as $condition) {
            Condition::create($condition);
        }
    }
}
