-- Bổ sung vai trò 'partner' vào enum app_role.
-- Production đã được cập nhật thủ công; migration này giữ cho môi trường local và
-- các lần deploy mới đồng bộ với ứng dụng.
alter type public.app_role add value if not exists 'partner';
