-- AccessCart product catalog. Run this in the Supabase SQL Editor first.
create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null,
  price numeric(12, 2) not null check (price >= 0),
  rating numeric(2, 1) not null check (rating between 0 and 5),
  reviews_count integer not null default 0 check (reviews_count >= 0),
  warranty_months integer not null default 0 check (warranty_months >= 0),
  image_url text not null default '',
  color text not null default '#f1f1ed',
  tag text not null default '',
  description text not null default '',
  simple_description text not null default '',
  features text[] not null default '{}',
  sample_reviews text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;
grant select on public.products to anon, authenticated;
drop policy if exists "Products are publicly readable" on public.products;
create policy "Products are publicly readable"
  on public.products for select
  to anon, authenticated
  using (true);

-- Supabase Auth stores credentials in auth.users. This small profile table
-- stores only the display name and is private to its signed-in owner.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
grant select, insert, update on public.profiles to authenticated;
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_accesscart on auth.users;
create trigger on_auth_user_created_accesscart
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

-- The browser/API's publishable key can read the catalog. Writes are performed
-- through the Supabase dashboard or SQL editor; no secret service key is needed.
