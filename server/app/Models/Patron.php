<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class Patron extends Model
{
    use HasFactory;

    protected $fillable = [
        'patron_id',
        'first_name',
        'middle_name',
        'last_name',
        'suffix',
        'email',
        'barangay',
        'city',
        'province',
        'number',
        'status',
        'age',
        'gender',
        'registered_by',
        'notes',
        'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'date', 
    ];

    protected $appends = ['expiry_date', 'full_name'];


    public static function generateUniquePatronId()
    {
        do {
            // Example: P00001, P00002...
            $patronId = 'P' . str_pad(rand(1, 99999), 5, '0', STR_PAD_LEFT);
        } while (self::where('patron_id', $patronId)->exists());

        return $patronId;
    }

    // Accessor for full name
    public function getFullNameAttribute()
    {
        return trim("{$this->first_name} {$this->middle_name} {$this->last_name} {$this->suffix}");
    }


    // Expiry date is dynamically computed
    public function getExpiryDateAttribute()
    {
        return $this->expires_at ? $this->expires_at->toDateString() : null;
    }


    // Relation: Patron has many circulations
    public function circulations()
    {
        return $this->hasMany(Circulation::class);
    }

    public function borrowedBooks()
    {
        return $this->circulations()->count();
    }

    public function returnedBooks()
    {
        return $this->circulations()->where('status', 'returned')->count();
    }

    public function totalFine()
    {
        return $this->circulations()->sum('fine'); // assuming 'fine' is a column in circulations
    }
}
