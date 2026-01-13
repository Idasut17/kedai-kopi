<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use App\Models\User;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('app:make-admin {username : Username yang akan dijadikan admin}', function () {
    $username = (string) $this->argument('username');

    $user = User::query()->where('username', $username)->first();
    if (! $user) {
        $this->error('User tidak ditemukan: '.$username);
        return 1;
    }

    $user->role = 'admin';
    $user->save();

    $this->info('OK: '.$username.' sekarang admin');
    return 0;
})->purpose('Promote user menjadi admin');
