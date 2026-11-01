# Hiện trạng triển khai

Cập nhật 26/10/2026. Phân biệt năng lực hiện có với quy trình đích; chưa nghiệm thu vận hành qua trình duyệt.

| Hạng mục | Hiện có | Giới hạn |
| --- | --- | --- |
| Tổng quan/menu | Sidebar chung, server guard, stream dữ liệu; tổng quan đọc Supabase; khung trang chung thu gọn đầu trang, bỏ tiêu đề lặp và khoảng cách dư (01/11/2026) | Chưa đo chuyển menu hoặc nghiệm thu bố cục thu gọn trong phiên người dùng bằng browser |
| Cấu hình cửa hàng | Lưu Supabase, đối chiếu version, đồng bộ tên sidebar; chứng từ giữ snapshot; cấu hình tài khoản ngân hàng đã có schema/RPC qua migration `202611010001` (01/11/2026) | Quản lý cần nhập tài khoản nhận tiền; chưa nghiệm thu lưu cấu hình qua browser; cấu hình local cũ không tự upload |
| Phụ tùng | Tạo danh mục/gợi ý có nhắc trùng; quản lý sửa giá bán/ngưỡng tồn qua RPC | Danh mục quản lý tối đa 1.000 hàng; từ điển không xác nhận fitment |
| Khách/xe | Tạo khách và nhiều xe; biển số chuẩn hóa unique trong database | Chưa gộp khách/chuyển chủ xe; lựa chọn xe tối đa 2.000 |
| Nhập hàng | Nhà cung cấp, nhiều dòng/phiếu, chốt tăng tồn, giá vốn bình quân, trả một phần/trả thêm và phải trả | Chưa PO/nhận từng phần/trả nhà cung cấp |
| Bán tại quầy | Giá từ server, khóa tồn, xuất kho/snapshot cost/thu đủ cùng transaction; mã nguồn POS có phản hồi tại giỏ, phiếu kết quả/in, tiền thừa, xác nhận nhận tiền, tài khoản/QR và nháp server phục hồi request; migration `202611010001` đã áp dụng vào Supabase ứng dụng đang dùng (01/11/2026) | Chưa nghiệm thu browser POS/QR hoặc deploy bản frontend mới lên Vercel; chưa ảnh thật, bán chịu/giảm giá/thanh toán một phần; chưa đối soát ngân hàng tự động |
| Sửa chữa | Tiếp nhận, phân công, báo giá version, ghi khách duyệt, xuất theo báo giá, chất lượng, thu nhiều lần, bàn giao khi thu đủ | Chưa sửa báo giá sau xuất/nhập trả phụ tùng sửa/bảo hành; hủy chỉ trước phát sinh |
| Kiểm kê/trả bán | Quản lý kiểm kê đối chiếu số dư + stock version; nhận trả hàng bán được, hoàn theo dòng gốc và giới hạn lũy kế | Chưa hàng lỗi, trả không nhập kho, trả nhà cung cấp |
| Thu chi/công nợ | Ledger bán/sửa/hoàn/nhập hàng/chi vận hành; phải thu sửa/phải trả nhập tính từ chứng từ | Chưa chốt ca/đối soát ngân hàng/đảo chi phí vận hành |
| Báo cáo | Khoảng ngày Việt Nam; doanh thu bán + sửa bàn giao − trả, cost snapshot/lợi nhuận gộp, thu/chi riêng; tổng toàn DB | Chưa xuất báo cáo kế toán/hóa đơn điện tử |
| Nhân viên/quyền | Supabase Auth username/password, session HttpOnly, active role/session trong DB, quản lý cấp/tắt/reset/quyền | Chưa cấu hình quyền con/hạn mức |
| Backend | Migrations đến `202611010001` đã áp dụng; RPC kho/tiền và nháp POS kiểm tra session/quyền, idempotency, transaction và audit | Chưa đầy đủ mọi quy trình đích trong business-workflows; POS chưa nghiệm thu browser |
| Dữ liệu cũ | Route nghiệp vụ dùng `features/garage`; không đọc/ghi localStorage nghiệp vụ, không fallback demo | `components/workspace.tsx` và `staff-workspace.tsx` còn mã cũ nhưng không được route import; local cũ giữ nguyên, không tự migrate |
| Kiểm thử | 27 unit đạt; 32 kiểm tra PostgreSQL native cách ly đạt; typecheck/build/skills checker đạt | Auth trong runner kho là schema tối thiểu; chưa HTTP JWT cho command kho, browser E2E, phục hồi backup |
| Production | Vercel `https://dangkietmoto.vercel.app`, `dpl_4aRsNCY5QhkKiGcW4PGFspAEzXSb` READY | HTTP login 200, 9 route nghiệp vụ không session trả 307; chưa nghiệm thu thao tác có đăng nhập |

## Bằng chứng dữ liệu và bảo mật

Trước/sau migration: giữ 1 phụ tùng, 1 giá vốn, 1 số dư; 274 từ điển (bao gồm các bổ sung trước đó). Chưa có chứng từ kho/bán/sửa/khách/xe/thu tiền trước triển khai; các bảng giao dịch mới vẫn rỗng sau triển khai. Không tạo fixture trong production.

Metadata production xác nhận 9 bảng mới bật RLS, anon không SELECT, authenticated không INSERT/UPDATE trực tiếp. `garage_command`, `garage_snapshot`, `garage_store` chỉ authenticated có EXECUTE; helper không mở EXECUTE cho client; definer cố định search_path. PostgREST anon gọi cả 3 RPC trả 42501. Schema lint không lỗi, một cảnh báo biến `ver` chưa dùng. Test riêng kiểm tra không lộ cost cho nhân viên, thợ không được giao, tài khoản tắt và phiên bị thu hồi.

Chi tiết phạm vi, nguồn tên gợi ý và runner: `docs/features/live-inventory.md`, `docs/features/part-name-suggestions.md`, `docs/testing-strategy.md`.

## Việc tiếp theo để nghiệm thu vận hành

Thử luồng thực tế bằng tài khoản quản lý/nhân viên trên browser; đối soát dữ liệu đầu kỳ và tiền; thử backup/restore trong môi trường riêng; đào tạo thao tác và chốt các nghiệp vụ nâng cao còn thiếu theo `docs/release-process.md`. Không ghi Production verified trước khi có bằng chứng tương ứng.
