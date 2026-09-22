-- LOOKSÒR — схема для Supabase (SQL Editor).
-- RLS включён. Публичное чтение только активных товаров и категорий.
-- Админ: Auth user + profiles.is_admin = true.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create table if not exists public.categories (
  id bigint generated always as identity primary key,
  name_ru text not null,
  name_uz text not null,
  name_en text not null,
  slug text not null unique,
  image text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id bigint generated always as identity primary key,
  article text not null unique,
  name_ru text not null,
  name_uz text not null,
  name_en text not null,
  description_ru text not null default '',
  description_uz text not null default '',
  description_en text not null default '',
  price int not null,
  old_price int,
  category_id bigint not null references public.categories(id),
  images jsonb not null default '[]'::jsonb,
  colors jsonb not null default '[]'::jsonb,
  sizes jsonb not null default '[]'::jsonb,
  stock int not null default 1,
  is_active boolean not null default true,
  featured boolean not null default false,
  bestseller boolean not null default false,
  is_new boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id bigint generated always as identity primary key,
  customer_name text not null,
  telegram_username text not null default '',
  phone text not null,
  delivery_address text not null,
  items jsonb not null default '[]'::jsonb,
  total int not null default 0,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.settings (
  id bigint generated always as identity primary key,
  key text not null unique,
  value text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_active_idx on public.products(is_active);
create index if not exists categories_slug_idx on public.categories(slug);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.settings enable row level security;

drop policy if exists "profiles_self_read" on public.profiles;
create policy "profiles_self_read" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "categories_public_read" on public.categories;
create policy "categories_public_read" on public.categories
  for select to anon, authenticated
  using (is_active = true or public.is_admin());

drop policy if exists "categories_admin_all" on public.categories;
create policy "categories_admin_all" on public.categories
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products
  for select to anon, authenticated
  using (is_active = true or public.is_admin());

drop policy if exists "products_admin_all" on public.products;
create policy "products_admin_all" on public.products
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Гости могут только СОЗДАВАТЬ заказы.
-- SELECT у anon нет намеренно (чужие заказы не читаются).
-- Frontend: insert БЕЗ .select() — иначе PostgREST требует SELECT-политику и даёт 401.
drop policy if exists "orders_public_insert" on public.orders;
create policy "orders_public_insert" on public.orders
  for insert to anon, authenticated
  with check (true);

drop policy if exists "orders_admin_read" on public.orders;
create policy "orders_admin_read" on public.orders
  for select to authenticated
  using (public.is_admin());

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "settings_public_read" on public.settings;
create policy "settings_public_read" on public.settings
  for select to anon, authenticated
  using (true);

drop policy if exists "settings_admin_write" on public.settings;
create policy "settings_admin_write" on public.settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public)
values
  ('products', 'products', true),
  ('categories', 'categories', true),
  ('site', 'site', true)
on conflict (id) do nothing;

drop policy if exists "storage_public_read" on storage.objects;
create policy "storage_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('products', 'categories', 'site'));

drop policy if exists "storage_admin_insert" on storage.objects;
create policy "storage_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('products', 'categories', 'site') and public.is_admin());

drop policy if exists "storage_admin_update" on storage.objects;
create policy "storage_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id in ('products', 'categories', 'site') and public.is_admin());

drop policy if exists "storage_admin_delete" on storage.objects;
create policy "storage_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('products', 'categories', 'site') and public.is_admin());

-- Профиль создаётся при регистрации
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, is_admin) values (new.id, false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.categories (slug, name_ru, name_uz, name_en, sort_order) values
  ('novinki', 'Новинки', 'Yangiliklar', 'New', 1),
  ('platya', 'Платья', 'Ko‘ylaklar', 'Dresses', 2),
  ('topy', 'Топы', 'Toplar', 'Tops', 3),
  ('bryuki', 'Брюки', 'Shimlar', 'Trousers', 4),
  ('yubki', 'Юбки', 'Yubkalar', 'Skirts', 5),
  ('kostyumy', 'Костюмы', 'Kostyumlar', 'Suits', 6),
  ('outerwear', 'Верхняя одежда', 'Tashqi kiyim', 'Outerwear', 7),
  ('rubashki', 'Рубашки', 'Ko‘ylak-bluzkalar', 'Shirts', 8),
  ('jeans', 'Джинсы', 'Jinsilar', 'Jeans', 9),
  ('knitwear', 'Трикотаж', 'Trikotaj', 'Knitwear', 10),
  ('accessories', 'Аксессуары', 'Aksessuarlar', 'Accessories', 11),
  ('sale', 'Sale', 'Sale', 'Sale', 12)
on conflict (slug) do nothing;

insert into public.settings (key, value) values
  ('telegram_url', 'https://t.me/APEX348'),
  ('telegram_username', '@APEX348'),
  ('phone', '+998'),
  ('instagram', 'https://instagram.com/looksor'),
  ('email', 'hello@looksor.uz'),
  ('brand_name', 'LOOKSÒR'),
  ('hours', '10:00 — 20:00'),
  ('delivery_note_ru', 'Стоимость доставки рассчитывается в зависимости от адреса. Подробности доставки уточняются у менеджера.'),
  ('delivery_note_uz', 'Yetkazib berish narxi manzilga qarab hisoblanadi. Tafsilotlar menejer bilan aniqlashtiriladi.'),
  ('delivery_note_en', 'Delivery cost depends on the address. Details are confirmed with the manager.')
on conflict (key) do nothing;

insert into public.products (
  article, name_ru, name_uz, name_en, description_ru, description_uz, description_en,
  category_id, price, old_price, images, colors, sizes, stock, is_active, featured, bestseller, is_new
)
select
  v.article, v.name_ru, v.name_uz, v.name_en, v.description_ru, v.description_uz, v.description_en,
  c.id, v.price, v.old_price, v.images::jsonb, v.colors::jsonb, '["XS","S","M","L","XL"]'::jsonb,
  10, true, v.featured, v.bestseller, v.is_new
from (values
  ('LS-001','platya','Платье Aurelia','Aurelia ko‘ylagi','Aurelia Dress',
   'Мягкий силуэт с естественной линией плеча. Ткань ложится спокойными складками и подчёркивает осанку без лишнего объёма.',
   'Yumshoq siluet, tabiiy yelka chizig‘i. Mato sokin burmalarda yotadi va qomatni ortiqcha hajmsiz ta’kidlaydi.',
   'A quiet silhouette with a natural shoulder line. The fabric falls in calm folds and frames posture without excess volume.',
   1450000, null::int, true, true, true,
   '["assets/images/products/platya-1.jpg","assets/images/products/platya-2.jpg"]',
   '[{"hex":"#EFE9D9","ru":"Кремовый","uz":"Krem","en":"Cream"},{"hex":"#682525","ru":"Бордо","uz":"Bordo","en":"Bordeaux"}]'),
  ('LS-002','topy','Топ Solenne','Solenne topi','Solenne Top',
   'Приталенный крой из мягкого полотна. Носится самостоятельно или как основа под жакет.',
   'Yumshoq matodan tikilgan tor kroylik. Yakka yoki pidjak ostida kiyiladi.',
   'A fitted cut in a soft knit. Worn alone or as a base beneath a jacket.',
   620000, null, true, true, false,
   '["assets/images/products/top-1.jpg","assets/images/products/top-2.jpg"]',
   '[{"hex":"#EFE9D9","ru":"Кремовый","uz":"Krem","en":"Cream"},{"hex":"#5A493B","ru":"Какао","uz":"Kakao","en":"Cocoa"}]'),
  ('LS-003','bryuki','Брюки Calma','Calma shimi','Calma Trousers',
   'Прямая линия с мягкой посадкой на талии. Универсальная длина для города и вечера.',
   'Belda yumshoq o‘tiradigan to‘g‘ri chiziq. Shahar va kechki chiqish uchun universal uzunlik.',
   'A straight line with a soft waist. A versatile length for day and evening.',
   890000, null, true, false, true,
   '["assets/images/products/pants-1.jpg","assets/images/products/pants-2.jpg"]',
   '[{"hex":"#1E1D1B","ru":"Графит","uz":"Grafit","en":"Graphite"},{"hex":"#B1997E","ru":"Песок","uz":"Qum","en":"Sand"}]'),
  ('LS-004','yubki','Юбка Luce','Luce yubkasi','Luce Skirt',
   'А-силуэт средней длины. Движение ткани спокойное, почти бесшумное.',
   'O‘rta uzunlikdagi A-siluet. Mato harakati sokin.',
   'A mid-length A-line. The fabric moves quietly.',
   760000, null, true, false, false,
   '["assets/images/products/skirt-1.jpg","assets/images/products/skirt-2.jpg"]',
   '[{"hex":"#682525","ru":"Бордо","uz":"Bordo","en":"Bordeaux"},{"hex":"#EFE9D9","ru":"Кремовый","uz":"Krem","en":"Cream"}]'),
  ('LS-005','kostyumy','Костюм Harmonia','Harmonia kostyumi','Harmonia Suit',
   'Жакет свободного кроя и брюки в тон. Костюм, который собирает образ целиком.',
   'Erkin kroylik pidjak va mos shimlar. Butun obrazni yig‘adigan kostyum.',
   'A relaxed jacket and matching trousers. A suit that completes the look.',
   2180000, null, true, true, true,
   '["assets/images/products/suit-1.jpg","assets/images/products/suit-2.jpg"]',
   '[{"hex":"#5A493B","ru":"Какао","uz":"Kakao","en":"Cocoa"},{"hex":"#1E1D1B","ru":"Графит","uz":"Grafit","en":"Graphite"}]'),
  ('LS-006','outerwear','Пальто Nube','Nube palto','Nube Coat',
   'Удлинённое пальто с мягким воротом. Тёплая шерстяная смесь, спокойный вес ткани.',
   'Yumshoq yoqali uzun palto. Iliq jun aralashmasi.',
   'A long coat with a soft collar. Warm wool blend, a calm fabric weight.',
   2650000, null, true, false, false,
   '["assets/images/products/coat-1.jpg","assets/images/products/coat-2.jpg"]',
   '[{"hex":"#B1997E","ru":"Песок","uz":"Qum","en":"Sand"},{"hex":"#1E1D1B","ru":"Графит","uz":"Grafit","en":"Graphite"}]'),
  ('LS-007','rubashki','Рубашка Alba','Alba ko‘ylagi','Alba Shirt',
   'Свободный рукав и чистый ворот. Носится навыпуск или заправленной.',
   'Erkin yeng va toza yoqa. Ichiga solib yoki tashqarida kiyiladi.',
   'A generous sleeve and a clean collar. Worn tucked or over the silhouette.',
   540000, null, true, false, false,
   '["assets/images/products/shirt-1.jpg","assets/images/products/shirt-2.jpg"]',
   '[{"hex":"#EFE9D9","ru":"Кремовый","uz":"Krem","en":"Cream"},{"hex":"#B1997E","ru":"Песок","uz":"Qum","en":"Sand"}]'),
  ('LS-008','jeans','Джинсы Terra','Terra jinsi','Terra Jeans',
   'Мягкая деним-смесь с естественным выцветанием. Прямой крой.',
   'Tabiiy oqarishli yumshoq denim. To‘g‘ri kroy.',
   'A soft denim blend with a natural fade. Straight cut.',
   720000, 890000, true, false, false,
   '["assets/images/products/jeans-1.jpg","assets/images/products/jeans-2.jpg"]',
   '[{"hex":"#1E1D1B","ru":"Графит","uz":"Grafit","en":"Graphite"},{"hex":"#5A493B","ru":"Какао","uz":"Kakao","en":"Cocoa"}]'),
  ('LS-009','knitwear','Джемпер Miele','Miele jumper','Miele Knit',
   'Тонкая вязка, которая держит тепло, но не утяжеляет силуэт.',
   'Issiqlikni saqlaydigan, lekin siluetni og‘irlashtirmaydigan nozik to‘qima.',
   'A fine knit that holds warmth without weighing the silhouette.',
   680000, null, true, true, false,
   '["assets/images/products/knit-1.jpg","assets/images/products/knit-2.jpg"]',
   '[{"hex":"#EFE9D9","ru":"Кремовый","uz":"Krem","en":"Cream"},{"hex":"#682525","ru":"Бордо","uz":"Bordo","en":"Bordeaux"}]'),
  ('LS-010','accessories','Шарф Velo','Velo sharf','Velo Scarf',
   'Лёгкий шарф из смесовой ткани. Завершает образ одной линией цвета.',
   'Aralash matodan yengil sharf. Obrazni bitta rang chizig‘i bilan yakunlaydi.',
   'A light mixed-fibre scarf. Completes a look with a single line of colour.',
   310000, null, true, false, false,
   '["assets/images/products/scarf-1.jpg","assets/images/products/scarf-2.jpg"]',
   '[{"hex":"#682525","ru":"Бордо","uz":"Bordo","en":"Bordeaux"},{"hex":"#B1997E","ru":"Песок","uz":"Qum","en":"Sand"},{"hex":"#EFE9D9","ru":"Кремовый","uz":"Krem","en":"Cream"}]')
) as v(article, slug, name_ru, name_uz, name_en, description_ru, description_uz, description_en, price, old_price, featured, bestseller, is_new, images, colors)
join public.categories c on c.slug = v.slug
where not exists (select 1 from public.products p where p.article = v.article);
