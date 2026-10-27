-- Supplier invoice (PDF) for each purchase, kept in a private bucket and shown only to the admin.
alter table public.purchases add column if not exists invoice_path text not null default '';
insert into storage.buckets (id, name, public) values ('invoices', 'invoices', false) on conflict (id) do nothing;
