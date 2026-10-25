# Cập nhật Vercel — 25/10/2026

Project: `project-quan-ly-cua-hang-xe-may` trong `dang-khoa-tran-s-projects`.
Project ID: `prj_miR0T7uE3uVNC0pJ8sfTsYzESOUs`.
Production: https://dangkietmoto.vercel.app

## Thực hiện

- Xác minh alias thuộc đúng project; bản cũ chưa có route login riêng.
- Liên kết checkout bằng CLI đã được người dùng đăng nhập. GitHub main đã có commit Auth `ea9e415ce73d39142e2bf19d43581822971a8aa1`.
- Production trước đó chưa có biến môi trường. Đã thêm URL và publishable key dạng Config, service-role key dạng Secret; chuyển giá trị bằng stdin, không log hoặc đưa vào đối số shell.
- Thêm `.vercelignore` loại env, state CLI, cache và node_modules khỏi upload source; `.vercel` được gitignore.
- Chạy `vercel deploy --prod --yes`; deployment `dpl_9nUaPyj8ZeLUfp38TBoo2DUGRzgD` trả READY và alias production đúng domain.

## Kiểm chứng HTTP trên URL thật

| Đường dẫn | Chưa đăng nhập |
| --- | --- |
| `/login` | 200; có field username và password |
| `/` | 307 → `/login` |
| `/staff` | 307 → `/login` |
| `/account` | 307 → `/login` |

Không tạo tài khoản hoặc giao dịch kiểm thử trên production. Kiểm thử JWT/RLS/Server Action local trước đó nằm ở `auth-setup.md`; không coi các kiểm tra HTTP này là browser QA hoặc nghiệm thu backend kho/tiền. Nếu chưa có quản lý, người dùng tự chạy `npm.cmd run auth:create-manager` trên máy để nhập mật khẩu riêng.
