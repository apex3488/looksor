const LANG_KEY = 'looksor_lang';

export const i18nState = {
  lang: localStorage.getItem(LANG_KEY) || 'ru',
  dict: {},
};

export function t(key) {
  return i18nState.dict[i18nState.lang]?.[key] || i18nState.dict.ru?.[key] || key;
}

export function loc(obj) {
  if (!obj || typeof obj !== 'object') return '';
  return obj[i18nState.lang] || obj.ru || '';
}

export function applyI18n() {
  document.documentElement.lang = i18nState.lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-lang]').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.lang === i18nState.lang);
  });
  const input = document.querySelector('#search-input');
  if (input) input.placeholder = t('search_placeholder');
}

export function setLanguage(lang) {
  const allowed = ['ru', 'uz', 'en'];
  i18nState.lang = allowed.includes(lang) ? lang : 'ru';
  localStorage.setItem(LANG_KEY, i18nState.lang);
  applyI18n();
  window.dispatchEvent(new CustomEvent('looksor:lang', { detail: i18nState.lang }));
}

window.setLanguage = setLanguage;

export async function loadTranslations(base) {
  const res = await fetch(`${base}assets/data/translations.json`);
  if (!res.ok) throw new Error(`translations.json: HTTP ${res.status}`);
  i18nState.dict = await res.json();
  applyI18n();
}
