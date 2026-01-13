import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db.js';
import { authRequired, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Create order from current active cart
router.post('/', authRequired, async (req,res)=>{
  try {
    const userId = req.user.id;
    // Get active cart and items
    const cartRow = await query('SELECT id FROM carts WHERE user_id=? AND status="active"', [userId]);
    if(!cartRow.rowCount) return res.status(400).json({ error: 'empty_cart' });
    const cartId = cartRow.rows[0].id;
    const items = await query('SELECT ci.product_id, ci.qty, ci.price_at, p.name FROM cart_items ci JOIN products p ON p.id=ci.product_id WHERE ci.cart_id=?', [cartId]);
    if(!items.rowCount) return res.status(400).json({ error: 'empty_cart' });
    // Compute totals
    const subtotal = items.rows.reduce((s,it)=> s + (Number(it.qty)*Number(it.price_at)), 0);
    const discount = 0; const tax = 0; const shipping_fee = 0; const total = subtotal - discount + tax + shipping_fee;
    const orderId = uuidv4();
    await query('INSERT INTO orders (id, user_id, status, subtotal, discount, tax, shipping_fee, total, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,NOW(),NOW())', [orderId, userId, 'pending', subtotal, discount, tax, shipping_fee, total]);
    // Insert order_items
    for(const it of items.rows){
      const id = uuidv4();
      const price = Number(it.price_at);
      const qty = Number(it.qty);
      await query('INSERT INTO order_items (id, order_id, product_id, product_name, qty, price, subtotal, created_at) VALUES (?,?,?,?,?,?,?,NOW())', [id, orderId, it.product_id, it.name, qty, price, price*qty]);
    }
    // Mark cart as ordered
    await query('UPDATE carts SET status="ordered", updated_at=NOW() WHERE id=?', [cartId]);
    res.status(201).json({ id: orderId, total, subtotal });
  } catch(err){
    console.error('[POST /orders] error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// Current user's orders
router.get('/', authRequired, async (req,res)=>{
  try {
    const rows = await query('SELECT id, status, total, created_at FROM orders WHERE user_id=? ORDER BY created_at DESC', [req.user.id]);
    res.json(rows.rows);
  } catch(err){
    console.error('[GET /orders] error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// Admin list all orders
router.get('/all', authRequired, adminOnly, async (_req,res)=>{
  try {
    const rows = await query('SELECT id, user_id, status, total, created_at FROM orders ORDER BY created_at DESC');
    res.json(rows.rows);
  } catch(err){
    console.error('[GET /orders/all] error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// Detail one order
router.get('/:id', authRequired, async (req,res)=>{
  try {
    const { id } = req.params;
    const order = await query('SELECT id, user_id, status, subtotal, discount, tax, shipping_fee, total, created_at FROM orders WHERE id=?', [id]);
    if(!order.rowCount) return res.status(404).json({ error: 'not_found' });
    const o = order.rows[0];
    // Only owner or admin can view
    if(req.user.role!== 'admin' && req.user.id !== o.user_id){ return res.status(403).json({ error: 'forbidden' }); }
    const items = await query('SELECT product_id, product_name, qty, price, subtotal FROM order_items WHERE order_id=?', [id]);
    res.json({ ...o, items: items.rows });
  } catch(err){
    console.error('[GET /orders/:id] error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;
