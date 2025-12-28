<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ActivityLogController extends Controller
{
    // Get all activity logs
    public function index()
    {
        return response()->json(
            ActivityLog::with('user:id,name')
                ->orderByDesc('created_at')
                ->get()
        );
    }

    // Get logs for a specific user
    public function getUserLogs($id)
    {
        $logs = ActivityLog::where('user_id', $id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json($logs);
    }

    // Store a new log
    public function store(Request $request)
    {
        $validated = $request->validate([
            'role' => 'required|string',
            'module' => 'required|string',
            'action' => 'required|string',
            'description' => 'nullable|string',
        ]);

        $log = ActivityLog::create([
            'user_id' => Auth::id(),
            'role' => $validated['role'],
            'module' => $validated['module'],
            'action' => $validated['action'],
            'description' => $validated['description'] ?? '',
        ]);

        return response()->json($log, 201);
    }
}
