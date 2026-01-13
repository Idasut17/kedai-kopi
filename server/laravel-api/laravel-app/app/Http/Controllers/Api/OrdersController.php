<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrdersController
{
    public function store(Request $request)
    {
        try {
            $user = $request->user();
            $userId = (string) $user->id;

            $result = DB::transaction(function () use ($userId) {
                $cart = DB::table('carts')
                    ->where('user_id', $userId)
                    ->where('status', 'active')
                    ->first(['id']);

                if (! $cart) {
                    return ['status' => 400, 'payload' => ['error' => 'empty_cart']];
                }

                $cartId = (string) $cart->id;

                $items = DB::table('cart_items as ci')
                    ->join('products as p', 'p.id', '=', 'ci.product_id')
                    ->where('ci.cart_id', $cartId)
                    ->get([
                        'ci.product_id',
                        'ci.qty',
                        'ci.price_at',
                        'p.name',
                    ]);

                if ($items->isEmpty()) {
                    return ['status' => 400, 'payload' => ['error' => 'empty_cart']];
                }

                $subtotal = (int) $items->reduce(function ($sum, $it) {
                    return $sum + ((int) $it->qty * (int) $it->price_at);
                }, 0);

                $discount = 0;
                $tax = 0;
                $shippingFee = 0;
                $total = $subtotal - $discount + $tax + $shippingFee;

                $orderId = (string) Str::uuid();

                DB::table('orders')->insert([
                    'id' => $orderId,
                    'user_id' => $userId,
                    'status' => 'pending',
                    'subtotal' => $subtotal,
                    'discount' => $discount,
                    'tax' => $tax,
                    'shipping_fee' => $shippingFee,
                    'total' => $total,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);

                foreach ($items as $it) {
                    $qty = (int) $it->qty;
                    $price = (int) $it->price_at;

                    DB::table('order_items')->insert([
                        'id' => (string) Str::uuid(),
                        'order_id' => $orderId,
                        'product_id' => (string) $it->product_id,
                        'product_name' => (string) $it->name,
                        'qty' => $qty,
                        'price' => $price,
                        'subtotal' => $qty * $price,
                        'created_at' => now(),
                    ]);
                }

                DB::table('carts')->where('id', $cartId)->update([
                    'status' => 'ordered',
                    'updated_at' => now(),
                ]);

                return [
                    'status' => 201,
                    'payload' => ['id' => $orderId, 'total' => $total, 'subtotal' => $subtotal],
                ];
            });

            return response()->json($result['payload'], (int) $result['status']);
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['error' => 'server_error'], 500);
        }
    }

    public function index(Request $request)
    {
        try {
            $user = $request->user();

            $rows = DB::table('orders')
                ->where('user_id', (string) $user->id)
                ->orderByDesc('created_at')
                ->get(['id', 'status', 'total', 'created_at']);

            return response()->json($rows);
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['error' => 'server_error'], 500);
        }
    }

    public function all()
    {
        try {
            $rows = DB::table('orders')
                ->orderByDesc('created_at')
                ->get(['id', 'user_id', 'status', 'total', 'created_at']);

            return response()->json($rows);
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['error' => 'server_error'], 500);
        }
    }

    public function show(Request $request, string $id)
    {
        try {
            $order = DB::table('orders')->where('id', $id)->first([
                'id',
                'user_id',
                'status',
                'subtotal',
                'discount',
                'tax',
                'shipping_fee',
                'total',
                'created_at',
            ]);

            if (! $order) {
                return response()->json(['error' => 'not_found'], 404);
            }

            $user = $request->user();
            if (($user->role ?? null) !== 'admin' && (string) $user->id !== (string) $order->user_id) {
                return response()->json(['error' => 'forbidden'], 403);
            }

            $items = DB::table('order_items')
                ->where('order_id', $id)
                ->get(['product_id', 'product_name', 'qty', 'price', 'subtotal']);

            return response()->json(array_merge((array) $order, ['items' => $items]));
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['error' => 'server_error'], 500);
        }
    }
}
