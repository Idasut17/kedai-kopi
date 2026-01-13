/* global feather */
(function(){
  if(window.feather){ window.feather.replace(); }

  function applyTheme(theme){
    document.documentElement.setAttribute('data-theme', theme);
    try{
      localStorage.setItem('kk_theme', theme);
    }catch(_){}
  }

  const savedTheme = (()=> {
    try{ return localStorage.getItem('kk_theme') || 'light'; }
    catch(_){ return 'light'; }
  })();
  applyTheme(savedTheme);

  const themeRadios = document.querySelectorAll('input[name="theme-option"]');
  themeRadios.forEach(radio => {
    if(radio.value === savedTheme){ radio.checked = true; }
    radio.addEventListener('change', () => applyTheme(radio.value));
  });

  const API_BASE = (function(){
    try{ const stored = localStorage.getItem('kk_api_base'); if(stored) return stored; }catch(_e){}
    const host = location.hostname || '127.0.0.1';
    const isPrivateHost = host==='localhost' || host==='127.0.0.1' || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);
    const hasHttpOrigin = location.origin && !location.origin.startsWith('file://');
    if(hasHttpOrigin){
      if(isPrivateHost && location.port && location.port !== '8000') return `http://${host}:8000`;
      return location.origin;
    }
    return `http://${host}:8000`;
  })();

  function getUser(){
    try{ return JSON.parse(localStorage.getItem('kk_user') || 'null'); }
    catch(_){ return null; }
  }

  const user = getUser();
  const role = (user && typeof user.role === 'string') ? user.role.toLowerCase() : '';
  const isAdmin = role === 'admin';

  const roleBadge = document.querySelector('[data-role-badge]');
  if(roleBadge){
    roleBadge.textContent = user ? (user.username + ' • ' + (role || 'guest')) : 'Guest';
  }

  const adminSection = document.getElementById('admin-settings');
  const adminHint = document.getElementById('admin-hint');
  const registerSection = document.getElementById('register-section');
  
  if(!isAdmin){
    if(adminSection){ adminSection.classList.add('hidden'); }
    if(adminHint){ adminHint.classList.remove('hidden'); }
    if(registerSection){ registerSection.style.display = 'none'; }
  } else {
    if(adminHint){ adminHint.classList.add('hidden'); }
    if(registerSection){ registerSection.style.display = 'block'; }
  }

  const profileDisplay = document.getElementById('profile-display');
  const form = document.getElementById('profile-form');
  const statusEl = document.getElementById('profile-status');

  function renderProfileDisplay(profile){
    if(!profileDisplay) return;
    const items = [
      {
        icon:'phone',
        label:'Kontak',
        value:profile.phone || profile.email || profile.whatsapp || 'Belum disetel'
      },
      {
        icon:'mail',
        label:'Email',
        value:profile.email || 'Belum disetel'
      },
      {
        icon:'message-circle',
        label:'WhatsApp',
        value:profile.whatsapp || 'Belum disetel'
      },
      {
        icon:'map-pin',
        label:'Alamat',
        value:profile.address || 'Belum disetel'
      }
    ];
    profileDisplay.innerHTML = items.map(item => `
      <div class="info-item">
        <i data-feather="${item.icon}"></i>
        <div>
          <strong>${item.label}</strong>
          <span>${item.value || '—'}</span>
        </div>
      </div>
    `).join('');
    if(window.feather){ window.feather.replace(); }
  }

  function fillForm(profile){
    if(!form || !isAdmin) return;
    form.phone.value = profile.phone || '';
    form.email.value = profile.email || '';
    form.whatsapp.value = profile.whatsapp || '';
    form.address.value = profile.address || '';
    form.mapUrl.value = profile.mapUrl || '';
    
    // Update map preview
    updateMapPreview(profile.mapUrl);
  }

  function updateMapPreview(mapUrl){
    const mapPreviewContainer = document.getElementById('map-preview-container');
    const mapPreview = document.getElementById('map-preview');
    
    if(mapUrl && mapUrl.trim()){
      // Validate that it's an embed URL
      const url = mapUrl.trim();
      if(!url.includes('/maps/embed')){
        if(mapPreviewContainer) mapPreviewContainer.style.display = 'none';
        if(mapPreview) mapPreview.src = '';
        return;
      }
      if(mapPreviewContainer) mapPreviewContainer.style.display = 'block';
      if(mapPreview) mapPreview.src = url;
    } else {
      if(mapPreviewContainer) mapPreviewContainer.style.display = 'none';
      if(mapPreview) mapPreview.src = '';
    }
  }

  async function fetchProfile(){
    try{
      const res = await fetch(`${API_BASE}/api/settings/site_profile`);
      if(!res.ok) throw new Error('http '+res.status);
      const data = await res.json();
      if(data && typeof data.value === 'object' && data.value !== null){
        return data.value;
      }
      return {};
    }catch(_){
      return {};
    }
  }

  function setStatus(type, message){
    if(!statusEl) return;
    statusEl.textContent = '';
    statusEl.classList.remove('loading','success','error');
    if(type && message){
      statusEl.classList.add(type);
      const icon = document.createElement('i');
      if(type === 'loading') icon.setAttribute('data-feather', 'loader');
      if(type === 'success') icon.setAttribute('data-feather', 'check-circle');
      if(type === 'error') icon.setAttribute('data-feather', 'alert-circle');
      if(type === 'loading') icon.classList.add('pulse');
      const text = document.createElement('span');
      text.textContent = message;
      statusEl.appendChild(icon);
      statusEl.appendChild(text);
      if(window.feather) window.feather.replace();
    }
  }

  (async function init(){
    const profile = await fetchProfile();
    renderProfileDisplay(profile);
    fillForm(profile);
  })();

  if(form && isAdmin){
    // Live preview untuk map URL
    const mapUrlInput = document.getElementById('contact-map');
    if(mapUrlInput){
      mapUrlInput.addEventListener('input', (e)=>{
        const url = e.target.value.trim();
        if(url && !url.includes('/maps/embed')){
          e.target.setCustomValidity('Harus menggunakan URL embed Google Maps (mengandung /maps/embed)');
        } else {
          e.target.setCustomValidity('');
        }
        updateMapPreview(url);
      });
    }

    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const payload = {
        phone: form.phone.value.trim(),
        email: form.email.value.trim(),
        whatsapp: form.whatsapp.value.trim(),
        address: form.address.value.trim(),
        mapUrl: form.mapUrl.value.trim()
      };
      setStatus('loading', 'Menyimpan pengaturan...');
      form.querySelectorAll('input, textarea, button').forEach(el => el.disabled = true);
      try{
        const headers = { 'Content-Type':'application/json' };
        if(user && user.token){ headers.Authorization = `Bearer ${user.token}`; }
        const res = await fetch(`${API_BASE}/api/settings/site_profile`, {
          method:'PUT',
          headers,
          body: JSON.stringify({ value: payload })
        });
        if(!res.ok) throw new Error('http '+res.status);
        setStatus('success', 'Pengaturan berhasil disimpan.');
        renderProfileDisplay(payload);
      }catch(err){
        console.error(err);
        setStatus('error', 'Gagal menyimpan. Coba lagi beberapa saat.');
      }finally{
        form.querySelectorAll('input, textarea, button').forEach(el => el.disabled = false);
        setTimeout(()=> setStatus('', ''), 3200);
      }
    });
  }

  // Register Form Handler (Admin Only)
  const registerForm = document.getElementById('register-form');
  const registerStatus = document.getElementById('register-status');

  function setRegisterStatus(type, message){
    if(!registerStatus) return;
    registerStatus.textContent = '';
    registerStatus.classList.remove('loading','success','error');
    if(type && message){
      registerStatus.classList.add(type);
      const icon = document.createElement('i');
      if(type === 'loading') icon.setAttribute('data-feather', 'loader');
      if(type === 'success') icon.setAttribute('data-feather', 'check-circle');
      if(type === 'error') icon.setAttribute('data-feather', 'alert-circle');
      if(type === 'loading') icon.classList.add('pulse');
      const text = document.createElement('span');
      text.textContent = message;
      registerStatus.appendChild(icon);
      registerStatus.appendChild(text);
      if(window.feather) window.feather.replace();
    }
  }

  if(registerForm && isAdmin){
    registerForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const username = document.getElementById('reg-username').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const roleVal = document.getElementById('reg-role').value;

      if(!username || !password){
        setRegisterStatus('error', 'Username dan password wajib diisi.');
        return;
      }

      setRegisterStatus('loading', 'Mendaftarkan user...');
      registerForm.querySelectorAll('input, select, button').forEach(el => el.disabled = true);

      try{
        const res = await fetch(`${API_BASE}/api/auth/register`, {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            username,
            email: email || undefined,
            password,
            role: roleVal
          })
        });

        if(!res.ok){
          if(res.status === 409) throw new Error('Username sudah dipakai.');
          throw new Error('Gagal mendaftarkan user. Kode: '+res.status);
        }

        setRegisterStatus('success', `User "${username}" berhasil didaftarkan dengan role "${roleVal}".`);
        registerForm.reset();
        
      }catch(err){
        console.error(err);
        setRegisterStatus('error', err.message);
      }finally{
        registerForm.querySelectorAll('input, select, button').forEach(el => el.disabled = false);
        setTimeout(()=> setRegisterStatus('', ''), 4000);
      }
    });
  }
})();


