/**
 * Modul Integrasi Google Sign-In & Validasi Format Telepon
 */

// Google OAuth Client ID resmi
const GOOGLE_CLIENT_ID = "783222505177-p7ite7jetiathok0fl927tsmu5m0ae0m.apps.googleusercontent.com";

export function initGoogleAuth() {
  // Pastikan SDK Google 3rd-party Identity Services sudah terload
  if (window.google?.accounts?.id) {
    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        auto_select: false
      });

      const loginBox = document.getElementById('googleLoginBox');
      if (loginBox) {
        window.google.accounts.id.renderButton(loginBox, { 
          theme: "outline", 
          size: "small",
          text: "signin_with",
          shape: "rectangular"
        });
      }
    } catch (err) {
      console.error('Google Auth Init Error:', err);
    }
  } else {
    // Jika SDK belum termuat sempurna, coba inisialisasi ulang dalam 1 detik
    setTimeout(initGoogleAuth, 1000);
  }
}

function handleGoogleResponse(resp) {
  try {
    // Parse JWT token payload secara aman
    const base64Url = resp.credential.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const payload = JSON.parse(jsonPayload);

    // Autofill & Update UI Profil
    const nameEl = document.getElementById('custName');
    if (nameEl && payload.name) nameEl.value = payload.name;

    const picEl = document.getElementById('googlePic');
    if (picEl) picEl.src = payload.picture || '';

    const nameBox = document.getElementById('googleName');
    if (nameBox) nameBox.textContent = payload.name || '';

    const emailBox = document.getElementById('googleEmail');
    if (emailBox) emailBox.textContent = payload.email || '';

    const loginBox = document.getElementById('googleLoginBox');
    if (loginBox) loginBox.classList.add('hidden');

    const profileBox = document.getElementById('googleProfileBox');
    if (profileBox) profileBox.classList.remove('hidden');

    const statusEl = document.getElementById('googleLoginStatus');
    if (statusEl) statusEl.textContent = 'Terhubung';

  } catch (e) {
    console.error('Google token parse error', e);
  }
}

export function googleLogout() {
  const loginBox = document.getElementById('googleLoginBox');
  if (loginBox) loginBox.classList.remove('hidden');

  const profileBox = document.getElementById('googleProfileBox');
  if (profileBox) profileBox.classList.add('hidden');

  const statusEl = document.getElementById('googleLoginStatus');
  if (statusEl) statusEl.textContent = 'Opsional';

  if (window.google?.accounts?.id) {
    window.google.accounts.id.disableAutoSelect();
  }
}

export function normalizePhoneForWA(raw) {
  if (!raw) return '';
  let p = String(raw).replace(/[^0-9]/g, '');
  if (p.startsWith('0')) p = p.replace(/^0+/, '');
  if (p.startsWith('8')) p = '62' + p;
  p = p.replace(/^0+/, '');
  if (!p.startsWith('62')) {
    if (p.length >= 9 && p.length <= 13) {
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