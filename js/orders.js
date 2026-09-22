import { getSupabase } from './supabase.js';
import { i18nState, loc, t } from './i18n.js';

export function money(n) {
  return new Intl.NumberFormat('ru-RU').format(n) + ' ' + t('currency');
}

export function telegramUrl(settings, text) {
  const base = settings.telegram_url || 'https://t.me/APEX348';
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function buildOrderText({ items, customer }) {
  const blocks = items.map((it) => [
    'Товар:',
    it.name,
    '',
    'Цвет:',
    it.color,
    '',
    'Размер:',
    it.size,
    '',
    'Количество:',
    String(it.qty),
    '',
    'Цена:',
    it.priceLine,
  ].join('\n'));

  return [
    'LOOKSÒR — НОВЫЙ ЗАКАЗ',
    '',
    blocks.join('\n\n'),
    '',
    'Имя:',
    customer.name || '',
    '',
    'Телефон:',
    customer.phone || '',
    '',
    'Адрес доставки:',
    customer.address || '',
    customer.telegram ? `\nTelegram:\n${customer.telegram}` : '',
  ].filter(Boolean).join('\n');
}

export function itemDisplay(p, extra) {
  return {
    name: loc(p.name),
    color: extra.color,
    size: extra.size,
    qty: extra.qty,
    priceLine: money(p.price * extra.qty),
    product_id: p.id,
    article: p.article,
    unit_price: p.price,
  };
}

export async function createOrder({ customer, items, total }) {
  const sb = getSupabase();
  // Без .select(): у anon нет SELECT на orders (только INSERT).
  // .insert().select() иначе падает с RLS 401, хотя строка могла бы записаться.
  const { error } = await sb.from('orders').insert({
    customer_name: customer.name,
    telegram_username: customer.telegram || '',
    phone: customer.phone,
    delivery_address: customer.address,
    items,
    total,
    status: 'new',
  });
  if (error) throw error;
  return { ok: true };
}

export async function fetchOrders() {
  const sb = getSupabase();
  const { data, error } = await sb.from('orders').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return data || [];
}

export async function updateOrderStatus(id, status) {
  const sb = getSupabase();
  const { error } = await sb.from('orders').update({ status }).eq('id', id);
  if (error) throw error;
}

export function lang() {
  return i18nState.lang;
}
