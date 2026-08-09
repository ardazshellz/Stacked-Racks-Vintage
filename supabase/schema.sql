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

alter table public.orders add column if not exists stripe_payment_intent text;
alter table public.orders add column if not exists fulfilment_status text not null default 'paid';
alter table public.orders add column if not exists tracking_number text not null default '';
alter table public.orders add column if not exists dispatched_at timestamptz;
alter table public.orders add column if not exists dispatch_email_sent boolean not null default false;
alter table public.orders add column if not exists refunded_amount numeric(10,2) not null default 0;
alter table public.orders add column if not exists stripe_fee numeric(10,2) not null default 0;
alter table public.orders add column if not exists items jsonb not null default '[]'::jsonb;
alter table public.orders add column if not exists updated_at timestamptz not null default now();

create index if not exists orders_payment_intent_idx on public.orders (stripe_payment_intent);
create index if not exists orders_fulfilment_idx on public.orders (fulfilment_status, date_of_sale desc);

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

alter table public.products add column if not exists reserved_until timestamptz;
alter table public.products add column if not exists reservation_token uuid;
create index if not exists products_reservation_idx on public.products (reservation_token);

create table if not exists public.subscribers (
  email text primary key,
  discount_code text not null unique,
  consent_source text not null default 'website',
  consented_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  discount_redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_rate_limits (
  id bigint generated always as identity primary key,
  key_hash text not null,
  action text not null,
  created_at timestamptz not null default now()
);
create index if not exists admin_rate_limits_lookup_idx on public.admin_rate_limits (key_hash, action, created_at desc);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  action text not null,
  target_type text not null,
  target_id text not null default '',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_created_idx on public.admin_audit_log (created_at desc);

alter table public.subscribers enable row level security;
alter table public.admin_rate_limits enable row level security;
alter table public.admin_audit_log enable row level security;

create or replace function public.reserve_products(
  p_ids uuid[],
  p_token uuid,
  p_expires_at timestamptz
)
returns setof public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  reserved_count integer;
begin
  if cardinality(p_ids) is null or cardinality(p_ids) = 0 then
    raise exception 'PRODUCT_UNAVAILABLE';
  end if;

  update public.products
  set reservation_token = p_token,
      reserved_until = p_expires_at,
      updated_at = now()
  where id = any(p_ids)
    and stock > 0
    and (reserved_until is null or reserved_until < now());

  get diagnostics reserved_count = row_count;
  if reserved_count <> cardinality(p_ids) then
    raise exception 'PRODUCT_UNAVAILABLE';
  end if;

  return query select * from public.products where reservation_token = p_token;
end;
$$;

create or replace function public.release_product_reservation(p_token uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  released_count integer;
begin
  update public.products
  set reservation_token = null,
      reserved_until = null,
      updated_at = now()
  where reservation_token = p_token and stock > 0;
  get diagnostics released_count = row_count;
  return released_count;
end;
$$;

create or replace function public.complete_product_reservation(p_token uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  completed_count integer;
begin
  update public.products
  set stock = 0,
      reservation_token = null,
      reserved_until = null,
      updated_at = now()
  where reservation_token = p_token;
  get diagnostics completed_count = row_count;
  return completed_count;
end;
$$;

revoke all on function public.reserve_products(uuid[], uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.release_product_reservation(uuid) from public, anon, authenticated;
revoke all on function public.complete_product_reservation(uuid) from public, anon, authenticated;
grant execute on function public.reserve_products(uuid[], uuid, timestamptz) to service_role;
grant execute on function public.release_product_reservation(uuid) to service_role;
grant execute on function public.complete_product_reservation(uuid) to service_role;

alter table public.orders enable row level security;
alter table public.products enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 4194304, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit)
values ('admin-backups', 'admin-backups', false, 10485760)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;
