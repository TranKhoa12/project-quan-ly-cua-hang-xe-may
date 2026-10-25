---
name: garage-security
description: Design and verify authentication, authorization, RLS, sensitive data boundaries and secure operations for this shop application. Use for security-sensitive implementation or a requested security review.
---

# Bảo mật theo luồng dữ liệu

Đọc `docs/security-model.md`. Phạm vi review dựa trên thay đổi thực tế; không biến chỉnh giao diện nhỏ thành audit vô hạn.

1. Xác định entrypoint và tài sản: session, thông tin khách/xe, giá vốn, tồn, tiền, quyền nhân viên. Theo dấu dữ liệu từ browser → server → Supabase/Storage → log/export.
2. Kiểm tra quyền người gọi ở mỗi thao tác và từng đối tượng. Tài khoản bị vô hiệu hóa phải bị chặn ở database/điểm xử lý, kể cả token còn hạn. Không cho người dùng tự tăng role qua sửa profile.
3. Thử trực tiếp API/RPC với tài khoản ẩn danh, bán hàng, thợ được giao, thợ không được giao và quản lý. Đảm bảo dữ liệu không bị rò trong payload/network dù cột UI đã ẩn.
4. Giữ service-role, database URL có mật khẩu và token ngoài client/log/repository. Chỉ publishable key được public với RLS phù hợp; không đăng secret vào báo cáo lỗi.
5. Dùng validation phía server, truy vấn tham số hóa, kiểm tra Origin/CSRF theo cơ chế session, rate limit đăng nhập và mutation nhạy cảm. Không đưa text khách hàng vào raw HTML.
6. File vào bucket private: kiểm tra quyền đối tượng, loại/kích thước, đường dẫn; URL ký ngắn hạn. Export cần quyền và audit, giới hạn dữ liệu được xuất.
7. Review migration, view và function đặc quyền cùng grants. Ghi phát hiện bằng đường tấn công, tác động, vị trí, cách tái hiện, sửa và kiểm thử lại. Không gọi checklist chưa chạy là bằng chứng an toàn.

Đầu ra: thay đổi bảo mật hoặc danh sách phát hiện có mức độ và chứng cứ; test bị từ chối đúng quyền; rủi ro còn mở. Không tự đổi quyền production, mở truy cập công khai hoặc xóa dữ liệu ngoài yêu cầu.
