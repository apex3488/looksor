const SUPABASE_URL = 'https://druepnsjozsupnmhyrsb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_9nbY0TV4DIGYAKWPmKKXVA_YSkb_uzD';

export function isSupabaseConfigured() {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes('YOUR_SUPABASE') &&
    !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE')
  );
}

export function getSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error('Укажите SUPABASE_URL и SUPABASE_ANON_KEY в js/supabase.js');
  }
  if (!window.supabase?.createClient) {
    throw new Error('Supabase JS client не загружен (CDN).');
  }
  if (!window.__looksorSb) {
    window.__looksorSb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return window.__looksorSb;
}

export function getProductImageUrl(path, bucket = 'products') {
  const base = window.LOOKSOR_BASE || './';
  if (!path) return `${base}assets/images/placeholder.svg`;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('assets/') || path.startsWith('./') || path.startsWith('../')) {
    return base + path.replace(/^\.?\//, '');
  }
  if (!isSupabaseConfigured()) {
    return `${base}assets/images/placeholder.svg`;
  }
  const clean = String(path).replace(/^\/+/, '');
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${clean}`;
}

export function getSiteImageUrl(path) {
  if (!path) return '';
  if (path.startsWith('assets/')) return (window.LOOKSOR_BASE || './') + path;
  return getProductImageUrl(path, 'site');
}

export function getCategoryImageUrl(path) {
  if (!path) return '';
  if (path.startsWith('assets/')) return (window.LOOKSOR_BASE || './') + path;
  return getProductImageUrl(path, 'categories');
}

export { SUPABASE_URL, SUPABASE_ANON_KEY };
