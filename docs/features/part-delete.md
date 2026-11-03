# Bỏ dòng phiếu và xóa mặt hàng chưa sử dụng

## Actor và phạm vi

Quản lý bỏ dòng phiếu nhập đang soạn hoặc xóa mặt hàng chưa sử dụng trong danh mục. Theo mục 5/6 business-workflows.md, không xóa lịch sử hoặc tự đảo giao dịch kho/tiền. Hàng đã phát sinh tiếp tục dùng Ẩn khỏi POS (không xóa hàng khỏi lựa chọn nhập hàng hoặc báo cáo).

## Luồng UI

- Phiếu chưa chốt: Xóa dòng dưới tên hàng bỏ dòng khỏi draft, tổng tiền tính lại; không gửi lệnh database.
- Danh mục Phụ tùng: Xóa mặt hàng → hiện tên và điều kiện xóa → đánh dấu xác nhận → server kiểm tra → loại khỏi danh mục sau thành công. Hủy trả focus về nút. Còn tồn bị chặn tại UI và DB; có lịch sử nhận lỗi hướng dẫn Ẩn khỏi POS.
- CommandForm giữ busy/error/uncertain, retry cùng request key, không báo thành công trước server. Danh sách/tổng cập nhật sau thành công. Không xóa tại bảng lịch sử hàng theo nhà cung cấp.

## Backend, dữ liệu và quyền

Migration `202611030003_part_delete.sql`: RPC `delete_part(payload,request_id)` chỉ quản lý hoạt động, kiểm tại server action và garage_actor. Nhận partId/version. Khóa catalog/metadata/request theo thứ tự đang dùng, khóa stock trước parts; kiểm version, tồn 0 và không có purchase_items/sales_order_items/repair_part_items/stock_movements/repair_quotes. FK và trigger khóa part khi tạo/sửa items báo giá bảo vệ cạnh tranh với xóa. Xóa parts, part_costs và stock_balances cùng transaction; giữ từ điển dùng chung, audit và request tạo hàng. FK part_creation_requests được bỏ để giữ ID lịch sử sau khi xóa, không xóa request; retry request tạo cũ không được tạo lại hàng.

Kết quả/idempotency và audit before trong cùng transaction. Retry cùng key trả kết quả, khác payload conflict; NOT_FOUND/version cũ/bị tắt/thiếu quyền bị chặn. Không cấp DELETE bảng cho client. Không ảnh hưởng kho/tiền vì chỉ xóa hàng chưa phát sinh, tồn 0.

## Tiêu chí và bằng chứng

Database kiểm tra hàng chưa sử dụng xóa được; retry/audit một lần; request tạo không mất; hàng có tồn/lịch sử/báo giá không xóa; rollback sau lỗi giữ toàn bộ dữ liệu; thiếu quyền/anon bị từ chối; cạnh tranh nhập/xóa và báo giá/xóa không sinh chứng từ mồ côi. Browser thao tác, bộ gõ, màn hình nhỏ chưa nghiệm thu. Lệnh và kết quả trong implementation-status.md/báo cáo bàn giao.

03/11/2026: `test:inventory` đạt 134 kiểm tra trên PostgreSQL cách ly (14 nhóm mới); unit 32 đạt, build/TypeScript và skills checker đạt. Dry-run đúng một migration `202611030003`, đã áp dụng production project liên kết. Metadata chỉ đọc xác nhận anon không EXECUTE delete_part; lock_quote_parts không mở cho anon/authenticated. Không tự xóa mặt hàng thật. Browser đăng nhập chưa thử.

Frontend đã deploy `dpl_F9uk3nA7ByisDLJVtJ4ViejzxyR8` READY với alias `https://dangkietmoto.vercel.app`. Không thực hiện giao dịch hoặc xóa thử trên production.
