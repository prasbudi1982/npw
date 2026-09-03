/**
 * Modul Integrasi Google Sign-In & Validasi Format Telepon
 */
export function initGoogleAuth() {
  if (window.google?.accounts?.id) {
    window.google.accounts.id.initialize({
      client_id: "831922896501-o46m51i98g921o49l4o1q2k3k21.apps.googleusercontent.com",
      callback: handleGoogleResponse
    });
    
    const loginBox = document.getElementById('googleLoginBox');
    if (loginBox) {
      window.google.accounts.id.renderButton(loginBox, { theme: "outline", size: "small" });
    }
  }
}

function handleGoogleResponse(resp) {
  try {
    const payload = JSON.parse(atob(resp.credential.split('.')[1]));
    document.getElementById('custName').value = payload.name || '';
    
    document.getElementById('googlePic').src = payload.picture || '';
    document.getElementById('googleName').textContent = payload.name || '';
    document.getElementById('googleEmail').textContent = payload.email || '';
    
    document.getElementById('googleLoginBox').classList.add('hidden');
    document.getElementById('googleProfileBox').classList.remove('hidden');
    document.getElementById('googleLoginStatus').textContent = 'Terhubung';
  } catch (e) {
    console.error('Google token parse error', e);
  }
}

export function googleLogout() {
  document.getElementById('googleLoginBox').classList.remove('hidden');
  document.getElementById('googleProfileBox').classList.add('hidden');
  document.getElementById('googleLoginStatus').textContent = 'Opsional';
}

export function normalizePhoneForWA(raw) {
  if (!raw) return '';
  let p = String(raw).replace(/[^0-9]/g, '');
  if (p.startsWith('0')) p = p.replace(/^0+/, '');
  if (p.startsWith('8')) p = '62' + p;
  p = p.replace(/^0+/, '');
  if (!p.startsWith('62')) {
    if (p.length >= 9 && p.length <= 13 && !p.startsWith('62')) {
      p = '62' + p.replace(/^0+/, '');
    }
  }
  return p;
}

export function isValidIndonesianPhone(raw) {
  const p = normalizePhoneForWA(raw);
  if (!p) return false;
  if (p.length < 10 || p.length > 15) return false;
  if (!p.startsWith('62')) return false;
  const after62 = p.slice(2);
  if (!after62.startsWith('8')) return false;
  if (/^([0-9])\1+$/.test(p)) return false;
  return true;
}

export function validatePhoneField() {
  const el = document.getElementById('custPhone');
  if (!el) return true;
  const raw = el.value.trim();
  const ok = isValidIndonesianPhone(raw);
  if (!ok) {
    el.classList.add('!border-red-500', 'border-red-500');
    return false;
  } else {
    el.classList.remove('!border-red-500', 'border-red-500');
    return true;
  }
}

export function setupPhoneValidationEvents() {
  const ph = document.getElementById('custPhone');
  if (ph) {
    ph.setAttribute('inputmode', 'numeric');
    ph.setAttribute('placeholder', 'HP WA (08xx / 628xx) *');
    
    ph.addEventListener('input', () => {
      let v = ph.value.replace(/[^0-9+\s\-]/g, '');
      if (v !== ph.value) ph.value = v;
      validatePhoneField();
    });
    
    ph.addEventListener('blur', () => {
      const norm = normalizePhoneForWA(ph.value.trim());
      if (isValidIndonesianPhone(ph.value)) {
        ph.value = norm;
      }
      validatePhoneField();
    });
  }
}