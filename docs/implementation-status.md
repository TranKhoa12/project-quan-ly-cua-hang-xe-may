# Hiện trạng triển khai

Cập nhật: 25/10/2026. Đây là nguồn phân biệt code hiện có với yêu cầu đích trong tài liệu quy trình.

| Hạng mục | Hiện có | Mức / còn thiếu |
| --- | --- | --- |
| Tổng quan và 10 trang quản lý | Next.js, CSS, dữ liệu tổng hợp | Demo; chưa E2E/browser QA |
| Cấu hình tên/điện thoại/địa chỉ | Validation, draft riêng, lưu/khôi phục localStorage; UI/title/mẫu in dùng chung | Demo; chưa quyền cập nhật, server version hoặc snapshot chứng từ |
| Khách hàng/xe | Form và danh sách mẫu | Demo gộp 1 xe/khách; SQL đã tách bảng; chưa nối database |
| Sửa chữa | Tiếp nhận, đổi trạng thái, xuất dùng, thu thêm | Demo; chưa máy trạng thái backend, báo giá/duyệt/QC/bảo hành |
| Bán tại quầy | Giỏ, chốt và trừ tồn local, snapshot giá/cost | Unit test mẫu; chưa transaction/lock/idempotency payload backend |
| Nhập kho | Tăng tồn, giá vốn bình quân mẫu | Chưa phiếu mua/nhà cung cấp/phải trả thật |
| Thu chi/công nợ | Tổng hợp các khoản thu mẫu | Chưa khoản chi/đối soát/ledger hoàn chỉnh |
| Báo cáo | Tổng hợp demo | Chưa mốc thu/bàn giao riêng và giá vốn sửa chữa |
| Nhân viên/quyền | Danh sách minh họa | Chưa Auth/authorization thật |
| Supabase | Client khởi tạo và migration nền | Chưa apply migration hoặc nối UI, chưa RPC ghi |
| Bảo mật | Thiết kế quyền, RLS đọc nền trong SQL | Chưa test token/RLS/quyền/Storage thực tế |
| Bộ quy trình AI | AGENTS.md, 5 skill và tài liệu luồng/hợp đồng/test/release | Đã viết; validator cấu trúc không chứng minh AI luôn làm đúng |
| Kiểm thử tự động | Unit demo và cấu hình; typecheck/build; checker skill | Chưa runner DB/RLS/concurrency/browser |
| Triển khai | Cấu trúc Next.js phù hợp mục tiêu Vercel | Chưa tạo/deploy project Vercel hoặc Supabase |

## Quy tắc cập nhật

Mỗi thay đổi cập nhật đúng dòng liên quan và ghi bằng chứng trong báo cáo giao việc. Không tăng mức chỉ vì có tài liệu hoặc migration. Chỉ thay “chưa” khi đã có code lẫn bằng chứng tương ứng.

## Khoảng thiếu ưu tiên tiếp theo

Auth và quyền server → cấu hình cửa hàng server → migrations/fixture test → nhập hàng/kho → chốt bán/thu tiền nguyên tử → luồng sửa hoàn chỉnh → trả/hủy/kiểm kê → báo cáo/backup/nghiệm thu. Thực hiện theo `release-process.md`, không dùng toàn bộ bản demo để vận hành thật.
