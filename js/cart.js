const CART_KEY = 'looksor_cart';
const FAV_KEY = 'looksor_favs';

export function cart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { return []; }
}
export function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  updateBadges();
}
export function favs() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch { return []; }
}
export function saveFavs(ids) {
  localStorage.setItem(FAV_KEY, JSON.stringify(ids));
  updateBadges();
}
export function toggleFav(id) {
  const ids = favs();
  const i = ids.indexOf(id);
  if (i >= 0) ids.splice(i, 1); else ids.push(id);
  saveFavs(ids);
  document.querySelectorAll(`[data-fav="${id}"]`).forEach((el) => {
    el.textContent = ids.includes(id) ? '♥' : '♡';
  });
}

export function updateBadges() {
  const c = cart().reduce((s, i) => s + i.qty, 0);
  const f = favs().length;
  document.querySelectorAll('[data-cart-count]').forEach((el) => {
    el.hidden = !c; el.textContent = String(c);
  });
  document.querySelectorAll('[data-fav-count]').forEach((el) => {
    el.hidden = !f; el.textContent = String(f);
  });
}
