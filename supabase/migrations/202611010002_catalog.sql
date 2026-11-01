-- Public catalog fields. These products contain no customer or physical-unit data.
alter table public.products
  add column specifications jsonb not null default '{}'::jsonb,
  add column image_urls text[] not null default array['/images/catalog-placeholder.svg']::text[],
  add column image_alt text not null default '',
  add column sort_order integer not null default 0,
  add column is_sample boolean not null default false,
  add column source_url text,
  add column image_credit_author text,
  add column image_license text,
  add column image_license_url text,
  add column image_source_url text,
  add column image_modification_note text;

alter table public.products
  add constraint products_specifications_object check (jsonb_typeof(specifications) = 'object'),
  add constraint products_images_not_empty check (cardinality(image_urls) > 0),
  add constraint products_image_credit_complete check (
    (image_credit_author is null and image_license is null and image_license_url is null and image_source_url is null)
    or (image_credit_author is not null and image_license is not null and image_license_url like 'https://%'
      and image_source_url like 'https://%')
  );

comment on column public.products.is_sample is
  'True means this row is illustrative fixture data, not verified rental inventory.';
comment on column public.products.image_urls is
  'Public catalog images only. Use local placeholders until licensed/self-owned photos are uploaded.';
comment on column public.products.source_url is
  'Manufacturer reference URL for product specifications; does not imply A.I.R owns or rents the item.';
comment on column public.products.image_modification_note is
  'Attribution note for resized or format-converted derivatives; preserve original license terms.';

