-- Lưu đủ thông tin từ form đăng ký đối tác. Trước đây tên doanh nghiệp và phần giới thiệu
-- được kiểm tra nhưng không được lưu; display_name lại lấy họ tên người liên hệ.
alter table public.partners
  add column if not exists contact_name text,
  add column if not exists description text;

alter table public.partners
  add constraint partners_contact_name_length check (contact_name is null or char_length(contact_name) <= 120),
  add constraint partners_description_length check (description is null or char_length(description) <= 1000);

comment on column public.partners.display_name is 'Tên doanh nghiệp/cửa hàng hiển thị của đối tác.';
comment on column public.partners.contact_name is 'Họ tên người liên hệ khi đăng ký.';
comment on column public.partners.description is 'Giới thiệu ngắn đối tác tự khai khi đăng ký.';
