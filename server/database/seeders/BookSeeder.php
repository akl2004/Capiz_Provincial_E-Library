<?php

namespace Database\Seeders;

use App\Models\Book;
use App\Models\BookCopy;
use App\Models\MaterialType;
use Illuminate\Database\Seeder;

class BookSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {

        $bookMaterialType = MaterialType::where('name', 'Book')->first();

        // Define section → abbreviation mapping
        $sectionMap = [
            'Filipiniana' => 'FIL',
            'General Collection' => 'GC',
            'General Reference' => 'REF',
        ];

        $section = 'Filipiniana'; // Example default section
        $sectionAbbr = $sectionMap[$section];

        // Build call number dynamically
        $dewey = '395.13';
        $authorNumber = 'A12';
        $copyright = '2020';

        $callNumber = $sectionAbbr . "\n" .
                      $dewey . "\n" .
                      ($authorNumber ?: '') . "\n" .
                      ($copyright ?: '');

        // Create a sample book
        $book = Book::create([
            'title' => 'Filipino Customs and Traditions',
            'author' => 'Juan Dela Cruz',
            'editor' => null,
            'other_author_editor' => null,
            'edition' => '1st',
            'series_name' => 'Library Innovation Series',
            'volume' => 'Vol. 1',
            'publisher' => 'National Publishing',
            'place_of_publication' => 'Manila',
            'copyright' => $copyright,
            'number_of_pages' => 250,
            'book_language' => 'ENG',
            'person_as_subject' => null,
            'topical_subject' => 'Culture, Filipino Customs',
            'geographical_subject' => 'Philippines',

            // Checklist
            'includes_index' => true,
            'includes_appendix' => false,
            'includes_glossary' => true,
            'includes_bibliographical_references' => true,

            // Identifiers
            'isbn_paperback' => '978-1234567890',
            'isbn_hardcover' => '978-0987654321',
            'issn' => null,

            // Call number breakdown
            'dewey_decimal' => $dewey,
            'author_number' => $authorNumber,
            'call_number' => $callNumber,
            'section' => $section,
        ]);

        // Define number of copies for this book
        $numCopies = 5;

        // Get last global accession number
        $lastCopy = BookCopy::orderBy('id', 'desc')->first();
        $startAccession = $lastCopy ? (int)$lastCopy->accession_number : 0;

        // Create copies
        for ($i = 1; $i <= $numCopies; $i++) {
            $copyNumber = $book->copies()->count() + 1;
            $accessionNumber = str_pad($startAccession + $i, 5, '0', STR_PAD_LEFT);
            $barcode = "BC" . random_int(1000000000, 9999999999);

            $condition = ($i === 1) ? 'Damaged' : 'Fine';
            
            $price = ($i === 1) ? 250.00 : 500.00;

            $book->copies()->create([
                'copy_number' => $copyNumber,
                'accession_number' => $accessionNumber,
                'barcode' => $barcode,
                'status' => 'Available',

                // Copy-specific fields
                'material_type_id' => $bookMaterialType->id,
                'condition' => $condition,
                'price' => $price,
                'cataloging_note' => 'Cataloged by FCU Library, August 28, 2025',
                'internal_note' => 'Donated by alumni association.',
                'source' => 'Donation',

                'binding' => ($i === 1) ? 'Hardcover' : 'Paperback',
                
                'source_person' => 'Alumni Association',
                'location_of_book' => 'Main Library Shelf A1',
            ]);
        }
    }
}
