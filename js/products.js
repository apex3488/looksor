import { getSupabase } from './supabase.js';

const PAGE_SIZE = 200;
let cache = { at: 0, products: [] };

function mapProduct(row) {
  const colors = Array.isArray(row.colors) ? row.colors : [];
  const sizes = Array.isArray(row.sizes) ? row.sizes : [];
  const images = Array.isArray(row.images) ? row.images : [];
  return {
    id: row.id,
    article: row.article,
    name: { ru: row.name_ru, uz: row.name_uz, en: row.name_en },
    description: { ru: row.description_ru, uz: row.description_uz, en: row.description_en },
    category: row.categories?.slug || row.category_slug || null,
    category_id: row.category_id,
    price: Number(row.price) || 0,
    oldPrice: row.old_price != null ? Number(row.old_price) : null,
    images,
    colors,
    sizes,
    stock: Number(row.stock) || 0,
    available: Boolean(row.is_active) && (row.stock == null || Number(row.stock) > 0),
    featured: Boolean(row.featured),
    bestseller: Boolean(row.bestseller),
    is_new: Boolean(row.is_new),
  };
}

export async function fetchProducts({ admin = false } = {}) {
  const now = Date.now();
  if (!admin && cache.products.length && now - cache.at < 30000) {
    return cache.products;
  }
  const sb = getSupabase();
  let q = sb
    .from('products')
    .select('*, categories(slug)')
    .order('id', { ascending: false })
    .limit(PAGE_SIZE);
  if (!admin) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  const products = (data || []).map((row) => {
    row.category_slug = row.categories?.slug;
    return mapProduct(row);
  });
  if (!admin) cache = { at: now, products };
  return products;
}

export async function fetchProductById(id, { admin = false } = {}) {
  const sb = getSupabase();
  let q = sb.from('products').select('*, categories(slug)').eq('id', id).maybeSingle();
  const { data, error } = await q;
  if (error) throw error;
  if (!data) return null;
  if (!admin && !data.is_active) return null;
  data.category_slug = data.categories?.slug;
  return mapProduct(data);
}

export function invalidateProducts() {
  cache = { at: 0, products: [] };
}
