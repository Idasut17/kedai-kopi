import express from 'express';
import { query } from '../db.js';
import { authRequired, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/:key', async (req, res) => {
  const key = req.params.key;
  const row = await query('SELECT `key`, `value` FROM settings WHERE `key`=?', [key]);
  if(!row.rowCount) return res.status(404).json({error:'not_found'});
  const record = row.rows[0];
  let parsed = record.value;
  // Attempt JSON parse (values are stored JSON.stringified)
  try {
    parsed = JSON.parse(record.value);
  } catch(_e){ /* keep raw string */ }
  res.json({ key: record.key, value: parsed });
});

router.put('/:key', authRequired, adminOnly, async (req, res) => {
  const key = req.params.key;
  const { value } = req.body;
  // Use MySQL upsert
  await query(
    'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)',
    [key, JSON.stringify(value)]
  );
  const row = await query('SELECT `key`, `value` FROM settings WHERE `key`=?', [key]);
  const record = row.rows[0];
  let parsed = record.value;
  try { parsed = JSON.parse(record.value); } catch(_e){}
  res.json({ key: record.key, value: parsed });
});

export default router;
