/**
 * Modul Konfigurasi Global Aplikasi & Warung
 */
export const API_BASE = (localStorage.getItem('api_base') || 'https://nasgor-v2.welybudiprasetya.workers.dev').trim().replace(/\/$/, '');

export const WARUNG = {
  lat: -8.0959324,
  lng: 111.6350933,
  name: "Warung Nasgor Pak W",
  maps: "https://www.google.com/maps?q=-8.0959324,111.6350933"
};

export const state = {
  WARUNG_CONFIG: null,
  WARUNG_IS_OPEN: true,
  WARUNG_CLOSED_MSG: "Warung tutup",
  menus: [],
  cart: JSON.parse(localStorage.getItem('npw_cart') || '[]'),
  curDetail: null,
  curQty: 1,
  curAddons: {},
  curVariant: null,
  curPedas: null,
  curOrderId: null,
  currentFilter: 'all',
  mapLocked: false,
  gpsValidated: false,
  mapValidated: false,
  lastValidCoords: null,
  curOngkir: 0,
  curJarak: 0,
  pendingPayload: null,
  pendingWAUrl: '',
  dbSaved: false,
  lastWA: ''
};

export function fmt(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

export function parseLatLng(input) {
  if (!input) return null;
  let m = String(input).match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  m = String(input).match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  return null;
}

export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Mengatur status disabled pada tombol transaksi berdasarkan status warung dan slot Pre-Order
 */
export function updateWarungStatusUI() {
  const isClosed = !state.WARUNG_IS_OPEN;
  const preorderSlot = document.getElementById('preorderSlot')?.value || '';
  
  // Jika warung tutup DAN pelanggan tidak memilih jam Pre-Order, tombol dinonaktifkan
  const shouldDisable = isClosed && !preorderSlot;

  const btnOpenCheckout = document.getElementById('btnOpenCheckout');
  const btnBayarCOD = document.getElementById('btnBayarCOD');
  const btnBayarPickup = document.getElementById('btnBayarPickup');

  if (btnOpenCheckout) {
    btnOpenCheckout.disabled = shouldDisable;
    if (shouldDisable) {
      btnOpenCheckout.classList.add('opacity-50', 'cursor-not-allowed');
      btnOpenCheckout.innerText = 'Warung Tutup';
    } else {
      btnOpenCheckout.classList.remove('opacity-50', 'cursor-not-allowed');
      btnOpenCheckout.innerText = 'Checkout';
    }
  }

  if (btnBayarCOD) {
    btnBayarCOD.disabled = shouldDisable;
    if (shouldDisable) {
      btnBayarCOD.classList.add('opacity-40', 'pointer-events-none');
    } else {
      btnBayarCOD.classList.remove('opacity-40', 'pointer-events-none');
    }
  }

  if (btnBayarPickup) {
    btnBayarPickup.disabled = shouldDisable;
    if (shouldDisable) {
      btnBayarPickup.classList.add('opacity-40', 'pointer-events-none');
    } else {
      btnBayarPickup.classList.remove('opacity-40', 'pointer-events-none');
    }
  }
}

export async function fetchWarungConfig() {
  try {
    const r = await fetch(API_BASE + '/api/settings', { cache: 'no-store' });
    if (r.ok) {
      const cfg = await r.json();
      state.WARUNG_CONFIG = cfg;
      if (cfg.lat) WARUNG.lat = cfg.lat;
      if (cfg.lng) WARUNG.lng = cfg.lng;
      if (cfg.maps) WARUNG.maps = cfg.maps;
      if (cfg.name) WARUNG.name = cfg.name;
      state.WARUNG_IS_OPEN = cfg.is_open !== false;
      state.WARUNG_CLOSED_MSG = cfg.closed_message || "Warung tutup";
      
      document.getElementById('radiusText').textContent = cfg.max_radius_km || 10;
      document.getElementById('freeText').textContent = (cfg.free_radius_km || 0.5) * 1000;
      document.getElementById('warungMapsLink').href = cfg.maps;
      
      localStorage.setItem('warung_config', JSON.stringify(cfg));
      updateWarungOpenUI(cfg);
      return cfg;
    }
  } catch (e) {
    console.log('config fail', e);
  }
  
  try {
    const cached = JSON.parse(localStorage.getItem('warung_config') || 'null');
    if (cached) {
      state.WARUNG_CONFIG = cached;
      WARUNG.lat = cached.lat || WARUNG.lat;
      WARUNG.lng = cached.lng || WARUNG.lng;
      state.WARUNG_IS_OPEN = cached.is_open !== false;
      state.WARUNG_CLOSED_MSG = cached.closed_message || state.WARUNG_CLOSED_MSG;
      updateWarungOpenUI(cached);
      return cached;
    }
  } catch {}
  
  updateWarungOpenUI({ is_open: true, open_time: '17:00', close_time: '22:00', closed_message: state.WARUNG_CLOSED_MSG });
  return WARUNG;
}

export function updateWarungOpenUI(cfg) {
  const closedBanner = document.getElementById('warungClosedBanner');
  const openBanner = document.getElementById('warungOpenBanner');
  const closedMsg = document.getElementById('warungClosedMessage');
  const closedTime = document.getElementById('warungClosedTime');
  const openInfo = document.getElementById('warungOpenInfo');
  
  if (!cfg) return;
  const isOpen = cfg.is_open !== false;
  if (isOpen) {
    closedBanner.classList.add('hidden');
    openBanner.classList.remove('hidden');
    openInfo.textContent = `Buka ${cfg.open_time || '17:00'}-${cfg.close_time || '22:00'} • Bisa order`;
  } else {
    closedBanner.classList.remove('hidden');
    openBanner.classList.add('hidden');
    closedMsg.textContent = cfg.closed_message || state.WARUNG_CLOSED_MSG;
    closedTime.textContent = `Jam buka: ${cfg.open_time || '17:00'}-${cfg.close_time || '22:00'} WIB`;
  }
  state.WARUNG_IS_OPEN = isOpen;
  
  // Sinkronisasi status tombol setiap kali status buka/tutup diperbarui
  updateWarungStatusUI();
}