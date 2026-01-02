<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class BookCopy extends Model
{
    use SoftDeletes;
    use HasFactory;

    protected $fillable = [
        'book_id',
        'binding',
        'accession_number',
        'barcode',
        'copy_number',
        'material_type_id',
        'cataloging_note',
        'internal_note',
        'source',
        'price',
        'condition',
        'source_person',
        'location_of_book',
        'status',
        'date_added',
    ];

    protected $casts = [
        'date_added' => 'date',
    ];

    /**
     * A copy belongs to one book (bibliographic record).
     */
    public function book()
    {
        return $this->belongsTo(Book::class);
    }

    public function materialType()
    {
        return $this->belongsTo(MaterialType::class, 'material_type_id');
    }

    public function circulations()
    {
        return $this->hasMany(Circulation::class);
    }

}
