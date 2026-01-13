<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $defaults = [
            [
                'username' => 'admin',
                'email' => 'admin@example.com',
                'password' => 'admin12345',
                'role' => 'admin',
            ],
            [
                'username' => 'member1',
                'email' => 'member1@example.com',
                'password' => 'member12345',
                'role' => 'member',
            ],
            [
                'username' => 'member2',
                'email' => 'member2@example.com',
                'password' => 'member12345',
                'role' => 'member',
            ],
        ];

        foreach ($defaults as $u) {
            $user = User::query()->where('username', $u['username'])->first();

            if (! $user) {
                User::query()->create([
                    'id' => (string) Str::uuid(),
                    'username' => $u['username'],
                    'email' => $u['email'],
                    'password_hash' => Hash::make($u['password']),
                    'role' => $u['role'],
                    'status' => 'active',
                ]);
                continue;
            }

            $updates = [
                'email' => $u['email'],
                'password_hash' => Hash::make($u['password']),
                'role' => $u['role'],
                'status' => 'active',
            ];

            $user->fill($updates);
            $user->save();
        }
    }
}
