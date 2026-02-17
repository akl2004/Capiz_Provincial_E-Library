<?php

// use App\Http\Controllers\Api\AuthController;

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\AuthController;
use Illuminate\Http\Request;
use App\Http\Controllers\BookController;
use App\Http\Controllers\CirculationController;
use App\Http\Controllers\DropdownController;
use App\Http\Controllers\LibrarySettingController;
use App\Http\Controllers\PatronController;
use App\Http\Controllers\ReportsController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;


// Public routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');

// Fetch the logged-in user
Route::middleware('auth:sanctum')->get('/user', [AuthController::class, 'user']);

// Users routes (protected with sanctum)
Route::middleware('auth:sanctum')->prefix('users')->group(function () {
    Route::get('/', [UserController::class, 'index']);       // List all users
    Route::post('/', [UserController::class, 'store']);      // Add new user
    Route::put('/{id}', [UserController::class, 'update']); // Update user
    Route::get('/{id}', [UserController::class, 'show']);    // Get single user
    Route::post('/{id}/reset-password', [UserController::class, 'resetPassword']); // Reset password
    Route::post('/{id}/validate-password', [UserController::class, 'validatePassword']);  // validate password
    Route::patch('/{id}/deactivate', [UserController::class, 'deactivate']);
    Route::patch('/{id}/activate', [UserController::class, 'activate']);
    Route::put('/{id}/promote', [UserController::class, 'promote']); // promoting staff to admin
});

Route::get('/user-counts', [UserController::class, 'getUserCounts'])->middleware('auth:sanctum');

// Dropdown options
Route::get('/dropdown-options', [DropdownController::class, 'index']);

// Book routes
Route::get('/books', [BookController::class, 'index']);    //fetch all books
Route::get('/books/latest', [BookController::class, 'latest']);
Route::get('/books/search', [BookController::class, 'search']); //fetches searched books
Route::get('/books/{id}', [BookController::class, 'show']);  // fetch single book
Route::get('/books/copy/{barcode}', [BookController::class, 'getByBarcode']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/books', [BookController::class, 'store']);   // Add new book
    Route::post('/books/{id}/add-copy', [BookController::class, 'addCopy']); // Add book copy
    Route::get('/book-copies/latest-accession', [BookController::class, 'getLatestAccession']);
    Route::put('/books/{book}/copies/{id}', [BookController::class, 'updateCopy']);
});

// Patron routes
Route::middleware('auth:sanctum')->group(function () {
    
    Route::get('/patrons/generate-id', [PatronController::class, 'generatePatronId']);
    Route::get('/patrons/{id}/stats', [PatronController::class, 'stats']);
    Route::patch('/patrons/{id}/deactivate', [PatronController::class, 'deactivate']);
    Route::patch('/patrons/{id}/block', [PatronController::class, 'block']);
    Route::patch('/patrons/{id}/activate', [PatronController::class, 'activate']);
    
    Route::get('/patrons', [PatronController::class, 'index']);
    Route::post('/patrons', [PatronController::class, 'store']);
    Route::get('/patrons/{id}', [PatronController::class, 'show']);
    Route::put('/patrons/{id}', [PatronController::class, 'update']);
    Route::delete('/patrons/{id}', [PatronController::class, 'destroy']);
    Route::post('/patrons/{id}/renew', [PatronController::class, 'renewPatron']);
    Route::post('/patrons/pay-fine', [PatronController::class, 'payFine']);
    Route::get('/patrons/{id}/full-activity', [PatronController::class, 'getPatronFullActivity']);

    Route::put('/patrons/{id}/edit', [PatronController::class, 'updateEditableFields']);
});
    
    Route::get('/patrons/by-id/{patronId}', [PatronController::class, 'getByPatronId']);


// Circulation routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/circulations/borrow', [CirculationController::class, 'borrow']);
    Route::post('/circulations/return', [CirculationController::class, 'return']);
    Route::post('/circulations/mark-lost', [CirculationController::class, 'markAsLost']);
    Route::post('/circulations/renew', [CirculationController::class, 'renew']);
    Route::post('/circulations/book-copies/withdraw-bulk', [CirculationController::class, 'withdraw']);
    
    Route::get('/patrons/{id}/transactions', [CirculationController::class, 'patronTransactions']); // fetch patrons transaction
    Route::get('/circulations/today-tally', [CirculationController::class, 'todayTallyWithPercentage']);
    Route::get('/circulations', [CirculationController::class, 'index']);        // list all circulations
    Route::get('/copies/{copyId}/history', [CirculationController::class, 'copyHistory']); //fetches all transaction of a book
    Route::get('/circulation/top-books-week', [CirculationController::class, 'topBooksThisWeek']);
    
    Route::get('/circulations/borrowed-book/{barcode}', [CirculationController::class, 'getBorrowedBookByBarcode']);
    Route::get('/circulations/borrowing-policy', [CirculationController::class, 'getBorrowingPolicy']);
    Route::get('/circulations/active-loans/{patron_id}', [CirculationController::class, 'getActiveLoansByPatron']);

    Route::get('/circulations/pending-settlements', [CirculationController::class, 'getPendingSettlements']);
    Route::post('/circulations/resolve-lost/{id}', [CirculationController::class, 'resolveLostBook']);
});



// Attendance routes
Route::get('/attendances', [AttendanceController::class, 'index']);
Route::post('/attendances', [AttendanceController::class, 'store']);   // time in
Route::post('/attendances/{id}/timeout', [AttendanceController::class, 'timeOut']); // time out
Route::get('/attendances/today', [AttendanceController::class, 'today']); // daily attendance
Route::get('/attendances/patrons-this-week', [AttendanceController::class, 'patronsThisWeek']);  // for patron dashboard
Route::get('/attendances/today-tally', [AttendanceController::class, 'todayTallyWithPercentage']);  
Route::get('/attendance/tally', [AttendanceController::class, 'tallyCounts']);  // tally counts for the attendance

Route::get('/patrons/{id}/activity-logs', [AttendanceController::class, 'patronLogs']);


// Apply authentication middleware to all settings routes
Route::middleware('auth:sanctum')->group(function () {

    // Borrowing Policy (Batch)
    Route::get('/settings/borrowing-policy', [LibrarySettingController::class, 'getBorrowingPolicy']);
    Route::post('/settings/borrowing-policy', [LibrarySettingController::class, 'updateBorrowingPolicy']);

    // Expiration Years
    Route::get('/settings/expiration-years', [LibrarySettingController::class, 'getExpirationYears']);
    Route::post('/settings/expiration-years', [LibrarySettingController::class, 'updateExpirationYears']);

    // Fine Per Day
    Route::get('/settings/fine-per-day', [LibrarySettingController::class, 'getFinePerDay']);
    Route::post('/settings/fine-per-day', [LibrarySettingController::class, 'updateFinePerDay']);

    // Renewal Limit
    Route::get('/settings/renewal-limit', [LibrarySettingController::class, 'getRenewalLimit']);
    Route::post('/settings/renewal-limit', [LibrarySettingController::class, 'updateRenewalLimit']);

    // Timezone
    Route::get('/settings/timezone', [LibrarySettingController::class, 'getTimezone']);
    Route::post('/settings/timezone', [LibrarySettingController::class, 'updateTimezone']);

    // Lost Book Processing Fee
    Route::get('/settings/lost-fee', [LibrarySettingController::class, 'getLostBookProcessingFee']);
    Route::post('/settings/lost-fee', [LibrarySettingController::class, 'updateLostBookProcessingFee']);

    // Missing Book Threshold Days
    Route::get('/settings/missing-threshold', [LibrarySettingController::class, 'getMissingThreshold']);
    Route::post('/settings/missing-threshold', [LibrarySettingController::class, 'updateMissingThreshold']);

    // Lost Overdue Penalty
    Route::get('/settings/late-settlement-penalty', [LibrarySettingController::class, 'getLateSettlementPenalty']);
    Route::post('/settings/late-settlement-penalty', [LibrarySettingController::class, 'updateLateSettlementPenalty']);
    
    // Replacement Extension Policy Settings
    Route::get('/settings/replacement-policy', [LibrarySettingController::class, 'getReplacementExtensionPolicy']);
    Route::post('/settings/replacement-policy', [LibrarySettingController::class, 'updateReplacementExtensionPolicy']);
});


// Reports routes
Route::middleware('auth:sanctum')->group(function () {

    Route::get('/reports/collection', [ReportsController::class, 'collection']);
    Route::get('/reports/collection-masterlist', [ReportsController::class, 'collectionMasterlist']);
    Route::get('/reports/circulation', [ReportsController::class, 'circulation']);
    Route::get('/reports/attendance/summary', [ReportsController::class, 'attendanceSummary']);
    Route::get('/reports/attendance/log', [ReportsController::class, 'attendanceLog']);
    Route::get('/reports/accounts', [ReportsController::class, 'accounts']);
    Route::get('/reports/lost-books-details', [ReportsController::class, 'lostBooksDetail']);
});

//Activity Logs
Route::get('/activity-logs', [ActivityLogController::class, 'index']);
Route::get('/users/{id}/activity-logs', [ActivityLogController::class, 'getUserLogs']);
Route::post('/activity-logs', [ActivityLogController::class, 'store']);



