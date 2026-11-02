# Phiếu bán hàng tại quầy A5/A4

## Phạm vi
- Quản lý/nhân viên bán hàng in sau chốt hoặc từ lịch sử đơn. Người dùng chọn giấy A5/A4, mặc định A5; không thêm máy in nhiệt trong lần này.
- Một mẫu dùng chung: tên/địa chỉ/điện thoại cửa hàng từ snapshot, số BH, thời gian Việt Nam gồm giờ/phút, khách, người bán nếu đã lưu, bảng STT/tên/SL/đơn giá/thành tiền, tổng số lượng/tổng tiền/đã thu, bằng chữ, tiền khách đưa/tiền thừa khi có dữ liệu server, phần ký và lời cảm ơn.
- Không invent số điện thoại/địa chỉ khách, thuế, giảm giá, bảo hành hoặc mã SKU lịch sử chưa có snapshot. Không gọi phiếu là hóa đơn thuế.

## UI và in
- Portal vùng in trực tiếp vào body để không bị cắt bởi khung cuộn, fieldset disabled hoặc sidebar; CSS chỉ in vùng này, tách toàn bộ form/nút/giá vốn khỏi phiếu.
- Chờ font trước khi mở hộp thoại in, cleanup sau afterprint; chọn A5/A4 sinh @page tương ứng. Header bảng lặp qua trang, hạn chế cắt dòng/tổng/ký, tên dài xuống dòng.
- Lịch sử có hàng trả ghi rõ đây là số tiền bán gốc, không trừ/ghi lại chứng từ cũ; đối chiếu chứng từ hoàn tiền riêng.

## Dữ liệu và quyền
- Migration nối tiếp `202611020001_sale_receipt.sql`: snapshot tên người bán lúc tạo sales_orders qua trigger private; lưu cash_received từ payload đã được core xác minh trong cùng transaction. Số dư/ledger không đổi cách tính.
- Wrapper command cập nhật receipt trả về và completed draft cùng transaction. Snapshot lịch sử và helper receipt cùng lấy các cột đã lưu. Chứng từ cũ để null phần chưa có, không backfill bằng tên nhân viên hoặc tiền khách đưa hiện tại.
- Không mở quyền ghi bảng trực tiếp; helper/trigger/core cũ không EXECUTE client. Giữ các guard RLS/session/role hiện có. Không có giá vốn trên phiếu.

## Nghiệm thu
- Unit: chữ tiền VND, giới hạn và mốc ngày/giờ Việt Nam. PostgreSQL cách ly: snapshot nhân viên/tiền khách, retry/reload, phiếu lịch sử, chuyển khoản/tiền mặt, rollback và quyền helper.
- Typecheck/build/tests/skills checker; kiểm tra mẫu giấy A5/A4, nhiều dòng, tên dài và số lớn bằng dữ liệu tổng hợp, không tạo đơn thật để thử.
- Áp dụng migration vào project ứng dụng sau kiểm tra, đối chiếu dữ liệu cũ trước/sau. Chưa kết luận in máy thật nếu chưa thực hiện.

## Bằng chứng 02/11/2026
- `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd test` (31 đạt), `npm.cmd run test:inventory` (110 đạt), `npm.cmd run skills:check`: đạt.
- `node scripts/preview-sale-receipt.mjs`: 4 PDF đạt bằng React component/CSS thực tế, dữ liệu tổng hợp và Edge headless với profile tạm riêng. A5 ngắn, A4 ngắn và A5 số tiền lớn đều 1 trang; A5 30 tên dài là 5 trang, lặp header và có BH/số trang mỗi trang. Văn bản sidebar/giá vốn thử không xuất hiện trong PDF. Đã render Poppler và xem PNG để kiểm tra tràn, cắt, dấu tiếng Việt, số lớn, trang đầu/cuối.
- Đã sửa chiều cao td 68px kế thừa từ globals khiến bản A5 ngắn bị sang trang, tách CSS riêng cho receipt.
- Profile/PDF/HTML thử trong `tmp/pdfs/` được ignore, không phải dữ liệu giao dịch thật; harness không đọc `.env` hoặc tạo phiếu DB. Có thể đặt `RECEIPT_BROWSER` nếu executable Chromium nằm ở vị trí khác; cần Poppler `pdftotext`.
- Xác nhận project `.env.local` trùng CLI liên kết. Dry-run chỉ có `202611020001`; push thành công; local/remote khớp đến migration này.
- Trước/sau giữ 5 đơn bán, 5 payments, 5 cash entries, tổng cash 10.290.050đ, tổng tồn 1. Dấu vân tay dữ liệu cũ sales_orders (trừ hai cột mới) giữ `a3dbc61075dad797af465b4502387db3`. Cả 5 phiếu cũ để null hai cột, không gán lại thông tin hiện tại.
- Helper wrapper cũ và trigger không mở EXECUTE cho authenticated; không mở UPDATE trực tiếp sales_orders.
- Chưa thử click/hủy hộp thoại in trong phiên đăng nhập, máy in vật lý hoặc deploy frontend Vercel. Các PDF chứng minh bố cục bản in, không chứng minh toàn bộ luồng giao diện đã nghiệm thu.
