<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('circulations', function (Blueprint $table) {
            $table->id();

            // Relations
            $table->foreignId('book_copy_id')->constrained('book_copies')->onDelete('cascade');
            $table->foreignId('patron_id')->constrained('patrons')->onDelete('cascade'); 

            // Circulation details
            $table->date('issue_date');
            $table->date('due_date');
            $table->date('renewal_date')->nullable();
            $table->unsignedInteger('renewal_count')->default(0);
            $table->integer('overdue_by')->default(0);
            $table->decimal('fine', 10, 2)->default(0.00);
            $table->boolean('is_paid')->default(false);
            $table->date('date_returned')->nullable();

            // Track how the 'Lost' status is handled
            $table->enum('lost_resolution', ['Pending', 'Paid', 'Replaced', 'None'])->default('None');

            $table->enum('status', [
                'On Loan', 
                'Returned', 
                'Returned Late', 
                'Renewed', 
                'Lost', 
                'Overdue'
            ])->default('On Loan');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('circulations');
    }
};
