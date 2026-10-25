# Quy trình thiết kế và triển khai giao diện

## Từ nghiệp vụ đến màn hình

1. Xác định actor, mục tiêu và ranh giới trong `business-workflows.md`.
2. Đặc tả đường đi chính và ngoại lệ: danh sách/tìm → tạo hoặc chi tiết → thao tác → xác nhận → kết quả. Một bước thay đổi tiền/kho phải cho biết tác động trước khi xác nhận.
3. Ghi field, kiểu dữ liệu, bắt buộc, giá trị mặc định, validation và quyền xem/sửa. Tách các tổng tiền do server tính khỏi input khách gửi.
4. Định nghĩa từng trạng thái UI trong bảng dưới, gắn mã lỗi backend tại `backend-process.md`.
5. Triển khai theo feature; dùng chung các thành phần bảng, field, dialog, trạng thái và định dạng tiền/ngày. Bố cục hiện tại dùng CSS thuần và lucide-react; không giả định đã có Tailwind/shadcn.
6. Kết nối backend, kiểm thử và cập nhật hiện trạng. Khi làm prototype độc lập phải đánh dấu demo rõ ràng.

## Trạng thái và phản hồi

| Tình huống | Hành vi yêu cầu |
| --- | --- |
| Tải lần đầu | Skeleton/loading có tên truy cập; không hiển thị số liệu 0 giả |
| Chưa có dữ liệu | Nêu chưa có gì và nút tạo theo quyền |
| Tìm không có kết quả | Giữ bộ lọc, cho xóa bộ lọc; khác trạng thái dữ liệu trống |
| Đang gửi | Nút khóa, thông báo đang xử lý, không mất input |
| Field sai | Lỗi tại trường, nêu cách sửa, chuyển focus phù hợp |
| Thiếu quyền/hết phiên | Chặn thao tác, nêu cách tiếp tục; không fallback demo |
| Xung đột tồn/version | Nêu dữ liệu đã đổi, tải bản mới; không tự chốt lại khi khách chưa xem thay đổi |
| Timeout chưa rõ kết quả | Tra cứu bằng idempotency key trước retry; không tạo key mới ngay |
| Thành công | Hiện mã chứng từ và dữ liệu server trả; cập nhật danh sách/số dư |

## Các màn hình nghiệp vụ cần phát triển

| Module | Màn hình/luồng chính | Ngoại lệ bắt buộc |
| --- | --- | --- |
| Auth | Đăng nhập, quên mật khẩu, hết phiên | Tài khoản tắt, chưa được cấp role |
| Cài đặt | Draft thông tin cửa hàng, lưu, xem mẫu in | Tên dài/rỗng, không đủ quyền, conflict version |
| Khách/xe | Tìm, khách mới, thêm xe, lịch sử | Biển số trùng, khách nhiều xe |
| Sửa chữa | Tiếp nhận, chẩn đoán, báo giá phiên bản, duyệt, xuất dùng, QC, thu, bàn giao | Khách từ chối, thiếu hàng, phát sinh, hủy, trả vật tư |
| Bán tại quầy | Giỏ, chọn khách, giảm giá theo quyền, chốt, thu, in | Tồn thay đổi, mạng lỗi, trả hàng, bán chịu |
| Nhập hàng | Nhà cung cấp, phiếu nháp, kiểm đếm, chốt, thanh toán | Giá/số lượng sai, nhận thiếu, trả hàng |
| Kho | Số dư, giữ hàng, lịch sử, kiểm kê, duyệt chênh lệch | Xuất trong lúc kiểm kê, hàng lỗi |
| Tài chính | Thu/chi, hoàn, công nợ, đối soát ca | Thu vượt dư nợ, hoàn vượt giới hạn, chứng từ bị khóa |
| Nhân viên | Cấp tài khoản, gán quyền, vô hiệu hóa | Chặn tự tăng quyền, bảo vệ quản lý cuối cùng |

## Nhận diện và khả năng sử dụng

- Tên sản phẩm MotoCare và tên cửa hàng là hai giá trị khác nhau. Không giả định tên cửa hàng là Minh Phát hoặc tên người quản lý.
- Bản demo dùng `src/lib/store-settings.ts`; draft và cấu hình đã lưu độc lập. Production phải chuyển sang dữ liệu cấu hình phía server; localStorage không làm nguồn tin cậy.
- Tiền dùng VND có phân cách; ngày rõ định dạng và múi giờ. Field giá/qty có đơn vị; biển số không dùng làm khóa chính.
- Kiểm tra tối thiểu ở 375px và 1440px; bảng rộng cuộn trong vùng riêng, không làm vỡ trang; tên 100 ký tự không đè nút.
- Hỗ trợ bàn phím, nhãn input, lỗi đọc được, focus trap và trả focus khi đóng dialog. Không chỉ dùng màu để báo lỗi/trạng thái.
- Mẫu in có tên/điện thoại/địa chỉ cửa hàng, mã phiếu, ngày, khách/xe, dòng công/phụ tùng, tiền và thanh toán; không in navigation, nút thao tác hoặc dữ liệu giá vốn của quản lý trên phiếu khách.

Nghiệm thu màn hình phải có bằng chứng browser hoặc ghi rõ chưa kiểm tra; HTTP 200 chỉ chứng minh route phản hồi.
