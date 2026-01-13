import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import settingsRouter from './routes/settings.js';
import xmppRouter from './routes/xmpp.js';
import devRouter from './routes/dev.js';
import cartRouter from './routes/cart.js';
import ordersRouter from './routes/orders.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Serve static frontend (index.html, css, js, images) from project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// project root = two levels up from server/src -> ../../
const clientRoot = path.resolve(__dirname, '../..');
app.use(express.static(clientRoot));

// If no file matched, fallback info (optional)
app.get('/', (req,res,next)=>{
	// Static middleware will have served index.html if it exists; if not, show info.
	if(!res.headersSent){
		res.type('text/plain').send('Kedai Kopi frontend not found (index.html missing). API OK. See /api/health');
	}
});

app.get('/api/health', (req,res)=> res.json({ ok:true }));
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/xmpp', xmppRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);
// Dev utilities (seed). Only enabled if DEV_SEED_KEY is set.
if(process.env.DEV_SEED_KEY){
	app.use('/api/dev', devRouter);
}

const PORT = process.env.PORT || 3002;
app.listen(PORT, ()=> console.log(`API listening on http://localhost:${PORT}`));
