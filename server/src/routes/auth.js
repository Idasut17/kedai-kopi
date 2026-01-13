import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if(!username || !password) return res.status(400).json({error:'username & password required'});
    const exists = await query('select 1 as x from users where username=?', [username]);
    if(exists.rowCount) return res.status(409).json({error:'username taken'});
    const hash = await bcrypt.hash(password, 10);
    const roleVal = role === 'admin' ? 'admin' : 'member';
    const id = uuidv4();
    await query('insert into users (id, username, email, password_hash, role) values (?,?,?,?,?)', [id, username, email || null, hash, roleVal]);
    const row = await query('select id, username, role from users where id=?', [id]);
    return res.json(row.rows[0]);
  } catch(err){
    console.error(err);
    res.status(500).json({error:'server_error'});
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const row = await query('select id, username, password_hash, role from users where username=?', [username]);
    if(!row.rowCount) return res.status(401).json({error:'invalid_credentials'});
    const user = row.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if(!ok) return res.status(401).json({error:'invalid_credentials'});
    const token = jwt.sign({ id:user.id, username:user.username, role:user.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '8h' });
    return res.json({ token, user: { id:user.id, username:user.username, role:user.role } });
  } catch(err){
    console.error(err);
    res.status(500).json({error:'server_error'});
  }
});

export default router;
