# Hàng từng nhập theo nhà cung cấp

## Mục tiêu và phạm vi

Quản lý chọn nhà cung cấp trong Nhập hàng để thấy bảng các mặt hàng đã nhập, theo mục 5 business-workflows.md. Bảng đọc toàn bộ lịch sử database theo supplier_id, không suy từ tên hoặc trang chứng từ hiện tại. Chưa triển khai production.

## Luồng và trạng thái

Chọn nhà cung cấp → tải bảng → xem hàng, tổng số lượng đã nhập, giá nhập lần gần nhất, giá bán hiện tại và ngày nhập theo Việt Nam → có thể thêm hàng vào phiếu. Hàng ngoài giới hạn danh mục chọn hiện tại vẫn xuất hiện nhưng không thêm nhanh. Thêm hàng không tự dùng giá nhập cũ: người dùng nhập giá thực tế của lần mới. Bảng phân trang 20 hàng, mới nhất trước, tên/ID làm thứ tự ổn định. Đổi nhà cung cấp reset trang và bỏ response cũ đang về; không xóa các dòng phiếu đang soạn. Loading/empty/error và nút thử lại riêng; không hiển thị empty khi lỗi. Chốt nhập thành công reset lựa chọn nên lần chọn tiếp theo truy vấn mới.

## Backend và bảo mật

Server action `loadSupplierItems` và RPC `supplier_purchase_items(uuid,integer)` đều chỉ cho quản lý. RPC dùng garage_actor kiểm tra session đang hoạt động, security definer cố định search_path, không cấp quyền bảng, anon không EXECUTE. Migration `202611030002` thêm RPC và index lịch sử. Trả `{items,total}`; tổng tính trên toàn lịch sử, mỗi part_id một dòng. Lần nhập gần nhất theo created_at/code/ID; lấy unit_cost thực tế, không dùng giá vốn bình quân. Tên/giá bán từ danh mục hiện tại. Không ghi kho/tiền, không cần idempotency cho truy vấn chỉ đọc. NOT_FOUND/VALIDATION_ERROR/FORBIDDEN và lỗi mạng hiển thị qua thông báo tiếng Việt.

## Nghiệm thu

- Nhà cung cấp chưa nhập có trạng thái trống rõ ràng.
- Hai lần nhập cùng hàng gộp số lượng, lấy đúng giá lần mới; không trộn nhà cung cấp khác.
- Trên 20 mặt hàng phân trang không lặp hoặc mất hàng.
- Bán hàng, thợ và anon không đọc được giá nhập qua RPC.
- Browser cần kiểm tra đổi nhà cung cấp nhanh, lỗi/retry, thêm hàng và màn hình nhỏ; chưa chạy.

03/11/2026: theo yêu cầu khắc phục lỗi tải bảng, đã xác nhận migration thiếu và áp dụng `202611030002` lên project liên kết. Metadata read-only xác nhận RPC tồn tại và anon không EXECUTE. Không tạo dữ liệu thử production. Chưa kiểm tra bảng trong browser đăng nhập. Kết quả lệnh được ghi trong implementation-status.md.
