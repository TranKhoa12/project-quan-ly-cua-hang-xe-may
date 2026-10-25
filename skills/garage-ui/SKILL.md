---
name: garage-ui
description: Build or revise Vietnamese management screens, forms, workflow states, configurable shop identity and printable receipts in this repository. Use for UI implementation and interaction design.
---

# Quy trình xây dựng giao diện

Đọc `docs/ui-process.md`; với trạng thái nghiệp vụ đọc phần tương ứng trong `docs/business-workflows.md`.

1. Liệt kê actor và tác vụ chính. Vẽ luồng danh sách → tạo/chi tiết → xác nhận → kết quả, gồm bước quay lại và thao tác khi có lỗi.
2. Lập các trạng thái giao diện: đang tải, chưa có dữ liệu, không có kết quả, sẵn sàng, đang gửi, lỗi trường, lỗi nghiệp vụ, hết phiên, không đủ quyền. Chỉ hiện trạng thái có ý nghĩa đối với tính năng.
3. Dùng tên cửa hàng từ cấu hình đã lưu; draft chưa lưu không thay thương hiệu toàn ứng dụng. Tên tài khoản lấy từ session khi có Auth, không lấy từ tên cửa hàng. Mẫu in dùng snapshot của chứng từ khi backend hỗ trợ.
4. Form hiển thị đơn vị, trường bắt buộc, số tiền còn nợ/tồn khả dụng. Thao tác hủy, trả hoặc điều chỉnh trình bày lý do và tác động cụ thể. Khóa nút lúc gửi nhưng vẫn cần chống lặp ở server.
5. Không dùng quyền ẩn menu làm rào bảo mật. Không nhận thành công giả, không fallback localStorage khi RPC lỗi. Hiển thị xung đột tồn hoặc trạng thái bằng dữ liệu được tải lại.
6. Tách feature/form/hook khi thêm nghiệp vụ; giữ bố cục, bảng và dialog dùng chung. Không thêm form chỉ có giao diện rồi gọi là tính năng hoàn chỉnh.
7. Kiểm tra bàn phím, focus dialog, tên truy cập cho icon, màn hình nhỏ, tên dài và bản in. Ghi rõ nếu không có công cụ kiểm tra trình duyệt.

Đầu ra: sơ đồ luồng hoặc đặc tả màn hình, UI có đủ trạng thái trong phạm vi, liên kết hợp đồng backend và bằng chứng kiểm tra. Chỉnh chữ nhỏ không cần đặc tả nhiều trang.
