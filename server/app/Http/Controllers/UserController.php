<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\Patron;
use Carbon\Carbon;

class UserController extends Controller
{
    // List all staff and admin
    public function index()
    {
        $users = User::whereIn('role', ['staff', 'admin'])
            ->select(
                'id', 'first_name', 'middle_name', 'last_name', 'suffix',
                'email', 'role', 'status', 'created_at', 'last_login_at'
            )
            ->get();

        return response()->json($users);
    }

    // Add new staff or admin
    public function store(Request $request)
    {
        $actor = $request->user();

        $request->validate([
            'first_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'required|string|max:255',
            'suffix' => 'nullable|string|max:50',
            'phone_number' => 'nullable|string|max:20',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'role' => 'required|in:staff,admin',
        ]);

        $target = User::create([
            'first_name' => $request->first_name,
            'middle_name' => $request->middle_name,
            'last_name' => $request->last_name,
            'suffix' => $request->suffix,
            'phone_number' => $request->phone_number,
            'email' => $request->email,
            'password' => $request->password,
            'role' => $request->role,
            'status' => $request->status ?? 'Active',
            'registered_by' => $actor->first_name . ' ' . $actor->last_name,
        ]);

        $this->logActivity('Add User', 'Added new user: ' . $target->first_name . ' ' . $target->last_name, $actor);

        return response()->json($target, 201);
    }

    // Edit staff or admin
    public function update(Request $request, $id)
    {
        $actor = $request->user();
        $target = User::findOrFail($id);

        $request->validate([
            'first_name' => 'sometimes|required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'suffix' => 'nullable|string|max:50',
            'phone_number' => 'nullable|string|max:20',
            'email' => 'sometimes|required|email|unique:users,email,' . $target->id,
            'role' => 'sometimes|required|in:staff,admin',
        ]);

        $target->update($request->only([
            'first_name',
            'middle_name',
            'last_name',
            'suffix',
            'phone_number',
            'email',
            'role',
        ]));

        $this->logActivity('Edit User', 'Updated user: ' . $target->first_name . ' ' . $target->last_name, $actor);

        return response()->json($target);
    }

    // Reset password
    public function resetPassword(Request $request, $id)
    {
        $actor = $request->user();
        $target = User::findOrFail($id);

        $request->validate([
            'password' => 'required|min:6',
        ]);

        $target->password = $request->password;
        $target->save();

        $this->logActivity('Reset Password', 'Reset password for: ' . $target->first_name . ' ' . $target->last_name, $actor);

        return response()->json(['message' => 'Password reset successfully']);
    }

    // Validate password
    public function validatePassword(Request $request, $id)
    {
        $request->validate([
            'current_password' => 'required',
        ]);

        $target = User::findOrFail($id);

        if (!Hash::check($request->current_password, $target->password)) {
            return response()->json(['message' => 'Incorrect password'], 422);
        }

        return response()->json(['message' => 'Password is correct']);
    }

    // Show single staff or admin
    public function show($id)
    {
        $target = User::whereIn('role', ['staff', 'admin'])->findOrFail($id);
        return response()->json($target);
    }

    // Get user counts
    public function getUserCounts()
    {
        $startOfWeek = Carbon::now()->startOfWeek();

        $totalPatrons = Patron::count(); 
        $totalStaff = User::where('role', 'staff')->count();
        $totalAdmins = User::where('role', 'admin')->count();
        $newAccountsThisWeek = User::where('created_at', '>=', $startOfWeek)->count()
            + Patron::where('created_at', '>=', $startOfWeek)->count();

        return response()->json([
            'total_patrons' => $totalPatrons,
            'total_staff' => $totalStaff,
            'total_admins' => $totalAdmins,
            'new_accounts_this_week' => $newAccountsThisWeek,
        ]);
    }

    // Deactivate a user
    public function deactivate(Request $request, $id)
    {
        $actor = $request->user();
        $target = User::findOrFail($id);

        if ($target->status === 'Deactivated') {
            return response()->json(['message' => 'User is already Deactivated'], 400);
        }

        $target->status = 'Deactivated';
        $target->save();

        $this->logActivity('Deactivate User', 'Deactivated user: ' . $target->first_name . ' ' . $target->last_name, $actor);

        return response()->json(['message' => 'User deactivated successfully']);
    }

    // Activate a user
    public function activate(Request $request, $id)
    {
        $actor = $request->user();
        $target = User::findOrFail($id);

        if ($target->status === 'Active') {
            return response()->json(['message' => 'User is already active'], 400);
        }

        $target->status = 'Active';
        $target->save();

        $this->logActivity('Activate User', 'Activated user: ' . $target->first_name . ' ' . $target->last_name, $actor);

        return response()->json(['message' => 'User activated successfully']);
    }

    // Promote staff to admin
    public function promote(Request $request, $id)
    {
        $actor = $request->user(); 
        $target = User::findOrFail($id);

        if ($target->role === 'admin') {
            return response()->json(['message' => 'User is already an admin'], 400);
        }

        $target->role = 'admin';
        $target->save();

        // 🧾 Log the activity
        $this->logActivity(
            'Promote User', 
            $actor->first_name . ' ' . $actor->last_name . ' promoted ' . $target->first_name . ' ' . $target->last_name . ' to admin',
            $actor
        );

        return response()->json(['message' => 'Staff promoted to admin successfully', 'user' => $target]);
    }


    /** 🧾 Helper function to record activity **/
    private function logActivity($action, $description = null, $actor)
    {
        ActivityLog::create([
            'user_id' => $actor->id,
            'role' => $actor->role,
            'module' => 'User Management',
            'action' => $action,
            'description' => $description,
        ]);
    }
}
