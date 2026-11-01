# Sửa thông tin mặt hàng đã lưu

## Mục tiêu và phạm vi
- Quản lý sửa tên, nhóm và thương hiệu tại từng hàng trong `/parts`; không phải tạo lại mặt hàng hay nhập lại kho. Nhân viên bán hàng và thợ không được sửa.
- Dựa trên quy tắc danh mục/chứng từ snapshot trong `business-workflows.md`. Không thay giá, mã SKU, tồn, hiển thị POS hoặc thông tin phiếu đã chốt.

## Luồng và giao diện
- Phụ tùng & kho → Sửa thông tin ở dòng → form ba trường điền sẵn → Lưu thay đổi → chỉ đóng khi server xác nhận, thông báo và tải lại danh mục.
- Tên bắt buộc, tối đa 180 ký tự; nhóm và thương hiệu bắt buộc, tối đa 100 ký tự. Nhóm/thương hiệu có gợi ý từ danh mục; cho nhập giá trị mới. Chuẩn hóa khoảng trắng trên server.
- Trùng tên + thương hiệu theo chuẩn hóa hiện có: chặn ở client khi biết, DB chặn toàn danh mục. Không tự gộp hoặc ghi đè mặt hàng khác.
- Đang gửi/timeout: khóa form và nút đóng; giữ payload/request key khi retry. Lỗi validation/trùng giữ input để sửa. Xung đột phiên bản: giữ nội dung, người dùng đóng và mở bản mới sau tải lại; không âm thầm ghi đè.
- Nút Sửa nằm tại từng mặt hàng; form mở ở đầu danh mục và focus ô đầu tiên; đóng trả focus về nút mở nếu còn trên trang. Chỉ một form được mở tại một thời điểm. Responsive một cột trên điện thoại.

## Backend và bảo mật
- Migration nối tiếp `202611010003_part_details.sql`: thêm `parts.details_version` mặc định 1 và RPC `update_part_details(p_payload,p_request_id)`.
- Server action dùng session hiện tại, RPC kiểm tra live actor phải là manager. Không cấp quyền UPDATE trực tiếp bảng parts; function definer cố định search_path, anon không EXECUTE.
- Input partId/version/name/category/brand. CAS theo details_version; advisory khóa metadata và actor/request; idempotency so payload gốc trước CAS. Audit before/after trong cùng transaction.
- Cập nhật từ điển gợi ý sau khi sửa thành công; không xóa tên cũ hay đổi từ điển nguồn dùng chung. Index unique bảo vệ cả hàng ẩn/inactive.
- Không biến động kho/tiền và không sửa snapshot tên hàng trong phiếu nhập/bán/sửa cũ. Snapshot live/POS lấy tên mới cho giao dịch về sau.

## Tiêu chí và kiểm tra
- PostgreSQL cách ly: quyền manager/sales/tech/anon, khoảng trắng/giới hạn, duplicate, CAS và hai kết nối độc lập, idempotency, không thay tồn/giá/SKU/flag, giữ snapshot cũ, audit/từ điển, session hết hiệu lực.
- Typecheck/build/unit/skills checker theo kết quả bàn giao. Chưa nghiệm thu browser khi chưa có bằng chứng.
- Sau kiểm tra cách ly, áp dụng migration vào đúng Supabase ứng dụng đang dùng; chỉ đối chiếu metadata/tổng số, không sửa mặt hàng thật để test.

## Bằng chứng thực hiện 01/11/2026
- `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd test` (27 đạt), `npm.cmd run test:inventory` (87 đạt), `npm.cmd run skills:check`: đạt.
- Runner cách ly kiểm tra hai phiên sửa đồng thời và sửa metadata đồng thời nhập hàng cùng từ gợi ý; mọi thao tác metadata lấy khóa catalog chung trước khi khóa mặt hàng/từ điển để tránh đảo thứ tự với intake.
- Đối chiếu URL ứng dụng và project liên kết trùng nhau. Dry-run chỉ có `202611010003`; `db push --linked --yes` thành công và `migration list --linked` local/remote khớp đến migration này.
- Danh mục trước/sau cùng dấu vân tay `d00dd6f4e91b32ecce025c72bd024a8d`; giữ 2 mặt hàng, 3 phiếu nhập, 4 đơn bán, tổng tồn 2, tổng cash entries 10.230.050đ. Không sửa hàng thật hoặc tạo fixture để kiểm tra.
- Authenticated có quyền EXECUTE RPC nhưng không UPDATE trực tiếp tên hàng; anon không EXECUTE. Các hàng cũ được details_version mặc định 1.
- Chưa nghiệm thu browser có session hoặc deploy frontend lên Vercel. Các kiểm tra DB không chứng minh giao diện/focus/responsive đã được thử thực tế.
