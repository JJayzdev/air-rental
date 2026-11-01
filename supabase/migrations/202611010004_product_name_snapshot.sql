-- Preserve the product label that a customer booked, even after catalog edits.
alter table public.order_items
  add column product_name_snapshot text;

update public.order_items oi
set product_name_snapshot = p.name
from public.products p
where p.id = oi.product_id;

alter table public.order_items
  alter column product_name_snapshot set not null;

create function public.set_order_item_product_name_snapshot()
returns trigger
language plpgsql
security definer
set search_path = '' as $$
begin
  select p.name into new.product_name_snapshot
  from public.products p
  where p.id = new.product_id;

  if not found then
    raise exception 'Order item product was not found';
  end if;

  return new;
end;
$$;

create trigger order_items_set_product_name_snapshot
  before insert on public.order_items
  for each row execute function public.set_order_item_product_name_snapshot();

revoke all on function public.set_order_item_product_name_snapshot() from public, anon, authenticated;

comment on column public.order_items.product_name_snapshot is
  'Product display name copied from the catalog at booking time; retained as historical order detail.';
