# Hiện trạng triển khai

Cập nhật: 26/10/2026. Đây là nguồn phân biệt code hiện có với yêu cầu đích trong tài liệu quy trình.

| Hạng mục | Hiện có | Mức / còn thiếu |
| --- | --- | --- |
| Tổng quan và 10 trang quản lý | Cùng ShopSidebar có icon/nhóm/thẻ cửa hàng trên tất cả trang; pending menu, prefetch theo tương tác; phần dữ liệu parts/staff stream sau guard | Nghiệp vụ kho/tiền cũ chưa có backend; chưa browser QA |
| Cấu hình tên/điện thoại/địa chỉ | Validation, draft riêng, lưu/khôi phục localStorage; UI/title/mẫu in dùng chung | Demo; chưa quyền cập nhật, server version hoặc snapshot chứng từ |
| Danh mục phụ tùng và gợi ý | `/parts` đọc Supabase, combobox tên/nhóm/brand cho nhập mới, nhắc trùng, RPC manager-only tạo danh mục với tồn 0 và nhớ từ mới | Migration `202610250003`; 23 từ tham chiếu, không seed sản phẩm; chặn trùng chính xác và cảnh báo tương tự ở database; chưa browser QA hoặc test ghi giao dịch trên môi trường riêng |
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
| Triển khai | Vercel production `https://dangkietmoto.vercel.app`, deployment `dpl_3m8HfP8rQEZZFTopF7DTZDsi2UyJ` READY; sidebar thống nhất và RPC live actor/session; giữ sin1 | 25 unit pass, schema lint pass, 8 test truy vấn actor/session bằng bảng tạm rollback; local/web login và guard/cookie giả pass. Chưa đo menu trong phiên đăng nhập của người dùng hoặc browser QA |

## Quy tắc cập nhật

Bổ sung 2026-10-26: migration `202610260002` đã mở rộng từ điển tên tham chiếu; Supabase có 254 tên (bộ mở rộng 253 tên/297 alias), 18 nhóm và 2 thương hiệu. Đã đối chiếu đủ dữ liệu và xác nhận sản phẩm/giá vốn/tồn kho/lịch sử kho không đổi; 27 unit test pass. Nguồn, phạm vi tên chung và giới hạn về mã OEM/đời xe tại `docs/features/part-name-suggestions.md`. Không đổi bundle Vercel; tải lại trang lấy danh sách mới từ Supabase.

Mỗi thay đổi cập nhật đúng dòng liên quan và ghi bằng chứng trong báo cáo giao việc. Không tăng mức chỉ vì có tài liệu hoặc migration. Chỉ thay “chưa” khi đã có code lẫn bằng chứng tương ứng.

## Khoảng thiếu ưu tiên tiếp theo

Auth và quyền server → cấu hình cửa hàng server → migrations/fixture test → nhập hàng/kho → chốt bán/thu tiền nguyên tử → luồng sửa hoàn chỉnh → trả/hủy/kiểm kê → báo cáo/backup/nghiệm thu. Thực hiện theo `release-process.md`, không dùng toàn bộ bản demo để vận hành thật.
