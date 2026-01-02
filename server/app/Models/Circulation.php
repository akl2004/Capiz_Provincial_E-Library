<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

class Circulation extends Model
{
    use HasFactory;

    protected $fillable = [
        'book_copy_id',
        'patron_id',
        'user_id',
        'issue_date',
        'due_date',
        'renewal_date',
        'renewal_count',
        'overdue_by',
        'fine',
        'date_returned',
        'status',
        'lost_resolution',
        'is_paid',
    ];

    protected $casts = [
        'is_paid' => 'boolean',
    ];

    protected $dates = [
        'issue_date',
        'due_date',
        'renewal_date',
        'date_returned',
    ];

    // Relationships
    public function bookCopy()
    {
        return $this->belongsTo(BookCopy::class, 'book_copy_id')->withTrashed();
    }

    public function patron()
    {
        return $this->belongsTo(Patron::class);
    }

    public function user() {
        return $this->belongsTo(User::class, 'user_id');
    }

    // Helper: check if this circulation is overdue
    public function getIsOverdueAttribute(): bool
    {
        return $this->status === 'On Loan' && $this->due_date instanceof Carbon && $this->due_date->isPast();
    }
}
