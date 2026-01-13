// Auth UI helper: adjusts navbar based on kk_user
// Contract:
// - Reads localStorage kk_user { id, username, role, token }
// - Provides window.renderAuthNav(navElement) to rebuild auth-related links
// - Adds window.logout() to clear storage and redirect to index.html

function getUser(){
  try { return JSON.parse(localStorage.getItem('kk_user')||'null'); } catch(e){ return null; }
}

function logout(){
  localStorage.removeItem('kk_user');
  // Optionally keep theme & api base
  window.location.href = 'index.html';
}

function buildLinks(user){
  const settingsLink = { href: 'settings.html', label: 'Settings' };
  if(!user){
    return [
      settingsLink,
      { href: 'login.html', label: 'Login' }
    ];
  }
  const role = (user.role || '').toLowerCase();
  const base = [];
  if(role === 'admin'){
    base.push({ href: 'admin-menu.html', label: 'Admin Menu' });
    base.push({ href: 'dashboard.html', label: 'Dashboard' });
  }
  base.push({ href: 'menu-member.html', label: 'Menu' });
  base.push(settingsLink);
  base.push({ href: '#', label: 'Logout', onClick: logout });
  return base;
}

function renderAuthNav(container){
  if(!container) return;
  const user = getUser();
  const links = buildLinks(user);
  // Clear previous dynamic part
  container.querySelectorAll('.auth-dyn').forEach(el=>el.remove());
  // Insert user badge if logged in
  if(user){
    const badge = document.createElement('span');
    badge.className = 'auth-dyn user-badge';
    const role = (user.role || '').toLowerCase();
    badge.textContent = user.username + ' (' + (role || 'unknown') + ')';
    badge.style.marginRight = '.75rem';
    container.insertBefore(badge, container.firstChild);
  }
  links.forEach(l => {
    const a = document.createElement('a');
    a.className = 'auth-dyn';
    a.href = l.href;
    a.textContent = l.label;
    if(l.onClick){ a.addEventListener('click', e => { e.preventDefault(); l.onClick(); }); }
    container.appendChild(a);
  });
}

window.renderAuthNav = renderAuthNav;
window.logout = logout;

// Auto init when loaded (defer slight to guarantee navbar exists)
document.addEventListener('DOMContentLoaded', ()=>{
  const navExtra = document.querySelector('.navbar .navbar-extra, .navbar-extra');
  renderAuthNav(navExtra);
});
