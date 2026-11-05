-- Hệ thống đối tác cho thuê: bất kỳ ai có đồ rảnh rỗi có thể đăng ký đối tác,
-- thêm sản phẩm của bản thân và nhận doanh thu sau khi hệ thống trừ phí duy trì.
create table public.partners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  display_name text not null,
  tax_code text,
  phone text,
  email text,
  commission_rate numeric(5,2) not null default 15.00 check (commission_rate >= 0 and commission_rate <= 100),
  status text not null default 'pending' check (status in ('pending','active','suspended','rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Liên kết sản phẩm với đối tác (null = sản phẩm của A.I.R hệ thống)
alter table public.products add column partner_id uuid references public.partners(id);

-- RLS partners: đối tác chỉ xem/sửa hồ sơ của mình; công chúng chỉ xem đối tác đang hoạt động
alter table public.partners enable row level security;
create policy "partners_own_profile" on public.partners
  for all using (auth.uid() = user_id);
create policy "partners_read_active" on public.partners
  for select using (status = 'active');

-- RLS products: đối tác chỉ xem/sửa sản phẩm của mình
alter table public.products enable row level security;
create policy "partner_own_products" on public.products
  for all using (auth.uid() = (select user_id from partners where id = partner_id));
