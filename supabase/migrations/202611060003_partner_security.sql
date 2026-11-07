-- Siết quyền cho hệ thống đối tác.
--
-- Trước migration này:
--   * Bảng partners giữ quyền mặc định của Supabase và policy "partners_own_profile"
--     (for all, không có with check riêng) cho phép người dùng đã đăng nhập tự chèn
--     hoặc sửa hồ sơ đối tác của mình qua REST API, kể cả status = 'active' và
--     commission_rate = 0, tức là tự duyệt và tự bỏ phí hoa hồng.
--   * Policy "partners_read_active" không giới hạn role nên khách vãng lai đọc được
--     phone, email, tax_code của mọi đối tác đang hoạt động.
--   * Policy "partner_own_products" không kiểm tra trạng thái đối tác, nên đối tác
--     chưa được duyệt hoặc đã bị từ chối vẫn đăng được sản phẩm công khai.
--
-- Sau migration: client chỉ được ĐỌC hồ sơ đối tác của chính mình (hoặc staff/admin
-- đọc tất cả). Mọi thao tác ghi partners đi qua server action dùng service role.
-- Đối tác chỉ ghi sản phẩm khi role = 'partner' và hồ sơ ở trạng thái 'active'.

-- 1. Bảng partners: bỏ mọi quyền client, chỉ cho authenticated SELECT.
revoke all on table public.partners from public, anon, authenticated;
grant select on table public.partners to authenticated;

drop policy if exists "partners_own_profile" on public.partners;
drop policy if exists "partners_read_active" on public.partners;
drop policy if exists "partners_update_status_admin" on public.partners;
-- "partners_read_all_for_admin" (select: chính mình hoặc staff/admin) được giữ nguyên.

-- 2. Hàm kiểm tra sản phẩm có thuộc đối tác đang hoạt động của người gọi hay không.
--    security definer để không phụ thuộc RLS của partners/profiles khi đánh giá policy.
create or replace function public.is_active_partner_owner(p_partner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_partner_id is not null
    and public.current_app_role() = 'partner'
    and exists (
      select 1
      from public.partners p
      where p.id = p_partner_id
        and p.user_id = auth.uid()
        and p.status = 'active'
    )
$$;

revoke all on function public.is_active_partner_owner(uuid) from public, anon, authenticated;
grant execute on function public.is_active_partner_owner(uuid) to authenticated;

-- 3. Thay policy sản phẩm của đối tác.
--    Đối tác (kể cả đang chờ duyệt) vẫn XEM được sản phẩm của mình; chỉ đối tác đang
--    hoạt động mới thêm/sửa/xóa được, và không thể chuyển sản phẩm sang chủ khác.
drop policy if exists "partner_own_products" on public.products;

create policy "partner_read_own_products" on public.products
  for select to authenticated
  using (
    partner_id is not null
    and exists (
      select 1 from public.partners p where p.id = partner_id and p.user_id = auth.uid()
    )
  );

create policy "partner_insert_own_products" on public.products
  for insert to authenticated
  with check (public.is_active_partner_owner(partner_id));

create policy "partner_update_own_products" on public.products
  for update to authenticated
  using (public.is_active_partner_owner(partner_id))
  with check (public.is_active_partner_owner(partner_id));

create policy "partner_delete_own_products" on public.products
  for delete to authenticated
  using (public.is_active_partner_owner(partner_id));

-- 4. Đối tác không được tự đánh dấu sản phẩm mẫu, đổi thứ tự hiển thị hay khai báo
--    nguồn/giấy phép ảnh; các cột này chỉ staff/admin hoặc service role chỉnh.
create or replace function public.guard_partner_product_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- service role / migration: không có auth.uid().
  if auth.uid() is null or public.current_app_role() in ('staff', 'admin') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.is_sample := false;
    new.sort_order := 1000;
    new.source_url := null;
    new.image_credit_author := null;
    new.image_license := null;
    new.image_license_url := null;
    new.image_source_url := null;
    new.image_modification_note := null;
  else
    new.is_sample := old.is_sample;
    new.sort_order := old.sort_order;
    new.source_url := old.source_url;
    new.image_credit_author := old.image_credit_author;
    new.image_license := old.image_license;
    new.image_license_url := old.image_license_url;
    new.image_source_url := old.image_source_url;
    new.image_modification_note := old.image_modification_note;
    new.partner_id := old.partner_id;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_partner_product_columns() from public, anon, authenticated;

drop trigger if exists guard_partner_product_columns on public.products;
create trigger guard_partner_product_columns
  before insert or update on public.products
  for each row
  when (new.partner_id is not null)
  execute function public.guard_partner_product_columns();

-- 5. Dọn dữ liệu: sản phẩm của đối tác đã bị từ chối/tạm ngưng không được hiển thị.
update public.products pr
set state = 'archived'
from public.partners p
where pr.partner_id = p.id
  and p.status in ('rejected', 'suspended')
  and pr.state = 'active';
