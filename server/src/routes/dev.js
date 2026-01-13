import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { query } from '../db.js';

const router = express.Router();

// Seed demo products if table is empty
router.get('/seed', async (req, res) => {
  try {
    const key = req.query.key;
    if(!process.env.DEV_SEED_KEY || key !== process.env.DEV_SEED_KEY){
      return res.status(403).json({ error: 'forbidden' });
    }
    // Check products count
    // Seed users if empty
    const ucnt = await query('SELECT COUNT(*) AS c FROM users');
    const ucount = Number(ucnt.rows?.[0]?.c || 0);
    let usersCreated = 0;
    if(ucount === 0){
      const adminId = uuidv4();
      const memberId = uuidv4();
      const adminHash = await bcrypt.hash('admin123', 10);
      const memberHash = await bcrypt.hash('member123', 10);
      await query('INSERT INTO users (id, username, email, password_hash, role, status, created_at, updated_at) VALUES (?,?,?,?,"admin","active",NOW(),NOW())', [adminId, 'admin', 'admin@example.com', adminHash]);
      await query('INSERT INTO users (id, username, email, password_hash, role, status, created_at, updated_at) VALUES (?,?,?,?,"member","active",NOW(),NOW())', [memberId, 'member', 'member@example.com', memberHash]);
      usersCreated = 2;
    }

    // Seed products if empty
    const cnt = await query('SELECT COUNT(*) AS c FROM products');
    const count = Number(cnt.rows?.[0]?.c || 0);
    if(count > 0){
      return res.json({ ok: true, message: 'Products already exist', count, usersCreated });
    }

    const p1 = uuidv4();
    const p2 = uuidv4();
    const p3 = uuidv4();

    await query('INSERT INTO products (id, name, description, price, is_active, created_at, updated_at) VALUES (?,?,?,?,1,NOW(),NOW())', [
      p1, 'Espresso', 'Shot kopi pekat dengan crema.', 15000
    ]);
    await query('INSERT INTO product_images (id, product_id, image_url, sort_order, created_at) VALUES (?,?,?,?,NOW())', [uuidv4(), p1, 'img/menu/1.jpg', 0]);

    await query('INSERT INTO products (id, name, description, price, is_active, created_at, updated_at) VALUES (?,?,?,?,1,NOW(),NOW())', [
      p2, 'Cappuccino', 'Perpaduan espresso, susu, dan foam.', 25000
    ]);
    await query('INSERT INTO product_images (id, product_id, image_url, sort_order, created_at) VALUES (?,?,?,?,NOW())', [uuidv4(), p2, 'img/menu/1.jpg', 0]);

    await query('INSERT INTO products (id, name, description, price, is_active, created_at, updated_at) VALUES (?,?,?,?,1,NOW(),NOW())', [
      p3, 'Latte', 'Espresso dengan susu steamed yang lembut.', 20000
    ]);
    await query('INSERT INTO product_images (id, product_id, image_url, sort_order, created_at) VALUES (?,?,?,?,NOW())', [uuidv4(), p3, 'img/menu/1.jpg', 0]);

  return res.json({ ok: true, created: 3, usersCreated });
  } catch(err){
    console.error('[dev/seed] error', err);
    res.status(500).json({ error: 'seed_failed', detail: err?.message || String(err) });
  }
});

export default router;
