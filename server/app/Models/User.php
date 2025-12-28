<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'first_name',
        'middle_name',
        'last_name',
        'suffix',
        'phone_number',
        'name',        // optional full name field
        'email',
        'password',
        'role',
        'registered_by',
        'status',
        'authToken', // optional: for compatibility
    ];

    protected $hidden = [
        'password', 
        'remember_token',
        'authToken', 
    ];

    // Hash password automatically
    public function setPasswordAttribute($password)
    {
        $this->attributes['password'] = bcrypt($password);
    }

    // Expose full name as "name" in JSON
    protected $appends = ['name'];


    // Optional: Accessor for full name
    public function getFullNameAttribute()
    {
        return trim(
            $this->first_name . ' ' .
            ($this->middle_name ? $this->middle_name . ' ' : '') .
            $this->last_name .
            ($this->suffix ? ', ' . $this->suffix : '')
        );
    }

     public function getNameAttribute()
    {
        return $this->full_name;
    }
}
