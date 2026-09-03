// ==========================================
// CONFIG & STATE LOKASI / GPS
// ==========================================
// Koordinat Warung (Default / Fallback)
const WARUNG = {
  lat: -8.0959324, 
  lng: 111.6350933, 
  name: "Warung Nasgor Pak W", 
  maps: "https://www.google.com/maps?q=-8.0959324,111.6350933"
};[cite: 19]

let WARUNG_CONFIG = null;[cite: 19]
let mapLocked = false; 
let gpsValidated = false; 
let mapValidated = false; 
let lastValidCoords = null;
let curOngkir = 0, curJarak = 0;[cite: 19]
let autoGpsAttempted = false;[cite: 19]

// ==========================================
// FUNGSI MATEMATIKA / HAVERSINE (HITUNG JARAK)
// ==========================================
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius bumi dalam KM
  const dLat = (lat2 - lat1) * Math.PI / 180;[cite: 19]
  const dLon = (lon2 - lon1) * Math.PI / 180;[cite: 19]
  const a = Math.sin(dLat / 2) ** 2 + 
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon / 2) ** 2;[cite: 19]
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));[cite: 19]
}

function parseLatLng(input) {
  if (!input) return null;[cite: 19]
  let m = String(input).match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/); 
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };[cite: 19]
  m = String(input).match(/@(-?\d+\.\d+),(-?\d+\.\d+)/); 
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }; 
  return null;[cite: 19]
}

// ==========================================
// ULTIMATE AUTOMATIC GPS DETECTION
// ==========================================
function autoDetectGps(force = false) {
  if (autoGpsAttempted && !force) autoGpsAttempted = false;[cite: 19]
  autoGpsAttempted = true;[cite: 19]
  
  if (!navigator.geolocation) { 
    autoGpsAttempted = false; 
    return; 
  }[cite: 19]

  navigator.geolocation.getCurrentPosition((pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;[cite: 19]
    const acc = pos.coords.accuracy;[cite: 19]
    
    lastValidCoords = { lat, lng };[cite: 19]
    mapLocked = true; 
    mapValidated = true; 
    gpsValidated = true;[cite: 19]

    const mapsField = document.getElementById('custMaps') || document.getElementById('customerMaps');[cite: 19]
    if (mapsField) {
      mapsField.value = `https://www.google.com/maps?q=${lat},${lng}`;[cite: 19]
      mapsField.placeholder = `${lat.toFixed(6)}, ${lng.toFixed(6)} • terkunci`;[cite: 19]
    }

    const miniInfo = document.getElementById('gpsMiniInfo');[cite: 19]
    if (miniInfo) {
      miniInfo.textContent = `Akurasi ±${Math.round(acc)}m • Klik Kunci untuk validasi real`;[cite: 19]
    }

    checkMapValidationUI();[cite: 19]
    updateOngkir();[cite: 19]
    autoGpsAttempted = false;[cite: 19]
  }, (err) => {
    autoGpsAttempted = false;[cite: 19]
    console.log('GPS fail', err);[cite: 19]
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });[cite: 19]
}

// Shortcut Trigger Tombol "📍 GPS"
function getGPS() { 
  return autoDetectGps(true);[cite: 19]
}

// Digunakan saat checkout modal terbuka
function silentAutoGpsOnCheckout() {
  const mapsField = document.getElementById('custMaps');[cite: 19]
  if (!mapsField) return;[cite: 19]
  if (!mapLocked) {
    autoDetectGps(true);[cite: 19]
  } else if (mapsField.value && !lastValidCoords) {
    const m = mapsField.value.match(/@?(-?\d+\.\d+),(-?\d+\.\d+)/) || 
              mapsField.value.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);[cite: 19]
    if (m) { 
      lastValidCoords = { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }; 
      if (typeof updateOngkir === 'function') updateOngkir();[cite: 19]
    }
  }
}

// ==========================================
// SYSTEM KUNCI MAP & HITUNG ONGKIR
// ==========================================
function toggleLockMap() {
  if (!lastValidCoords) { 
    alert('Klik GPS dulu untuk dapat koordinat valid'); 
    return; 
  }[cite: 19]
  mapLocked = !mapLocked; 
  mapValidated = mapLocked;[cite: 19]
  checkMapValidationUI();[cite: 19]
  updateOngkir();[cite: 19]
}

function lockManualMap() {
  const mapsField = document.getElementById('custMaps') || document.getElementById('customerMaps');[cite: 19]
  const mapsVal = mapsField ? mapsField.value.trim() : '';[cite: 19]
  if (!mapsVal) { alert('Isi link Maps dulu'); return; }[cite: 19]
  
  const m = mapsVal.match(/@?(-?\d+\.\d+),(-?\d+\.\d+)/) || 
            mapsVal.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);[cite: 19]
  if (m) { lastValidCoords = { lat: parseFloat(m[1]), lng: parseFloat(m[2]) }; }[cite: 19]
  
  mapLocked = true; 
  mapValidated = true;[cite: 19]
  if (typeof checkMapValidationUI === 'function') checkMapValidationUI();[cite: 19]
  if (typeof updateOngkir === 'function') updateOngkir();[cite: 19]
}

function checkMapValidationUI() {
  const lockBtn = document.getElementById('btnLock'); 
  const dot = document.getElementById('gpsStatusDot'); 
  const lockStatus = document.getElementById('gpsLockStatus');[cite: 19]
  const codBtn = document.getElementById('btnBayarCOD');[cite: 19]

  if (mapLocked) {
    if (lockBtn) {
      lockBtn.textContent = '🔒 Terkunci Hijau ✓'; 
      lockBtn.className = 'flex-1 rounded-full bg-[#22c55e] text-black py-2.5 text-[11px] font-bold';[cite: 19]
    }
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-[#22c55e]';[cite: 19]
    if (lockStatus) {
      lockStatus.textContent = 'Terkunci ✓'; 
      lockStatus.className = 'ml-2 text-[10px] px-2 py-0.5 rounded-full bg-[#22c55e]/20 text-[#22c55e] font-bold';[cite: 19]
    }
    if (codBtn) { 
      codBtn.disabled = false; 
      codBtn.classList.remove('opacity-40'); 
    }[cite: 19]
  } else {
    if (lockBtn) {
      lockBtn.textContent = '🔓 Kunci & Validasi'; 
      lockBtn.className = 'flex-1 rounded-full bg-white/10 border border-white/10 py-2.5 text-[11px] font-bold';[cite: 19]
    }
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-yellow-500 animate-pulse';[cite: 19]
    if (lockStatus) {
      lockStatus.textContent = 'Belum Kunci'; 
      lockStatus.className = 'ml-2 text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400';[cite: 19]
    }
    if (curJarak > 0 && document.getElementById('custMaps')?.value) { 
      if (codBtn) { codBtn.disabled = true; } 
    }[cite: 19]
  }
}

function updateOngkir() {
  const valOngkirEl = document.getElementById('ongkirVal');
  const noteEl = document.getElementById('ongkirNote');
  
  if (!lastValidCoords) { 
    curOngkir = 0; 
    curJarak = 0; 
    if (valOngkirEl) valOngkirEl.textContent = 'Belum ada GPS'; 
    if (noteEl) noteEl.textContent = 'Klik GPS dulu'; 
    return; 
  }[cite: 19]

  const dist = haversine(WARUNG.lat, WARUNG.lng, lastValidCoords.lat, lastValidCoords.lng);[cite: 19]
  curJarak = dist;[cite: 19]

  const freeR = Number(WARUNG_CONFIG?.free_radius_km || 0.5); 
  const pricePer100 = Number(WARUNG_CONFIG?.price_per_100m || 300);[cite: 19]
  const maxR = Number(WARUNG_CONFIG?.max_radius_km || 10);[cite: 19]

  let ongkir = 0; 
  if (dist > freeR) { 
    const meters = dist * 1000; 
    const blocks = Math.ceil(meters / 100); 
    ongkir = blocks * pricePer100; 
  }[cite: 19]
  curOngkir = ongkir;[cite: 19]

  if (valOngkirEl) {
    valOngkirEl.textContent = ongkir === 0 ? 'GRATIS 🎉' : `Rp ${ongkir.toLocaleString('id-ID')} (${dist.toFixed(2)}km)`;[cite: 19]
  }
  if (noteEl) {
    noteEl.textContent = dist > maxR ? 
      `⛔ Diluar radius ${maxR}km - Pilih Pickup` : 
      `Jarak ${dist.toFixed(3)}km • Rumus ceil(m/100)*${pricePer100}`;[cite: 19]
  }

  // Jika ada fungsi render keranjang, update totalnya
  if (typeof updateCartUI === 'function') updateCartUI();[cite: 19]
}