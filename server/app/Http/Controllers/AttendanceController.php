<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AttendanceController extends Controller
{
    // Store new guest & mark Time In
    public function store(Request $request)
    {
        $validated = $request->validate([
            'patron_id' => 'nullable|exists:patrons,id',
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'suffix' => 'nullable|string|max:50',
            'province' => 'required|string|max:255',
            'city' => 'required|string|max:255',
            'barangay' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'number' => 'nullable|string|max:50',
            'visitor_type' => 'required|string|max:255',
            'affiliation' => 'nullable|string|max:255',
            'purpose_of_visit' => 'required|string|max:255',
        ]);

        $attendance = Attendance::create([
            ...$validated,
            'time_in' => Carbon::now(),
        ]);

        return response()->json($attendance, 201);
    }

    // Update guest Time Out
    public function timeOut($id)
    {
        $attendance = Attendance::findOrFail($id);

        if ($attendance->time_out) {
            return response()->json(['message' => 'Already timed out'], 400);
        }

        $attendance->update([
            'time_out' => Carbon::now(),
        ]);

        return response()->json($attendance);
    }

    // Attendance for today
    public function today()
    {
        return Attendance::with('patron')
        ->whereDate('time_in', today())
        ->get();
    }

    // List all attendance records
    public function index()
    {
        $attendances = Attendance::orderBy('created_at', 'desc')->get()->map(function ($log) {
            return [
                'id' => $log->id,
                'patron_id' => $log->patron_id,
                'first_name' => $log->first_name,
                'middle_name' => $log->middle_name,
                'last_name' => $log->last_name,
                'suffix' => $log->suffix,
                'email' => $log->email,
                'province' => $log->province,
                'city' => $log->city,
                'barangay' => $log->barangay,
                'number' => $log->number,
                'visitor_type' => $log->visitor_type,
                'affiliation' => $log->affiliation,
                'purpose_of_visit' => $log->purpose_of_visit,
                'time_in' => $log->time_in,
                'time_out' => $log->time_out,
                'type' => $log->patron_id ? 'patron' : 'guest',
            ];
        });

        return response()->json($attendances);
    }

    public function patronsThisWeek()
    {
        $startOfWeek = now()->startOfWeek(Carbon::MONDAY); // Monday as the start of the week
        $endOfWeek = now()->endOfWeek(Carbon::SUNDAY);     // Sunday as the end of the week

        $attendances = Attendance::with('patron')
            ->whereNotNull('patron_id') // exclude guests
            ->whereBetween('time_in', [$startOfWeek, $endOfWeek])
            ->get();

        return response()->json($attendances);
    }



    // Get all activity logs for a specific patron
    public function patronLogs($id)
    {
        $logs = Attendance::where('patron_id', $id)
            ->orderBy('time_in', 'desc')
            ->get();

        if ($logs->isEmpty()) {
            return response()->json(['message' => 'No activity logs found for this patron'], 404);
        }

        return response()->json($logs);
    }

    // Get today's tally with percentage change from yesterday
    public function todayTallyWithPercentage()
    {
        $today = Carbon::today();
        $yesterday = Carbon::yesterday();

        $todayCount = Attendance::whereDate('time_in', $today)->count();
        $yesterdayCount = Attendance::whereDate('time_in', $yesterday)->count();

        if ($yesterdayCount == 0 && $todayCount == 0) {
            $percent = 0;
        } elseif ($yesterdayCount == 0) {
            $percent = 100;
        } else {
            $percent = round((($todayCount - $yesterdayCount) / $yesterdayCount) * 100);
        }

        return response()->json([
            'attendanceToday' => $todayCount,
            'percent' => $percent,
        ]);
    }


    public function tallyCounts()
    {
        $today = Carbon::today();

        $visitorsToday = Attendance::whereDate('time_in', $today)->count();

        $currentVisitors = Attendance::whereNull('time_out')
            ->whereDate('time_in', $today)
            ->count();

        return response()->json([
            'visitors_today' => $visitorsToday,
            'current_visitors' => $currentVisitors,
        ]);
    }



}
