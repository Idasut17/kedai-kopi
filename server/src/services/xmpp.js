import { client, xml } from '@xmpp/client';

let xmpp = null;
let ready = false;
let joiningRoom = false;

const conf = {
  service: process.env.XMPP_SERVICE, // e.g. ws://localhost:5280/xmpp-websocket
  domain: process.env.XMPP_DOMAIN,   // e.g. localhost
  username: process.env.XMPP_JID,    // full JID or local part (user@domain)
  password: process.env.XMPP_PASSWORD,
  resource: process.env.XMPP_RESOURCE || 'kedai-api',
  roomJid: process.env.XMPP_ROOM_JID, // room@muc.domain
  roomNick: process.env.XMPP_ROOM_NICK || 'backend'
};

export function ensureClient(){
  if(xmpp) return xmpp;
  if(!conf.service || !conf.username || !conf.password){
    console.warn('[XMPP] missing env (XMPP_SERVICE, XMPP_JID, XMPP_PASSWORD). XMPP disabled.');
    return null;
  }
  xmpp = client({ service: conf.service, domain: conf.domain || undefined, username: conf.username, password: conf.password, resource: conf.resource });
  xmpp.on('error', err => { ready = false; console.error('[XMPP] error', err?.message || err); });
  xmpp.on('offline', () => { ready = false; console.warn('[XMPP] offline'); });
  xmpp.on('stanza', stanza => {
    // basic log; extend if needed
    // console.log('[XMPP] stanza', stanza.toString());
  });
  xmpp.on('online', async address => {
    ready = true;
    console.log('[XMPP] online as', address.toString());
    if(conf.roomJid && !joiningRoom){
      try { await joinRoom(conf.roomJid, conf.roomNick); } catch(e){ console.warn('[XMPP] join room failed', e?.message || e); }
    }
  });
  xmpp.start().catch(err=> console.error('[XMPP] start failed', err?.message || err));
  return xmpp;
}

export function isReady(){ return !!ready; }

export async function joinRoom(roomJid, nick){
  if(!xmpp) ensureClient(); if(!xmpp) throw new Error('XMPP disabled');
  joiningRoom = true;
  const presence = xml('presence', { to: `${roomJid}/${nick}` }, xml('x', { xmlns: 'http://jabber.org/protocol/muc' }));
  await xmpp.send(presence);
}

export async function sendMessage(to, body){
  if(!xmpp) ensureClient(); if(!xmpp) throw new Error('XMPP disabled');
  const message = xml('message', { to, type: 'chat' }, xml('body', {}, body));
  await xmpp.send(message);
}

export async function sendRoomMessage(body){
  if(!conf.roomJid) throw new Error('room not configured');
  if(!xmpp) ensureClient(); if(!xmpp) throw new Error('XMPP disabled');
  const message = xml('message', { to: conf.roomJid, type: 'groupchat' }, xml('body', {}, body));
  await xmpp.send(message);
}

export function getConfig(){ return { ...conf, password: undefined }; }
