/**
 * Modul Keranjang Belanja & Riwayat Transaksi
 */
import { state, fmt } from './config.js';
import { getEmojiForMenu, closeDetail } from './menu.js';
import { updateOngkir } from './gps.js';

export function addToCart() {
  if (!state.curDetail) return;
  if (state.curDetail.stock_status === 'soldout') {
    alert('Stok habis');
    return;
  }
  
  const base = Number(state.curVariant?.price || state.curDetail.price || 0);
  let addonSum = 0;
  const addonArr = [];
  
  (state.curDetail.addons || []).forEach((a, idx) => {
    const q = state.curAddons[idx] || 0;
    if (q > 0) {
      addonSum += q * Number(a.price);
      addonArr.push({ id: a.id, label: a.name, qty: q, price: Number(a.price) });
    }
  });

  const total = (base + addonSum) * state.curQty;
  const item = {
    menuId: state.curDetail.id,
    name: state.curDetail.name,
    emoji: state.curDetail.emoji || getEmojiForMenu(state.curDetail.name, state.curDetail.category),
    variantLabel: state.curVariant?.label || state.curVariant?.name || 'Biasa',
    pedasLabel: state.curPedas?.label || state.curPedas?.name || '',
    addons: addonArr,
    note: document.getElementById('customRequest').value.trim(),
    qty: state.curQty,
    unitPrice: base + addonSum,
    totalPrice: total
  };

  state.cart.push(item);
  localStorage.setItem('npw_cart', JSON.stringify(state.cart));
  updateCartUI();
  closeDetail();

  const toast = document.getElementById('addToast');
  toast.classList.remove('hidden');
  toast.classList.add('flex');
  setTimeout(() => {
    toast.classList.add('hidden');
    toast.classList.remove('flex');
  }, 1500);
}

export function updateCartUI() {
  const count = state.cart.reduce((a, b) => a + b.qty, 0);
  const total = state.cart.reduce((a, b) => a + b.totalPrice, 0);

  document.getElementById('cartCount').textContent = count;
  document.getElementById('cartItems').textContent = count + ' menu';
  document.getElementById('cartTotal').textContent = fmt(total);
  document.getElementById('modalCount').textContent = count;
  document.getElementById('subtotalVal').textContent = fmt(total);
  document.getElementById('totalVal').textContent = fmt(total + state.curOngkir);

  const cartList = document.getElementById('cartList');
  cartList.innerHTML = state.cart.map((c, i) => 
    `<div class="flex justify-between gap-3 bg-[#0F0F0F] border border-white/10 rounded-[14px] p-3">
      <div class="flex-1">
        <div class="text-[12px] font-bold">${c.emoji} ${c.name} (${c.variantLabel}) x${c.qty}</div>
        <div class="text-[10px] opacity-50">${c.pedasLabel || ''} ${c.addons.map(a => a.qty + 'x ' + a.label).join(', ')} ${c.note ? '• ' + c.note : ''}</div>
        <div class="text-[11px] font-bold mt-1">${fmt(c.totalPrice)}</div>
      </div>
      <button data-cart-idx="${i}" class="btn-remove-cart w-8 h-8 rounded-full bg-white/10">✕</button>
    </div>`
  ).join('') || '<div class="opacity-40 text-[11px] text-center py-4">Keranjang kosong</div>';

  cartList.querySelectorAll('.btn-remove-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-cart-idx'));
      removeCart(idx);
    });
  });

  document.getElementById('cartBar').classList.toggle('hidden', count === 0);
}

export function removeCart(i) {
  state.cart.splice(i, 1);
  localStorage.setItem('npw_cart', JSON.stringify(state.cart));
  updateCartUI();
}

export function openHistory() {
  document.getElementById('historyModal').classList.remove('hidden');
  const hist = JSON.parse(localStorage.getItem('npw_history') || '[]').slice(0, 10);
  const box = document.getElementById('historyList');
  const header = document.getElementById('historyHeader');

  if (header) {
    header.innerHTML = `<div class="flex justify-between items-center">
      <span>Riwayat (${hist.length}/10 terbaru)</span>
      <button id="btnClearHistory" class="px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-[10px]">🗑️ Clear Histori</button>
    </div>`;
    document.getElementById('btnClearHistory')?.addEventListener('click', clearHistory);
  }

  if (hist.length === 0) {
    box.innerHTML = '<div class="opacity-50 text-[12px]">Belum ada riwayat real</div>';
  } else {
    box.innerHTML = hist.map(h => 
      `<div class="bg-[#0F0F0F] border border-white/10 rounded-[12px] p-3">
        <div class="font-bold text-[12px]">${h.menuNames || h.customer?.name || 'Pesanan'} • ${fmt(h.total || 0)}</div>
        <div class="text-[11px] opacity-70 mt-1 line-clamp-2">${h.menuNames || '-'}</div>
        <div class="text-[10px] opacity-50 mt-1">${new Date(h.created_at).toLocaleString('id-ID')} • ${h.customer?.name || ''}</div>
        <div class="mt-2 flex gap-2">
          <button data-order-id="${h.id}" class="btn-reorder text-[10px] px-3 py-1 rounded-full bg-white/10 border border-white/10">Pesan Lagi</button>
        </div>
      </div>`
    ).join('');

    box.querySelectorAll('.btn-reorder').forEach(btn => {
      btn.addEventListener('click', () => {
        reorderFromHistory(btn.getAttribute('data-order-id'));
      });
    });
  }
}

export function clearHistory() {
  localStorage.removeItem('npw_history');
  openHistory();
}

export function reorderFromHistory(orderId) {
  const hist = JSON.parse(localStorage.getItem('npw_history') || '[]');
  const item = hist.find(x => x.id === orderId);
  if (!item || !item.cart) {
    alert('Detail order tidak ditemukan');
    return;
  }
  
  state.cart = JSON.parse(JSON.stringify(item.cart));
  localStorage.setItem('npw_cart', JSON.stringify(state.cart));
  updateCartUI();
  document.getElementById('historyModal').classList.add('hidden');
  alert('Menu berhasil dimasukkan kembali ke keranjang!');
}