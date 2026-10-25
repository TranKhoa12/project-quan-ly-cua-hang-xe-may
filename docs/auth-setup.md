# Đăng nhập và phân quyền

## Đã triển khai

- `/login`: tên đăng nhập và mật khẩu, không cần email cá nhân; không có tự đăng ký.
- `/account`: thông tin tài khoản, đổi mật khẩu có xác minh mật khẩu cũ và đăng xuất.
- `/staff`: chỉ quản lý; tạo tài khoản, đổi vai trò, bật/tắt và đặt lại mật khẩu nhân viên.
- Server xác minh Supabase user và profile active cho page/action. Proxy làm mới session cookie; cookie HttpOnly, SameSite=Lax, Secure khi production. Không dùng localStorage lưu token.
- Profile role lấy từ database; không tin user metadata hoặc role client gửi. Không cấp INSERT/UPDATE profile từ trình duyệt; RPC tự kiểm tra actor.
- Mật khẩu mới 12–128 ký tự, gồm chữ và số. Bộ đếm thử đăng nhập lưu database, bucket HMAC không chứa username/IP dạng thô; Supabase Auth vẫn có giới hạn riêng.
- Supabase đã tắt đăng ký công khai và đặt mật khẩu tối thiểu 12 ký tự. Không tắt nhà cung cấp email/password: Auth vẫn cần provider này cho định danh nội bộ.

Supabase dùng địa chỉ nội bộ `<username>@accounts.motocare.invalid`. Đây là chi tiết triển khai, không phải email liên hệ, không gửi thư hoặc khôi phục mật khẩu qua email. Quản lý đặt lại mật khẩu cho nhân viên; nếu mất mật khẩu quản lý cuối cùng cần luồng quản trị tin cậy trên máy có quyền Supabase.

## Tạo quản lý đầu tiên

Mở Terminal tương tác ở gốc repository:

```powershell
npm.cmd run auth:create-manager
```

Nhập tên đăng nhập, tên hiển thị, mật khẩu và xác nhận. Mật khẩu được ẩn khi nhập, không lưu vào file/log hay đối số shell. Script từ chối khi đã có quản lý active. Sau đó chạy `npm.cmd run dev` nếu server chưa mở, vào `http://localhost:3000/login`.

Chưa tạo quản lý thật thay người dùng vì mật khẩu cần được người dùng tự nhập. Không gửi mật khẩu vào chat.

## Cấu hình triển khai

Trong `.env.local` và Vercel cần:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY
```

Key cuối chỉ dùng server: admin Auth API và limiter. Không thêm tiền tố NEXT_PUBLIC_, không commit env. `scripts/configure-auth-admin.mjs` có thể lấy key từ CLI đã đăng nhập và ghi local bị gitignore mà không in key; đây là thao tác quản trị, không chạy ở browser hoặc build Vercel.

## Phạm vi mỗi vai trò

| Vai trò | Trang được vào | Dữ liệu/nghiệp vụ |
| --- | --- | --- |
| Quản lý | Tất cả trang quản lý và tài khoản | Quản lý tài khoản thật; các luồng kho/tiền cũ vẫn là prototype cục bộ |
| Bán hàng | Tổng quan, sửa chữa, bán hàng, phụ tùng, khách hàng, tài khoản | Đọc Supabase theo RLS; chưa chốt bán/thu/xuất thật |
| Thợ sửa xe | Tổng quan, sửa chữa, phụ tùng, tài khoản | Chỉ đọc phiếu được giao và phụ tùng; không xem khách hàng toàn bộ/giá vốn |

Đổi role/tắt tài khoản được kiểm tra ở yêu cầu tiếp theo; JWT cũ vẫn bị RLS chặn khi profile inactive. Không cho tự tắt/hạ quyền mình. RPC khóa thay đổi profile để tránh hai quản lý vô hiệu hóa chéo làm mất toàn bộ quản lý. Reset mật khẩu không thay thế quy trình thu hồi toàn bộ session nếu có sự cố token bị lộ; khi nghi ngờ cần tắt tài khoản và xử lý sự cố.

Workspace cục bộ quản lý dùng key có user ID; không đọc key shared cũ. Nhân viên không dùng prototype localStorage, không được tải dữ liệu giá vốn từ đó. Bản cục bộ không phải sổ kinh doanh, chưa đồng bộ backend; không dùng dữ liệu khách thật trước khi các giao dịch kho/tiền hoàn thành.

## Kiểm thử

Unit: `npm.cmd test`. Tích hợp Auth/RLS cần server local và project phát triển/test riêng được xác nhận:

```powershell
$env:SUPABASE_TEST_PROJECT_REF='project-ref-moi-truong-test'
npm.cmd run test:auth
```

Runner từ chối project không khớp URL hoặc HTTP base không phải localhost. Runner tạo tài khoản/bản ghi tổng hợp tạm và dọn đúng IDs trong finally. Không chạy trên cửa hàng đang vận hành. Không tự reset database khi test lỗi; kiểm tra cleanup trước.

Đã chạy trên project mới chưa vận hành: 25 assertion RLS/JWT/HTTP/Server Action pass. Có kiểm tra form đăng nhập, tạo nhân viên, đăng xuất, cookie HttpOnly/SameSite, CSRF, ẩn danh, sales không đọc cost, thợ chỉ thấy phiếu được giao, tự nâng quyền bị từ chối, disable với token cũ, route trực tiếp, limiter và signup bị tắt. Đăng xuất chỉ kết thúc phiên hiện tại. Đây không phải kiểm thử tương tác/visual bằng browser và chưa chứng minh transaction kho/tiền.
