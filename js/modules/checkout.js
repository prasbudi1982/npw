/**
 * Modul Proses Checkout, Simpan Order Ke Backend & Redirect WhatsApp
 */
import { API_BASE, WARUNG, state, fmt, parseLatLng, updateWarungStatusUI } from './config.js';
import { updateCartUI } from './cart.js';

export function autofillCustomerFromHistory() {
  try {
    const profile = JSON.parse(localStorage.getItem('npw_customer_profile') || localStorage.getItem('npw_last_customer') || 'null') || JSON.parse(localStorage.getItem('npw_history') || '[]')[0]?.customer || null;
    if (!profile) return;
    
    const nameEl = document.getElementById('custName');
    const phoneEl = document.getElementById('custPhone');
    const addrEl = document.getElementById('custAddr');
    const mapsEl = document.getElementById('custMaps');

    if (nameEl && !nameEl.value && profile.name) nameEl.value = profile.name;
    if (phoneEl && !phoneEl.value && (profile.phone || profile.hp)) phoneEl.value = profile.phone || profile.hp;
    if (addrEl && !addrEl.value && (profile.address || profile.alamat)) addrEl.value = profile.address || profile.alamat;
    if (mapsEl && !mapsEl.value && profile.maps) mapsEl.value = profile.maps;
  } catch (e) {
    console.log('autofill fail', e);
  }
}

export function openCheckout() {
  if (state.cart.length === 0) {
    alert('Keranjang kosong');
    return;
  }
  autofillCustomerFromHistory();
  
  // Perbarui UI tombol sesuai status warung dan slot Pre-Order yang dipilih
  updateWarungStatusUI();
  
  document.getElementById('checkoutModal').classList.remove('hidden');

  // =========================================================
  // TRIGGER DETEKSI GPS OTOMATIS SAAT MODAL CHECKOUT DIBUKA
  // =========================================================
  if (window.ModulesGps) {
    if (typeof window.ModulesGps.silentAutoGpsOnCheckout === 'function') {
      window.ModulesGps.silentAutoGpsOnCheckout();
    } else if (typeof window.ModulesGps.autoDetectGps === 'function') {
      window.ModulesGps.autoDetectGps(true);
    }
  }
}

export function bayar(method) {
  if (state.cart.length === 0) { alert('Keranjang kosong!'); return; }

  // Proteksi Tambahan: Blokir transaksi jika warung tutup dan Pre-Order belum dipilih
  const slot = document.getElementById('preorderSlot')?.value || '';
  if (!state.WARUNG_IS_OPEN && !slot) {
    alert('⛔ Mohon maaf, warung sedang TUTUP. Silakan tentukan jam Pre-Order terlebih dahulu di menu atas!');
    return;
  }
  
  const name = document.getElementById('custName').value.trim();
  let phone = document.getElementById('custPhone').value.trim();
  const addr = document.getElementById('custAddr').value.trim();
  const mapsCheck = document.getElementById('custMaps').value.trim();

  if (!name || !phone || !addr) { alert('Nama, HP, Alamat wajib diisi'); return; }

  const isValidPhone = window.ModulesAuth ? window.ModulesAuth.isValidIndonesianPhone(phone) : true;
  if (!isValidPhone) {
    alert('Nomor HP tidak valid.\nContoh valid: 0812xxxxxxx atau 62812xxxxxxx\nHarus nomor HP Indonesia aktif WA.');
    const el = document.getElementById('custPhone');
    if (el) { el.focus(); el.classList.add('border-red-500', '!border-red-500'); }
    return;
  }
  
  phone = window.ModulesAuth ? window.ModulesAuth.normalizePhoneForWA(phone) : phone;

  if (method !== 'pickup') {
    const latLng = parseLatLng(mapsCheck);
    if (!latLng) { alert('GPS belum terkunci. Klik GPS dulu.'); return; }
    if (!state.mapLocked) { alert('Wajib Kunci & Validasi hijau untuk COD. Klik tombol Kunci & Validasi.'); return; }
    if (state.WARUNG_CONFIG && state.curJarak > Number(state.WARUNG_CONFIG.max_radius_km || 10)) {
      alert(`Jarak ${state.curJarak.toFixed(2)}km melebihi radius ${state.WARUNG_CONFIG.max_radius_km}km - Pilih Pickup`);
      return;
    }
  }

  const sub = state.cart.reduce((a, b) => a + b.totalPrice, 0);
  const grand = sub + (method === 'pickup' ? 0 : state.curOngkir);
  const tableNoValue = addr + " | Maps: " + mapsCheck + " | Jarak: " + (state.curJarak ? state.curJarak.toFixed(3) + 'km' : '-') + " | Ongkir: " + (state.curOngkir === 0 ? "Gratis" : fmt(state.curOngkir)) + " | Warung: " + WARUNG.maps + " | Metode: " + method.toUpperCase() + (slot ? " | Pre-Order: " + slot : "") + " | COD/Pickup Only";

  state.curOrderId = 'NPW-' + Math.floor(100000 + Math.random() * 900000);
  document.getElementById('payOrderId').textContent = state.curOrderId;
  document.getElementById('payTotal').textContent = fmt(grand);

  let rincian = `Halo Nasgor Pak W, ada pesanan baru!\n\nOrder: ${state.curOrderId}\nNama: ${name}\nHP: ${phone}\nAlamat: ${addr}\nMaps: ${mapsCheck}\n`;
  if (state.curJarak > 0) rincian += `Jarak: ${state.curJarak.toFixed(2)}km | Ongkir: ${state.curOngkir === 0 ? 'Gratis' : fmt(state.curOngkir)}\n`;
  if (slot) rincian += `Pre-Order: ${slot} WIB\n`;
  
  rincian += `\nPesanan:\n`;
  state.cart.forEach((c, i) => {
    rincian += `${i + 1}. ${c.name} ${c.variantLabel !== 'Biasa' ? '(' + c.variantLabel + ')' : ''} x${c.qty} = ${fmt(c.totalPrice)}\n`;
    if (c.pedasLabel) rincian += `   Pedas: ${c.pedasLabel}\n`;
    if (c.addons && c.addons.length > 0) rincian += `   Addon: ${c.addons.map(a => a.qty + 'x ' + a.label).join(', ')}\n`;
    if (c.note) rincian += `   Catatan: ${c.note}\n`;
  });

  rincian += `\nSubtotal: ${fmt(sub)}\nOngkir: ${state.curOngkir === 0 ? 'Gratis' : fmt(state.curOngkir)}\nTOTAL: ${fmt(grand)}\n\nMetode: ${method.toUpperCase()}\n`;
  
  document.getElementById('payOrderDetail').textContent = rincian;
  state.lastWA = rincian;

  const waUrl = "https://wa.me/6282296728478?text=" + encodeURIComponent(rincian);
  document.getElementById('waLink').href = waUrl;

  document.getElementById('checkoutModal').classList.add('hidden');
  document.getElementById('cartBar').classList.add('hidden');
  document.getElementById('paymentModal').classList.remove('hidden');

  const payload = {
    mode: method === 'pickup' ? "pickup" : "delivery",
    payment_method: method,
    tableNo: tableNoValue,
    table_no: tableNoValue,
    customer: { name, phone, address: addr, mapsLink: mapsCheck },
    total_before_fee: sub,
    total: grand,
    ongkir: method === 'pickup' ? 0 : state.curOngkir,
    jarak_km: state.curJarak,
    warung: { lat: WARUNG.lat, lng: WARUNG.lng, maps: WARUNG.maps },
    map_locked: state.mapLocked,
    map_validated: state.mapValidated,
    gps_validated: state.gpsValidated,
    scheduled_time: slot || null,
    cart: state.cart.map(c => ({
      menuId: c.menuId, name: c.name, variantLabel: c.variantLabel,
      pedasLabel: c.pedasLabel, addons: c.addons, note: c.note || "",
      qty: c.qty, unitPrice: c.unitPrice, totalPrice: c.totalPrice, emoji: c.emoji
    }))
  };

  state.pendingPayload = payload;
  state.pendingWAUrl = waUrl;
  state.dbSaved = false;
}

export function handleWAConfirm(e) {
  e.preventDefault();
  const waLinkEl = document.getElementById('waLink');

  if (state.cart.length === 0 && !state.pendingPayload) {
    alert('Keranjang kosong');
    closePaymentAndClearCart();
    return false;
  }

  if (state.dbSaved) {
    window.open(state.pendingWAUrl, '_blank');
    closePaymentAndClearCart();
    return false;
  }

  waLinkEl.textContent = 'Menyimpan real & validasi server...';
  waLinkEl.style.pointerEvents = 'none';

  fetch(API_BASE + "/api/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state.pendingPayload)
  })
  .then(r => r.json().then(j => ({ ok: r.ok, status: r.status, json: j })).catch(() => ({ ok: r.ok, json: null })))
  .then(res => {
    if (!res.ok) {
      alert('❌ Validasi server gagal: ' + (res.json?.error || 'Unknown') + '\nKode: ' + (res.json?.code || ''));
      waLinkEl.textContent = '📲 Konfirmasi WA & Simpan (Real)';
      waLinkEl.style.pointerEvents = 'auto';
      return;
    }

    if (res.json && res.json.orderId) {
      state.curOrderId = res.json.orderId;
      document.getElementById('payOrderId').textContent = state.curOrderId;
      
      let newRincian = state.lastWA.replace(/NPW-\d+/, state.curOrderId);
      state.lastWA = newRincian;
      document.getElementById('payOrderDetail').textContent = newRincian;
      
      state.pendingWAUrl = "https://wa.me/6282296728478?text=" + encodeURIComponent(newRincian);
      waLinkEl.href = state.pendingWAUrl;
      localStorage.setItem('last_order_id', state.curOrderId);

      const hist = JSON.parse(localStorage.getItem('npw_history') || '[]');
      const menuNames = (state.pendingPayload.cart || []).map(c => `${c.qty}x ${c.name} ${c.variantLabel || ''}`).join(', ');

      hist.unshift({
        id: state.curOrderId,
        menuNames: menuNames,
        cart: state.pendingPayload.cart,
        customer: state.pendingPayload.customer,
        total: res.json.total,
        created_at: new Date().toISOString()
      });

      try {
        const custProfile = {
          name: state.pendingPayload.customer.name || document.getElementById('custName')?.value || '',
          phone: state.pendingPayload.customer.phone || document.getElementById('custPhone')?.value || '',
          address: state.pendingPayload.customer.address || document.getElementById('custAddr')?.value || '',
          maps: state.pendingPayload.customer.mapsLink || document.getElementById('custMaps')?.value || '',
          updated_at: new Date().toISOString()
        };
        localStorage.setItem('npw_customer_profile', JSON.stringify(custProfile));
        localStorage.setItem('npw_last_customer', JSON.stringify(custProfile));
      } catch (e) {}

      localStorage.setItem('npw_history', JSON.stringify(hist.slice(0, 10)));
    }

    state.dbSaved = true;
    waLinkEl.textContent = 'Membuka WA...';

    setTimeout(() => {
      window.open(state.pendingWAUrl, '_blank');
      setTimeout(() => { closePaymentAndClearCart(); }, 1000);
    }, 600);
  })
  .catch(err => {
    console.error('Fetch error:', err);
    alert('❌ Failed to fetch - Worker tidak bisa dihubungi:\n' + err.message + '\n\n1) Pastikan Worker https://nasgor-v2.welybudiprasetya.workers.dev/api/config bisa dibuka\n2) Cek internet\n3) Coba buka di tab baru: ' + API_BASE + '/api/config');
    waLinkEl.textContent = '📲 Konfirmasi WA & Simpan';
    waLinkEl.style.pointerEvents = 'auto';
  });

  return false;
}

export function closePaymentAndClearCart() {
  state.cart = [];
  state.curAddons = {};
  state.curQty = 1;
  localStorage.removeItem('npw_cart');
  updateCartUI();

  document.getElementById('cartBar').classList.add('hidden');
  document.getElementById('checkoutModal').classList.add('hidden');
  document.getElementById('paymentModal').classList.add('hidden');

  state.pendingPayload = null;
  state.dbSaved = false;
  state.gpsValidated = false;
  state.mapValidated = false;
  state.mapLocked = false;
  state.lastValidCoords = null;
  state.curOngkir = 0;
  state.curJarak = 0;

  if (window.ModulesGps) window.ModulesGps.checkMapValidationUI();

  const waLinkEl = document.getElementById('waLink');
  if (waLinkEl) {
    waLinkEl.textContent = '📲 Konfirmasi WA & Simpan (Real)';
    waLinkEl.style.pointerEvents = 'auto';
    waLinkEl.href = '#';
  }
}

export function closePaymentModal() {
  document.getElementById('paymentModal').classList.add('hidden');
  if (state.dbSaved) {
    closePaymentAndClearCart();
  } else {
    if (state.cart.length > 0) document.getElementById('cartBar').classList.remove('hidden');
  }
}

export function openTracking() {
  const id = localStorage.getItem('last_order_id') || state.curOrderId;
  if (!id) { alert('Belum ada order real'); return; }
  const trackUrl = 'track.html?id=' + encodeURIComponent(id);
  window.open(trackUrl, '_blank');
}

export function copyWA() {
  if (!state.lastWA) { alert('Belum ada pesanan'); return; }
  navigator.clipboard.writeText(state.lastWA).then(() => alert('Dicopy!'));
}

// =========================================================
// INISIATOR EVENT LISTENER (LISTENER PASTE/INPUT MAPS MANUAL)
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
  const mapsInput = document.getElementById('custMaps') || document.getElementById('customerMaps');
  if (mapsInput) {
    mapsInput.addEventListener('input', () => {
      if (window.ModulesGps && typeof window.ModulesGps.lockManualMap === 'function') {
        window.ModulesGps.lockManualMap();
      }
    });
  }
});