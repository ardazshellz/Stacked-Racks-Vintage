create table if not exists public.promotion_codes (
  code text primary key,
  percent_off integer not null check (percent_off between 1 and 100),
  description text not null default '',
  active boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  preview_text text not null default '',
  body text not null,
  keywords text not null default '',
  promotion_code text references public.promotion_codes(code) on update cascade on delete set null,
  status text not null default 'draft' check (status in ('draft', 'sending', 'sent', 'failed')),
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists promotion_codes_active_idx on public.promotion_codes (active, expires_at);
create index if not exists email_campaigns_created_idx on public.email_campaigns (created_at desc);

alter table public.promotion_codes enable row level security;
alter table public.email_campaigns enable row level security;

create or replace function public.redeem_promotion_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed integer;
begin
  update public.promotion_codes
  set redemption_count = redemption_count + 1,
      updated_at = now()
  where code = upper(trim(p_code))
    and active = true
    and (starts_at is null or starts_at <= now())
    and (expires_at is null or expires_at >= now())
    and (max_redemptions is null or redemption_count < max_redemptions);
  get diagnostics changed = row_count;
  return changed = 1;
end;
$$;

revoke all on function public.redeem_promotion_code(text) from public, anon, authenticated;
grant execute on function public.redeem_promotion_code(text) to service_role;
