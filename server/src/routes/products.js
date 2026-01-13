import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db.js';
import { authRequired, adminOnly } from '../middleware/auth.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const active = req.query.active === 'true';
    const sql = `SELECT p.id, p.name, p.price, p.is_active,
                (SELECT image_url FROM product_images WHERE product_id=p.id ORDER BY sort_order ASC, id ASC LIMIT 1) AS image_url
                FROM products p
                WHERE (? = FALSE OR p.is_active = TRUE)
                ORDER BY p.created_at DESC`;
    const rows = await query(sql, [active]);
    res.json(rows.rows);
  } catch(err){
    console.error('[GET /products] error', err);
    res.status(500).json({ error: 'server_error', detail: 'db_unavailable' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const p = await query('SELECT id, name, description, price, is_active, created_at FROM products WHERE id=?', [id]);
    if(!p.rowCount) return res.status(404).json({error:'not_found'});
    const imgs = await query('SELECT id, image_url, width, height, sort_order FROM product_images WHERE product_id=? ORDER BY sort_order ASC, id ASC', [id]);
    res.json({ ...p.rows[0], images: imgs.rows });
  } catch(err){
    console.error('[GET /products/:id] error', err);
    res.status(500).json({ error: 'server_error', detail: 'db_unavailable' });
  }
});

router.post('/', authRequired, adminOnly, async (req, res) => {
  const { name, description, price, is_active } = req.body;
  if(!name || price == null) return res.status(400).json({error:'name & price required'});
  const id = uuidv4();
  await query('INSERT INTO products (id, name, description, price, is_active, created_at, updated_at) VALUES (?,?,?,?,?,NOW(),NOW())', [id, name, description || null, Number(price), is_active !== undefined ? (is_active?1:0) : 1]);
  const row = await query('SELECT id, name, description, price, is_active, created_at, updated_at FROM products WHERE id=?', [id]);
  res.status(201).json(row.rows[0]);
});

router.put('/:id', authRequired, adminOnly, async (req, res) => {
  const { name, description, price, is_active } = req.body;
  const id = req.params.id;
  // Build dynamic update
  const fields = [];
  const params = [];
  if(name !== undefined){ fields.push('name=?'); params.push(name); }
  if(description !== undefined){ fields.push('description=?'); params.push(description); }
  if(price !== undefined){ fields.push('price=?'); params.push(Number(price)); }
  if(is_active !== undefined){ fields.push('is_active=?'); params.push(is_active?1:0); }
  if(!fields.length){ return res.status(400).json({error:'no fields to update'}); }
  fields.push('updated_at=NOW()');
  params.push(id);
  const sql = `UPDATE products SET ${fields.join(', ')} WHERE id=?`;
  const result = await query(sql, params);
  if(!result.rowCount){ return res.status(404).json({error:'not_found'}); }
  const row = await query('SELECT id, name, description, price, is_active, created_at, updated_at FROM products WHERE id=?', [id]);
  res.json(row.rows[0]);
});

router.delete('/:id', authRequired, adminOnly, async (req, res) => {
  const id = req.params.id;
  const result = await query('DELETE FROM products WHERE id=?', [id]);
  if(!result.rowCount) return res.status(404).json({error:'not_found'});
  res.json({ok:true});
});

export default router;

// === Image Upload & Management ===
// Storage: uploads/products/<productId>/filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = path.resolve(__dirname, '../../..', 'uploads', 'products');

const storage = multer.diskStorage({
  destination: function(req, file, cb){
    const productId = req.params.id;
    const dest = path.join(uploadsRoot, productId);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: function(req, file, cb){
    const safe = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9_.-]/g,'_');
    cb(null, safe);
  }
});

const upload = multer({ storage });

// List images
router.get('/:id/images', async (req, res) => {
  try {
    const id = req.params.id;
    const imgs = await query('SELECT id, image_url, width, height, sort_order, created_at FROM product_images WHERE product_id=? ORDER BY sort_order ASC, id ASC', [id]);
    res.json(imgs.rows);
  } catch(err){
    console.error('[GET /products/:id/images] error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// Upload new image
router.post('/:id/images', authRequired, adminOnly, upload.single('file'), async (req, res) => {
  try {
    const id = req.params.id;
    if(!req.file){ return res.status(400).json({ error: 'file_required' }); }
    // Build public path relative to root served by express.static (project root)
    const rel = path.relative(path.resolve(__dirname, '../../..'), req.file.path).replace(/\\/g,'/');
    const imgId = uuidv4();
    await query('INSERT INTO product_images (id, product_id, image_url, sort_order, created_at) VALUES (?,?,?,?,NOW())', [imgId, id, rel, 0]);
    const imgs = await query('SELECT id, image_url, width, height, sort_order FROM product_images WHERE product_id=? ORDER BY sort_order ASC, id ASC', [id]);
    res.status(201).json({ ok:true, images: imgs.rows });
  } catch(err){
    console.error('[POST /products/:id/images] error', err);
    res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

// Delete image
router.delete('/:id/images/:imageId', authRequired, adminOnly, async (req, res) => {
  try {
    const { id, imageId } = req.params;
    // Get image row
    const row = await query('SELECT id, image_url FROM product_images WHERE id=? AND product_id=?', [imageId, id]);
    if(!row.rowCount) return res.status(404).json({ error: 'not_found' });
    const imagePath = path.join(path.resolve(__dirname, '../../..'), row.rows[0].image_url);
    // Delete DB row
    await query('DELETE FROM product_images WHERE id=?', [imageId]);
    // Attempt to remove file (ignore errors)
    try { fs.unlinkSync(imagePath); } catch(_e) {}
    res.json({ ok:true });
  } catch(err){
    console.error('[DELETE /products/:id/images/:imageId] error', err);
    res.status(500).json({ error: 'server_error' });
  }
});
