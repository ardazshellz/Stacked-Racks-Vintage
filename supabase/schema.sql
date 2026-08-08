create extension if not exists pgcrypto;

create table if not exists public.orders (
  id text primary key,
  stripe_session_id text unique,
  source text not null default 'stripe',
  item_id text,
  item_name text not null,
  brand text not null default '',
  price numeric(10,2) not null default 0,
  postage numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  customer_name text not null,
  customer_email text not null default '',
  customer_phone text not null default '',
  customer_address text not null default '',
  payment_status text not null default 'paid',
  notes text not null default '',
  customer_email_sent boolean not null default false,
  owner_email_sent boolean not null default false,
  date_of_sale timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists orders_date_of_sale_idx on public.orders (date_of_sale desc);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text not null,
  size text not null,
  gender text not null check (gender in ('Mens', 'Womens')),
  price numeric(10,2) not null check (price > 0),
  category text not null,
  badge text not null default 'NEW' check (badge in ('NEW', 'RARE')),
  rare_badge text,
  stock integer not null default 1 check (stock >= 0),
  condition text not null check (condition in ('Excellent', 'Good', 'Fair')),
  era text not null,
  fit text not null,
  listed_date date not null default current_date,
  description text not null default '',
  editorial_story text,
  image_urls text[] not null default '{}',
  vinted_title text,
  vinted_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_created_at_idx on public.products (created_at desc);
create index if not exists products_stock_idx on public.products (stock);

alter table public.orders enable row level security;
alter table public.products enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 4194304, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
