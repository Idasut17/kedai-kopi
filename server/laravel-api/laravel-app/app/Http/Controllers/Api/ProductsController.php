<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProductsController
{
    public function index(Request $request)
    {
        try {
            $active = $request->query('active') === 'true';

            $rows = DB::select(
                'SELECT p.id, p.name, p.price, p.is_active,
                    (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY sort_order ASC, id ASC LIMIT 1) AS image_url
                 FROM products p
                 WHERE (? = FALSE OR p.is_active = TRUE)
                 ORDER BY p.created_at DESC',
                [$active ? 1 : 0]
            );

            return response()->json($rows);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'server_error', 'detail' => 'db_unavailable'], 500);
        }
    }

    public function show(string $id)
    {
        try {
            $product = DB::selectOne('SELECT id, name, description, price, is_active, created_at FROM products WHERE id=?', [$id]);
            if (! $product) {
                return response()->json(['error' => 'not_found'], 404);
            }

            $images = DB::select('SELECT id, image_url, width, height, sort_order FROM product_images WHERE product_id=? ORDER BY sort_order ASC, id ASC', [$id]);

            return response()->json(array_merge((array) $product, ['images' => $images]));
        } catch (\Throwable $e) {
            return response()->json(['error' => 'server_error', 'detail' => 'db_unavailable'], 500);
        }
    }

    public function store(Request $request)
    {
        $name = $request->input('name');
        $description = $request->input('description');
        $price = $request->input('price');
        $isActive = $request->input('is_active');

        if (! $name || $price === null) {
            return response()->json(['error' => 'name & price required'], 400);
        }

        $id = (string) Str::uuid();

        DB::statement(
            'INSERT INTO products (id, name, description, price, is_active, created_at, updated_at) VALUES (?,?,?,?,?,NOW(),NOW())',
            [$id, $name, $description ?: null, (int) $price, $isActive !== null ? ($isActive ? 1 : 0) : 1]
        );

        $row = DB::selectOne('SELECT id, name, description, price, is_active, created_at, updated_at FROM products WHERE id=?', [$id]);

        return response()->json($row, 201);
    }

    public function update(Request $request, string $id)
    {
        $fields = [];
        $params = [];

        if ($request->has('name')) {
            $fields[] = 'name=?';
            $params[] = $request->input('name');
        }

        if ($request->has('description')) {
            $fields[] = 'description=?';
            $params[] = $request->input('description');
        }

        if ($request->has('price')) {
            $fields[] = 'price=?';
            $params[] = (int) $request->input('price');
        }

        if ($request->has('is_active')) {
            $fields[] = 'is_active=?';
            $params[] = $request->boolean('is_active') ? 1 : 0;
        }

        if (! count($fields)) {
            return response()->json(['error' => 'no fields to update'], 400);
        }

        $fields[] = 'updated_at=NOW()';
        $params[] = $id;

        $updated = DB::update('UPDATE products SET '.implode(', ', $fields).' WHERE id=?', $params);
        if (! $updated) {
            return response()->json(['error' => 'not_found'], 404);
        }

        $row = DB::selectOne('SELECT id, name, description, price, is_active, created_at, updated_at FROM products WHERE id=?', [$id]);

        return response()->json($row);
    }

    public function destroy(string $id)
    {
        $deleted = DB::delete('DELETE FROM products WHERE id=?', [$id]);
        if (! $deleted) {
            return response()->json(['error' => 'not_found'], 404);
        }

        return response()->json(['ok' => true]);
    }

    public function listImages(string $id)
    {
        try {
            $imgs = DB::select('SELECT id, image_url, width, height, sort_order, created_at FROM product_images WHERE product_id=? ORDER BY sort_order ASC, id ASC', [$id]);
            return response()->json($imgs);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'server_error'], 500);
        }
    }

    public function uploadImage(Request $request, string $id)
    {
        try {
            $file = $request->file('file');
            if (! $file) {
                return response()->json(['error' => 'file_required'], 400);
            }

            $repoRoot = dirname(base_path(), 3);
            $uploadsRoot = $repoRoot.DIRECTORY_SEPARATOR.'uploads'.DIRECTORY_SEPARATOR.'products'.DIRECTORY_SEPARATOR.$id;
            if (! is_dir($uploadsRoot)) {
                @mkdir($uploadsRoot, 0777, true);
            }

            $original = (string) $file->getClientOriginalName();
            $safe = time().'-'.preg_replace('/[^a-zA-Z0-9_.-]/', '_', $original);
            $file->move($uploadsRoot, $safe);

            $rel = 'uploads/products/'.$id.'/'.$safe;

            $imgId = (string) Str::uuid();
            DB::statement(
                'INSERT INTO product_images (id, product_id, image_url, sort_order, created_at) VALUES (?,?,?,?,NOW())',
                [$imgId, $id, str_replace('\\', '/', $rel), 0]
            );

            $imgs = DB::select('SELECT id, image_url, width, height, sort_order FROM product_images WHERE product_id=? ORDER BY sort_order ASC, id ASC', [$id]);

            return response()->json(['ok' => true, 'images' => $imgs], 201);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'server_error', 'detail' => $e->getMessage()], 500);
        }
    }

    public function deleteImage(string $id, string $imageId)
    {
        try {
            $row = DB::selectOne('SELECT id, image_url FROM product_images WHERE id=? AND product_id=?', [$imageId, $id]);
            if (! $row) {
                return response()->json(['error' => 'not_found'], 404);
            }

            DB::delete('DELETE FROM product_images WHERE id=?', [$imageId]);

            $repoRoot = dirname(base_path(), 3);
            $imagePath = $repoRoot.DIRECTORY_SEPARATOR.str_replace(['/', '\\'], DIRECTORY_SEPARATOR, (string) $row->image_url);
            if (is_file($imagePath)) {
                @unlink($imagePath);
            }

            return response()->json(['ok' => true]);
        } catch (\Throwable $e) {
            return response()->json(['error' => 'server_error'], 500);
        }
    }
}
