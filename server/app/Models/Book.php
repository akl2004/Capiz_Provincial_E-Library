<?php 

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Book extends Model
{
    use HasFactory;

    protected $fillable = [
        // Bibliographic fields only
        'title',
        'author',
        'editor',
        'other_author_editor',
        'edition',
        'series_name',
        'volume',
        'publisher',
        'place_of_publication',
        'copyright',
        'number_of_pages',
        'book_language',
        'person_as_subject',
        'includes_index',
        'includes_appendix',
        'includes_glossary',
        'includes_bibliographical_references',
        'isbn',
        'geographical_subject',
        'topical_subject',
        'section',
        'dewey_decimal',
        'author_number',
        'call_number',
        'cover_image',
    ];

    protected $casts = [
        'includes_index' => 'boolean',
        'includes_appendix' => 'boolean',
        'includes_glossary' => 'boolean',
        'includes_bibliographical_references' => 'boolean',
    ];

    /**
     * A book can have many physical copies (accessions).
     */
    public function copies()
    {
        return $this->hasMany(BookCopy::class);
    }
}
