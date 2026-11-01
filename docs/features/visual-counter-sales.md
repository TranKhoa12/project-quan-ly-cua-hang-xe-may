# Chọn phụ tùng trực quan tại quầy

## Mục tiêu và phạm vi
- Quản lý/nhân viên bán hàng chọn phụ tùng tại `/sales` bằng thẻ hình lớn thay vì chỉ danh sách chọn.
- Theo luồng bán tại quầy trong `business-workflows.md`. Tái sử dụng command bán đang có; chưa nghiệm thu browser.
- Chưa có ảnh sản phẩm trong dữ liệu. Hình SVG theo loại (lốp, dầu, bugi, ắc quy, truyền động, hộp chung) luôn ghi là minh họa; không xác nhận mẫu hàng hay fitment. Upload ảnh thật để sau.

## Luồng và trạng thái
- Bố cục POS: danh mục bên trái, giỏ hàng và thanh toán bên phải; cuộn danh mục/giỏ riêng trên desktop, xếp dọc trên điện thoại. Giỏ khởi tạo trống, có tăng/giảm/nhập số lượng và xóa từng hàng. Nút thanh toán khóa khi giỏ trống hoặc số lượng vượt tồn. Lịch sử đơn thu gọn dưới khu POS.
- Tải danh mục từ snapshot hiện có → tìm theo tên/mã/thương hiệu, lọc nhóm → bấm thẻ thêm vào đơn → sửa số lượng/xóa bằng trình sửa dòng hiện có → chốt và thu tiền.
- Bấm lại tăng số lượng, tối đa tồn hiển thị; hết tồn khóa thẻ. Danh mục trống và tìm không thấy có thông báo.
- Thẻ nằm trong fieldset của command: khóa khi đang gửi hoặc kết quả chưa rõ. Lỗi/retry và xác nhận thành công theo CommandForm hiện có.
- Hỗ trợ nút bàn phím, focus rõ, tên truy cập có tên/mã phụ tùng; hai cột thẻ trên điện thoại.
- Bố cục thu gọn 01/11/2026: giữ một tiêu đề h1 ở topbar của khung trang chung, bỏ khối tiêu đề/tài khoản lặp; bỏ dòng đồng bộ kỹ thuật, giữ nút tải lại; giảm padding/gap dùng chung. Phần chọn hàng đứng trước tên khách để tiếp cận sản phẩm sớm hơn. Các màn hình nghiệp vụ dùng AccessShell cùng hưởng khung thu gọn.

## Backend, dữ liệu và bảo mật
- Không migration, không thêm upload, không lưu nháp vào localStorage.
- Giá/tồn từ snapshot; server tiếp tục xác minh quyền, giá và tồn tại thời điểm chốt. Chọn thẻ chỉ sửa nháp, chưa tác động kho/tiền.
- Phần chọn hàng không thay luật kho/giá. Thanh toán đã được tách thành `sale-pos.tsx`; xem `pos-payment.md` cho migration ngân hàng/nháp, xác nhận nhận tiền và kết quả/in phiếu mới.

## Tiêu chí nghiệm thu và bằng chứng
- Browser chưa chạy: tìm/lọc đúng; thêm mới và tăng số lượng; hết hàng bị khóa; fieldset khóa trong lúc gửi; chốt/lỗi/retry; bố cục 375px/1440px.
- Kiểm tra tĩnh sau bố cục POS: `npm.cmd run typecheck` và `npm.cmd run build` đạt (01/11/2026). Không dùng các lệnh này làm bằng chứng nghiệm thu browser hoặc giao dịch DB.
