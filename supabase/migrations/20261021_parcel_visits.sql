-- Parcel card QR scans (?from=parcel) are counted as a plain tally: no cookie, no visitor id.
alter table public.site_events drop constraint if exists site_events_event_name_check;
alter table public.site_events add constraint site_events_event_name_check
  check (event_name in ('page_view', 'product_view', 'product_click', 'add_to_cart', 'checkout_started', 'parcel_visit'));
