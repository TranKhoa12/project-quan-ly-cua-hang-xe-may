# Thiết kế lại màn hình nhập hàng

## Mục tiêu, actor và nguồn tham khảo

Quản lý cần chọn hàng và nhập số lượng/giá nhanh, không phải đi qua nhiều bảng nối tiếp. Giữ quy trình mục 5 business-workflows.md và toàn bộ RPC kho/tiền hiện tại. Tham khảo hướng dẫn công khai chính thức, không sao chép nhãn hiệu hoặc giao diện nguyên bản:

- [KiotViet: Tạo phiếu nhập hàng](https://www.kiotviet.vn/huong-dan-su-dung-kiotviet/huong-dan-nhap-hang/tao-phieu-nhap-hang/): tìm/chọn hàng, sửa dữ liệu dòng và thêm nhanh hàng mới.
- [Sapo: Thao tác nhập hàng](https://help.sapo.vn/thao-tac-nhap-hang-tren-phan-mem-quan-ly-ban-hang-sapo): chọn nhà cung cấp, hàng nhập và thanh toán tại màn hình tạo phiếu.

## Luồng và giao diện

Desktop: khung trái tìm/chọn hàng và danh sách dòng phiếu; khung phải sticky gồm nhà cung cấp, tổng, đã trả/còn nợ và nút Xác nhận nhập kho. Mobile: nhà cung cấp lên đầu, hàng nhập tiếp theo, thanh toán và xác nhận ở cuối. Không lồng thẻ main trong main của ứng dụng.

Chưa chọn nhà cung cấp: hiển thị tối đa 6 hàng chọn nhanh. Chọn nhà cung cấp: tự tải lịch sử của họ trong danh sách cuộn gọn có phân trang. Gõ tìm kiếm: kết quả từ danh mục hiện tại; xóa tìm để quay lại hàng của nhà cung cấp. Bấm + thêm dòng hoặc tăng lượng nếu đã có; con trỏ chuyển tới số lượng. Nhập số lượng, giá nhập và giá bán hàng mới trực tiếp tại dòng. Giá bán hàng cũ chỉ đọc. Giá nhập lần trước chỉ để đối chiếu, không tự điền giá thực tế.

Hàng mới mở editor hiện hữu, gợi ý/chống trùng và xác nhận hàng tương tự giữ nguyên. Nhà cung cấp thêm/sửa/xóa giữ RPC hiện hữu và mở form riêng ngoài form phiếu, không lồng form. Xóa dòng chỉ thay draft. Đổi nhà cung cấp giữ các dòng đã chọn; không tự thay giá. Giới hạn 100 dòng và giới hạn danh mục hiện tại giữ nguyên.

## Dữ liệu, quyền và trạng thái

Payload `purchase_intake` giữ nguyên: supplierId, paid, method, lines với quantity/cost và partId hoặc newPart. Không thay migration, giá vốn, stock hoặc quyền. CommandForm thêm submitPanel tùy chọn để đặt phần xác nhận cạnh danh sách, cùng fieldset nên busy/uncertain khóa toàn bộ nội dung. Empty/loading/history error/retry/known error/uncertain giữ nguyên, không có localStorage hoặc báo thành công giả. Xác nhận bị khóa khi chưa có nhà cung cấp/hàng hoặc form phụ chưa hoàn tất. Native validation kiểm tra số nguyên và đã trả không vượt tổng.

## Nghiệm thu và kiểm chứng

`npm.cmd run test:purchase-ui` dựng bundle từ component/CSS thật trong headless Edge, chỉ thay router và server actions bằng dữ liệu tổng hợp. Không đọc .env, không kết nối Supabase/production. Kiểm tra empty, đổi NCC nhanh bỏ response cũ, lịch sử/retry/phân trang, thêm hàng/focus/tổng, thanh toán đủ/một phần/chưa trả, chặn vượt tổng, lỗi nghiệp vụ giữ phiếu, uncertain retry đúng key/payload và reset sau thành công, hàng mới/viết hoa, xóa dòng, tìm không có kết quả, tên dài và bố cục 1440/768/375px. Ảnh ở `.browser-test/purchase/` đã ignore.

Đây là UI harness, không phải E2E với Auth/Server Action thật và không chứng minh RLS hoặc transaction. Backend không đổi trong lần thiết kế lại này; bằng chứng database trước đó vẫn riêng biệt. Unit/build/TypeScript/skills checker và kết quả triển khai được ghi trong implementation-status.md.

03/11/2026: UI 16 nhóm đạt, unit 32 đạt, build gồm TypeScript và skills checker đạt. Đã xem ảnh desktop/mobile. Vercel `dpl_AsbyEyKTEkf4LTi5T2Q8Eqtr8cz3` READY với alias production `https://dangkietmoto.vercel.app`. Chưa thử nhập kho thật bằng browser đăng nhập.
