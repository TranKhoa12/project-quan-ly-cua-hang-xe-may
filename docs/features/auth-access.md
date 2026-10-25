# Đăng nhập và phân quyền bằng tên tài khoản

Actor: quản lý, bán hàng, thợ sửa xe. Không yêu cầu email cá nhân. Tên đăng nhập chuẩn hóa lowercase ASCII 3–32 ký tự; Supabase Auth dùng địa chỉ nội bộ được suy ra, không dùng để gửi thư. Không có đăng ký công khai hoặc tự gán vai trò.

Luồng: login username/password → Auth xác minh phía server → profile active → kiểm tra role theo route. Session dùng cookie HttpOnly; Proxy làm mới token, mỗi page/action vẫn kiểm tra lại user và profile. Không dùng getSession làm chứng cứ danh tính.

Quản lý tạo tài khoản bằng tên/mật khẩu ban đầu, gán một trong ba vai trò, bật/tắt tài khoản. Không cho tự tắt/hạ quyền mình; database chặn mất quản lý cuối cùng. Người chưa được cấp profile, profile bị tắt hoặc role không hợp lệ không vào trang quản lý.

Key quản trị chỉ ở server cho admin Auth API; server action luôn xác minh manager trước khi dùng. Profile không có quyền INSERT/UPDATE trực tiếp từ browser; RPC quản lý tự kiểm tra actor và ghi audit. Giới hạn đăng nhập bằng bucket HMAC lưu trong database, không dùng bộ nhớ Vercel.

Scope: login/logout, đổi mật khẩu có xác minh mật khẩu cũ, quản lý tài khoản và quyền, read-only workspace cho nhân viên. Nghiệp vụ kho/tiền hiện vẫn chưa có RPC ghi; không cấp khả năng ghi giả cho nhân viên bằng localStorage. Workspace cục bộ của quản lý được tách theo user ID; nhân viên đọc dữ liệu Supabase theo RLS, không đọc workspace cục bộ của quản lý.

Khởi tạo quản lý đầu tiên qua CLI interactive có key server, không có endpoint bootstrap công khai. Mật khẩu không ghi log/file hoặc đưa vào đối số shell. Nếu chưa có quản lý, giao diện đăng nhập nêu cần khởi tạo tài khoản.

Nghiệm thu: anonymous không vào page/action; manager đúng quyền; sales/technician truy cập URL cấm bị từ chối; account inactive bị chặn dù token còn hạn; không tự sửa role; không mất quản lý cuối; username/password sai báo chung; secret không trong bundle; CSRF dùng bảo vệ Origin của Server Actions. Cần báo riêng unit/SQL metadata/HTTP và E2E, không thay thế bằng nhau.
