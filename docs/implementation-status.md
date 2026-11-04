# Hiện trạng triển khai

04/11/2026: thêm tra cứu web ngay trong form mặt hàng mới của Nhập hàng. Server action manager-only gọi Tavily Search Basic, giữ key server, giới hạn 12 lượt/15 phút/actor bằng limiter database hiện có; tối đa 5 kết quả có nguồn, người dùng chọn tiêu đề làm tên để sửa, không suy đoán nhóm/thương hiệu hoặc ghi kho/tiền. Không lưu từ điển kết quả. Typecheck, 36 unit, 17 nhóm UI Edge cách ly, build và skills checker pass. Chưa có API key, chưa thử provider thật/E2E Auth, chưa deploy. Chi tiết cấu hình và giới hạn: `docs/features/part-web-search.md`.

Cập nhật 26/10/2026. Phân biệt năng lực hiện có với quy trình đích; chưa nghiệm thu vận hành qua trình duyệt.

| Hạng mục | Hiện có | Giới hạn |
| --- | --- | --- |
| Tổng quan/menu | Sidebar chung, server guard, stream dữ liệu; tổng quan đọc Supabase; khung trang chung thu gọn đầu trang, bỏ tiêu đề lặp và khoảng cách dư (01/11/2026) | Chưa đo chuyển menu hoặc nghiệm thu bố cục thu gọn trong phiên người dùng bằng browser |
| Cấu hình cửa hàng | Lưu Supabase, đối chiếu version, đồng bộ tên sidebar; chứng từ giữ snapshot; cấu hình tài khoản ngân hàng đã có schema/RPC qua migration `202611010001` (01/11/2026) | Quản lý cần nhập tài khoản nhận tiền; chưa nghiệm thu lưu cấu hình qua browser; cấu hình local cũ không tự upload |
| Phụ tùng | Tạo mặt hàng mới trong phiếu nhập, gợi ý/nhắc trùng; quản lý sửa tên/nhóm/thương hiệu có version, sửa giá bán/ngưỡng tồn và Ẩn/Hiện POS qua RPC; bỏ nút tạo phụ tùng riêng (01/11/2026) | Danh mục quản lý tối đa 1.000 hàng; từ điển không xác nhận fitment; chưa nghiệm thu browser luồng sửa thông tin |
| Khách/xe | Tạo khách và nhiều xe; biển số chuẩn hóa unique trong database | Chưa gộp khách/chuyển chủ xe; lựa chọn xe tối đa 2.000 |
| Nhập hàng | Phiếu chọn hàng cũ hoặc mặt hàng mới, tạo danh mục/tăng tồn cùng transaction; giao diện rút gọn với ô tìm hàng chung, dòng nhập số lượng/giá, form hàng mới mở khi cần, chọn Chưa trả/Trả đủ/Trả một phần; migration `202611010002` đã áp dụng | Chưa nghiệm thu browser giao diện rút gọn; chưa PO/nhận từng phần/trả nhà cung cấp |
| Bán tại quầy | Giá từ server, khóa tồn, xuất kho/snapshot cost/thu đủ cùng transaction; mã nguồn POS có phản hồi tại giỏ, phiếu kết quả/in, tiền thừa, xác nhận nhận tiền, tài khoản/QR và nháp server phục hồi request; migration `202611010001` đã áp dụng vào Supabase ứng dụng đang dùng (01/11/2026) | Chưa nghiệm thu browser POS/QR hoặc deploy bản frontend mới lên Vercel; chưa ảnh thật, bán chịu/giảm giá/thanh toán một phần; chưa đối soát ngân hàng tự động |
| Sửa chữa | Tiếp nhận, phân công, báo giá version, ghi khách duyệt, xuất theo báo giá, chất lượng, thu nhiều lần, bàn giao khi thu đủ | Chưa sửa báo giá sau xuất/nhập trả phụ tùng sửa/bảo hành; hủy chỉ trước phát sinh |
| Kiểm kê/trả bán | Quản lý kiểm kê đối chiếu số dư + stock version; nhận trả hàng bán được, hoàn theo dòng gốc và giới hạn lũy kế | Chưa hàng lỗi, trả không nhập kho, trả nhà cung cấp |
| Thu chi/công nợ | Ledger bán/sửa/hoàn/nhập hàng/chi vận hành; phải thu sửa/phải trả nhập tính từ chứng từ | Chưa chốt ca/đối soát ngân hàng/đảo chi phí vận hành |
| Báo cáo | Khoảng ngày Việt Nam; doanh thu bán + sửa bàn giao − trả, cost snapshot/lợi nhuận gộp, thu/chi riêng; tổng toàn DB | Chưa xuất báo cáo kế toán/hóa đơn điện tử |
| Nhân viên/quyền | Supabase Auth username/password, session HttpOnly, active role/session trong DB, quản lý cấp/tắt/reset/quyền | Chưa cấu hình quyền con/hạn mức |
| Nhà cung cấp | Quản lý chọn nhà cung cấp trong Nhập hàng và sửa tên/số điện thoại bằng RPC có version, idempotency và audit; phiếu nhập cũ giữ snapshot (01/11/2026) | Chưa nghiệm thu browser chức năng sửa; chưa gộp/xóa nhà cung cấp |
| Phiếu bán tại quầy | Mẫu chung POS/lịch sử, A5/A4, bảng hàng/tổng/bằng chữ, ngày giờ VN, số trang; snapshot người bán và tiền khách đưa cho đơn mới; PDF mẫu đã render kiểm tra (02/11/2026) | Phiếu cũ không backfill thông tin chưa lưu; chưa thử máy in thật hoặc luồng nút in trong phiên đăng nhập |
| Backend | Migrations đến `202611020001` đã áp dụng; RPC kho/tiền, nháp POS, nhập hàng thống nhất, hiển thị POS, sửa mặt hàng/nhà cung cấp và snapshot phiếu in kiểm tra session/quyền, idempotency, transaction và audit | Chưa đầy đủ mọi quy trình đích trong business-workflows; POS/nhập mới/sửa thông tin chưa nghiệm thu browser |
| Dữ liệu cũ | Route nghiệp vụ dùng `features/garage`; không đọc/ghi localStorage nghiệp vụ, không fallback demo | `components/workspace.tsx` và `staff-workspace.tsx` còn mã cũ nhưng không được route import; local cũ giữ nguyên, không tự migrate |
| Kiểm thử | 31 unit đạt; 110 kiểm tra PostgreSQL native cách ly đạt; 4 PDF A5/A4 dựng từ component và CSS thật đạt kiểm tra nội dung/bố cục (02/11/2026); typecheck/build/skills checker đạt | Auth trong runner kho là schema tối thiểu; chưa HTTP JWT cho command kho, browser E2E, phục hồi backup; PDF render không thay nghiệm thu máy in thật |
| Production | Vercel `https://dangkietmoto.vercel.app`, `dpl_4aRsNCY5QhkKiGcW4PGFspAEzXSb` READY | HTTP login 200, 9 route nghiệp vụ không session trả 307; chưa nghiệm thu thao tác có đăng nhập |

## Bằng chứng dữ liệu và bảo mật

03/11/2026: người dùng yêu cầu xóa toàn bộ dữ liệu cửa hàng, giữ tài khoản đăng nhập và từ điển gợi ý. Đã kiểm kê chỉ đọc schema/FK/defaults. Lệnh xóa nghiệp vụ production bị automatic approval review từ chối vì phá hủy không thể đảo ngược; lệnh không được thực thi. Không xóa/reset dữ liệu hoặc tìm cách vượt chặn. Script thao tác tạm đã được bỏ khỏi workspace.

Frontend nhập hàng mới đã triển khai 03/11/2026: `dpl_AsbyEyKTEkf4LTi5T2Q8Eqtr8cz3` READY, alias `https://dangkietmoto.vercel.app`, thay thế bản `dpl_F9uk3nA7ByisDLJVtJ4ViejzxyR8`. Không có migration mới trong lần đổi bố cục. UI harness 16 nhóm đạt; nghiệm thu đăng nhập với database thật vẫn chưa thực hiện, không tạo giao dịch thử production.

Thiết kế lại Nhập hàng 03/11/2026 sau tham khảo hướng dẫn chính thức KiotViet/Sapo: trái là chọn hàng và phiếu nhập; phải là nhà cung cấp/tổng/thanh toán/xác nhận. Mobile đưa nhà cung cấp lên đầu. Lịch sử NCC trở thành danh sách chọn nhanh gọn, thêm hàng tự focus số lượng, giá nhập/bán/xóa tại từng dòng. CommandForm thêm submitPanel dùng chung fieldset để giữ khóa busy/uncertain. Không đổi RPC/database. `npm.cmd run test:purchase-ui` đạt 16 nhóm kiểm tra headless Edge trên component/CSS thật với server actions/router giả lập; đã xem ảnh 1440/375px, kiểm tra không tràn ngang 1440/768/375px. Unit 32 đạt; build/TypeScript và skills checker đạt. Chưa E2E Auth/database thật. Đặc tả và nguồn tham khảo: `features/purchase-workbench.md`.

Triển khai frontend 03/11/2026: Vercel `dpl_F9uk3nA7ByisDLJVtJ4ViejzxyR8` READY, alias `https://dangkietmoto.vercel.app`. Bản triển khai gồm các thay đổi nhập hàng rút gọn, viết hoa đầu từ, bảng hàng theo nhà cung cấp và xóa dòng/mặt hàng trong phiên làm việc này. Ghi chú “chưa deploy” trước đó không còn áp dụng với các thay đổi này; chưa thay thế nghiệm thu browser đăng nhập hoặc thao tác xóa thực tế.

03/11/2026: thêm Xóa dòng dưới tên hàng phiếu nhập nháp; danh mục có Xóa mặt hàng, xác nhận và server kiểm tra tồn 0/chưa giao dịch hoặc báo giá. Giữ Ẩn khỏi POS cho hàng đã phát sinh. `test:inventory` đạt 134 kiểm tra (14 nhóm mới cho quyền/version/retry/audit/rollback và nhập-báo giá đồng thời với xóa); unit 32 đạt, build gồm TypeScript đạt, skills checker đạt. Đã dry-run và áp dụng `202611030003_part_delete.sql` lên database production liên kết, metadata RPC/helper đúng quyền. Không tự xóa mặt hàng production; chưa QA browser đăng nhập. Đặc tả `features/part-delete.md`.

Khắc phục lỗi tải hàng nhà cung cấp 03/11/2026: CLI migration list trên project liên kết `ozypilffzhbunjlzgdgc` xác nhận thiếu `202611030001` và `202611030002`. Dry-run chỉ có hai migration này, không seed. Đã áp dụng cả hai bằng `supabase db push --linked --yes`; truy vấn metadata read-only xác nhận `delete_supplier` và `supplier_purchase_items` tồn tại, authenticated có EXECUTE, anon không có. Không tạo/xóa giao dịch hay mặt hàng production. Các ghi chú “chưa áp dụng” trước đó được thay thế bởi bằng chứng này. Chưa nghiệm thu bảng trong phiên browser đăng nhập của người dùng. Câu hỏi “hàng không xóa được” đang chờ phân biệt dòng phiếu nháp với mặt hàng trong kho.

Cập nhật 03/11/2026: chọn nhà cung cấp ở Nhập hàng hiện bảng mặt hàng đã nhập, tổng số lượng, giá nhập gần nhất, giá bán hiện tại và ngày nhập VN; phân trang 20 hàng, thêm nhanh vào phiếu cho hàng trong danh mục lựa chọn. RPC chỉ đọc `supplier_purchase_items` chỉ quản lý, có kiểm tra session, không dựa trang chứng từ hiện tại. `npm.cmd run test:inventory` đạt 120 kiểm tra PostgreSQL cách ly; build đạt gồm TypeScript. Migration `202611030002` chưa áp dụng production, chưa deploy hoặc nghiệm thu browser. Xem `features/supplier-purchased-items.md`.

Nhập chữ tại Nhập hàng 03/11/2026: tự viết hoa chữ đầu mỗi từ cho tìm hàng, tên hàng/nhóm/thương hiệu và tên nhà cung cấp mới/sửa. Không đổi ô số hoặc danh mục đã lưu; có xử lý kết thúc composition cho bộ gõ. `npm.cmd run typecheck` và build đạt; unit đạt 32, gồm Unicode tiếng Việt/chữ viết tắt/khoảng trắng. Chưa thử bộ gõ trong browser và chưa deploy.

Giao diện nhập hàng rút gọn 03/11/2026: bỏ tiêu đề cột lặp; giá bán hàng cũ chỉ hiển thị, hàng mới nhập giá bán một nơi; sửa/xóa nhà cung cấp thu gọn; thanh toán bằng số Đã trả và nút Trả đủ, giữ mặc định chưa trả. Giữ RPC và kiểm tra server. `npm.cmd test` đạt 31, `npm.cmd run build` đạt gồm TypeScript. Chưa deploy và chưa nghiệm thu thao tác/browser responsive. Đặc tả `features/simple-purchase-intake.md`.

Cập nhật 03/11/2026: mã nguồn có xóa nhà cung cấp chưa phát sinh phiếu nhập qua `delete_supplier`, chỉ quản lý, đối chiếu version, idempotency và audit. UI tại Nhập hàng → Sửa → Xóa nhà cung cấp, có xác nhận; nhà cung cấp có phiếu nhập bị từ chối. `npm.cmd run test:inventory` đạt 115 kiểm tra PostgreSQL cách ly; `npm.cmd run build` đạt cả TypeScript. Migration `202611030001` chưa áp dụng production; chưa deploy hoặc nghiệm thu browser. Đặc tả: `features/supplier-delete.md`.

Cập nhật giao diện nhập hàng 03/11/2026: hiển thị giá bán từng dòng (hàng mới sửa được, hàng cũ chỉ đọc và hướng dẫn sửa tại Phụ tùng); nhãn giá nhập luôn hiện. Không đổi RPC hoặc cách tính kho/tiền. Typecheck và build đạt; chưa kiểm tra browser hoặc triển khai bản sửa.

Trước/sau migration: giữ 1 phụ tùng, 1 giá vốn, 1 số dư; 274 từ điển (bao gồm các bổ sung trước đó). Chưa có chứng từ kho/bán/sửa/khách/xe/thu tiền trước triển khai; các bảng giao dịch mới vẫn rỗng sau triển khai. Không tạo fixture trong production.

Metadata production xác nhận 9 bảng mới bật RLS, anon không SELECT, authenticated không INSERT/UPDATE trực tiếp. `garage_command`, `garage_snapshot`, `garage_store` chỉ authenticated có EXECUTE; helper không mở EXECUTE cho client; definer cố định search_path. PostgREST anon gọi cả 3 RPC trả 42501. Schema lint không lỗi, một cảnh báo biến `ver` chưa dùng. Test riêng kiểm tra không lộ cost cho nhân viên, thợ không được giao, tài khoản tắt và phiên bị thu hồi.

Chi tiết phạm vi, nguồn tên gợi ý và runner: `docs/features/live-inventory.md`, `docs/features/part-name-suggestions.md`, `docs/testing-strategy.md`.

## Việc tiếp theo để nghiệm thu vận hành

Thử luồng thực tế bằng tài khoản quản lý/nhân viên trên browser; đối soát dữ liệu đầu kỳ và tiền; thử backup/restore trong môi trường riêng; đào tạo thao tác và chốt các nghiệp vụ nâng cao còn thiếu theo `docs/release-process.md`. Không ghi Production verified trước khi có bằng chứng tương ứng.
