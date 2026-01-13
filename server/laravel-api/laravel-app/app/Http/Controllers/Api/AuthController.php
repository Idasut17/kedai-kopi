<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController
{
    private function verifyPassword(string $plain, string $storedHash): bool
    {
        $storedHash = (string) $storedHash;
        if ($storedHash === '') {
            return false;
        }

        try {
            return Hash::check($plain, $storedHash);
        } catch (\RuntimeException $e) {
            // Some databases may contain bcrypt hashes created by other stacks (e.g. Node bcrypt: $2b$...)
            // which older PHP builds may not recognize via password_get_info(), causing Hash::check to throw.
            if (function_exists('password_verify')) {
                if (password_verify($plain, $storedHash)) {
                    return true;
                }

                if (str_starts_with($storedHash, '$2b$')) {
                    $as2y = '$2y$' . substr($storedHash, 4);
                    if (password_verify($plain, $as2y)) {
                        return true;
                    }
                }
            }

            return false;
        }
    }

    public function register(Request $request)
    {
        $username = (string) $request->input('username', '');
        $email = $request->input('email');
        $password = (string) $request->input('password', '');
        $role = $request->input('role');

        if ($username === '' || $password === '') {
            return response()->json(['error' => 'username & password required'], 400);
        }

        $exists = User::query()->where('username', $username)->exists();
        if ($exists) {
            return response()->json(['error' => 'username taken'], 409);
        }

        $roleVal = ($role === 'admin') ? 'admin' : 'member';
        if ($roleVal === 'admin') {
            $hasAdmin = User::query()->where('role', 'admin')->exists();
            if ($hasAdmin) {
                $actor = Auth::guard('sanctum')->user();
                if (! $actor || ($actor->role ?? null) !== 'admin') {
                    return response()->json(['error' => 'forbidden'], 403);
                }
            }
        }

        $user = new User();
        $user->id = (string) Str::uuid();
        $user->username = $username;
        $user->email = $email ?: null;
        $user->password_hash = Hash::make($password);
        $user->role = $roleVal;
        $user->status = 'active';
        $user->save();

        return response()->json([
            'id' => $user->id,
            'username' => $user->username,
            'role' => $user->role,
        ]);
    }

    public function login(Request $request)
    {
        $username = (string) $request->input('username', '');
        $password = (string) $request->input('password', '');

        $user = User::query()->where('username', $username)->first();
        if (! $user) {
            return response()->json(['error' => 'invalid_credentials'], 401);
        }

        if (($user->status ?? 'active') !== 'active') {
            return response()->json(['error' => 'invalid_credentials'], 401);
        }

        if (! $this->verifyPassword($password, (string) $user->password_hash)) {
            return response()->json(['error' => 'invalid_credentials'], 401);
        }

        // If the stored hash is from a different bcrypt variant, upgrade it to the current default.
        try {
            if (Hash::needsRehash((string) $user->password_hash)) {
                $user->password_hash = Hash::make($password);
                $user->save();
            }
        } catch (\Throwable $e) {
            // ignore rehash failures
        }

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'role' => $user->role,
            ],
        ]);
    }
}
