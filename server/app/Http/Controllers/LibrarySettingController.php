<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\LibrarySetting;
use Illuminate\Http\Request;

class LibrarySettingController extends Controller
{
    // =======================
    // 📌 Borrowing Policy (Batch)
    // =======================
    public function getBorrowingPolicy()
    {
        return response()->json([
            'loan_days' => (int) LibrarySetting::getValue('default_loan_days', 5),
            'max_items' => (int) LibrarySetting::getValue('max_items_per_transaction', 3),
            'borrow_limit' => (int) LibrarySetting::getValue('borrow_limit_per_person', 5),
        ]);
    }

    public function updateBorrowingPolicy(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'loan_days' => 'required|integer|min:1|max:60',
            'max_items' => 'required|integer|min:1|max:20',
            'borrow_limit' => 'required|integer|min:1|max:50',
        ]);

        LibrarySetting::setValue('default_loan_days', $validated['loan_days']);
        LibrarySetting::setValue('max_items_per_transaction', $validated['max_items']);
        LibrarySetting::setValue('borrow_limit_per_person', $validated['borrow_limit']);

        ActivityLog::create([
            'user_id' => $user->id,
            'role' => $user->role,
            'module' => 'Settings',
            'action' => 'Update Borrowing Policy',
            'description' => "{$user->name} updated borrowing policy: loan_days={$validated['loan_days']}, max_items={$validated['max_items']}, borrow_limit={$validated['borrow_limit']}",
        ]);

        return response()->json([
            'message' => 'Borrowing policy updated successfully',
            'data' => $validated
        ]);
    }


    // =======================
    // 📌 Patron Expiration Years
    // =======================
    public function getExpirationYears()
    {
        $years = LibrarySetting::getValue('patron_expiration_years', 3); // default 3 years
        return response()->json(['expiration_years' => (int) $years]);
    }

    public function updateExpirationYears(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'expiration_years' => 'required|integer|min:1|max:10', // up to 10 years
        ]);

        LibrarySetting::setValue('patron_expiration_years', $validated['expiration_years']);

        ActivityLog::create([
            'user_id' => $user->id,
            'role' => $user->role,
            'module' => 'Settings',
            'action' => 'Update Patron Expiration',
            'description' => "{$user->name} updated expiration years to {$validated['expiration_years']}",
        ]);

        return response()->json([
            'message' => 'Patron expiration years updated successfully',
            'expiration_years' => (int) $validated['expiration_years']
        ]);
    }


    // =======================
    // 📌 Fine
    // =======================
    public function getFinePerDay()
    {
        $fine = LibrarySetting::getValue('fine_per_day', 5);
        return response()->json(['fine_per_day' => (int) $fine]);
    }

    public function updateFinePerDay(Request $request)
    {
        $user = $request->user();
        $validated = $request->validate([
            'fine_per_day' => 'required|integer|min:1|max:100',
        ]);

        LibrarySetting::setValue('fine_per_day', $validated['fine_per_day']);

        ActivityLog::create([
            'user_id' => $user->id,
            'role' => $user->role,
            'module' => 'Settings',
            'action' => 'Update Fine Per Day',
            'description' => "{$user->name} set fine per day to ₱{$validated['fine_per_day']}",
        ]);

        return response()->json([
            'message' => 'Fine per day updated successfully',
            'fine_per_day' => $validated['fine_per_day']
        ]);
    }


    // =======================
    // 📌 Renewal Limit
    // =======================
    public function getRenewalLimit()
    {
        $limit = LibrarySetting::getValue('renewal_limit', 2);
        return response()->json(['renewal_limit' => (int) $limit]);
    }

    public function updateRenewalLimit(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'renewal_limit' => 'required|integer|min:1|max:10',
        ]);

        LibrarySetting::setValue('renewal_limit', $validated['renewal_limit']);

        ActivityLog::create([
            'user_id' => $user->id,
            'role' => $user->role,
            'module' => 'Settings',
            'action' => 'Update Renewal Limit',
            'description' => "{$user->name} updated renewal limit to {$validated['renewal_limit']}",
        ]);

        return response()->json([
            'message' => 'Renewal limit updated successfully',
            'renewal_limit' => $validated['renewal_limit']
        ]);
    }


    // =======================
    // 📌 Timezone
    // =======================
    public function getTimezone()
    {
        $timezone = LibrarySetting::getValue('system_timezone', 'Asia/Manila');
        return response()->json(['timezone' => $timezone]);
    }

    public function updateTimezone(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'timezone' => 'required|string',
        ]);

        LibrarySetting::setValue('system_timezone', $validated['timezone']);

        ActivityLog::create([
            'user_id' => $user->id,
            'role' => $user->role,
            'module' => 'Settings',
            'action' => 'Update Timezone',
            'description' => "{$user->name} set system timezone to {$validated['timezone']}",
        ]);
        
        return response()->json([
            'message' => 'Timezone updated successfully',
            'timezone' => $validated['timezone']
        ]);
    }


    // =======================
    // 📌 Lost Book Processing Fee
    // =======================
    public function getLostBookProcessingFee()
    {
        $fee = LibrarySetting::getValue('lost_book_processing_fee', 50); // Default P50
        return response()->json(['lost_book_processing_fee' => (int) $fee]);
    }
    
    public function updateLostBookProcessingFee(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'lost_book_processing_fee' => 'required|integer|min:0|max:1000',
        ]);

        LibrarySetting::setValue('lost_book_processing_fee', $validated['lost_book_processing_fee']);

        ActivityLog::create([
            'user_id' => $user->id,
            'role'    => $user->role,
            'module'  => 'Settings',
            'action'  => 'Update Lost Book Fee',
            'description' => "{$user->name} updated lost book processing fee to ₱{$validated['lost_book_processing_fee']}",
        ]);

        return response()->json([
            'message' => 'Lost book processing fee updated successfully',
            'lost_book_processing_fee' => (int) $validated['lost_book_processing_fee']
        ]);
    }

}
