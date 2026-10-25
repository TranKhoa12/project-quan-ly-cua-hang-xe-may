# Kết quả thiết lập Supabase — 25/10/2026

Project: `ozypilffzhbunjlzgdgc`. Người dùng xác nhận project mới và đã đăng nhập CLI. Không lưu token/mật khẩu trong tài liệu hoặc source.

## Thực hiện

1. Liên kết thư mục bằng `supabase link --project-ref ozypilffzhbunjlzgdgc`.
2. `supabase migration list --linked`: ban đầu chưa có migration remote.
3. `supabase db push --linked --dry-run`: chỉ có `202610250001_initial_schema.sql`, không seed.
4. `supabase db push --linked --yes`: áp dụng thành công migration nền.
5. `supabase migration list --linked`: local và remote đều có `202610250001`.
6. Truy vấn chỉ đọc `pg_class`, `pg_namespace`, `pg_policies`, `has_table_privilege`: xác minh đủ 14 bảng, tất cả bật RLS/có policy; anon không có SELECT; authenticated không có INSERT trực tiếp.

## Bảng đã tạo

`profiles`, `customers`, `vehicles`, `parts`, `part_costs`, `stock_balances`, `repair_orders`, `repair_part_items`, `sales_orders`, `sales_order_items`, `sale_item_costs`, `stock_movements`, `payments`, `audit_logs`.

Không tạo tài khoản quản lý hoặc dữ liệu demo. Không xóa/reset bảng. Không thay Auth project settings. CLI state `supabase/.temp/` và `.env.local` được gitignore.

## Giới hạn

Đây là xác minh schema và cấu hình quyền, chưa phải kiểm thử RLS với JWT thật. Ứng dụng vẫn dùng localStorage; chưa có UI đăng nhập, server authorization hoặc RPC chốt kho/tiền. Chưa deploy Vercel. Không chạy lại SQL nền bằng SQL Editor khi migration này đã có trong lịch sử.
