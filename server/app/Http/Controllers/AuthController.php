<?php

namespace App\Http\Controllers;

use App\Models\LibrarySetting;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\LoginLog;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(Request $request)
{
    $request->validate([
        'email' => 'required|email',
        'password' => 'required',
        'role' => 'required|string|in:admin,staff,guest',
    ]);

    if (!Auth::attempt($request->only('email', 'password'))) {
        return response()->json(['message' => 'Invalid credentials'], 401);
    }

    $user = User::find(Auth::id());

    // Update last_login_at in users table
    $timezone = LibrarySetting::getValue('default_timezone', 'Asia/Manila');
    $user->last_login_at = now($timezone);
    $user->save();


    // ✅ Check role matches the selected role
    if (strtolower($user->role) !== strtolower($request->role)) {
        return response()->json(['message' => 'Unauthorized role'], 403);
    }


    // Only allow active or onleave staff/admin
    if ($user->status === 'Deactivated') {
        return response()->json(['message' => 'Your account is Deactivated'], 403);
    }

    // Create token
    $token = $user->createToken('authToken')->plainTextToken;

    // Log login
    LoginLog::create([
        'user_id' => $user->id,
        'logged_in_at' => now(),
        'ip_address' => $request->ip(),
    ]);

    return response()->json([
        'message' => 'Login successful',
        'token' => $token,
        'role' => $user->role,
        'name' => $user->first_name . ' ' . $user->last_name,
        'status' => $user->status,
    ], 200);
}


    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }
    
    public function user(Request $request)
{
    $user = $request->user(); // gets the currently authenticated user

    return response()->json([
        'id' => $user->id,
        'first_name' => $user->first_name,
        'middle_name' => $user->middle_name,
        'last_name' => $user->last_name,
        'suffix' => $user->suffix,
        'name' => $user->name,
        'email' => $user->email,
        'role' => $user->role,
        'status' => $user->status,
        'avatar' => './src/assets/lib-logo.png', // placeholder
    ]);
}
}
