<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SettingsController
{
    public function show(string $key)
    {
        $row = DB::table('settings')->select(['key', 'value'])->where('key', $key)->first();
        if (! $row) {
            return response()->json(['error' => 'not_found'], 404);
        }

        $parsed = $this->decode($row->value);

        return response()->json(['key' => $row->key, 'value' => $parsed]);
    }

    public function upsert(Request $request, string $key)
    {
        $value = $request->input('value');

        DB::statement(
            'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)',
            [$key, json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]
        );

        $row = DB::table('settings')->select(['key', 'value'])->where('key', $key)->first();
        $parsed = $row ? $this->decode($row->value) : $value;

        return response()->json(['key' => $key, 'value' => $parsed]);
    }

    private function decode($raw)
    {
        if ($raw === null) {
            return null;
        }

        if (is_array($raw) || is_object($raw)) {
            return $raw;
        }

        $decoded = json_decode((string) $raw, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $decoded;
        }

        return $raw;
    }
}
