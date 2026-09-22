import { getSupabase, getProductImageUrl, getSiteImageUrl, isSupabaseConfigured } from './supabase.js';
import { applyI18n, i18nState, loadTranslations, loc, setLanguage, t } from './i18n.js';
import { fetchProducts } from './products.js';
import { fetchCategories } from './categories.js';
import { cart, favs, saveCart, toggleFav, updateBadges } from './cart.js';
import { buildOrderText, createOrder, itemDisplay, money, telegramUrl } from './orders.js';

const BASE = window.LOOKSOR_BASE || './';

const state = {
  products: [],
  categories: [],
  settings: {},
};

export function imgSrc(src) {
  return getProductImageUrl(src);
}

function setting(key, fallback = '') {
  return state.settings[key] || fallback;
}

export function cardHTML(p) {
  const imgs = p.images || [];
  const fav = favs().includes(p.id) ? '♥' : '♡';
  const excerpt = loc(p.description).slice(0, 90);
  return `<article class="product-card">
    <a href="${BASE}product.html?id=${p.id}">
      <div class="card-media">
        <img class="main" src="${imgSrc(imgs[0])}" alt="${loc(p.name)}" loading="lazy">
        ${imgs[1] ? `<img class="hover" src="${imgSrc(imgs[1])}" alt="" loading="lazy">` : ''}
        <button class="card-fav" type="button" data-fav="${p.id}" aria-label="${t('add_favorite')}">${fav}</button>
      </div>
      <div class="card-body">
        <h3 class="card-name">${loc(p.name)}</h3>
        <div class="card-price">${p.oldPrice ? `<s>${money(p.oldPrice)}</s>` : ''}${money(p.price)}</div>
        <p class="card-excerpt">${excerpt}</p>
      </div>
    </a>
  </article>`;
}

function bindFavClicks(root = document) {
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-fav]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    toggleFav(Number(btn.dataset.fav));
  });
}

async function fetchSettings() {
  const sb = getSupabase();
  const { data, error } = await sb.from('settings').select('key, value');
  if (error) throw error;
  const map = {};
  (data || []).forEach((row) => { map[row.key] = row.value; });
  return map;
}

function applySettingsToDom() {
  const tg = setting('telegram_url', 'https://t.me/APEX348');
  const ig = setting('instagram', '#');
  document.querySelectorAll('[data-setting-href="telegram_url"]').forEach((a) => { a.href = tg; });
  document.querySelectorAll('[data-setting-href="instagram"]').forEach((a) => { a.href = ig; });
  document.querySelectorAll('[data-setting="telegram_username"]').forEach((el) => {
    el.textContent = setting('telegram_username', '@APEX348');
  });
  document.querySelectorAll('[data-setting="phone"]').forEach((el) => {
    el.textContent = setting('phone', '+998');
  });
  document.querySelectorAll('[data-setting="hours"]').forEach((el) => {
    el.textContent = setting('hours', '10:00 — 20:00');
  });
  document.querySelectorAll('[data-setting="email"]').forEach((el) => {
    el.textContent = setting('email', '');
  });
  document.querySelectorAll('[data-bg-slot]').forEach((el) => {
    const key = el.dataset.bgSlot;
    const fallback = el.dataset.bgFallback;
    const val = setting(key, '');
    const url = val ? getSiteImageUrl(val) : `${BASE}${fallback}`;
    el.style.backgroundImage = `url('${url}')`;
  });
  document.querySelectorAll('[data-img-slot]').forEach((el) => {
    const key = el.dataset.imgSlot;
    const fallback = el.dataset.imgFallback;
    const val = setting(key, '');
    el.src = val ? getSiteImageUrl(val) : `${BASE}${fallback}`;
  });
  const note = setting('delivery_note_' + i18nState.lang, setting('delivery_note_ru', ''));
  document.querySelectorAll('[data-delivery-note]').forEach((el) => { el.textContent = note; });
}

function fillMenu() {
  const menu = document.getElementById('menu-cats');
  if (!menu) return;
  menu.innerHTML = state.categories.map((c) =>
    `<a href="${BASE}catalog.html?category=${c.slug}">${loc(c.name)}</a>`
  ).join('');
}

function initSlider() {
  const slides = [...document.querySelectorAll('.home-slider .slide')];
  if (!slides.length) return;
  let i = 0;
  const bar = document.getElementById('slider-progress');
  const go = (dir) => {
    i = (i + dir + slides.length) % slides.length;
    slides.forEach((s, n) => s.classList.toggle('is-on', n === i));
    if (bar) {
      bar.style.width = `${100 / slides.length}%`;
      bar.style.marginLeft = `${(i / slides.length) * 100}%`;
    }
  };
  go(0);
  document.querySelector('[data-slide="-1"]')?.addEventListener('click', () => go(-1));
  document.querySelector('[data-slide="1"]')?.addEventListener('click', () => go(1));
  setInterval(() => go(1), 7000);
}

function onSearch(e) {
  const q = e.target.value.trim().toLowerCase();
  const box = document.getElementById('search-results');
  if (!q) { box.innerHTML = ''; return; }
  const hits = state.products.filter((p) => {
    const blob = [loc(p.name), loc(p.description), p.article, p.category].join(' ').toLowerCase();
    return blob.includes(q);
  });
  box.innerHTML = hits.length
    ? hits.map((p) => `<a class="search-hit" href="${BASE}product.html?id=${p.id}">
        <img src="${imgSrc(p.images[0])}" alt="${loc(p.name)}" loading="lazy">
        <div><strong>${loc(p.name)}</strong><div>${p.article} · ${money(p.price)}</div></div>
      </a>`).join('')
    : `<p>${t('no_results')}</p>`;
}

function bindChrome() {
  const header = document.getElementById('site-header');
  window.addEventListener('scroll', () => {
    header?.classList.toggle('is-scrolled', window.scrollY > 12);
  }, { passive: true });

  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setLanguage(btn.dataset.lang);
      fillMenu();
      applySettingsToDom();
      rerenderPage();
    });
  });

  const nav = document.getElementById('mobile-nav');
  const search = document.getElementById('search-overlay');
  document.querySelector('[data-open-menu]')?.addEventListener('click', () => {
    nav.hidden = false;
    document.body.style.overflow = 'hidden';
  });
  document.querySelector('[data-close-menu]')?.addEventListener('click', () => {
    nav.hidden = true;
    document.body.style.overflow = '';
  });
  document.querySelector('[data-open-search]')?.addEventListener('click', () => {
    search.hidden = false;
    document.getElementById('search-input').focus();
  });
  document.querySelector('[data-close-search]')?.addEventListener('click', () => { search.hidden = true; });
  document.getElementById('search-input')?.addEventListener('input', onSearch);
  initSlider();
  fillMenu();
}

function rerenderPage() {
  const page = document.body.dataset.page;
  if (page === 'home') renderHome();
  if (page === 'catalog') renderCatalog();
  if (page === 'product') renderProduct();
  if (page === 'cart') renderCart();
  if (page === 'favorites') renderFavorites();
}

function renderHome() {
  const grid = document.getElementById('home-new');
  if (grid) grid.innerHTML = state.products.slice(0, 8).map(cardHTML).join('');
}

function renderCatalog() {
  const params = new URLSearchParams(location.search);
  const wrap = document.getElementById('catalog-grid');
  const bar = document.getElementById('cat-bar');
  if (!wrap) return;
  bar.dataset.ready = '';
  if (bar) {
    const current = params.get('category') || '';
    bar.innerHTML = `<a href="${BASE}catalog.html" class="${current ? '' : 'is-on'}">${t('all')}</a>` +
      state.categories.map((c) => `<a class="${current === c.slug ? 'is-on' : ''}" href="${BASE}catalog.html?category=${c.slug}">${loc(c.name)}</a>`).join('');
    document.querySelectorAll('#filters select, #filters input').forEach((el) => {
      el.onchange = applyFilters;
      el.oninput = applyFilters;
    });
  }
  applyFilters();
  function applyFilters() {
    let list = [...state.products];
    const cat = new URLSearchParams(location.search).get('category') || '';
    const size = document.getElementById('f-size')?.value;
    const color = (document.getElementById('f-color')?.value || '').trim().toLowerCase();
    const priceMax = Number(document.getElementById('f-price')?.value || 0);
    const stock = document.getElementById('f-stock')?.value;
    const sort = document.getElementById('f-sort')?.value;
    if (cat) list = list.filter((p) => p.category === cat);
    if (size) list = list.filter((p) => (p.sizes || []).includes(size));
    if (color) {
      list = list.filter((p) => (p.colors || []).some((c) =>
        (c[i18nState.lang] || c.ru || '').toLowerCase().includes(color) || (c.hex || '').toLowerCase().includes(color)
      ));
    }
    if (priceMax) list = list.filter((p) => p.price <= priceMax);
    if (stock === '1') list = list.filter((p) => p.available);
    if (stock === '0') list = list.filter((p) => !p.available);
    if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
    if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
    if (sort === 'new') list.sort((a, b) => b.id - a.id);
    wrap.innerHTML = list.length ? list.map(cardHTML).join('') : `<p class="empty">${t('no_results')}</p>`;
  }
}

function renderProduct() {
  const id = Number(new URLSearchParams(location.search).get('id'));
  const p = state.products.find((x) => x.id === id);
  const root = document.getElementById('pdp');
  if (!p || !root) {
    if (root) root.innerHTML = `<p class="empty">${t('no_results')}</p>`;
    return;
  }
  document.title = `LOOKSÒR — ${loc(p.name)}`;
  const imgs = p.images.length ? p.images : ['assets/images/placeholder.svg'];
  let color = '';
  let size = '';
  let qty = 1;
  const colorName = (c) => c[i18nState.lang] || c.ru || c.hex;
  root.innerHTML = `
    <div>
      <div class="gallery-main"><img id="g-main" src="${imgSrc(imgs[0])}" alt="${loc(p.name)}"></div>
      <div class="thumbs">${imgs.map((src, i) => `<button type="button" class="${i===0?'is-active':''}" data-img="${imgSrc(src)}"><img src="${imgSrc(src)}" alt="" loading="lazy"></button>`).join('')}</div>
    </div>
    <div class="pdp-info">
      <h1>${loc(p.name)}</h1>
      <div class="pdp-price">${p.oldPrice ? `<s>${money(p.oldPrice)}</s> ` : ''}${money(p.price)}</div>
      <p>${loc(p.description)}</p>
      <div>${t('color')}</div>
      <div class="swatches">${(p.colors || []).map((c) => `<button type="button" class="swatch" style="background:${c.hex}" data-color="${colorName(c)}" title="${colorName(c)}"></button>`).join('')}</div>
      <div>${t('size')}</div>
      <div class="sizes">${(p.sizes || []).map((s) => `<button type="button" class="size-btn" data-size="${s}">${s}</button>`).join('')}</div>
      <div>${t('qty')}</div>
      <div class="qty-wrap">
        <button type="button" data-q="-1">−</button>
        <span id="qty">1</span>
        <button type="button" data-q="1">+</button>
      </div>
      <p class="hint" id="hint">${t('select_color_size')}</p>
      <div class="pdp-actions">
        <button class="btn" id="order-btn" disabled>${t('order')}</button>
        <button class="btn btn-ghost" id="add-cart" disabled>${t('add_cart')}</button>
        <button class="btn btn-ghost" data-fav="${p.id}">${favs().includes(p.id) ? '♥' : '♡'}</button>
      </div>
      <div class="meta-line">${t('availability')}: ${p.available ? t('in_stock') : t('out_of_stock')}</div>
      <div class="meta-line">${t('delivery')}: ${setting('delivery_note_' + i18nState.lang, setting('delivery_note_ru'))}</div>
      <p class="meta-line">${p.article}</p>
      <form class="checkout-mini" id="pdp-customer">
        <label class="field">Имя <input name="name" required autocomplete="name"></label>
        <label class="field">Телефон <input name="phone" required autocomplete="tel"></label>
        <label class="field">Адрес доставки <input name="address" required></label>
        <label class="field">Telegram <input name="telegram" placeholder="@username"></label>
      </form>
    </div>
    <div class="sticky-cta"><button class="btn" id="order-btn-m" disabled style="width:100%">${t('order')}</button></div>
  `;
  const hint = () => {
    const ok = color && size && p.available;
    document.getElementById('hint').textContent = ok ? '' : t('select_color_size');
    document.getElementById('order-btn').disabled = !ok;
    document.getElementById('order-btn-m').disabled = !ok;
    document.getElementById('add-cart').disabled = !ok;
  };
  root.querySelectorAll('[data-img]').forEach((b) => b.addEventListener('click', () => {
    document.getElementById('g-main').src = b.dataset.img;
    root.querySelectorAll('[data-img]').forEach((x) => x.classList.toggle('is-active', x === b));
  }));
  root.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => {
    color = b.dataset.color;
    root.querySelectorAll('[data-color]').forEach((x) => x.classList.toggle('is-active', x === b));
    hint();
  }));
  root.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => {
    size = b.dataset.size;
    root.querySelectorAll('[data-size]').forEach((x) => x.classList.toggle('is-active', x === b));
    hint();
  }));
  root.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
    qty = Math.max(1, qty + Number(b.dataset.q));
    document.getElementById('qty').textContent = String(qty);
  }));
  const goOrder = async () => {
    if (!color || !size) return;
    const form = document.getElementById('pdp-customer');
    if (!form.reportValidity()) return;
    const fd = new FormData(form);
    const customer = {
      name: String(fd.get('name') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      address: String(fd.get('address') || '').trim(),
      telegram: String(fd.get('telegram') || '').trim(),
    };
    const line = itemDisplay(p, { color, size, qty });
    try {
      await createOrder({
        customer,
        items: [line],
        total: p.price * qty,
      });
    } catch (err) {
      console.warn('Order save:', err.message);
    }
    const text = buildOrderText({ items: [line], customer });
    window.open(telegramUrl(state.settings, text), '_blank');
  };
  document.getElementById('order-btn').onclick = goOrder;
  document.getElementById('order-btn-m').onclick = goOrder;
  document.getElementById('add-cart').onclick = () => {
    const items = cart();
    const key = `${p.id}-${color}-${size}`;
    const found = items.find((i) => i.key === key);
    if (found) found.qty += qty;
    else items.push({ key, id: p.id, color, size, qty });
    saveCart(items);
  };
}

function renderCart() {
  const root = document.getElementById('cart-root');
  const items = cart();
  if (!items.length) {
    root.innerHTML = `<div class="empty"><p>${t('empty_cart')}</p><a class="btn" href="${BASE}catalog.html">${t('to_catalog')}</a></div>`;
    return;
  }
  let total = 0;
  const rows = items.map((it) => {
    const p = state.products.find((x) => x.id === it.id);
    if (!p) return '';
    total += p.price * it.qty;
    return `<div class="cart-item" data-key="${it.key}">
      <img src="${imgSrc(p.images[0])}" alt="${loc(p.name)}" loading="lazy">
      <div>
        <strong>${loc(p.name)}</strong>
        <div>${it.color} · ${it.size}</div>
        <div class="qty-wrap">
          <button type="button" data-chg="-1">−</button>
          <span>${it.qty}</span>
          <button type="button" data-chg="1">+</button>
        </div>
        <button type="button" data-del>${t('remove')}</button>
      </div>
      <div>${money(p.price * it.qty)}</div>
    </div>`;
  }).join('');
  root.innerHTML = `${rows}<p class="section-title">${t('total')}: ${money(total)}</p>
    <p style="text-align:center">${t('payment_note')}</p>
    <form id="cart-customer" class="checkout-mini" style="max-width:480px;margin:24px auto">
      <label class="field">Имя <input name="name" required autocomplete="name"></label>
      <label class="field">Телефон <input name="phone" required autocomplete="tel"></label>
      <label class="field">Адрес доставки <input name="address" required></label>
      <label class="field">Telegram <input name="telegram" placeholder="@username"></label>
    </form>
    <p style="text-align:center"><button class="btn btn-solid" id="cart-order">${t('order_telegram')}</button></p>`;
  root.querySelectorAll('.cart-item').forEach((row) => {
    const key = row.dataset.key;
    row.querySelector('[data-del]').onclick = () => { saveCart(items.filter((i) => i.key !== key)); renderCart(); };
    row.querySelectorAll('[data-chg]').forEach((b) => {
      b.onclick = () => {
        const it = items.find((i) => i.key === key);
        it.qty = Math.max(1, it.qty + Number(b.dataset.chg));
        saveCart(items);
        renderCart();
      };
    });
  });
  document.getElementById('cart-order').onclick = async () => {
    const form = document.getElementById('cart-customer');
    if (!form.reportValidity()) return;
    const fd = new FormData(form);
    const customer = {
      name: String(fd.get('name') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      address: String(fd.get('address') || '').trim(),
      telegram: String(fd.get('telegram') || '').trim(),
    };
    const mapped = items.map((it) => {
      const p = state.products.find((x) => x.id === it.id);
      return itemDisplay(p, it);
    });
    try {
      await createOrder({ customer, items: mapped, total });
    } catch (err) {
      console.warn('Order save:', err.message);
    }
    const text = buildOrderText({ items: mapped, customer });
    window.open(telegramUrl(state.settings, text), '_blank');
  };
}

function renderFavorites() {
  const root = document.getElementById('fav-root');
  const ids = favs();
  const list = state.products.filter((p) => ids.includes(p.id));
  root.innerHTML = list.length
    ? `<div class="grid-products">${list.map(cardHTML).join('')}</div>`
    : `<div class="empty"><p>${t('empty_fav')}</p><a class="btn" href="${BASE}catalog.html">${t('to_catalog')}</a></div>`;
}

async function boot() {
  await loadTranslations(BASE);
  if (!isSupabaseConfigured()) {
    document.getElementById('main')?.insertAdjacentHTML('afterbegin',
      '<p class="empty">Добавьте SUPABASE_URL и SUPABASE_ANON_KEY в js/supabase.js</p>');
    applyI18n();
    updateBadges();
    bindChrome();
    bindFavClicks();
    return;
  }
  const [products, categories, settings] = await Promise.all([
    fetchProducts(),
    fetchCategories(),
    fetchSettings(),
  ]);
  state.products = products;
  state.categories = categories;
  state.settings = settings;
  applyI18n();
  applySettingsToDom();
  updateBadges();
  bindChrome();
  bindFavClicks();
  rerenderPage();
}

boot().catch((err) => {
  document.getElementById('main')?.insertAdjacentHTML('afterbegin', `<p class="empty">Failed to load: ${err.message}</p>`);
});
