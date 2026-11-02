# Sửa nhà cung cấp

## Mục tiêu và quyền
- Quản lý sửa tên và số điện thoại của nhà cung cấp đã lưu ngay tại `/purchases`. Nhân viên/thợ/ẩn danh không được sửa.
- Theo luồng nhà cung cấp/nhập hàng trong `business-workflows.md`. Không đổi nhà cung cấp trên phiếu đã chốt, không gộp/xóa nhà cung cấp hoặc sửa công nợ.

## Luồng và giao diện
- Nhập hàng → chọn nhà cung cấp → Sửa → tên và số điện thoại điền sẵn → Lưu thay đổi.
- Tên bắt buộc, tối đa 180 ký tự; số điện thoại tùy chọn, tối đa 30 ký tự. Cho sửa cả nhà cung cấp vừa thêm.
- Mở form riêng ngoài form nhập, khóa chốt phiếu và đổi nhà cung cấp trong khi sửa. Giữ các hàng nhập đang soạn. Chỉ cập nhật lựa chọn sau server xác nhận, thông báo rõ thành công.
- Đang gửi/timeout khóa form và Hủy; retry cùng UUID/payload. Lỗi giữ nội dung. Xung đột version không ghi đè, đóng form/tải bản mới. Focus ô tên khi mở và trở lại ô chọn khi đóng.

## Backend và dữ liệu
- Migration nối tiếp `202611010004_supplier_details.sql`: thêm suppliers.details_version mặc định 1, RPC manager-only `update_supplier_details(p_payload,p_request_id)` và bổ sung version cho danh sách nhà cung cấp trong snapshot.
- Payload supplierId/version/name/phone. Live session/role ở server và DB, row lock + CAS, idempotency theo actor/request trong garage_requests, audit before/after cùng transaction. Không mở quyền UPDATE trực tiếp, anon không EXECUTE; definer search_path cố định.
- Tên nhà cung cấp không có ràng buộc unique trong hệ thống hiện tại; giữ nguyên chính sách, không tự gộp các nhà cung cấp trùng tên.
- Giữ ID, phiếu nhập cũ/supplier_snapshot, ledger và công nợ; phiếu mới lấy thông tin hiện tại khi chốt. Phiếu đang soạn giữ cùng supplierId và hiển thị dữ liệu mới sau tải lại.

## Nghiệm thu và rollout
- Kiểm tra PostgreSQL cách ly: quyền, validate, CAS hai phiên, retry/conflict/audit, snapshot phiếu trước/sau, không thay số dư, session bị tắt và quyền API.
- Typecheck/build/unit/skills checker theo kết quả bàn giao; chưa browser verified nếu chưa có bằng chứng.
- Áp dụng sau kiểm tra vào đúng project ứng dụng; đối chiếu dấu vân tay nhà cung cấp và số chứng từ/tổng tồn/tiền trước/sau. Không sửa nhà cung cấp thật để thử.

## Bằng chứng 01/11/2026
- `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd test` (27 đạt), `npm.cmd run test:inventory` (103 đạt), `npm.cmd run skills:check`: đạt. Runner inventory dùng PostgreSQL cách ly với Auth schema tối thiểu, không kết nối production.
- Đối chiếu project của `.env.local` và CLI liên kết khớp nhau. Dry-run chỉ liệt kê `202611010004_supplier_details.sql`; push thành công; local/remote khớp đến migration này.
- Trước/sau cùng dấu vân tay nhà cung cấp `58d7e0d1a879f9e8cc27ac3c17b269cb`, phiếu nhập `b1fa14e04fd79d144bf2e82996c65c94`. Giữ 1 nhà cung cấp, 3 phiếu nhập, 4 đơn bán, tổng tồn 2 và tổng cash entries 10.230.050đ. Không sửa thông tin nhà cung cấp thật hay tạo phiếu thử.
- Authenticated được EXECUTE RPC, anon không được EXECUTE; bảng suppliers không mở UPDATE trực tiếp. API gọi RPC không session trả HTTP 401 / SQLSTATE 42501 permission denied, xác nhận API nhận function mới và chặn ẩn danh.
- Chưa nghiệm thu browser có đăng nhập, chưa deploy frontend lên Vercel. Khôi phục focus, sửa khi phiếu đang soạn và responsive chưa được kiểm tra trực tiếp bằng browser.
