-- Allow a third department, Kids (shown as "Children's"), alongside Mens and Womens.
alter table public.products drop constraint if exists products_gender_check;
alter table public.products add constraint products_gender_check check (gender in ('Mens', 'Womens', 'Kids'));
