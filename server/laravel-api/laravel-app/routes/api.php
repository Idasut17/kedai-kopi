<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\OrdersController;
use App\Http\Controllers\Api\ProductsController;
use App\Http\Controllers\Api\SettingsController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => ['ok' => true]);

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

Route::prefix('settings')->group(function () {
    Route::get('/{key}', [SettingsController::class, 'show']);
    Route::put('/{key}', [SettingsController::class, 'upsert'])->middleware(['auth:sanctum', 'admin.only']);
});

Route::prefix('products')->group(function () {
    Route::get('/', [ProductsController::class, 'index']);
    Route::get('/{id}', [ProductsController::class, 'show']);

    Route::post('/', [ProductsController::class, 'store'])->middleware(['auth:sanctum', 'admin.only']);
    Route::put('/{id}', [ProductsController::class, 'update'])->middleware(['auth:sanctum', 'admin.only']);
    Route::delete('/{id}', [ProductsController::class, 'destroy'])->middleware(['auth:sanctum', 'admin.only']);

    Route::get('/{id}/images', [ProductsController::class, 'listImages']);
    Route::post('/{id}/images', [ProductsController::class, 'uploadImage'])->middleware(['auth:sanctum', 'admin.only']);
    Route::delete('/{id}/images/{imageId}', [ProductsController::class, 'deleteImage'])->middleware(['auth:sanctum', 'admin.only']);
});

Route::prefix('cart')->middleware(['auth:sanctum'])->group(function () {
    Route::get('/', [CartController::class, 'show']);
    Route::post('/items', [CartController::class, 'addItem']);
});

Route::prefix('orders')->middleware(['auth:sanctum'])->group(function () {
    Route::post('/', [OrdersController::class, 'store']);
    Route::get('/', [OrdersController::class, 'index']);
    Route::get('/all', [OrdersController::class, 'all'])->middleware(['admin.only']);
    Route::get('/{id}', [OrdersController::class, 'show']);
});
