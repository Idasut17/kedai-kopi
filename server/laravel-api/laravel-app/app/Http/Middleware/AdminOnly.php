<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class AdminOnly
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        if (! $user || ($user->role ?? null) !== 'admin') {
            return response()->json(['error' => 'forbidden'], 403);
        }

        return $next($request);
    }
}
