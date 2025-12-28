<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasFactory;

    protected $table = 'attendance';

    protected $fillable = [
        'patron_id',
        'first_name',
        'middle_name',
        'last_name',
        'suffix',
        'province',
        'city',
        'barangay',
        'number',
        'email',
        'affiliation',
        'purpose_of_visit',
        'time_in',
        'time_out',
    ];

    protected $casts = [
        'time_in' => 'datetime',
        'time_out' => 'datetime',
    ];

    public function patron()
    {
        return $this->belongsTo(Patron::class, 'patron_id');
    }
}
