# Kho và nghiệp vụ dùng Supabase

## Phạm vi và quyền

Thay các màn hình nghiệp vụ local bằng truy vấn Supabase có session. Quản lý: nhà cung cấp, nhập hàng, chi trả nhập hàng, kiểm kê, trả hàng bán, cấu hình và báo cáo. Bán hàng: khách/xe, tiếp nhận, báo giá, ghi xác nhận khách, chốt bán, thu sửa chữa, bàn giao. Thợ: chỉ phiếu được giao, chuyển sang chờ kiểm tra chất lượng; không tự xuất kho/đổi giá/thu tiền. Nhân viên không được nhận giá vốn qua payload.

Các chức năng đang có được nối backend; không thêm online/nhiều chi nhánh. Chốt bán thanh toán đủ, không bán chịu; bàn giao sửa chữa phải thu đủ. Nhập hàng cho phép trả một phần, phần còn lại tính từ chứng từ và các lần trả. Điều chỉnh kiểm kê chỉ quản lý, có tồn kỳ vọng để phát hiện thay đổi sau lúc đếm. Không tự chuyển dữ liệu local cũ vào production.

## Giao dịch

`garage_command(action,payload,request_id)` kiểm tra session còn hoạt động và quyền trong DB; khóa request theo actor/key, đối chiếu action + JSON payload, trả lại kết quả cũ khi retry cùng nội dung. Mỗi command gồm cả chứng từ, dòng, stock balance/movement, cost snapshot, payment/cash ledger và audit trong một transaction. Khóa stock theo UUID tăng dần. Không tin tổng/giá bán/giá vốn từ client; chốt bán đối chiếu giá người dùng đã thấy, báo lỗi khi giá đổi.

Sửa chữa: received → awaiting_approval (báo giá có version, giá tại server) → in_progress (ghi người khách xác nhận) → ready (đã xuất đủ theo báo giá, kiểm tra chất lượng) → delivered (thu đủ). Chỉ xuất một lần toàn bộ phần còn lại của báo giá đã duyệt. Thay báo giá chỉ trước khi đã xuất hàng. Hủy chỉ khi chưa xuất/thu; phiếu đã phát sinh không bị xóa hay tự hoàn tồn. Giá công đã duyệt không sửa tay.

Phiếu nhập tăng tồn và tính bình quân; bán và xuất sửa lưu giá vốn tại thời điểm xuất. Trả hàng bán có dòng gốc, giới hạn lũy kế, hoàn đúng giá gốc và nhập lại hàng bán được; quản lý xác nhận chất lượng. Phiếu đã chốt giữ snapshot tên hàng, khách và cửa hàng.

## UI và nghiệm thu

Các route hiện hữu giữ sidebar; form có busy/error/success, retry giữ key cho đến thành công, không báo thành công trước RPC. Load lỗi không fallback local. Dữ liệu danh sách có phân trang; tổng báo cáo tính từ DB và phân biệt doanh thu bàn giao, tiền thu/chi, phải trả nhập hàng, lợi nhuận gộp. Cấu hình dùng server version; mẫu in dùng snapshot.

Kiểm tra trên PostgreSQL cách ly: apply đủ migrations, nhập/bán/xuất/thu, retry conflict, rollback khi một dòng thiếu, hai kết nối mua món cuối, thu đồng thời, quyền thợ/bán hàng/ẩn danh/tài khoản tắt, không lộ cost. Không tạo giao dịch thử trong production. Browser/khôi phục backup cần ghi rõ nếu chưa chạy; không coi build là nghiệm thu vận hành.

## Bằng chứng triển khai 26/10/2026

- Đã apply `202610260003_live_inventory.sql` và `202610260004_live_queries.sql` trên Supabase liên kết. Giữ nguyên bảng/dữ liệu hiện có, không nhập demo từ localStorage. Kho hiện có 1 phụ tùng do người dùng tạo; không tạo phụ tùng thử.
- `npm.cmd run test:inventory`: 32 kiểm tra đạt trên PostgreSQL native 18 cách ly (schema Auth/session tối thiểu mô phỏng Supabase, SET ROLE authenticated/anon, hai kết nối độc lập và trigger gây lỗi sau cập nhật kho). Runner không đọc `.env`, không kết nối production. Bao gồm apply toàn bộ migrations từ rỗng; chưa chạy nâng cấp với dữ liệu lịch sử lớn hoặc HTTP JWT tích hợp cho command kho.
- `npm.cmd test`: 27 đạt. Typecheck/build đạt. Schema lint production không có lỗi, có một cảnh báo biến `ver` chưa sử dụng trong `garage_command`.
- Không có browser/app kết nối: chưa QA thao tác người dùng, responsive hay bản in bằng browser. Chưa thử phục hồi backup và chưa nghiệm thu vận hành production.
- Vercel production `dpl_4aRsNCY5QhkKiGcW4PGFspAEzXSb` READY. HTTP login 200; 9 route nghiệp vụ trả 307 về login khi không có session. PostgREST anon bị từ chối cả 3 RPC (42501); metadata 9 bảng mới bật RLS, không grant ghi trực tiếp authenticated, helper không cấp EXECUTE client. Số bản ghi các bảng cũ trước/sau giữ nguyên; bảng giao dịch mới không có fixture.
- Danh sách chứng từ phân trang 50 dòng; tổng báo cáo tính riêng trên database. Lựa chọn phụ tùng/xe/nhà cung cấp giới hạn 2.000, có cảnh báo số lượng khi vượt; danh mục phụ tùng quản lý giữ giới hạn 1.000 hiện hữu. Không lấy số tổng từ các trang đã tải.
- Stock balance có version tự tăng bằng trigger; kiểm kê đối chiếu cả số dư và version, không ghi đè nếu có giao dịch dù số dư đã quay về giá trị cũ. Chỉnh giá bán/ngưỡng tồn chỉ quản lý và đối chiếu giá/ngưỡng đã thấy. Giá vốn chỉ tính qua nhập hàng và nhập trả, không sửa tay trên UI.
- Phần để sau ngoài luồng hiện hữu: bán chịu, đặt hàng/nhận từng phần, trả nhà cung cấp, sửa báo giá sau khi đã xuất hàng, nhập trả vật tư sửa chữa, hàng lỗi, bảo hành, chốt ca và hóa đơn điện tử. Các nút import JSON/ghi đè/xóa dữ liệu demo không xuất hiện trong màn hình thật.
