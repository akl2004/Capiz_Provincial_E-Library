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
        Schema::create('attendance', function (Blueprint $table) {
            $table->id();
            
            // Optional if patron is registered
            $table->unsignedBigInteger('patron_id')->nullable();

            // Full name fields
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('last_name');
            $table->string('suffix')->nullable();

            // Address fields
            $table->string('province');
            $table->string('city');
            $table->string('barangay');

            // Contact / info
            $table->string('email')->nullable();
            $table->string('number')->nullable();
            $table->string('affiliation')->nullable();

            // Attendance details
            $table->string('purpose_of_visit');
            $table->timestamp('time_in')->nullable();
            $table->timestamp('time_out')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance');
    }
};
