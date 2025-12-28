<?php

namespace App\Http\Controllers;

use App\Models\Condition;
use App\Models\Section;
use App\Models\Source;
use App\Models\MaterialType;

class DropdownController extends Controller
{
    public function index() {
        return response()->json([
            'sections' => Section::where('is_active', true)->pluck('name'),
            'sources' => Source::where('is_active', true)->pluck('name'),
            'materialTypes' => MaterialType::where('is_active', true)->pluck('name'),
            'conditions' => Condition::where('is_active', true)->pluck('name'),
        ]);
    }
}