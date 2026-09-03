// ==========================================
// CONFIG & STATE LOKASI / GPS
// ==========================================
import { WARUNG, state, fmt } from './config.js';
import { updateCartUI } from './cart.js';

let autoGpsAttempted = false;

// ==========================================
// FUNGSI MATEMATIKA / HAVERSINE (HITUNG JARAK)
// ==========================================
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius bumi dalam KM
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + 
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function parseLatLng(input) {
  if (!input) return null;
  let m = String(input).match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/); 
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  m = String(input).match(/@(-?\d+\.\d+),(-?\d+\.\d+)/); 
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }; 
  return null;
}

// ==========================================
// ULTIMATE AUTOMATIC GPS DETECTION
// ==========================================
export function autoDetectGps(force = false) {
  if (autoGpsAttempted && !force) autoGpsAttempted = false;
  autoGpsAttempted = true;
  
  if (!navigator.geolocation) { 
    autoGpsAttempted = false; 
    return; 
  }

  navigator.geolocation.getCurrentPosition((pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const acc = pos.coords.accuracy;
    
    state.lastValidCoords = { lat, lng };
    state.mapLocked = true; 
    state.mapValidated = true; 
    state.gpsValidated = true;

    const mapsField = document.getElementById('custMaps') || document.getElementById('customerMaps');
    if (mapsField) {
      mapsField.value = `https://www.google.com/maps?q=${lat},${lng}`;
      mapsField.placeholder = `${lat.toFixed(6)}, ${lng.toFixed(6)} • terkunci`;
    }

    const miniInfo = document.getElementById('gpsMiniInfo');
    if (miniInfo) {
      miniInfo.textContent = `Akurasi ±${Math.round(acc)}m • Klik Kunci untuk validasi real`;
    }

    checkMapValidationUI();
    updateOngkir();
    autoGpsAttempted = false;
  }, (err) => {
    autoGpsAttempted = false;
    console.log('GPS fail', err);
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
}

// Shortcut Trigger Tombol "📍 GPS"
export function getGPS() { 
  return autoDetectGps(true);
}

// Digunakan saat checkout modal terbuka
export function silentAutoGpsOnCheckout() {
  const mapsField = document.getElementById('custMaps');
  if (!mapsField) return;
  
  if (!state.mapLocked) {
    autoDetectGps(true);
  } else if (mapsField.value && !state.lastValidCoords) {
    const m = mapsField.value.match(/@?(-?\d+\.\d+),(-?\d+\.\d+)/) || 
              mapsField.value.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (m) { 
      state.lastValidCoords = { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }; 
      updateOngkir();
    }
  }
}

// ==========================================
// SYSTEM KUNCI MAP & HITUNG ONGKIR
// ==========================================
export function toggleLockMap() {
  if (!state.lastValidCoords) { 
    alert('Klik GPS dulu untuk dapat koordinat valid'); 
    return; 
  }
  state.mapLocked = !state.mapLocked; 
  state.mapValidated = state.mapLocked;
  checkMapValidationUI();
  updateOngkir();
}

export function lockManualMap() {
  const mapsField = document.getElementById('custMaps') || document.getElementById('customerMaps');
  const mapsVal = mapsField ? mapsField.value.trim() : '';
  if (!mapsVal) { alert('Isi link Maps dulu'); return; }
  
  const m = mapsVal.match(/@?(-?\d+\.\d+),(-?\d+\.\d+)/) || 
            mapsVal.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) { state.lastValidCoords = { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }; }
  
  state.mapLocked = true; 
  state.mapValidated = true;
  checkMapValidationUI();
  updateOngkir();
}

export function checkMapValidationUI() {
  const lockBtn = document.getElementById('btnLock'); 
  const dot = document.getElementById('gpsStatusDot'); 
  const lockStatus = document.getElementById('gpsLockStatus');
  const codBtn = document.getElementById('btnBayarCOD');

  if (state.mapLocked) {
    if (lockBtn) {
      lockBtn.textContent = '🔒 Terkunci Hijau ✓'; 
      lockBtn.className = 'flex-1 rounded-full bg-[#22c55e] text-black py-2.5 text-[11px] font-bold';
    }
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-[#22c55e]';
    if (lockStatus) {
      lockStatus.textContent = 'Terkunci ✓'; 
      lockStatus.className = 'ml-2 text-[10px] px-2 py-0.5 rounded-full bg-[#22c55e]/20 text-[#22c55e] font-bold';
    }
    if (codBtn) { 
      codBtn.disabled = false; 
      codBtn.classList.remove('opacity-40'); 
    }
  } else {
    if (lockBtn) {
      lockBtn.textContent = '🔓 Kunci & Validasi'; 
      lockBtn.className = 'flex-1 rounded-full bg-white/10 border border-white/10 py-2.5 text-[11px] font-bold';
    }
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-yellow-500 animate-pulse';
    if (lockStatus) {
      lockStatus.textContent = 'Belum Kunci'; 
      lockStatus.className = 'ml-2 text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400';
    }
    if (state.curJarak > 0 && document.getElementById('custMaps')?.value) { 
      if (codBtn) { codBtn.disabled = true; } 
    }
  }
}

export function updateOngkir() {
  const valOngkirEl = document.getElementById('ongkirVal');
  const noteEl = document.getElementById('ongkirNote');
  
  if (!state.lastValidCoords) { 
    state.curOngkir = 0; 
    state.curJarak = 0; 
    if (valOngkirEl) valOngkirEl.textContent = 'Belum ada GPS'; 
    if (noteEl) noteEl.textContent = 'Klik GPS dulu'; 
    return; 
  }

  const dist = haversine(WARUNG.lat, WARUNG.lng, state.lastValidCoords.lat, state.lastValidCoords.lng);
  state.curJarak = dist;

  const freeR = Number(state.WARUNG_CONFIG?.free_radius_km || 0.5); 
  const pricePer100 = Number(state.WARUNG_CONFIG?.price_per_100m || 300);
  const maxR = Number(state.WARUNG_CONFIG?.max_radius_km || 10);

  let ongkir = 0; 
  if (dist > freeR) { 
    const meters = dist * 1000; 
    const blocks = Math.ceil(meters / 100); 
    ongkir = blocks * pricePer100; 
  }
  state.curOngkir = ongkir;

  if (valOngkirEl) {
    valOngkirEl.textContent = ongkir === 0 ? 'GRATIS 🎉' : (typeof fmt === 'function' ? fmt(ongkir) : `Rp ${ongkir.toLocaleString('id-ID')}`) + ` (${dist.toFixed(2)}km)`;
  }
  if (noteEl) {
    noteEl.textContent = dist > maxR ? 
      `⛔ Diluar radius ${maxR}km - Pilih Pickup` : 
      `Jarak ${dist.toFixed(3)}km • Rumus ceil(m/100)*${pricePer100}`;
  }

  if (typeof updateCartUI === 'function') updateCartUI();
}

// ==========================================
// REGISTRASI KE WINDOW (GLOBAL BINDING)
// ==========================================
window.ModulesGps = {
  haversine,
  parseLatLng,
  autoDetectGps,
  getGPS,
  silentAutoGpsOnCheckout,
  toggleLockMap,
  lockManualMap,
  checkMapValidationUI,
  updateOngkir
};