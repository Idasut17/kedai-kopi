<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CartController
{
    public function show(Request $request)
    {
        try {
            $user = $request->user();
            $cartId = $this->ensureActiveCartId((string) $user->id);

            $items = $this->getCartItems($cartId);

            return response()->json(['id' => $cartId, 'items' => $items]);
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['error' => 'server_error'], 500);
        }
    }

    public function addItem(Request $request)
    {
        try {
            $productId = $request->input('product_id');
            $qtyRaw = $request->input('qty');

            if (! $productId || ! $qtyRaw) {
                return response()->json(['error' => 'product_id & qty required'], 400);
            }

            $qty = (int) $qtyRaw;
            if ($qty <= 0) {
                return response()->json(['error' => 'product_id & qty required'], 400);
            }

            $user = $request->user();

            $result = DB::transaction(function () use ($user, $productId, $qty) {
                $cartId = $this->ensureActiveCartId((string) $user->id);

                $price = DB::table('products')->where('id', $productId)->value('price');
                if ($price === null) {
                    return ['error' => 'product_not_found', 'status' => 404];
                }

                $existing = DB::table('cart_items')
                    ->where('cart_id', $cartId)
                    ->where('product_id', $productId)
                    ->first(['id']);

                if ($existing) {
                    DB::table('cart_items')->where('id', $existing->id)->update([
                        'qty' => DB::raw('qty + ' . (int) $qty),
                    ]);
                } else {
                    DB::table('cart_items')->insert([
                        'id' => (string) Str::uuid(),
                        'cart_id' => $cartId,
                        'product_id' => $productId,
                        'qty' => $qty,
                        'price_at' => (int) $price,
                        'created_at' => now(),
                    ]);
                }

                $items = $this->getCartItems($cartId);

                return ['status' => 201, 'payload' => ['id' => $cartId, 'items' => $items]];
            });

            if (($result['error'] ?? null) === 'product_not_found') {
                return response()->json(['error' => 'product_not_found'], 404);
            }

            return response()->json($result['payload'], (int) $result['status']);
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['error' => 'server_error'], 500);
        }
    }

    private function ensureActiveCartId(string $userId): string
    {
        $existing = DB::table('carts')
            ->where('user_id', $userId)
            ->where('status', 'active')
            ->first(['id']);

        if ($existing) {
            return (string) $existing->id;
        }

        $id = (string) Str::uuid();
        DB::table('carts')->insert([
            'id' => $id,
            'user_id' => $userId,
            'status' => 'active',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    private function getCartItems(string $cartId)
    {
        return DB::table('cart_items as ci')
            ->join('products as p', 'p.id', '=', 'ci.product_id')
            ->where('ci.cart_id', $cartId)
            ->orderBy('ci.created_at')
            ->get([
                'ci.id',
                'ci.product_id',
                'ci.qty',
                'ci.price_at',
                'ci.note',
                'p.name',
            ]);
    }
}
