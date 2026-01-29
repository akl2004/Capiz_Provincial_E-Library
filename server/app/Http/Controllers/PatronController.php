<?php

namespace App\Http\Controllers;

use App\Models\LibrarySetting;
use App\Models\Patron;
use App\Models\ActivityLog;
use App\Models\Circulation;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PatronController extends Controller
{
    public function index()
    {
        return response()->json(Patron::all());
    }

    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'patron_id'   => 'nullable|string|unique:patrons,patron_id',
            'first_name'  => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name'   => 'required|string|max:255',
            'suffix'      => 'nullable|string|max:50',
            'email'       => 'required|email|unique:patrons,email',
            'barangay'    => 'nullable|string|max:255',
            'city'        => 'required|string|max:255',
            'province'    => 'required|string|max:255',
            'number'      => 'nullable|string|max:20',
            'status'      => 'nullable|string|max:50',
            'age'         => 'nullable|integer|min:0',
            'gender'      => 'nullable|string|max:10',
            'notes'       => 'nullable|string',
        ]);

        if (empty($validated['patron_id'])) {
            $validated['patron_id'] = Patron::generateUniquePatronId();
        }

        $expirationYears = (int) LibrarySetting::getValue('patron_expiration_years', 3);
    
        if (empty($validated['patron_id'])) {
            $validated['patron_id'] = Patron::generateUniquePatronId();
        }

        // Add registered_by
        $validated['registered_by'] = $user->first_name . ' ' . $user->last_name; 

        $validated['expires_at'] = now()->addYears($expirationYears);

        $patron = Patron::create($validated);

        // Log activity using the authenticated user
        $this->logActivity('Add Patron', 'Added new patron: ' . $patron->first_name . ' ' . $patron->last_name, $user);

        return response()->json($patron, 201);
    }

    public function show($id)
    {
        return Patron::findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        $patron = Patron::findOrFail($id);

        $validated = $request->validate([
            'first_name'  => 'sometimes|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name'   => 'sometimes|string|max:255',
            'suffix'      => 'nullable|string|max:50',
            'email'       => 'sometimes|email|unique:patrons,email,' . $id,
            'barangay'    => 'nullable|string|max:255',
            'city'        => 'sometimes|string|max:255',
            'province'    => 'sometimes|string|max:255',
            'number'      => 'nullable|string|max:20',
            'status'      => 'nullable|string|max:50',
            'age'         => 'nullable|integer|min:0',
            'gender'      => 'nullable|string|max:10',
            'notes'       => 'nullable|string',
        ]);

        $patron->update($validated);

        // Log the activity
        $this->logActivity('Edit Patron', 'Updated patron: ' . $patron->first_name . ' ' . $patron->last_name, $user);

        return response()->json($patron);
    }

    public function renewPatron(Request $request, $id)
    {
        $patron = Patron::findOrFail($id);
        $years = (int) LibrarySetting::getValue('patron_expiration_years', 3);

        $newExpiry = now()->addYears($years);

        $patron->update([
            'expires_at' => $newExpiry,
            'status' => 'Active'
        ]);

        $this->logActivity(
            'Renew Patron', 
            "Renewed {$patron->first_name} until " . $newExpiry->format('Y-m-d'), 
            $request->user()
        );

        return response()->json(['message' => 'Renewed successfully', 'patron' => $patron->fresh()]);
    }

    public function destroy($id)
    {
        $patron = Patron::findOrFail($id);
        $patron->delete();

        return response()->json(['message' => 'Patron deleted']);
    }

    public function getByPatronId($patronId)
    {
        $patron = Patron::where('patron_id', $patronId)->first();

        if (!$patron) {
            return response()->json(['message' => 'Patron not found'], 404);
        }

        return response()->json($patron);
    }

    public function generatePatronId()
    {
        try {
            $patronId = Patron::generateUniquePatronId();
            return response()->json(['patron_id' => $patronId]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to generate unique Patron ID',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    public function stats($id)
    {
        $patron = Patron::findOrFail($id);

        $totalFine = $patron->circulations()
            ->where('is_paid', false) 
            ->sum('fine');

        return response()->json([
            'borrowedBooks' => $patron->circulations()->count(),
            'returnedBooks' => $patron->circulations()->whereIn('status', ['Returned', 'Returned Late'])->count(),
            'lostBooks'     => $patron->circulations()->where('status', 'Lost')->count(),
            'activeLoans'   => $patron->circulations()->whereIn('status', ['On Loan', 'Overdue'])->count(),
            'totalFine'     => (float) $totalFine,
            'overdueBooks'  => $patron->circulations()->where('status', 'Overdue')->count(),
        ]);
    }

    // deactivating a patron
    public function deactivate(Request $request, $id)
    {
        $user = $request->user();
        $patron = Patron::findOrFail($id);

        $patron->status = 'Deactivated';
        $patron->save();

        //  Log the activity
        $this->logActivity('Deactivate Patron', 'Deactivated patron: ' . $patron->first_name . ' ' . $patron->last_name, $user);
        
        return response()->json([
            'message' => 'Patron account deactivated successfully',
            'patron' => $patron
        ]);
    }

    // blocking a patron
    public function block(Request $request, $id)
    {
        $user = $request->user();
        $patron = Patron::findOrFail($id);

        // Update status to "Blocked"
        $patron->status = 'Blocked';
        $patron->save();

        //  Log the activity
        $this->logActivity(
            'Block Patron',
            'Blocked patron: ' . $patron->first_name . ' ' . $patron->last_name,
            $user
        );

        return response()->json([
            'message' => 'Patron account blocked successfully',
            'patron' => $patron
        ]);
    }

    // reactivate patron
    public function activate(Request $request, $id)
    {
        $user = $request->user();
        $patron = Patron::findOrFail($id);

        if ($patron->status === 'Active') {
            return response()->json(['message' => 'Patron is already active'], 400);
        }

        $patron->status = 'Active';
        $patron->save();

        // Log the activity
        $this->logActivity(
            'Activate Patron',
            'Activated patron: ' . $patron->first_name . ' ' . $patron->last_name,
            $user
        );

        return response()->json([
            'message' => 'Patron activated successfully',
            'patron' => $patron
        ]);
    }

    /** Helper function to record activity **/
    private function logActivity($action, $description = null, $user)
    {
        ActivityLog::create([
            'user_id' => $user->id,
            'role' => $user->role,
            'module' => 'Patron',
            'action' => $action,
            'description' => $description,
        ]);
    }

    public function updateEditableFields(Request $request, $id)
    {
        $user = $request->user();
        $patron = Patron::findOrFail($id);

        // Validate only editable fields
        $validated = $request->validate([
            'email'    => 'sometimes|email|unique:patrons,email,' . $id,
            'barangay' => 'nullable|string|max:255',
            'city'     => 'sometimes|string|max:255',
            'province' => 'sometimes|string|max:255',
            'age'      => 'nullable|integer|min:0',
            'number'   => 'nullable|string|max:20',
            'notes'    => 'nullable|string|max:500',
        ]);

        // Determine which fields are actually changing
        $updatedFields = [];
        foreach ($validated as $key => $newValue) {
            $oldValue = $patron->$key ?? '';
            if ((string)$oldValue !== (string)($newValue ?? '')) {
                $updatedFields[] = $key;
            }
        }

        // Update only if there are changes
        if (!empty($updatedFields)) {
            $patron->update(array_intersect_key($validated, array_flip($updatedFields)));

            // Build a simple log description
            $description = 'Updated ' . implode(', ', $updatedFields) . ' for ' . $patron->first_name . ' ' . $patron->last_name;
        } else {
            $description = 'No changes made for ' . $patron->first_name . ' ' . $patron->last_name;
        }

        $this->logActivity('Edit Patron (Limited Fields)', $description, $user);

        return response()->json([
            'message' => 'Patron information successfully updated.',
            'patron'  => $patron
        ]);
    }


    // paying overdue fines
    public function payFine(Request $request)
    {
        $user = $request->user();
        $request->validate([
            'patron_id' => 'required',
            'amount' => 'required|numeric'
        ]);

        $patron = Patron::where('patron_id', $request->patron_id)->first();
        if (!$patron) {
            return response()->json(['message' => 'Patron not found.'], 404);
        }

        // 1. Get the fine rate from settings
        $fineRate = (int) LibrarySetting::getValue('fine_per_day', 5);
        $now = now()->startOfDay();

        // 2. Find all active loans for this patron
        $loans = Circulation::where('patron_id', $patron->id)
            ->whereIn('status', ['On Loan', 'Overdue'])
            ->get();

        $paidCount = 0;

        foreach ($loans as $loan) {
            $dueDate = \Carbon\Carbon::parse($loan->due_date)->startOfDay();
            
            // Calculate what the fine SHOULD be right now
            $overdueDays = $this->calculateOverdueDays($loan->due_date, $now);
            $calculatedFine = $overdueDays * $fineRate;

            // If there's a fine to pay, clear it
            if ($calculatedFine > 0) {
            $loan->update([
                    'fine' => $calculatedFine,
                    'status' => 'On Loan',   
                    'is_paid' => true,          
                    'overdue_by' => $overdueDays,
                    'updated_at' => $now        
                ]);
                $paidCount++;
            }
        }

        if ($paidCount === 0) {
            return response()->json(['message' => 'No outstanding fines found.'], 404);
        }

        $this->logActivity('Pay Fine', "Collected ₱{$request->amount} from {$patron->first_name}", $user);

        return response()->json(['message' => 'Fine paid successfully'], 200);
    }



    private function calculateOverdueDays($dueDate, $comparisonDate)
    {
        $due = Carbon::parse($dueDate)->startOfDay();
        $comp = Carbon::parse($comparisonDate)->startOfDay();

        if ($comp->lte($due)) {
            return 0;
        }

        return $due->diffInDaysFiltered(function (Carbon $date) {
            return !$date->isWeekend();
        }, $comp);
    }



}
