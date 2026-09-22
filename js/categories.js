import { getSupabase } from './supabase.js';

let cache = { at: 0, categories: [] };

function mapCat(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: { ru: row.name_ru, uz: row.name_uz, en: row.name_en },
    image: row.image,
    sort_order: row.sort_order,
    is_active: Boolean(row.is_active),
  };
}

export async function fetchCategories({ admin = false } = {}) {
  const now = Date.now();
  if (!admin && cache.categories.length && now - cache.at < 30000) {
    return cache.categories;
  }
  const sb = getSupabase();
  let q = sb
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });
  if (!admin) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  const categories = (data || []).map(mapCat);
  if (!admin) cache = { at: now, categories };
  return categories;
}

export function invalidateCategories() {
  cache = { at: 0, categories: [] };
}
