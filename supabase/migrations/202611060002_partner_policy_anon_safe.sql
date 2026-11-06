-- Sửa policy để khách vãng lai đọc được danh mục sản phẩm.
--
-- Policy "partner_own_products" trước đây áp cho cả role anon và dùng subquery
-- tới public.partners. Khi đọc partners, Postgres đánh giá tiếp các policy quản
-- trị có subquery tới public.profiles, mà anon không có quyền SELECT trên bảng
-- này, nên mọi truy vấn catalog của khách bị "permission denied for table
-- profiles" (HTTP 401). Giới hạn policy cho authenticated và dùng
-- current_app_role() (security definer) để bỏ phụ thuộc vào quyền đọc profiles.

alter policy "partner_own_products" on public.products to authenticated;

drop policy if exists "partners_read_all_for_admin" on public.partners;
create policy "partners_read_all_for_admin" on public.partners
  for select to authenticated
  using (auth.uid() = user_id or public.current_app_role() in ('staff', 'admin'));

drop policy if exists "partners_update_status_admin" on public.partners;
create policy "partners_update_status_admin" on public.partners
  for update to authenticated
  using (public.current_app_role() in ('staff', 'admin'))
  with check (public.current_app_role() in ('staff', 'admin'));
