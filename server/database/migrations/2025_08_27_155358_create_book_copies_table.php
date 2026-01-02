<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('book_copies', function (Blueprint $table) {
            $table->id();

            // Link to book
            $table->foreignId('book_id')->constrained()->onDelete('cascade');

            $table->enum('binding', ['Paperback', 'Hardcover', 'Spiral', 'Other'])->default('Paperback');

            // Copy-specific info
            $table->string('accession_number')->unique();
            $table->string('barcode')->unique()->nullable();
            $table->integer('copy_number');

            $table->enum('condition', ['New', 'Fine', 'Damaged'])->default('New');

            // Accession / acquisition details
            $table->foreignId('material_type_id')->constrained('material_types')->onDelete('cascade');
            $table->text('cataloging_note')->nullable();
            $table->text('internal_note')->nullable();
            $table->enum('source', ['Purchased', 'Donation', 'Replaced', 'Exchange', 'Legal Deposit', 'Other']);
            $table->string('source_person')->nullable();
            $table->string('location_of_book')->nullable();

            // Circulation info
            $table->decimal('price', 8, 2)->nullable();
            $table->enum('status', ['Available', 'On Loan', 'Lost'])->default('Available');
            $table->dateTime('date_added')->useCurrent();

            $table->softDeletes();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('book_copies');
    }
};
