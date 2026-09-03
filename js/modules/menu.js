/**
 * Modul Manajemen Menu, Filter, Detail & Modal Varian
 */
import { API_BASE, state, fmt } from './config.js';
import { updateCartUI } from './cart.js';

export function getEmojiForMenu(name, category) {
  const n = (name || '').toLowerCase();
  const c = (category || '').toLowerCase();
  if (n.includes('nasi goreng')) return '🍛';
  if (n.includes('mie')) return '🍜';
  if (n.includes('ayam')) return '🍗';
  if (c === 'minuman') return '🥤';
  return '🍛';
}

export async function loadMenu() {
  try {
    document.getElementById('loading').style.display = 'block';
    const r = await fetch(API_BASE + '/api/menus', { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const data = await r.json();

    function _isHabis(m) {
      if (!m) return false;
      const active = !(m.active === 0 || m.active === false || m.active === '0' || m.active === 'false');
      if (!active) return true;
      if ((m.stock_status || '').toLowerCase() === 'soldout') return true;
      const nm = (m.name || '').toLowerCase();
      if (nm.includes('(habis)') || nm.includes('habis')) return true;
      return false;
    }

    const sorted = (data || []).slice().sort((a, b) => {
      const ha = _isHabis(a) ? 1 : 0;
      const hb = _isHabis(b) ? 1 : 0;
      if (ha !== hb) return ha - hb;
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });

    state.menus = sorted;
    document.getElementById('loading').style.display = 'none';

    if (state.menus.length === 0) {
      document.getElementById('menuGrid').innerHTML = '<div class="col-span-2 text-center opacity-50 py-10 text-[12px]">Belum ada menu real di DB • Tambah via Admin</div>';
      return;
    }

    renderMenuGrid();
    
    setTimeout(() => {
      try {
        const grid = document.getElementById('menuGrid');
        if (!grid) return;
        const cards = Array.from(grid.children);
        cards.sort((a, b) => {
          const ah = a.classList.contains('soldout') || (a.innerText || '').toLowerCase().includes('(habis)');
          const bh = b.classList.contains('soldout') || (b.innerText || '').toLowerCase().includes('(habis)');
          if (ah && !bh) return 1;
          if (!ah && bh) return -1;
          return 0;
        });
        cards.forEach(c => grid.appendChild(c));
        filterKategori(state.currentFilter);
      } catch (e) {}
    }, 0);

    updateCartUI();
  } catch (e) {
    document.getElementById('loading').textContent = 'Gagal load menu real: ' + e.message;
  }
}

export function renderMenuGrid() {
  document.getElementById('menuGrid').innerHTML = state.menus.map(m => {
    const emoji = m.emoji || getEmojiForMenu(m.name, m.category);
    const sold = m.stock_status === 'soldout';
    const isActive = (m.active !== 0 && m.active !== false && m.active !== '0');
    const varian = m.variants?.find(x => x.id === 'varian') || m.variants?.[0];
    const basePrice = varian?.options?.[0]?.price || m.price;
    const statusLabel = !isActive ? 'TIDAK AKTIF' : (sold ? 'HABIS' : 'AKTIF');
    const statusColor = !isActive ? 'bg-gray-500' : (sold ? 'bg-red-500' : 'bg-[#22c55e]');

    return `<div data-category="${(m.category || '').toLowerCase()}" class="card-menu ${sold ? 'soldout' : ''} rounded-[18px] p-3 cursor-pointer active:scale-[0.98] relative overflow-hidden border ${!isActive ? 'border-gray-500/30' : ''}" data-id="${m.id}">
      ${m.badge ? `<div class="absolute top-2 left-2 z-10 text-[8px] bg-[#FF6B2B] px-2 py-1 rounded-full font-bold shadow-lg">${m.badge}</div>` : ''}
      <div class="absolute top-2 right-2 z-10 text-[7px] ${statusColor} px-2 py-1 rounded-full font-bold shadow-lg">${statusLabel}</div>
      <div class="w-full h-[80px] rounded-[12px] bg-[#0F0F0F] flex items-center justify-center text-[36px] mt-3 ${!isActive ? 'grayscale opacity-60' : ''}">${emoji}</div>
      <div class="mt-2">
        <div class="font-bold text-[13px] leading-tight ${!isActive ? 'opacity-70' : ''}">${m.name}</div>
        <div class="mt-1 font-extrabold text-[13px]">${fmt(basePrice)} ${varian?.options?.length > 1 ? `<span class="text-[10px] opacity-50 font-normal">• ${varian.options.length} varian</span>` : ''}</div>
      </div>
    </div>`;
  }).join('');

  document.querySelectorAll('#menuGrid .card-menu').forEach(card => {
    card.addEventListener('click', () => openDetail(card.getAttribute('data-id')));
  });
}

export function filterKategori(cat) {
  state.currentFilter = cat;
  document.querySelectorAll('.cat-tab').forEach(t => {
    if (t.getAttribute('data-cat') === cat) t.classList.add('active-cat');
    else t.classList.remove('active-cat');
  });

  let visibleCount = 0;
  document.querySelectorAll('#menuGrid .card-menu').forEach(card => {
    const itemCat = card.getAttribute('data-category');
    if (cat === 'all' || itemCat === cat) {
      card.style.display = 'block';
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });

  const info = document.getElementById('categoryInfo');
  if (info) info.textContent = `Menampilkan ${visibleCount} menu`;
}

export function openDetail(id) {
  const m = state.menus.find(x => x.id === id);
  if (!m) return;
  
  state.curDetail = m;
  state.curQty = 1;
  state.curAddons = {};
  state.curVariant = null;
  state.curPedas = null;

  document.getElementById('detailEmoji').textContent = m.emoji || getEmojiForMenu(m.name, m.category);
  document.getElementById('detailName').textContent = m.name;
  
  const isActiveDetail = (m.active !== 0 && m.active !== false && m.active !== '0');
  document.getElementById('detailDesc').textContent = (isActiveDetail ? '' : '[TIDAK AKTIF] ') + 'Base ' + fmt(m.price);
  
  if (!isActiveDetail) {
    document.getElementById('detailStock').innerHTML = '<span class="bg-gray-600 px-2 py-1 rounded-full text-[10px] font-bold">TIDAK AKTIF • Tidak bisa dipesan</span>';
  } else {
    document.getElementById('detailStock').innerHTML = m.stock_status === 'soldout' ? '<span class="text-red-400 font-bold">STOK HABIS</span>' : '<span class="text-[#22c55e]">Ready • Real DB</span>';
  }

  const varianGroup = m.variants?.find(x => x.id === 'varian');
  const pedasGroup = m.variants?.find(x => x.id === 'pedas');
  const varBox = document.getElementById('variantBox');
  const varList = document.getElementById('variantList');

  if (varianGroup && varianGroup.options && varianGroup.options.length > 0) {
    varBox.classList.remove('hidden');
    state.curVariant = varianGroup.options[0];
    varList.innerHTML = varianGroup.options.map((o, i) => 
      `<button data-idx="${i}" class="var-btn opt-btn rounded-full border ${i === 0 ? 'is-selected' : 'is-unselected'} px-4 py-2.5 text-[12px] font-bold">${o.label || o.name}<br><span class="text-[11px] opacity-70">${fmt(o.price)}</span></button>`
    ).join('');
    
    varList.querySelectorAll('.var-btn').forEach(btn => {
      btn.addEventListener('click', (e) => pickVariant(parseInt(btn.getAttribute('data-idx'))));
    });
  } else {
    varBox.classList.add('hidden');
    state.curVariant = { label: 'Biasa', price: m.price };
  }

  const pedasList = document.getElementById('pedasList');
  if (pedasGroup && pedasGroup.options) {
    pedasList.innerHTML = pedasGroup.options.map((o, i) => 
      `<button data-idx="${i}" class="pedas-btn opt-btn rounded-full border ${i === 0 ? 'is-selected' : 'is-unselected'} px-3 py-2 text-[11px]">${o.label || o.name}</button>`
    ).join('');
    state.curPedas = pedasGroup.options[0];
    
    pedasList.querySelectorAll('.pedas-btn').forEach(btn => {
      btn.addEventListener('click', () => pickPedas(parseInt(btn.getAttribute('data-idx'))));
    });
  } else {
    pedasList.innerHTML = '<div class="opacity-50 text-[11px]">Tidak ada level pedas</div>';
  }

  const addonList = document.getElementById('addonList');
  addonList.innerHTML = (m.addons || []).map((a, idx) => 
    `<div class="flex justify-between items-center bg-[#0F0F0F] border border-white/10 rounded-full px-4 py-2.5">
      <div>
        <div class="text-[12px] font-bold">${a.name}</div>
        <div class="text-[10px] opacity-50">+${fmt(a.price)}</div>
      </div>
      <div class="flex items-center gap-2">
        <button data-addon="${idx}" data-step="-1" class="btn-addon-step w-7 h-7 rounded-full bg-white/10">-</button>
        <span id="addonQty${idx}" class="text-[12px] w-4 text-center">0</span>
        <button data-addon="${idx}" data-step="1" class="btn-addon-step w-7 h-7 rounded-full bg-white text-black">+</button>
      </div>
    </div>`
  ).join('') || '<div class="opacity-40 text-[11px]">Tanpa addon</div>';

  addonList.querySelectorAll('.btn-addon-step').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-addon'));
      const step = parseInt(btn.getAttribute('data-step'));
      changeAddon(idx, step);
    });
  });

  document.getElementById('customRequest').value = '';
  document.getElementById('customRequestCount').textContent = '0';
  document.getElementById('detailQty').textContent = '1';

  updateDetailPrice();
  document.getElementById('detailModal').classList.remove('hidden');
}

export function closeDetail() {
  document.getElementById('detailModal').classList.add('hidden');
}

export function pickVariant(i) {
  const m = state.curDetail;
  const grp = m.variants?.find(x => x.id === 'varian');
  if (!grp) return;
  state.curVariant = grp.options[i];
  
  document.querySelectorAll('#variantList .var-btn').forEach((b, idx) => {
    b.className = 'var-btn opt-btn rounded-full border ' + (idx === i ? 'is-selected' : 'is-unselected') + ' px-4 py-2.5 text-[12px] font-bold';
  });
  updateDetailPrice();
}

export function pickPedas(i) {
  const m = state.curDetail;
  const grp = m.variants?.find(x => x.id === 'pedas');
  if (!grp) return;
  state.curPedas = grp.options[i];
  
  document.querySelectorAll('#pedasList .pedas-btn').forEach((b, idx) => {
    b.className = 'pedas-btn opt-btn rounded-full border ' + (idx === i ? 'is-selected' : 'is-unselected') + ' px-3 py-2 text-[11px]';
  });
}

export function changeDetailQty(d) {
  state.curQty = Math.max(1, state.curQty + d);
  document.getElementById('detailQty').textContent = state.curQty;
  updateDetailPrice();
}

export function changeAddon(idx, d) {
  const m = state.curDetail;
  const a = m.addons[idx];
  const cur = state.curAddons[idx] || 0;
  const next = Math.max(0, Math.min(a.max || 10, cur + d));
  state.curAddons[idx] = next;
  document.getElementById('addonQty' + idx).textContent = next;
  updateDetailPrice();
}

export function updateDetailPrice() {
  if (!state.curDetail) return;
  const base = Number(state.curVariant?.price || state.curDetail.price || 0);
  let addonSum = 0;
  (state.curDetail.addons || []).forEach((a, idx) => {
    addonSum += (state.curAddons[idx] || 0) * Number(a.price || 0);
  });
  const total = (base + addonSum) * state.curQty;
  document.getElementById('detailTotalPrice').textContent = fmt(total);
  document.getElementById('detailBtnTotal').textContent = fmt(total);
}