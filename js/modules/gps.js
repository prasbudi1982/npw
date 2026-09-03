/**
 * Modul Geolocation GPS, Penguncian, dan Perhitungan Ongkir Presisi
 */
import { WARUNG, state, fmt, haversine } from './config.js';

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

export function checkMapValidationUI() {
  const lockBtn = document.getElementById('btnLock');
  const dot = document.getElementById('gpsStatusDot');
  const lockStatus = document.getElementById('gpsLockStatus');
  const codBtn = document.getElementById('btnBayarCOD');

  if (state.mapLocked) {
    lockBtn.textContent = '🔒 Terkunci Hijau ✓';
    lockBtn.className = 'flex-1 rounded-full bg-[#22c55e] text-black py-2.5 text-[11px] font-bold';
    dot.className = 'w-2 h-2 rounded-full bg-[#22c55e]';
    lockStatus.textContent = 'Terkunci ✓';
    lockStatus.className = 'ml-2 text-[10px] px-2 py-0.5 rounded-full bg-[#22c55e]/20 text-[#22c55e] font-bold';
    if (codBtn) {
      codBtn.disabled = false;
      codBtn.classList.remove('opacity-40');
    }
  } else {
    lockBtn.textContent = '🔓 Kunci & Validasi';
    lockBtn.className = 'flex-1 rounded-full bg-white/10 border border-white/10 py-2.5 text-[11px] font-bold';
    dot.className = 'w-2 h-2 rounded-full bg-yellow-500 animate-pulse';
    lockStatus.textContent = 'Belum Kunci';
    lockStatus.className = 'ml-2 text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400';
    if (state.curJarak > 0 && document.getElementById('custMaps').value) {
      if (codBtn) {
        codBtn.disabled = true;
      }
    }
  }
}

export function updateOngkir() {
  if (!state.WARUNG_CONFIG) return;
  if (!state.lastValidCoords) {
    state.curOngkir = 0;
    state.curJarak = 0;
    document.getElementById('ongkirVal').textContent = 'Belum ada GPS';
    document.getElementById('ongkirNote').textContent = 'Klik GPS dulu';
    return;
  }

  const dist = haversine(WARUNG.lat, WARUNG.lng, state.lastValidCoords.lat, state.lastValidCoords.lng);
  state.curJarak = dist;

  const freeR = Number(state.WARUNG_CONFIG.free_radius_km || 0.5);
  const pricePer100 = Number(state.WARUNG_CONFIG.price_per_100m || 300);

  let ongkir = 0;
  if (dist > freeR) {
    const meters = dist * 1000;
    const blocks = Math.ceil(meters / 100);
    ongkir = blocks * pricePer100;
  }
  state.curOngkir = ongkir;

  document.getElementById('ongkirVal').textContent = ongkir === 0 ? 'GRATIS 🎉' : fmt(ongkir) + ` (${dist.toFixed(2)}km)`;
  document.getElementById('ongkirNote').textContent = dist > Number(state.WARUNG_CONFIG.max_radius_km || 10) ? `⛔ Diluar radius ${state.WARUNG_CONFIG.max_radius_km}km - Pilih Pickup` : `Jarak ${dist.toFixed(3)}km • Rumus ceil(m/100)*${pricePer100}`;

  const sub = state.cart.reduce((a, b) => a + b.totalPrice, 0);
  document.getElementById('subtotalVal').textContent = fmt(sub);
  document.getElementById('totalVal').textContent = fmt(sub + ongkir);
}

export function autoDetectGps(isManual = false) {
  const btn = document.getElementById('btnGPS');
  if (btn) {
    btn.textContent = '⏳...';
    btn.disabled = true;
  }

  if (!navigator.geolocation) {
    if (isManual) alert('Geolocation tidak support');
    if (btn) { btn.textContent = '📍 GPS'; btn.disabled = false; }
    return;
  }

  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const acc = pos.coords.accuracy;

    state.lastValidCoords = { lat, lng };
    state.gpsValidated = true;
    state.mapLocked = true;
    state.mapValidated = true;

    const mapsStr = `${lat.toFixed(7)},${lng.toFixed(7)}`;
    document.getElementById('custMaps').value = mapsStr;
    document.getElementById('gpsMiniInfo').textContent = `Akurasi ±${Math.round(acc)}m • Klik Kunci untuk validasi real`;
    document.getElementById('gpsStatusDot').className = 'w-2 h-2 rounded-full bg-[#22c55e]';

    checkMapValidationUI();
    updateOngkir();

    if (btn) {
      btn.textContent = '✅ GPS OK';
      btn.disabled = false;
      setTimeout(() => { btn.textContent = '📍 GPS'; }, 1500);
    }
  }, err => {
    if (isManual) alert('Gagal GPS: ' + err.message);
    if (btn) { btn.textContent = '📍 GPS'; btn.disabled = false; }
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
}

export function silentAutoGpsOnCheckout() {
  if (document.getElementById('custMaps').value.trim()) return;
  autoDetectGps(false);
}