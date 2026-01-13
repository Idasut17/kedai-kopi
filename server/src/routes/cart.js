import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

async function ensureCart(userId){
  const existing = await query('SELECT id FROM carts WHERE user_id=? AND status="active"', [userId]);
  if(existing.rowCount){ return existing.rows[0].id; }
  const id = uuidv4();
  await query('INSERT INTO carts (id, user_id, status, created_at, updated_at) VALUES (?,?,"active",NOW(),NOW())', [id, userId]);
  return id;
}

router.get('/', authRequired, async (req,res)=>{
  try {
    const cartId = await ensureCart(req.user.id);
    const items = await query('SELECT ci.id, ci.product_id, ci.qty, ci.price_at, ci.note, p.name FROM cart_items ci JOIN products p ON p.id=ci.product_id WHERE ci.cart_id=? ORDER BY ci.created_at ASC', [cartId]);
    res.json({ id: cartId, items: items.rows });
  } catch(err){
    console.error('[GET /cart] error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

router.post('/items', authRequired, async (req,res)=>{
  try {
    const { product_id, qty } = req.body;
    if(!product_id || !qty) return res.status(400).json({ error: 'product_id & qty required' });
    const cartId = await ensureCart(req.user.id);
    // Get product price
    const p = await query('SELECT id, price FROM products WHERE id=?', [product_id]);
    if(!p.rowCount) return res.status(404).json({ error: 'product_not_found' });
    const existing = await query('SELECT id FROM cart_items WHERE cart_id=? AND product_id=?', [cartId, product_id]);
    if(existing.rowCount){
      // update qty
      await query('UPDATE cart_items SET qty=qty+?, updated_at=NOW() WHERE id=?', [Number(qty), existing.rows[0].id]);
    } else {
      const id = uuidv4();
      await query('INSERT INTO cart_items (id, cart_id, product_id, qty, price_at, created_at) VALUES (?,?,?,?,?,NOW())', [id, cartId, product_id, Number(qty), p.rows[0].price]);
    }
    const items = await query('SELECT ci.id, ci.product_id, ci.qty, ci.price_at, ci.note, p.name FROM cart_items ci JOIN products p ON p.id=ci.product_id WHERE ci.cart_id=? ORDER BY ci.created_at ASC', [cartId]);
    res.status(201).json({ id: cartId, items: items.rows });
  } catch(err){
    console.error('[POST /cart/items] error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

router.put('/items/:id', authRequired, async (req,res)=>{
  try {
    const { id } = req.params;
    const { qty, note } = req.body;
    if(qty == null && note == null) return res.status(400).json({ error: 'no fields' });
    const row = await query('SELECT ci.id FROM cart_items ci JOIN carts c ON c.id=ci.cart_id WHERE ci.id=? AND c.user_id=? AND c.status="active"', [id, req.user.id]);
    if(!row.rowCount) return res.status(404).json({ error: 'not_found' });
    const fields=[]; const params=[];
    if(qty!=null){ fields.push('qty=?'); params.push(Number(qty)); }
    if(note!=null){ fields.push('note=?'); params.push(note); }
    params.push(id);
    await query(`UPDATE cart_items SET ${fields.join(', ')}, updated_at=NOW() WHERE id=?`, params);
    const cartIdRow = await query('SELECT cart_id FROM cart_items WHERE id=?', [id]);
    const cartId = cartIdRow.rows[0].cart_id;
    const items = await query('SELECT ci.id, ci.product_id, ci.qty, ci.price_at, ci.note, p.name FROM cart_items ci JOIN products p ON p.id=ci.product_id WHERE ci.cart_id=? ORDER BY ci.created_at ASC', [cartId]);
    res.json({ id: cartId, items: items.rows });
  } catch(err){
    console.error('[PUT /cart/items/:id] error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

router.delete('/items/:id', authRequired, async (req,res)=>{
  try {
    const { id } = req.params;
    const row = await query('SELECT ci.id, ci.cart_id FROM cart_items ci JOIN carts c ON c.id=ci.cart_id WHERE ci.id=? AND c.user_id=? AND c.status="active"', [id, req.user.id]);
    if(!row.rowCount) return res.status(404).json({ error: 'not_found' });
    const cartId = row.rows[0].cart_id;
    await query('DELETE FROM cart_items WHERE id=?', [id]);
    const items = await query('SELECT ci.id, ci.product_id, ci.qty, ci.price_at, ci.note, p.name FROM cart_items ci JOIN products p ON p.id=ci.product_id WHERE ci.cart_id=? ORDER BY ci.created_at ASC', [cartId]);
    res.json({ id: cartId, items: items.rows });
  } catch(err){
    console.error('[DELETE /cart/items/:id] error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

export default router;
