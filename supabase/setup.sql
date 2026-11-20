create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  code text not null unique,
  category_id uuid references public.categories(id) on delete set null,
  price numeric(10, 2) check (price is null or price >= 0),
  description text not null default '',
  fabric text,
  colors text[] not null default '{}',
  sizes text[] not null default '{}',
  images text[] not null default '{}',
  image_alt text not null default 'Stitched kamiz',
  is_featured boolean not null default false,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.categories (name)
values
  ('Straight cut'),
  ('A-line'),
  ('Umbrella style'),
  ('Long kamiz'),
  ('Cotton'),
  ('Printed'),
  ('Embroidered')
on conflict (name) do nothing;

create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_visible_created_idx
  on public.products(is_visible, created_at desc);

alter table public.categories enable row level security;
alter table public.products enable row level security;

create or replace function public.is_lamiya_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'lamiya_admin' = 'true'
    or auth.jwt() -> 'app_metadata' ->> 'mamoni_admin' = 'true',
    false
  );
$$;

revoke all on function public.is_lamiya_admin() from public;
grant execute on function public.is_lamiya_admin() to anon, authenticated;

grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

drop policy if exists "Anyone can read categories" on public.categories;
create policy "Anyone can read categories"
  on public.categories for select to anon, authenticated
  using (true);

drop policy if exists "Mamoni admins can manage categories" on public.categories;
drop policy if exists "Lamiya admins can manage categories" on public.categories;
create policy "Lamiya admins can manage categories"
  on public.categories for all to authenticated
  using (public.is_lamiya_admin())
  with check (public.is_lamiya_admin());

drop policy if exists "Public can read visible products and admins can read all" on public.products;
create policy "Public can read visible products and admins can read all"
  on public.products for select to anon, authenticated
  using (is_visible or public.is_lamiya_admin());

drop policy if exists "Mamoni admins can manage products" on public.products;
drop policy if exists "Lamiya admins can manage products" on public.products;
create policy "Lamiya admins can manage products"
  on public.products for all to authenticated
  using (public.is_lamiya_admin())
  with check (public.is_lamiya_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can read Mamoni product photos" on storage.objects;
drop policy if exists "Anyone can read Lamiya product photos" on storage.objects;
create policy "Anyone can read Lamiya product photos"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Mamoni admins can upload product photos" on storage.objects;
drop policy if exists "Lamiya admins can upload product photos" on storage.objects;
create policy "Lamiya admins can upload product photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_lamiya_admin());

drop policy if exists "Mamoni admins can delete product photos" on storage.objects;
drop policy if exists "Lamiya admins can delete product photos" on storage.objects;
create policy "Lamiya admins can delete product photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_lamiya_admin());

-- After creating the owner in Supabase Auth, run this once with their real email:
-- update auth.users
-- set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"lamiya_admin": true}'::jsonb
-- where email = 'owner@example.com';
