<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class MakeAdmin extends Command
{
    protected $signature = 'app:make-admin {username : Username yang akan dijadikan admin}';

    protected $description = 'Promote user menjadi admin (role=admin)';

    public function handle(): int
    {
        $username = (string) $this->argument('username');

        $user = User::query()->where('username', $username)->first();
        if (! $user) {
            $this->error('User tidak ditemukan: '.$username);
            return self::FAILURE;
        }

        $user->role = 'admin';
        $user->save();

        $this->info('OK: '.$username.' sekarang admin');
        return self::SUCCESS;
    }
}
