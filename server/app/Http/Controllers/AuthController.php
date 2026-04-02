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
        ]);

        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        // This "Type Hint" tells the IDE exactly what $user is
        /** @var \App\Models\User $user */
        $user = Auth::user(); 

        // Now 'save()' and 'createToken()' will be recognized
        $timezone = LibrarySetting::getValue('default_timezone', 'Asia/Manila');
        $user->last_login_at = now($timezone);
        $user->save();

        if ($user->status === 'Deactivated') {
            return response()->json(['message' => 'Your account is Deactivated'], 403);
        }

        $token = $user->createToken('authToken')->plainTextToken;

        LoginLog::create([
            'user_id' => $user->id,
            'logged_in_at' => now($timezone),
            'ip_address' => $request->ip(),
        ]);

        return response()->json([
            'message' => 'Login successful',
            'token' => $token,
            'role' => $user->role, 
            'name' => $user->name, // Using your model's 'name' attribute
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
        $user = $request->user();

        $avatarUrl = null;
        if ($user->profile_image) {
            // 2. Generate the full network URL (e.g., http://192.168.1.5/storage/profile_images/xyz.jpg)
            $avatarUrl = asset('storage/' . $user->profile_image);
        }

        return response()->json([
            'id' => $user->id,
            'first_name' => $user->first_name,
            'middle_name' => $user->middle_name,
            'last_name' => $user->last_name,
            'suffix' => $user->suffix,
            'name' => $user->first_name . ' ' . $user->last_name,
            'email' => $user->email,
            'role' => $user->role,
            'status' => $user->status,
            'avatar' => $avatarUrl,
        ]);
    }
}