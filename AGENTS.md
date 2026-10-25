# Hướng dẫn AI cho dự án quản lý cửa hàng xe máy

## Phạm vi và hiện trạng

- Một cửa hàng kinh doanh thật; quản lý, bán hàng, thợ sửa xe. Chưa triển khai bán online.
- Next.js + TypeScript, Supabase PostgreSQL/Auth/Storage, triển khai mục tiêu Vercel.
- Hiện UI là demo localStorage. Migration nền `202610250001` đã áp dụng lên Supabase; chưa có luồng Auth trong ứng dụng hoặc RPC nghiệp vụ. Không mô tả demo là backend hoàn chỉnh.
- Tên cửa hàng là cấu hình, khác tên sản phẩm MotoCare. Không thêm tên cửa hàng, địa chỉ, số điện thoại gắn cứng vào màn hình hoặc mẫu in.
- Dùng tiếng Việt cho giao diện và báo cáo cho chủ cửa hàng. Tiền VND; ngày nghiệp vụ theo Asia/Ho_Chi_Minh.

## Định tuyến skill trong repository

Các skill nằm trong `skills/`, đi theo repository. Đọc đúng `SKILL.md` trước công việc tương ứng; không giả định chúng đã được cài vào danh mục skill toàn cục.

| Công việc | Skill bắt buộc đọc |
| --- | --- |
| Tính năng mới, thay đổi luồng xuyên UI/backend | `skills/garage-delivery/SKILL.md` |
| Màn hình, form, trạng thái, in phiếu, thương hiệu | `skills/garage-ui/SKILL.md` |
| Database, Supabase, API/RPC, giao dịch kho/tiền | `skills/garage-backend/SKILL.md` |
| Auth, quyền, RLS, upload, export, review bảo mật | `skills/garage-security/SKILL.md` |
| Viết/chạy test, nghiệm thu, tuyên bố đủ dùng thật | `skills/garage-testing/SKILL.md` |

Tính năng tiền/kho cần backend + security + testing. Thay đổi chữ hoặc bố cục nhỏ chỉ cần UI và kiểm tra phù hợp; không mở rộng thành audit toàn hệ thống. Không tự giao việc cho agent khác nếu người dùng chưa yêu cầu.

## Quy tắc thực hiện

1. Đọc `docs/implementation-status.md` và tài liệu nghiệp vụ liên quan trước khi sửa. Phân biệt yêu cầu đích trong tài liệu với hành vi đã có trong code.
2. Với tính năng nghiệp vụ, tạo đặc tả ngắn từ `docs/templates/feature-spec.md`: actor, trạng thái, dữ liệu, quyền, lỗi, tác động kho/tiền và tiêu chí nghiệm thu. Tiếp tục làm các việc đã được yêu cầu; không tạo vòng xin duyệt tài liệu cho thay đổi thông thường.
3. Giữ nghiệp vụ mới ngoài component giao diện. Dùng các module feature/service/repository khi nối backend; không tiếp tục dồn mọi xử lý vào `workspace.tsx`.
4. Migration mới nối tiếp migration đã áp dụng. Không sửa dữ liệu sản xuất, reset database hoặc chạy seed mẫu lên production để làm test.
5. Dữ liệu thật không lưu trong localStorage. Production phải xác thực phía server, kiểm tra quyền và RLS. Không bật quyền ghi rộng để khắc phục lỗi quyền.
6. Ghi nhận cả đường đi thành công lẫn từ chối, lỗi mạng, retry. Không báo thành công trước khi server xác nhận.
7. Cập nhật trạng thái triển khai khi thay đổi năng lực thật. Báo rõ lệnh đã chạy, kết quả, phần chưa chạy và giới hạn. HTTP 200 không phải kiểm thử giao diện; test local không chứng minh đồng thời database hoặc RLS.

## Lệnh hiện có

`npm.cmd run typecheck`, `npm.cmd test`, `npm.cmd run build`, `npm.cmd run skills:check`.

Chạy bộ kiểm tra phù hợp thay đổi. Test database/RLS/E2E chưa có runner: đánh dấu chưa thực hiện, không tự tạo báo cáo pass. Chi tiết trong `docs/testing-strategy.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
