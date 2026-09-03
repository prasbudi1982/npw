/**
 * Main Entry Point (Routing & Event Initialization)
 */
import { fetchWarungConfig, state, updateWarungStatusUI } from './modules/config.js';
import { initTheme, toggleTheme } from './modules/theme.js';
import { loadMenu, filterKategori, changeDetailQty, closeDetail } from './modules/menu.js';
import { addToCart, openHistory, updateCartUI } from './modules/cart.js';
import { toggleLockMap, autoDetectGps, updateOngkir, silentAutoGpsOnCheckout, checkMapValidationUI } from './modules/gps.js';
import { initGoogleAuth, googleLogout, setupPhoneValidationEvents, isValidIndonesianPhone, normalizePhoneForWA } from './modules/auth.js';
import { openCheckout, bayar, handleWAConfirm, closePaymentModal, openTracking, copyWA } from './modules/checkout.js';

// Expose modules ke Global Window jika ada inline handler yang membutuhkan
window.ModulesAuth = { isValidIndonesianPhone, normalizePhoneForWA };
window.ModulesGps = { checkMapValidationUI };

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Inisialisasi Tema
  initTheme();
  document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

  // 2. Hide Splash Screen setelah load
  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    if (splash) splash.classList.add('hide');
  }, 600);

  // 3. Fetch Konfigurasi & Load Menu Real
  await fetchWarungConfig();
  await loadMenu();

  // Update status UI tombol setelah konfigurasi dimuat
  updateWarungStatusUI();

  // Event listener saat user mengganti slot Pre-Order
  document.getElementById('preorderSlot')?.addEventListener('change', () => {
    updateWarungStatusUI();
  });

  // 4. Bind Event Listener Kategori Tabs
  document.querySelectorAll('#categoryTabs .cat-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const cat = tab.getAttribute('data-cat');
      filterKategori(cat);
    });
  });

  // 5. Detail Modal Controls
  document.getElementById('btnCloseDetail')?.addEventListener('click', closeDetail);
  document.getElementById('detailOverlay')?.addEventListener('click', closeDetail);
  document.getElementById('btnQtyDec')?.addEventListener('click', () => changeDetailQty(-1));
  document.getElementById('btnQtyInc')?.addEventListener('click', () => changeDetailQty(1));
  document.getElementById('btnAddToCart')?.addEventListener('click', addToCart);

  const customReq = document.getElementById('customRequest');
  if (customReq) {
    customReq.addEventListener('input', (e) => {
      document.getElementById('customRequestCount').textContent = e.target.value.length;
    });
  }

  // 6. Checkout Modal Controls
  document.getElementById('btnOpenCheckout')?.addEventListener('click', () => {
    openCheckout();
    updateOngkir();
    setTimeout(() => { silentAutoGpsOnCheckout(); }, 500);
  });
  
  document.getElementById('btnCloseCheckout')?.addEventListener('click', () => {
    document.getElementById('checkoutModal').classList.add('hidden');
  });
  document.getElementById('checkoutOverlay')?.addEventListener('click', () => {
    document.getElementById('checkoutModal').classList.add('hidden');
  });

  // 7. GPS Controls
  document.getElementById('btnGPS')?.addEventListener('click', () => autoDetectGps(true));
  document.getElementById('btnLock')?.addEventListener('click', toggleLockMap);

  // 8. Payment Action Controls
  document.getElementById('btnBayarCOD')?.addEventListener('click', () => bayar('cod'));
  document.getElementById('btnBayarPickup')?.addEventListener('click', () => bayar('pickup'));
  document.getElementById('btnClosePaymentModal')?.addEventListener('click', closePaymentModal);
  document.getElementById('paymentOverlay')?.addEventListener('click', closePaymentModal);
  document.getElementById('btnCopyWA')?.addEventListener('click', copyWA);
  document.getElementById('btnOpenTracking')?.addEventListener('click', openTracking);
  document.getElementById('waLink')?.addEventListener('click', handleWAConfirm);

  // 9. History Modal Controls
  document.getElementById('btnHistory')?.addEventListener('click', openHistory);
  document.getElementById('btnCloseHistory')?.addEventListener('click', () => {
    document.getElementById('historyModal').classList.add('hidden');
  });
  document.getElementById('historyOverlay')?.addEventListener('click', () => {
    document.getElementById('historyModal').classList.add('hidden');
  });

  // 10. Pre-order Focus & Google Auth
  document.getElementById('btnFocusPreorder')?.addEventListener('click', () => {
    document.getElementById('preorderSlot')?.focus();
  });

  initGoogleAuth();
  document.getElementById('btnGoogleLogout')?.addEventListener('click', googleLogout);
  setupPhoneValidationEvents();
});