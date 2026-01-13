// Simple cart frontend handler using API if available else localStorage fallback
// LocalStorage key: kk_cart_items [{ product_id, name, price, qty }]

const CART_KEY = 'kk_cart_items';

function getApiBase(){
  try{
    const stored = localStorage.getItem('kk_api_base');
    if(stored) return stored;
  }catch(_e){}

  const host = location.hostname || '127.0.0.1';
  const isPrivateHost = host==='localhost' || host==='127.0.0.1' || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
  const hasHttpOrigin = location.origin && !location.origin.startsWith('file://');
  if(hasHttpOrigin){
    if(isPrivateHost && location.port && location.port !== '8000') return `http://${host}:8000`;
    return location.origin;
  }
  return `http://${host}:8000`;
}

function getStoredCart(){
  try { return JSON.parse(localStorage.getItem(CART_KEY)||'[]'); } catch(e){ return []; }
}
function saveStoredCart(items){ localStorage.setItem(CART_KEY, JSON.stringify(items)); }

function computeTotals(items){
  const subtotal = items.reduce((s,i)=> s + (Number(i.price)*Number(i.qty)), 0);
  return { subtotal };
}

async function apiEnsureCart(){
  const user = JSON.parse(localStorage.getItem('kk_user')||'null');
  if(!user) return null;
  const API_BASE = getApiBase();
  try {
    const r = await fetch(`${API_BASE}/api/cart`, { headers: { 'Authorization': `Bearer ${user.token}` }});
    if(!r.ok) throw new Error('http '+r.status);
    return await r.json();
  } catch(_e){ return null; }
}

async function apiAdd(product_id, qty){
  const user = JSON.parse(localStorage.getItem('kk_user')||'null');
  if(!user) return null;
  const API_BASE = getApiBase();
  try {
    const r = await fetch(`${API_BASE}/api/cart/items`, { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${user.token}`}, body: JSON.stringify({ product_id, qty }) });
    if(!r.ok) throw new Error('http '+r.status);
    return await r.json();
  } catch(_e){ return null; }
}

export async function addToCartLocal(product){
  const items = getStoredCart();
  const idx = items.findIndex(i=> i.product_id === product.product_id);
  if(idx>-1){ items[idx].qty += product.qty; } else { items.push(product); }
  saveStoredCart(items);
  renderCartDropdown();
}

export async function addToCart(product_id, name, price, qty=1){
  // Try API first
  const apiRes = await apiAdd(product_id, qty);
  if(apiRes){
    // We could map API items but for simplicity keep local mirror
    const mapped = apiRes.items.map(i=> ({ product_id: i.product_id, name: i.name, price: i.price_at, qty: i.qty }));
    saveStoredCart(mapped);
    renderCartDropdown();
    return;
  }
  // Fallback local
  addToCartLocal({ product_id, name, price, qty });
}

export function renderCartDropdown(){
  const container = document.querySelector('.shopping-cart');
  if(!container) return;
  const items = getStoredCart();
  if(!items.length){ container.innerHTML = '<div class="cart-item">Keranjang kosong.</div>'; return; }
  container.innerHTML = items.map(i=> `
    <div class="cart-item" data-id="${i.product_id}">
      <img src="img/products/1.jpg" alt="${i.name}" />
      <div class="item-detail">
        <h3>${i.name}</h3>
        <div class="item-price">IDR ${Math.round(Number(i.price)/1000)}K x ${i.qty}</div>
      </div>
      <a href="#" class="remove-item" data-remove="${i.product_id}" aria-label="Hapus">×</a>
    </div>`).join('') + `<div class="cart-total">Total: IDR ${Math.round(computeTotals(items).subtotal/1000)}K</div>`;
  // Bind remove
  container.querySelectorAll('[data-remove]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      e.preventDefault();
      const pid = btn.getAttribute('data-remove');
      let items = getStoredCart();
      items = items.filter(x=> x.product_id!==pid);
      saveStoredCart(items);
      renderCartDropdown();
    });
  });
}

// Auto render on load
document.addEventListener('DOMContentLoaded', ()=>{
  renderCartDropdown();
});
