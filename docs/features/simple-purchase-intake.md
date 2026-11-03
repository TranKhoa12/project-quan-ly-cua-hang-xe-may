# Nhập hàng gọn hơn

## Mục tiêu, actor và phạm vi

Quản lý nhập hàng theo mục 5 business-workflows.md. Rút gọn giao diện đang nối Supabase; không đổi hợp đồng RPC, quyền hoặc quy tắc kho/tiền. Chưa triển khai bản UI mới lên production.

## Luồng và dữ liệu

Chọn nhà cung cấp → tìm/chọn hàng hoặc tạo hàng mới → nhập số lượng, giá nhập, giá bán hàng mới → nhập số đã trả → chốt. Sửa/xóa nhà cung cấp thu gọn dưới mục Sửa / xóa. Hàng mới nhập tên, nhóm và thương hiệu trong form; giá bán chỉ nhập một lần tại dòng hàng. Tùy chọn tồn và xác nhận hàng tương tự giữ trong phần mở rộng.

Thanh toán bỏ lựa chọn Chưa trả/Đủ/Một phần: một ô Đã trả, mặc định trống tương đương 0, nút Trả đủ điền tổng hiện tại. Tổng thay đổi không tự tăng số đã trả; vượt tổng bị validation chặn. Phương thức chỉ hiện khi đã trả lớn hơn 0. Còn nợ tự tính; tổng do RPC kiểm tra lại. Giá bán hàng cũ hiển thị văn bản để đối chiếu. Nhãn số lượng và giá nhập luôn hiện, bỏ tiêu đề cột lặp.

## Trạng thái, quyền và lỗi

Ô nhập chữ khi gõ trong Nhập hàng (tìm hàng, tên hàng, nhóm, thương hiệu, tên nhà cung cấp mới/sửa) tự viết hoa chữ đầu mỗi từ. Giữ phần còn lại, chữ viết tắt, mã số và khoảng trắng; không đổi dữ liệu danh mục đã lưu khi chỉ chọn. Không chuyển chữ giữa phiên composition của bộ gõ; chuyển khi composition kết thúc. Dữ liệu state được đổi thật, không chỉ CSS; điện thoại/số lượng/giá không đổi.

Giữ empty/search-empty, validation số nguyên không âm, quantity tối thiểu 1, giá tối đa 1 tỷ, duplicate/similar, busy, lỗi quyền/hết phiên, retry cùng key khi chưa rõ kết quả. Thành công chỉ sau server trả kết quả; reset số đã trả về trống. Không lưu localStorage. Không đổi RLS, migration hoặc kho/tiền.

## Tiêu chí nghiệm thu

- Hàng cũ chỉ cần chọn, nhập số lượng và giá nhập; thấy giá bán cạnh đó.
- Hàng mới không phải nhập giá bán hai nơi.
- Trống Đã trả = chưa trả; Trả đủ điền tổng; nhập số khác = trả một phần; không vượt tổng.
- Màn hình nhỏ giữ nhãn, giá và nút xóa; tên dài xuống dòng.
- Backend từ chối/lỗi mạng không làm mất phiếu hoặc báo thành công giả.

Kiểm chứng: build/TypeScript và unit; browser thao tác, responsive và lỗi mạng chưa nghiệm thu. Không thay đổi backend nên không chạy lại bộ transaction/RLS cho riêng thay đổi UI này.
