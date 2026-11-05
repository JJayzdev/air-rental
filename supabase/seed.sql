-- Clearly marked illustrative catalog fixtures. No row represents verified inventory or owned imagery.
insert into public.categories (id, slug, name, sort_order) values
  ('00000000-0000-4000-8000-000000000001', 'laptop', 'Laptop', 1),
  ('00000000-0000-4000-8000-000000000002', 'phone', 'Điện thoại', 2),
  ('00000000-0000-4000-8000-000000000003', 'camera', 'Máy ảnh', 3),
  ('00000000-0000-4000-8000-000000000004', 'tablet', 'Tablet', 4),
  ('00000000-0000-4000-8000-000000000005', 'accessory', 'Phụ kiện', 5)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into public.products
  (id, category_id, slug, name, description, price_per_day_vnd, deposit_vnd, state, specifications, image_urls, image_alt, sort_order, is_sample, source_url,
   image_credit_author, image_license, image_license_url, image_source_url, image_modification_note)
select v.id::uuid, c.id, v.slug, v.name, v.description, v.price::bigint, v.deposit, 'active', v.specifications::jsonb,
  case when img.slug is null then array['/images/catalog/category-' || c.slug || '.svg']::text[]
    else array[img.local_path]::text[] end,
  case when img.slug is null then 'Ảnh minh hoạ catalog mẫu' else 'Ảnh tham khảo model; không phải máy bàn giao' end,
  v.sort_order, true, v.source_url, img.author, img.license, img.license_url, img.source_url,
  case when img.slug is null then null else 'Ảnh gốc được giữ nguyên; bản hiển thị có thể được Next.js tối ưu kích thước hoặc định dạng.' end
from (values
  ('10000000-0000-4000-8000-000000000001','laptop','macbook-air-m3','MacBook Air 13-inch M3 (2024)','SAMPLE: giá thuê và cấu hình máy cần xác minh.','350000',5000000,'{"chip":"Apple M3","màn hình":"13.6 inch"}',1,'https://support.apple.com/en-au/118551'),
  ('10000000-0000-4000-8000-000000000002','laptop','macbook-pro-14-m3','MacBook Pro 14-inch M3 Pro (2023)','SAMPLE: giá thuê và cấu hình máy cần xác minh.','520000',8000000,'{"chip":"Apple M3 Pro","màn hình":"14.2 inch"}',2,'https://support.apple.com/en-us/117736'),
  ('10000000-0000-4000-8000-000000000003','laptop','macbook-pro-16-m3','MacBook Pro 16-inch M3 Pro (2023)','SAMPLE: giá thuê và cấu hình máy cần xác minh.','680000',10000000,'{"chip":"Apple M3 Pro","màn hình":"16.2 inch"}',3,'https://support.apple.com/en-gb/117737'),
  ('10000000-0000-4000-8000-000000000004','laptop','dell-xps-13','Dell XPS 13 9340','SAMPLE: giá thuê và cấu hình máy cần xác minh.','310000',5000000,'{"màn hình":"13.4 inch","bộ xử lý hỗ trợ":"Core Ultra 7 155H (một cấu hình)"}',4,'https://www.dell.com/support/manuals/en-us/xps-13-9340-laptop/xps-13-9340_owners_manual/processor?guid=guid-b426df85-6237-4365-b1fc-c3bb6e190257&lang=en-us'),
  ('10000000-0000-4000-8000-000000000005','laptop','thinkpad-x1-carbon','Lenovo ThinkPad X1 Carbon Gen 12','SAMPLE: giá thuê và cấu hình máy cần xác minh.','330000',5000000,'{"màn hình":"14 inch","bộ xử lý hỗ trợ":"Core Ultra 5/7 Series 1 (tuỳ cấu hình)"}',5,'https://psref.lenovo.com/Product/ThinkPad_X1_Carbon_Gen_12?tab=spec'),
  ('10000000-0000-4000-8000-000000000006','laptop','asus-zenbook-14','ASUS Zenbook 14 OLED UX3405','SAMPLE: giá thuê và cấu hình máy cần xác minh.','280000',4000000,'{"màn hình":"OLED 14 inch","bộ xử lý hỗ trợ":"Core Ultra 7 155H (một cấu hình)"}',6,'https://press.asus.com/news/press-releases/asus-zenbook-14-oled-ux3405-laptop-announced/'),
  ('10000000-0000-4000-8000-000000000007','phone','iphone-16','Apple iPhone 16','SAMPLE: giá thuê và cấu hình máy cần xác minh.','250000',4000000,'{"màn hình":"OLED 6.1 inch","chip":"A18"}',7,'https://support.apple.com/en-euro/121029'),
  ('10000000-0000-4000-8000-000000000008','phone','iphone-16-pro','Apple iPhone 16 Pro','SAMPLE: giá thuê và cấu hình máy cần xác minh.','330000',5000000,'{"chip":"A18 Pro"}',8,'https://support.apple.com/es-es/121031'),
  ('10000000-0000-4000-8000-000000000009','phone','galaxy-s25','Samsung Galaxy S25','SAMPLE: giá thuê và cấu hình máy cần xác minh.','260000',4000000,'{"màn hình":"6.2 inch","chip":"Snapdragon 8 Elite for Galaxy","camera chính":"50 MP"}',9,'https://images.samsung.com/is/content/samsung/assets/us/business/mobile/phones/galaxy-s25/02052025/S25_Series_B2B_Spec_Sheet_HRc.pdf'),
  ('10000000-0000-4000-8000-000000000010','phone','pixel-9','Google Pixel 9','SAMPLE: giá thuê và cấu hình máy cần xác minh.','240000',3500000,'{"màn hình":"6.3 inch","chip":"Google Tensor G4"}',10,'https://support.google.com/pixelphone/answer/7158570?hl=en'),
  ('10000000-0000-4000-8000-000000000011','phone','galaxy-z-fold6','Samsung Galaxy Z Fold6','SAMPLE: giá thuê và cấu hình máy cần xác minh.','420000',7000000,'{"màn hình chính":"7.6 inch","chip":"Snapdragon 8 Gen 3 for Galaxy"}',11,'https://www.samsung.com/ie/support/mobile-devices/what-is-the-difference-between-the-galaxy-z-fold6-and-z-fold5/'),
  ('10000000-0000-4000-8000-000000000012','camera','sony-a6400','Sony Alpha a6400 / ILCE-6400','SAMPLE: giá thuê và cấu hình máy cần xác minh.','400000',6000000,'{"cảm biến":"APS-C 24.2 MP","ngàm":"E"}',12,'https://www.sony.com/electronics/support/e-mount-body/ilce-6400/specifications'),
  ('10000000-0000-4000-8000-000000000013','camera','canon-eos-r50','Canon EOS R50','SAMPLE: giá thuê và cấu hình máy cần xác minh.','390000',6000000,'{"cảm biến":"APS-C 24.2 MP","ngàm":"RF"}',13,'https://cam.start.canon/en/C011/manual/html/UG-11_Reference_0090.html'),
  ('10000000-0000-4000-8000-000000000014','camera','sony-zv-e10-ii','Sony ZV-E10 II / ZV-E10M2','SAMPLE: giá thuê và cấu hình máy cần xác minh.','440000',6500000,'{"cảm biến":"APS-C 26 MP","video":"4K đến 59.94p/50p"}',14,'https://www.sony.com/electronics/support/e-mount-body-zv-e-series/zv-e10m2/specifications'),
  ('10000000-0000-4000-8000-000000000015','camera','fujifilm-x-t5','Fujifilm X-T5','SAMPLE: giá thuê và cấu hình máy cần xác minh.','590000',9000000,'{"cảm biến":"APS-C 40.2 MP"}',15,'https://shopusa.fujifilm-x.com/x-t5-x-t5/'),
  ('10000000-0000-4000-8000-000000000016','camera','gopro-hero-13','GoPro HERO13 Black','SAMPLE: giá thuê và cấu hình máy cần xác minh.','220000',3500000,'{"video":"5.3K60","chống rung":"HyperSmooth 6.0"}',16,'https://gopro.com/en/is/news/hero13-black-specialty-bundles'),
  ('10000000-0000-4000-8000-000000000017','tablet','ipad-air-m2','iPad Air 11-inch M2 (2024)','SAMPLE: giá thuê và cấu hình máy cần xác minh.','180000',3000000,'{"chip":"Apple M2","màn hình":"Tên model 11 inch"}',17,'https://support.apple.com/en-gb/119894'),
  ('10000000-0000-4000-8000-000000000018','tablet','ipad-pro-m4','iPad Pro 11-inch M4 (2024)','SAMPLE: giá thuê và cấu hình máy cần xác minh.','320000',5000000,'{"chip":"Apple M4","màn hình":"Model 11 inch"}',18,'https://support.apple.com/es-es/119892'),
  ('10000000-0000-4000-8000-000000000019','tablet','galaxy-tab-s10','Samsung Galaxy Tab S10+','SAMPLE: giá thuê và cấu hình máy cần xác minh.','230000',3500000,'{"màn hình":"12.4 inch","chip":"MediaTek Dimensity 9300+"}',19,'https://image-us.samsung.com/SamsungUS/home/tablets/galaxy-tab-s10/09232024/NCM812352_Tab-S10-B2B-Tablet-Portfolio-Flyer_c.pdf'),
  ('10000000-0000-4000-8000-000000000020','tablet','remarkable-2','reMarkable 2','SAMPLE: giá thuê và cấu hình máy cần xác minh.','150000',2500000,'{"màn hình":"E-ink đơn sắc 10.3 inch","bộ nhớ trong":"8 GB"}',20,'https://support.remarkable.com/articles/Knowledge/About-reMarkable-2'),
  ('10000000-0000-4000-8000-000000000021','accessory','sony-wh1000xm5','Sony WH-1000XM5','SAMPLE: giá thuê và cấu hình máy cần xác minh.','90000',1200000,'{"loại":"Tai nghe chụp tai","kết nối":"Bluetooth 5.2","chống ồn":"Chủ động"}',21,'https://www.sony.com/electronics/support/wireless-headphones-bluetooth-headphones/wh-1000xm5/specifications'),
  ('10000000-0000-4000-8000-000000000022','accessory','airpods-pro-2','AirPods Pro 2 USB-C (2023)','SAMPLE: giá thuê và cấu hình máy cần xác minh.','80000',1000000,'{"chip":"H2","chống ồn":"Chủ động","hộp sạc":"USB-C"}',22,'https://support.apple.com/en-us/111834'),
  ('10000000-0000-4000-8000-000000000023','accessory','dji-mic-2','DJI Mic 2','SAMPLE: giá thuê và cấu hình máy cần xác minh.','120000',1500000,'{"loại":"Micro không dây","bộ 2":"2 TX + 1 RX","ghi âm":"Nội bộ 32-bit float"}',23,'https://www.dji.com/mic-2/faq'),
  ('10000000-0000-4000-8000-000000000024','accessory','dji-osmo-mobile-7','DJI Osmo Mobile 7','SAMPLE: giá thuê và cấu hình máy cần xác minh.','100000',1500000,'{"loại":"Gimbal điện thoại","chống rung":"3 trục"}',24,'https://store.dji.com/product/osmo-mobile-7')
) as v(id, category_slug, slug, name, description, price, deposit, specifications, sort_order, source_url)
join public.categories c on c.slug = v.category_slug
left join (values
  ('canon-eos-r50','/images/catalog/canon-eos-r50.jpg','CNEcija12345','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/','https://commons.wikimedia.org/wiki/File:Canon_EOS_R50_Black.jpg'),
  ('sony-a6400','/images/catalog/sony-a6400.jpg','昼落ち','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/','https://commons.wikimedia.org/wiki/File:Sony_ILCE-6400_27_Feb_2019a.jpg'),
  ('iphone-16-pro','/images/catalog/iphone-16-pro.jpg','Farragutful','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/','https://commons.wikimedia.org/wiki/File:IPhone_16_Pro_-_black.jpg')
) as img(slug, local_path, author, license, license_url, source_url) on img.slug = v.slug
on conflict (slug) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  price_per_day_vnd = excluded.price_per_day_vnd,
  deposit_vnd = excluded.deposit_vnd,
  state = 'active',
  specifications = excluded.specifications,
  image_urls = excluded.image_urls,
  image_alt = excluded.image_alt,
  sort_order = excluded.sort_order,
  is_sample = true,
  source_url = excluded.source_url,
  image_credit_author = excluded.image_credit_author,
  image_license = excluded.image_license,
  image_license_url = excluded.image_license_url,
  image_source_url = excluded.image_source_url,
  image_modification_note = excluded.image_modification_note
where public.products.is_sample;

insert into public.product_units (product_id, asset_tag, state)
select p.id, 'SAMPLE-' || upper(p.slug) || '-' || n::text, 'maintenance'
from public.products p cross join generate_series(1, 2) as units(n)
where p.is_sample
on conflict (asset_tag) do update set state = 'maintenance'
where exists (
  select 1 from public.products p where p.id = product_units.product_id and p.is_sample
);

insert into public.price_tiers(product_id, min_days, max_days, discount_percent)
select p.id, tier.min_days, tier.max_days, tier.discount_percent
from public.products p
cross join (values (1, 2, 0), (3, 6, 10), (7, null::integer, 20)) as tier(min_days, max_days, discount_percent)
where p.is_sample
on conflict (product_id, min_days) do update set
  max_days = excluded.max_days,
  discount_percent = excluded.discount_percent;

-- Delivery pricing fixtures. These are illustrative rates, not a real courier contract.
insert into public.delivery_zones(id, name, fee_vnd, free_from_vnd, notes, sort_order)
values
  ('20000000-0000-4000-8000-000000000001', 'Nội thành Hà Nội', 30000, 2000000,
    'Giao trong ngày cho các quận nội thành.', 1),
  ('20000000-0000-4000-8000-000000000002', 'Nội thành TP. Hồ Chí Minh', 40000, 3000000,
    'Giao trong ngày cho các quận nội thành.', 2),
  ('20000000-0000-4000-8000-000000000003', 'Ngoại thành / tỉnh lân cận', 60000, 5000000,
    'Có thể giao chậm hơn một ngày.', 3)
on conflict (id) do update set
  name = excluded.name,
  fee_vnd = excluded.fee_vnd,
  free_from_vnd = excluded.free_from_vnd,
  notes = excluded.notes,
  sort_order = excluded.sort_order,
  active = true;

-- Discount code fixtures. used_count is intentionally left alone so a reset starts clean.
insert into public.discount_codes(id, code, description, kind, value, min_subtotal_vnd, max_uses)
values
  ('21000000-0000-4000-8000-000000000001', 'WELCOME10',
    'Giảm 10% cho đơn thuê từ 500.000 ₫.', 'percent', 10, 500000, 500),
  ('21000000-0000-4000-8000-000000000002', 'AIR50K',
    'Giảm 50.000 ₫ cho đơn thuê từ 1.000.000 ₫.', 'fixed', 50000, 1000000, null)
on conflict (id) do update set
  code = excluded.code,
  description = excluded.description,
  kind = excluded.kind,
  value = excluded.value,
  min_subtotal_vnd = excluded.min_subtotal_vnd,
  max_uses = excluded.max_uses,
  active = true;

-- Bookable fleet fixtures for the hosted demo. These rows are seeded for evaluation,
-- not a verified inventory. Replace them with real stock before operating commercially.
insert into public.products
  (id, category_id, slug, name, description, price_per_day_vnd, deposit_vnd, state,
   specifications, image_urls, image_alt, sort_order, is_sample, source_url)
select v.id::uuid, c.id, v.slug, v.name, v.description, v.price::bigint, v.deposit::bigint,
  'active', v.specifications::jsonb, array['/images/catalog-placeholder.svg'],
  'Ảnh thiết bị A.I.R', v.sort_order, false, null
from (values
  ('30000000-0000-4000-8000-000000000001', 'laptop', 'lenovo-yoga-7-14',
    'Lenovo Yoga 7 14', 'Laptop văn phòng linh hoạt, màn hình cảm ứng, phù hợp làm việc và học tập.',
    290000, 4500000, '{"màn hình":"14 inch cảm ứng","bộ xử lý":"Intel Core Ultra 5","ram":"16 GB"}', 25),
  ('30000000-0000-4000-8000-000000000002', 'laptop', 'hp-spectre-x360-14',
    'HP Spectre x360 14', 'Laptop cao cấp cho công việc sáng tạo, màn hình OLED và bút cảm ứng.',
    430000, 7000000, '{"màn hình":"14 inch OLED","bộ xử lý":"Intel Core Ultra 7","ram":"16 GB"}', 26),
  ('30000000-0000-4000-8000-000000000003', 'phone', 'samsung-galaxy-s24',
    'Samsung Galaxy S24', 'Điện thoại Android nhỏ gọn, camera tốt, phù hợp công việc và chụp ảnh.',
    230000, 3800000, '{"màn hình":"6.2 inch","chip":"Snapdragon 8 Gen 3","bộ nhớ":"256 GB"}', 27),
  ('30000000-0000-4000-8000-000000000004', 'phone', 'xiaomi-14',
    'Xiaomi 14', 'Điện thoại Android cấu hình cao, sạc nhanh, camera Leica.',
    210000, 3500000, '{"màn hình":"6.36 inch","chip":"Snapdragon 8 Gen 3","bộ nhớ":"256 GB"}', 28),
  ('30000000-0000-4000-8000-000000000005', 'camera', 'nikon-z30',
    'Nikon Z30', 'Máy ảnh không gương lật cho vlog và quay video, kèm lens kit.',
    380000, 6000000, '{"cảm biến":"APS-C 20.9 MP","ngàm":"Nikon Z","video":"4K30"}', 29),
  ('30000000-0000-4000-8000-000000000006', 'camera', 'fujifilm-x-s20',
    'Fujifilm X-S20', 'Máy ảnh hybrid cho ảnh và video, chống rung trong thân máy.',
    470000, 7500000, '{"cảm biến":"APS-C 26.1 MP","chống rung":"IBIS 7 stop","video":"6.2K30"}', 30),
  ('30000000-0000-4000-8000-000000000007', 'tablet', 'ipad-10-9',
    'iPad 10.9-inch', 'Tablet cho ghi chú, đọc tài liệu và họp trực tuyến.',
    170000, 2800000, '{"màn hình":"10.9 inch","chip":"Apple A14","bộ nhớ":"64 GB"}', 31),
  ('30000000-0000-4000-8000-000000000008', 'accessory', 'bose-qc-ultra',
    'Bose QuietComfort Ultra', 'Tai nghe chống ồn cho làm việc tập trung và di chuyển.',
    110000, 1500000, '{"loại":"Tai nghe chụp tai","kết nối":"Bluetooth","chống ồn":"Chủ động"}', 32)
) as v(id, category_slug, slug, name, description, price, deposit, specifications, sort_order)
join public.categories c on c.slug = v.category_slug
on conflict (slug) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  price_per_day_vnd = excluded.price_per_day_vnd,
  deposit_vnd = excluded.deposit_vnd,
  state = 'active',
  specifications = excluded.specifications,
  image_urls = excluded.image_urls,
  image_alt = excluded.image_alt,
  sort_order = excluded.sort_order,
  is_sample = false;

insert into public.product_units (product_id, asset_tag, state)
select p.id, 'AIR-' || upper(p.slug) || '-' || n::text, 'available'
from public.products p
cross join generate_series(1, 3) as units(n)
where p.id::text between '30000000-0000-4000-8000-000000000001' and '30000000-0000-4000-8000-000000000008'
on conflict (asset_tag) do update set state = 'available';

insert into public.price_tiers(product_id, min_days, max_days, discount_percent)
select p.id, tier.min_days, tier.max_days, tier.discount_percent
from public.products p
cross join (values (1, 2, 0), (3, 6, 10), (7, null::integer, 20)) as tier(min_days, max_days, discount_percent)
where p.id::text between '30000000-0000-4000-8000-000000000001' and '30000000-0000-4000-8000-000000000008'
on conflict (product_id, min_days) do update set
  max_days = excluded.max_days,
  discount_percent = excluded.discount_percent;
