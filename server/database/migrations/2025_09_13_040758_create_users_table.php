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
        Schema::create('users', function (Blueprint $table) {
            $table->id();

            // Name fields
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('last_name');
            $table->string('suffix')->nullable();

            // Contact & login
            $table->string('phone_number')->nullable();
            $table->string('email')->unique();
            $table->string('password');

            // Role and status
            $table->enum('role', ['staff', 'admin'])->default('staff');
            $table->string('status')->default('Active');

            // Last login timestamp
            $table->timestamp('last_login_at')->nullable();

            $table->string('registered_by')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
