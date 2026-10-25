# Hiện trạng triển khai

Cập nhật: 25/10/2026. Đây là nguồn phân biệt code hiện có với yêu cầu đích trong tài liệu quy trình.

| Hạng mục | Hiện có | Mức / còn thiếu |
| --- | --- | --- |
| Tổng quan và 10 trang quản lý | Đã có guard server; quản lý dùng workspace trống tách user ID, nhân viên đọc Supabase theo role | Các nghiệp vụ ghi kho/tiền vẫn chưa có backend; chưa E2E/browser QA |
| Cấu hình tên/điện thoại/địa chỉ | Validation, draft riêng, lưu/khôi phục localStorage; UI/title/mẫu in dùng chung | Demo; chưa quyền cập nhật, server version hoặc snapshot chứng từ |
| Khách hàng/xe | Form và danh sách mẫu | Demo gộp 1 xe/khách; SQL đã tách bảng; chưa nối database |
| Sửa chữa | Tiếp nhận, đổi trạng thái, xuất dùng, thu thêm | Demo; chưa máy trạng thái backend, báo giá/duyệt/QC/bảo hành |
| Bán tại quầy | Giỏ, chốt và trừ tồn local, snapshot giá/cost | Unit test mẫu; chưa transaction/lock/idempotency payload backend |
| Nhập kho | Tăng tồn, giá vốn bình quân mẫu | Chưa phiếu mua/nhà cung cấp/phải trả thật |
| Thu chi/công nợ | Tổng hợp các khoản thu mẫu | Chưa khoản chi/đối soát/ledger hoàn chỉnh |
| Báo cáo | Tổng hợp demo | Chưa mốc thu/bàn giao riêng và giá vốn sửa chữa |
| Nhân viên/quyền | Supabase Auth username/password, cookie SSR, guard role, tạo/bật/tắt/đổi role/reset mật khẩu; RPC có audit | Cần người dùng chạy `auth:create-manager` để đặt tài khoản đầu tiên; chưa browser QA |
| Supabase | Áp dụng migration `202610250001` và `202610250002`, gồm Auth/RPC phân quyền và limiter | Đã nối Auth, staff và đọc dữ liệu nhân viên; chưa có RPC ghi kho/tiền |
| Bảo mật | 25 kiểm tra tích hợp JWT/RLS/HTTP/Server Action đã pass trên project mới, fixtures được dọn; signup tắt | Chưa test Storage hoặc giao dịch kho/tiền đồng thời; chưa E2E browser |
| Bộ quy trình AI | AGENTS.md, 5 skill và tài liệu luồng/hợp đồng/test/release | Đã viết; validator cấu trúc không chứng minh AI luôn làm đúng |
| Kiểm thử tự động | Unit nghiệp vụ/cấu hình/quyền/storage; `test:auth` chạy JWT/RLS/HTTP thật, build/typecheck | Chưa runner transaction kho/tiền hoặc E2E browser |
| Triển khai | Supabase đã cấu hình; Vercel production cập nhật tại `https://dangkietmoto.vercel.app`, deployment `dpl_9nUaPyj8ZeLUfp38TBoo2DUGRzgD` READY; đã cấu hình 3 env Auth | HTTP production: login 200 có form, / và /staff và /account redirect 307 về login; chưa browser QA hoặc nghiệm thu nghiệp vụ kinh doanh |

## Quy tắc cập nhật

Mỗi thay đổi cập nhật đúng dòng liên quan và ghi bằng chứng trong báo cáo giao việc. Không tăng mức chỉ vì có tài liệu hoặc migration. Chỉ thay “chưa” khi đã có code lẫn bằng chứng tương ứng.

## Khoảng thiếu ưu tiên tiếp theo

Auth và quyền server → cấu hình cửa hàng server → migrations/fixture test → nhập hàng/kho → chốt bán/thu tiền nguyên tử → luồng sửa hoàn chỉnh → trả/hủy/kiểm kê → báo cáo/backup/nghiệm thu. Thực hiện theo `release-process.md`, không dùng toàn bộ bản demo để vận hành thật.
