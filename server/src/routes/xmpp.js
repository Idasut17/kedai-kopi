import express from 'express';
import { authRequired, adminOnly } from '../middleware/auth.js';
import { ensureClient, sendMessage, sendRoomMessage, isReady, getConfig } from '../services/xmpp.js';

const router = express.Router();

// Ping status
router.get('/status', (req,res)=>{
  res.json({ ready: isReady(), config: getConfig() });
});

// Send direct chat message
router.post('/send', authRequired, adminOnly, async (req,res)=>{
  try {
    const { to, body } = req.body;
    if(!to || !body) return res.status(400).json({error:'to & body required'});
    ensureClient();
    await sendMessage(to, body);
    res.json({ ok:true });
  } catch(err){
    res.status(500).json({ error: err.message });
  }
});

// Send groupchat to configured room
router.post('/room', authRequired, adminOnly, async (req,res)=>{
  try {
    const { body } = req.body;
    if(!body) return res.status(400).json({error:'body required'});
    ensureClient();
    await sendRoomMessage(body);
    res.json({ ok:true });
  } catch(err){
    res.status(500).json({ error: err.message });
  }
});

export default router;
