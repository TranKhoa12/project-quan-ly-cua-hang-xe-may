---
name: garage-backend
description: Implement Supabase schema, server contracts, transactional inventory, sales, repair and payment operations for this repository. Use when changing backend behavior or connecting demo workflows to real data.
---

# Quy trình backend

Đọc `docs/backend-process.md`, nghiệp vụ liên quan trong `docs/business-workflows.md` và migration thực tế. Schema nền hiện tại chưa phải triển khai đầy đủ của các nghiệp vụ đích.

1. Xác định dữ liệu tin cậy: user/session và quyền từ server, giá/tồn từ database, payload trình duyệt là dữ liệu chưa xác minh. Không tin tổng tiền, cost, role hay actor do client truyền.
2. Thiết kế bảng/ràng buộc cùng hợp đồng trước khi nối UI. Tiền không dùng float; giao dịch giữ snapshot giá vốn, giá bán và thời gian chốt. Tách dữ liệu giá vốn khỏi truy vấn nhân viên.
3. Mỗi thao tác kho/tiền là một RPC/giao dịch nguyên tử. Khóa các dòng liên quan theo thứ tự cố định; kiểm tra lại tồn khả dụng, trạng thái và số đã thu bên trong transaction. Giữ hàng chuyển thành xuất dùng phải giải phóng phần giữ cùng transaction.
4. Dùng idempotency key + unique constraint theo actor/nghiệp vụ; cùng key và cùng payload trả lại kết quả cũ, cùng key khác payload trả conflict. Không chỉ kiểm tra trong bộ nhớ hoặc khóa nút.
5. Kiểm tra quyền cả server entrypoint và database. Function `security definer` chỉ dùng nếu cần; schema-qualify tên bảng, cố định `search_path`, thu hồi EXECUTE mặc định, kiểm tra người gọi. Không dùng service-role để bỏ qua authorization.
6. Với update đang mở, dùng version hoặc trạng thái kỳ vọng để phát hiện sửa đồng thời. Chứng từ đã chốt không sửa/xóa dòng giao dịch; tạo bản điều chỉnh liên kết chứng từ gốc.
7. Tạo migration nối tiếp, kiểm tra apply trên database rỗng và nâng cấp từ baseline. Viết test RLS, atomicity, rollback, concurrency, retry và audit phù hợp thao tác.

Đầu ra: migration, hợp đồng, xử lý server/RPC, test và kế hoạch chuyển dữ liệu. Nếu thiếu kết nối Supabase, hoàn thiện phần local có thể kiểm tra và nêu chính xác kiểm thử tích hợp chưa chạy; không nới quyền hoặc báo database đã sẵn sàng.
