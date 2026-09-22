import { getSupabase, getProductImageUrl, getCategoryImageUrl, getSiteImageUrl } from './supabase.js';
import { invalidateProducts } from './products.js';
import { invalidateCategories } from './categories.js';
import { fetchOrders, updateOrderStatus } from './orders.js';

const BASE = '../';

function photoRole(index) {
  if (index === 0) return ['Фото 1 — карточка каталога', 'Это главное фото товара. Его видят в сетке каталога и на главной.'];
  if (index === 1) return ['Фото 2 — при наведении', 'Показывается, когда наводят курсор на карточку товара.'];
  return [`Фото ${index + 1} — галерея товара`, 'Дополнительный кадр на странице товара (листание).'];
}

const MEDIA_SLOTS = [
  ['photo_slide_1', 'Слайд 1 на главной', 'Первый полноэкранный экран (карусель сверху).', 'assets/images/hero.jpg'],
  ['photo_slide_2', 'Слайд 2 на главной', 'Второй кадр карусели на первом экране.', 'assets/images/editorial.jpg'],
  ['photo_slide_3', 'Слайд 3 на главной', 'Третий кадр карусели на первом экране.', 'assets/images/cats/1.jpg'],
  ['photo_campaign_dresses', 'Блок «Платья»', 'Большой фото-блок на главной, ведёт в категорию платьев.', 'assets/images/cats/1.jpg'],
  ['photo_campaign_outer', 'Блок «Верхняя одежда»', 'Большой фото-блок на главной.', 'assets/images/cats/6.jpg'],
  ['photo_campaign_suits', 'Блок «Костюмы»', 'Большой фото-блок на главной.', 'assets/images/cats/5.jpg'],
  ['photo_campaign_knit', 'Блок «Трикотаж»', 'Большой фото-блок на главной.', 'assets/images/cats/3.jpg'],
  ['photo_campaign_philosophy', 'Блок «Философия»', 'Большой фото-блок на главной, ведёт на страницу о бренде.', 'assets/images/editorial.jpg'],
  ['photo_ig_1', 'Instagram 1', 'Первая ячейка сетки Instagram внизу главной.', 'assets/images/ig/1.jpg'],
  ['photo_ig_2', 'Instagram 2', 'Вторая ячейка сетки Instagram.', 'assets/images/ig/2.jpg'],
  ['photo_ig_3', 'Instagram 3', 'Третья ячейка сетки Instagram.', 'assets/images/ig/3.jpg'],
  ['photo_ig_4', 'Instagram 4', 'Четвёртая ячейка сетки Instagram.', 'assets/images/ig/4.jpg'],
  ['photo_ig_5', 'Instagram 5', 'Пятая ячейка сетки Instagram.', 'assets/images/ig/5.jpg'],
  ['photo_ig_6', 'Instagram 6', 'Шестая ячейка сетки Instagram.', 'assets/images/ig/6.jpg'],
];

function parseColors(raw) {
  return String(raw).split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const parts = line.split('|').map((s) => s.trim());
    return { hex: parts[0] || '#EFE9D9', ru: parts[1] || '', uz: parts[2] || parts[1] || '', en: parts[3] || parts[1] || '' };
  });
}

async function requireAdmin() {
  const sb = getSupabase();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    location.href = 'login.html';
    return null;
  }
  const { data: profile } = await sb.from('profiles').select('is_admin').eq('id', session.user.id).maybeSingle();
  if (!profile?.is_admin) {
    document.body.innerHTML = '<p class="err" style="padding:40px">Этот аккаунт не помечен как администратор. В Supabase: Table Editor → profiles → is_admin = true.</p>';
    return null;
  }
  return { sb, session };
}

function bindNav() {
  document.querySelector('[data-admin-menu]')?.addEventListener('click', () => {
    document.body.classList.toggle('nav-open');
  });
  document.getElementById('logout-link')?.addEventListener('click', async (e) => {
    e.preventDefault();
    await getSupabase().auth.signOut();
    location.href = 'login.html';
  });
}

async function pageLogin() {
  const sb = getSupabase();
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    location.href = 'index.html';
    return;
  }
  const form = document.getElementById('login-form');
  const err = document.getElementById('login-error');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    const fd = new FormData(form);
    const { error } = await sb.auth.signInWithPassword({
      email: String(fd.get('email') || '').trim(),
      password: String(fd.get('password') || ''),
    });
    if (error) {
      err.textContent = error.message === 'Invalid login credentials' ? 'Неверный email или пароль' : error.message;
      return;
    }
    location.href = 'index.html';
  });
}

async function pageProducts() {
  const ctx = await requireAdmin();
  if (!ctx) return;
  bindNav();
  const { sb } = ctx;
  const { data, error } = await sb.from('products').select('*, categories(name_ru)').order('id', { ascending: false });
  if (error) throw error;
  const tbody = document.getElementById('products-body');
  tbody.innerHTML = (data || []).map((p) => {
    const imgs = Array.isArray(p.images) ? p.images : [];
    const src = getProductImageUrl(imgs[0]);
    return `<tr>
      <td class="col-photo" data-label="Фото карточки"><img class="thumb-mini" src="${src}" alt="Фото карточки: ${p.name_ru}"></td>
      <td data-label="Артикул">${p.article}</td>
      <td data-label="Название">${p.name_ru}</td>
      <td data-label="Категория">${p.categories?.name_ru || ''}</td>
      <td data-label="Цена">${Number(p.price).toLocaleString('ru-RU')} сум</td>
      <td data-label="Наличие">${p.is_active ? 'В наличии' : 'Нет'}</td>
      <td class="col-actions" data-label="Редактирование">
        <div class="row-actions">
          <a class="btn" href="product.html?id=${p.id}">Редактировать</a>
          <button class="btn btn-danger" data-del="${p.id}" data-name="${p.name_ru}">Удалить</button>
        </div>
      </td>
    </tr>`;
  }).join('');
  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-del]');
    if (!btn) return;
    if (!confirm(`Удалить товар «${btn.dataset.name}»?`)) return;
    const { error: delErr } = await sb.from('products').delete().eq('id', Number(btn.dataset.del));
    if (delErr) { alert(delErr.message); return; }
    invalidateProducts();
    btn.closest('tr').remove();
  });
}

async function uploadFiles(sb, bucket, folder, fileList) {
  const files = [...fileList];
  const paths = [];
  for (const file of files) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await sb.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    paths.push(path);
  }
  return paths;
}

async function pageProduct() {
  const ctx = await requireAdmin();
  if (!ctx) return;
  bindNav();
  const { sb } = ctx;
  const id = Number(new URLSearchParams(location.search).get('id') || 0);
  const { data: cats } = await sb.from('categories').select('*').order('sort_order');
  let row = null;
  if (id) {
    const { data } = await sb.from('products').select('*').eq('id', id).maybeSingle();
    row = data;
  }
  const catSel = document.getElementById('category_id');
  catSel.innerHTML = (cats || []).map((c) =>
    `<option value="${c.id}" ${row && row.category_id === c.id ? 'selected' : ''}>${c.name_ru}</option>`
  ).join('');

  const set = (name, val) => {
    const el = document.querySelector(`[name="${name}"]`);
    if (el) el.value = val ?? '';
  };
  if (row) {
    set('article', row.article);
    set('name_ru', row.name_ru);
    set('name_uz', row.name_uz);
    set('name_en', row.name_en);
    set('description_ru', row.description_ru);
    set('description_uz', row.description_uz);
    set('description_en', row.description_en);
    set('price', row.price);
    set('old_price', row.old_price ?? '');
    set('stock', row.stock ?? 1);
    set('sizes', (row.sizes || []).join(','));
    set('colors', (row.colors || []).map((c) => `${c.hex}|${c.ru}|${c.uz}|${c.en}`).join('\n'));
    document.querySelector('[name="is_active"]').checked = row.is_active;
    document.querySelector('[name="featured"]').checked = row.featured;
    document.querySelector('[name="bestseller"]').checked = row.bestseller;
    document.querySelector('[name="is_new"]').checked = row.is_new;
    document.getElementById('open-site').href = `${BASE}product.html?id=${row.id}`;
    document.getElementById('open-site').hidden = false;
    document.getElementById('create-photos').hidden = true;
  }

  document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const payload = {
      article: String(fd.get('article')).trim(),
      name_ru: String(fd.get('name_ru')).trim(),
      name_uz: String(fd.get('name_uz')).trim(),
      name_en: String(fd.get('name_en')).trim(),
      description_ru: String(fd.get('description_ru')).trim(),
      description_uz: String(fd.get('description_uz')).trim(),
      description_en: String(fd.get('description_en')).trim(),
      category_id: Number(fd.get('category_id')),
      price: Number(fd.get('price')),
      old_price: String(fd.get('old_price') || '') === '' ? null : Number(fd.get('old_price')),
      sizes: String(fd.get('sizes') || '').split(',').map((s) => s.trim()).filter(Boolean),
      colors: parseColors(String(fd.get('colors') || '')),
      stock: Number(fd.get('stock') || 0),
      is_active: document.querySelector('[name="is_active"]').checked,
      featured: document.querySelector('[name="featured"]').checked,
      bestseller: document.querySelector('[name="bestseller"]').checked,
      is_new: document.querySelector('[name="is_new"]').checked,
      updated_at: new Date().toISOString(),
    };
    if (row) {
      const { error } = await sb.from('products').update(payload).eq('id', row.id);
      if (error) { alert(error.message); return; }
      invalidateProducts();
      alert('Данные товара сохранены.');
      location.reload();
      return;
    }
    payload.images = [];
    const { data: created, error } = await sb.from('products').insert(payload).select('id').single();
    if (error) { alert(error.message); return; }
    const files = document.querySelector('[name="images[]"]')?.files;
    if (files?.length) {
      const paths = await uploadFiles(sb, 'products', String(created.id), files);
      await sb.from('products').update({ images: paths }).eq('id', created.id);
    }
    invalidateProducts();
    location.href = `product.html?id=${created.id}`;
  });

  if (row) renderPhotos(sb, row);
}

async function renderPhotos(sb, row) {
  const wrap = document.getElementById('photo-grid');
  if (!wrap) return;
  wrap.hidden = false;
  document.getElementById('photo-section').hidden = false;
  const images = Array.isArray(row.images) ? row.images : [];
  wrap.innerHTML = images.map((img, i) => {
    const [title, desc] = photoRole(i);
    return `<article class="photo-card">
      <h3>${title}</h3>
      <p>${desc}</p>
      <img src="${getProductImageUrl(img)}" alt="${title}">
      <label class="field">Заменить это фото
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-replace="${i}">
      </label>
      <button class="btn btn-danger" type="button" data-del-img="${img}">Удалить фото</button>
    </article>`;
  }).join('');
  wrap.querySelectorAll('[data-replace]').forEach((input) => {
    input.addEventListener('change', async () => {
      if (!input.files[0]) return;
      const idx = Number(input.dataset.replace);
      const [path] = await uploadFiles(sb, 'products', String(row.id), [input.files[0]]);
      const next = [...images];
      next[idx] = path;
      const { error } = await sb.from('products').update({ images: next, updated_at: new Date().toISOString() }).eq('id', row.id);
      if (error) { alert(error.message); return; }
      invalidateProducts();
      location.reload();
    });
  });
  wrap.querySelectorAll('[data-del-img]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Удалить это фото?')) return;
      const next = images.filter((p) => p !== btn.dataset.delImg);
      const { error } = await sb.from('products').update({ images: next }).eq('id', row.id);
      if (error) { alert(error.message); return; }
      invalidateProducts();
      location.reload();
    });
  });
  document.getElementById('add-photos')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const files = e.target.querySelector('[name="more"]').files;
    if (!files.length) return;
    const paths = await uploadFiles(sb, 'products', String(row.id), files);
    const { error } = await sb.from('products').update({ images: [...images, ...paths] }).eq('id', row.id);
    if (error) { alert(error.message); return; }
    invalidateProducts();
    location.reload();
  });
}

async function pageCategories() {
  const ctx = await requireAdmin();
  if (!ctx) return;
  bindNav();
  const { sb } = ctx;
  const { data: rows } = await sb.from('categories').select('*').order('sort_order').order('id');
  const list = document.getElementById('cat-list');
  list.innerHTML = (rows || []).map((r) => `
    <div class="cat-card" data-id="${r.id}">
      <form class="inline cat-save">
        <label class="field">Slug <input name="slug" value="${r.slug}"></label>
        <label class="field">RU <input name="name_ru" value="${r.name_ru}"></label>
        <label class="field">UZ <input name="name_uz" value="${r.name_uz}"></label>
        <label class="field">EN <input name="name_en" value="${r.name_en}"></label>
        <label class="field">Сорт <input name="sort_order" type="number" value="${r.sort_order}"></label>
        <label class="check"><input type="checkbox" name="is_active" ${r.is_active ? 'checked' : ''}> Показывать</label>
        <label class="field">Фото категории
          ${r.image ? `<img class="thumb-mini" src="${getCategoryImageUrl(r.image)}" alt="">` : ''}
          <input type="file" name="image" accept="image/*">
        </label>
        <button class="btn" type="submit">Сохранить</button>
      </form>
      <button class="btn btn-danger" type="button" data-del-cat>Удалить</button>
    </div>`).join('');

  document.getElementById('cat-new').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const { error } = await sb.from('categories').insert({
      slug: String(fd.get('slug')).toLowerCase().replace(/[^a-z0-9\-]+/g, '-'),
      name_ru: String(fd.get('name_ru')),
      name_uz: String(fd.get('name_uz')),
      name_en: String(fd.get('name_en')),
      sort_order: Number(fd.get('sort_order') || 0),
      is_active: e.target.querySelector('[name="is_active"]').checked,
    });
    if (error) { alert(error.message); return; }
    invalidateCategories();
    location.reload();
  });

  list.addEventListener('submit', async (e) => {
    const form = e.target.closest('.cat-save');
    if (!form) return;
    e.preventDefault();
    const id = Number(form.closest('[data-id]').dataset.id);
    const fd = new FormData(form);
    const payload = {
      slug: String(fd.get('slug')).toLowerCase().replace(/[^a-z0-9\-]+/g, '-'),
      name_ru: String(fd.get('name_ru')),
      name_uz: String(fd.get('name_uz')),
      name_en: String(fd.get('name_en')),
      sort_order: Number(fd.get('sort_order') || 0),
      is_active: form.querySelector('[name="is_active"]').checked,
    };
    const file = form.querySelector('[name="image"]').files[0];
    if (file) {
      const [path] = await uploadFiles(sb, 'categories', String(id), [file]);
      payload.image = path;
    }
    const { error } = await sb.from('categories').update(payload).eq('id', id);
    if (error) { alert(error.message); return; }
    invalidateCategories();
    location.reload();
  });

  list.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-del-cat]');
    if (!btn) return;
    const id = Number(btn.closest('[data-id]').dataset.id);
    const { count } = await sb.from('products').select('id', { count: 'exact', head: true }).eq('category_id', id);
    if (count > 0) { alert('Нельзя удалить: в категории есть товары.'); return; }
    const { error } = await sb.from('categories').delete().eq('id', id);
    if (error) { alert(error.message); return; }
    invalidateCategories();
    location.reload();
  });
}

async function upsertSetting(sb, key, value) {
  const { data } = await sb.from('settings').select('id').eq('key', key).maybeSingle();
  if (data) {
    const { error } = await sb.from('settings').update({ value, updated_at: new Date().toISOString() }).eq('key', key);
    if (error) throw error;
  } else {
    const { error } = await sb.from('settings').insert({ key, value });
    if (error) throw error;
  }
}

async function pageSettings() {
  const ctx = await requireAdmin();
  if (!ctx) return;
  bindNav();
  const { sb } = ctx;
  const { data } = await sb.from('settings').select('*');
  const map = {};
  (data || []).forEach((r) => { map[r.key] = r.value; });
  ['telegram_url', 'telegram_username', 'phone', 'instagram', 'email', 'brand_name', 'hours',
    'delivery_note_ru', 'delivery_note_uz', 'delivery_note_en'].forEach((k) => {
    const el = document.querySelector(`[name="${k}"]`);
    if (el) el.value = map[k] || '';
  });
  document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    for (const [k, v] of fd.entries()) {
      await upsertSetting(sb, k, String(v).trim());
    }
    alert('Контакты сохранены.');
  });
}

async function pageMedia() {
  const ctx = await requireAdmin();
  if (!ctx) return;
  bindNav();
  const { sb } = ctx;
  const { data } = await sb.from('settings').select('*');
  const map = {};
  (data || []).forEach((r) => { map[r.key] = r.value; });
  const grid = document.getElementById('media-grid');
  grid.innerHTML = MEDIA_SLOTS.map(([key, title, desc, fallback]) => {
    const current = map[key] || '';
    const src = current ? getSiteImageUrl(current) : BASE + fallback;
    return `<article class="photo-card">
      <h3>${title}</h3>
      <p>${desc}</p>
      <img src="${src}" alt="${title}">
      <label class="field">Заменить: ${title}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-slot="${key}">
      </label>
    </article>`;
  }).join('');
  grid.querySelectorAll('[data-slot]').forEach((input) => {
    input.addEventListener('change', async () => {
      if (!input.files[0]) return;
      const [path] = await uploadFiles(sb, 'site', input.dataset.slot, [input.files[0]]);
      await upsertSetting(sb, input.dataset.slot, path);
      location.reload();
    });
  });
}

async function pageOrders() {
  const ctx = await requireAdmin();
  if (!ctx) return;
  bindNav();
  const rows = await fetchOrders();
  const root = document.getElementById('orders-root');
  if (!rows.length) {
    root.innerHTML = '<p>Заказов пока нет.</p>';
    return;
  }
  root.innerHTML = `<table class="product-table"><thead><tr>
    <th>Дата</th><th>Имя</th><th>Телефон</th><th>Адрес</th><th>Сумма</th><th>Статус</th>
  </tr></thead><tbody>${rows.map((o) => `<tr>
    <td data-label="Дата">${new Date(o.created_at).toLocaleString('ru-RU')}</td>
    <td data-label="Имя">${o.customer_name}<br><small>${o.telegram_username || ''}</small></td>
    <td data-label="Телефон">${o.phone}</td>
    <td data-label="Адрес">${o.delivery_address}</td>
    <td data-label="Сумма">${Number(o.total).toLocaleString('ru-RU')} сум</td>
    <td data-label="Статус">
      <select data-status="${o.id}">
        ${['new', 'processing', 'done', 'cancelled'].map((s) =>
          `<option value="${s}" ${o.status === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
    </td>
  </tr>`).join('')}</tbody></table>`;
  root.querySelectorAll('[data-status]').forEach((sel) => {
    sel.addEventListener('change', async () => {
      await updateOrderStatus(Number(sel.dataset.status), sel.value);
    });
  });
}

const page = document.body.dataset.admin;
const runners = {
  login: pageLogin,
  products: pageProducts,
  product: pageProduct,
  categories: pageCategories,
  settings: pageSettings,
  media: pageMedia,
  orders: pageOrders,
};

runners[page]?.().catch((err) => {
  document.querySelector('.admin-main')?.insertAdjacentHTML('afterbegin', `<p class="err">${err.message}</p>`);
});
