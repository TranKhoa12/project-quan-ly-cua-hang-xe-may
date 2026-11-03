# Xóa nhà cung cấp chưa phát sinh

## Mục tiêu và phạm vi

Quản lý xóa nhà cung cấp tạo nhầm, chưa có phiếu nhập. Nhà cung cấp có phiếu nhập không được xóa. Không thay đổi kho, tiền, công nợ hoặc snapshot chứng từ. Nguồn: mục 5 business-workflows.md. Trước thay đổi chỉ có tạo/sửa; bản sửa chưa triển khai production.

## Luồng và giao diện

Nhập hàng → chọn nhà cung cấp → Sửa → Xóa nhà cung cấp → đánh dấu xác nhận → gửi → server xác nhận → bỏ lựa chọn, gỡ khỏi danh sách và báo thành công. Quay lại giữ thông tin sửa. CommandForm khóa khi gửi, hiện lỗi, giữ request key khi mất mạng và cho kiểm tra lại cùng yêu cầu. Tên dài xuống dòng theo vùng form. Chưa nghiệm thu browser/bàn phím/responsive.

## Backend và bảo mật

`delete_supplier(payload,request_id)` nhận supplierId và details_version qua trường version. Chỉ quản lý có session hoạt động; server action và RPC cùng kiểm quyền. Khóa request theo actor/key, kiểm tra payload retry, khóa dòng nhà cung cấp, kiểm version, từ chối SUPPLIER_IN_USE nếu có phiếu. FK bảo vệ cả giao dịch nhập đồng thời. Xóa, audit before và kết quả idempotency trong một transaction. Không cấp quyền DELETE bảng cho client. Migration `202611030001_supplier_delete.sql` nối tiếp hiện có.

## Tiêu chí nghiệm thu

- Nhà cung cấp chưa có phiếu được xóa, mất khỏi lựa chọn; audit một lần kể cả retry.
- Có phiếu nhập, version cũ, ID không tồn tại, key đổi payload đều bị từ chối.
- Bán hàng, thợ, ẩn danh không gọi được RPC.
- Lỗi không làm mất draft nhập hàng; không báo thành công trước server.

`npm.cmd run test:inventory`: 115 kiểm tra đạt trên PostgreSQL cách ly, bao gồm 5 nhóm kiểm tra xóa nhà cung cấp. `npm.cmd run build`: đạt, bao gồm TypeScript. Chưa áp dụng migration production, chưa deploy và chưa nghiệm thu browser. Runner dùng Auth schema tối thiểu, không thay kiểm thử JWT/HTTP thật.
