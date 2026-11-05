# Bố cục xem đơn đã bán

- Người bán/quản lý chuyển giữa Bán hàng và Đơn đã bán bằng hai nút ở đầu trang `/sales`; URL `view=history` giữ lựa chọn khi reload/phân trang, mặc định Bán hàng. POS đã mở được giữ mounted khi đổi view để không mất draft/yêu cầu thanh toán; không sửa RPC thanh toán.
- Danh sách mới nhất trước, 50 đơn/trang theo snapshot hiện có. Mã, khách, thời gian, phương thức, tổng tiền bán gốc và ghi chú có hàng trả; nút Xem đơn mở phiếu, chọn khổ A5/A4 và in bằng component cũ.
- Tìm mã/tên khách và lọc phương thức chỉ trong các đơn của trang hiện tải; scope hiện rõ, không tuyên bố tìm toàn bộ database. Trước/Sau giữ view history; chưa bổ sung tìm kiếm server hoặc khoảng ngày.
- Nhận trả/hoàn tiền chỉ quản lý, giữ nguyên command, min/max và xác nhận hàng còn bán được. Phiếu có hàng trả vẫn ghi tổng gốc, không gán nhầm doanh thu ròng.
- Empty, không khớp bộ lọc, biên phân trang; xem chi tiết có focus tiêu đề, quay lại trả focus nút mở. Desktop bảng dòng; mobile thẻ. Không có schema/migration/kho/tiền mới.
- Kiểm chứng cần: tab dễ thấy, draft không unmount, tìm/lọc/phân trang, chi tiết/in, role ẩn nhận trả, responsive. Harness dùng server mock không thay browser Auth/transaction thật.
- Thời gian đơn hiển thị cả giờ/phút theo Asia/Ho_Chi_Minh. `node tests/browser/sales-history.mjs`: 7 nhóm pass trên Edge cách ly, gồm giữ giỏ, URL/pager, lọc, focus/in, role và 1440/900/375px. Build (gồm TypeScript) và skills checker pass; không gọi lệnh tiền/kho production để test.
