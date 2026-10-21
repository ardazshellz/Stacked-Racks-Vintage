-- Screenshot of each sale (Vinted, Depop, eBay order page), kept as a memory of the item.
alter table public.orders add column if not exists photo_url text not null default '';
