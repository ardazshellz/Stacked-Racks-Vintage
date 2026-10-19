-- Stock bought from Fleek, Vinted and elsewhere, so each piece can be matched to its own listing later.
create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'other' check (source in ('vinted', 'fleek', 'other')),
  external_id text unique,
  title text not null,
  seller text not null default '',
  purchased_at date not null,
  price numeric(10,2) not null default 0,
  quantity integer not null default 1 check (quantity > 0),
  photo_url text not null default '',
  personal boolean not null default false,
  product_id text,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists purchases_purchased_at_idx on public.purchases (purchased_at desc);
alter table public.purchases enable row level security;
