# Nhập hàng thống nhất và ẩn khỏi POS

## Mục tiêu, actor và quyền
- Quản lý dùng một điểm vào Nhập hàng: chọn hàng có sẵn hoặc thêm mặt hàng mới ngay trong phiếu.
- Bỏ nút tạo phụ tùng riêng ở Phụ tùng & kho; giữ tra cứu, giá bán, kiểm kê và bật/tắt hiển thị POS.
- Giữ quyền hiện tại: chỉ quản lý nhập hàng và đổi hiển thị, nhân viên bán hàng chỉ bán hàng được phép hiển thị. Không thêm trạng thái ngừng kinh doanh trong phạm vi này.
- Nguồn nghiệp vụ: mục 4/5 trong `business-workflows.md`. Chưa nghiệm thu browser.

## Luồng và dữ liệu
- Giao diện rút gọn: một ô tìm mặt hàng dùng chung, bấm kết quả để thêm; chọn lại hàng đã có trong phiếu tăng số lượng thay vì tạo dòng trùng. Danh sách nhập gọn gồm tên/số lượng/giá nhập/thành tiền/xóa.
- Chỉ mở một form hàng mới khi cần; sửa metadata qua nút Sửa ở dòng. Ngưỡng tồn và xác nhận hàng tương tự nằm trong Tùy chọn thêm. Chưa tạo bản ghi cho đến khi chốt.
- Thêm nhà cung cấp ngay cạnh ô chọn, sau khi server xác nhận thì tự chọn nhà cung cấp vừa tạo.
- Thanh toán chọn Chưa trả (mặc định giữ hành vi cũ), Đã trả đủ hoặc Trả một phần. Chỉ hiện số tiền nhập tay khi trả một phần, chỉ hiện phương thức khi có trả. Tổng nhập và khoản còn nợ luôn hiện rõ.
- Lịch sử phiếu nhập và lịch sử kho thu gọn dưới phần nhập. Enter trong ô tìm không chốt phiếu.
- Chọn nhà cung cấp → thêm dòng hàng đã có hoặc mặt hàng mới (tên, nhóm, thương hiệu, giá bán, ngưỡng tồn) → số lượng/giá nhập → đã trả/phương thức → chốt.
- Dòng mới chỉ là dữ liệu form cho đến khi server chốt; hủy/xóa dòng không tạo danh mục hay biến động kho.
- Khi chốt, tạo danh mục và từ điển gợi ý, phiếu nhập, tăng tồn, giá vốn bình quân, thu/chi và phải trả trong cùng transaction. Lỗi bất kỳ bước nào rollback toàn bộ. Không nhập giá vốn tham khảo riêng cho hàng mới.
- Giữ kiểm tra trùng tên/thương hiệu và nhắc tên gần giống; trường hợp tương tự cần xác nhận rõ. Tên, nhóm, thương hiệu gợi ý từ từ điển hiện có và các hàng trong kho.
- Thành công server xác nhận rồi mới xóa form và tải dữ liệu; lỗi giữ input. Timeout khóa sửa, retry nguyên key/payload, không tạo key mới khi kết quả chưa rõ.

## Ẩn khỏi POS
- Cột `parts.pos_visible`, mặc định true cho hàng đang có. Không đổi `active`, tồn, giá vốn hay chứng từ.
- Quản lý Ẩn/Hiện tại danh mục, hiển thị trạng thái và lọc được hàng đã ẩn. Hàng ẩn vẫn được chọn nhập kho và dùng sửa chữa.
- Catalog POS bỏ hàng ẩn. Giỏ nháp cũ vẫn hiển thị dòng để xóa nhưng khóa thanh toán nếu có hàng ẩn. RPC kiểm tra lại hiển thị dưới khóa; không chỉ ẩn ở giao diện.
- Đã bán rồi ẩn: phiếu cũ và retry của giao dịch đã thành công vẫn đọc được.

## Hợp đồng backend và bảo mật
- Migration nối tiếp `202611010002_unified_purchases.sql`, không sửa migration đã áp dụng.
- `purchase_intake`: payload gốc có lines; dòng hoặc partId có sẵn hoặc newPart; quantity/cost, supplierId/paid/method. Idempotency theo actor/request UUID so sánh toàn payload gốc. Giao dịch nhập bên trong dùng UUID dẫn xuất riêng, không ghi lặp khi retry.
- `part_visibility`: partId, expected boolean, visible boolean; manager/session guard, CAS, audit và idempotency. Khóa stock trước parts để cùng thứ tự với core.
- RPC/helper cũ không mở thêm quyền; wrapper snapshot bổ sung flag giữ nguyên giới hạn dữ liệu/quyền. Client không ghi trực tiếp bảng parts.

## Tiêu chí và kiểm tra
- PostgreSQL cách ly: tạo mới + nhập, phiếu hỗn hợp, retry/conflict, trùng/tương tự, rollback giữa chừng, phân quyền, ẩn/hiện/CAS, hàng ẩn vẫn nhập và giữ lịch sử, từ chối bán trực tiếp, retry đã chốt sau ẩn.
- Typecheck, unit, inventory runner, build và skills checker theo kết quả thực tế khi bàn giao.
- Browser: chưa chạy cho đến khi có bằng chứng; cần thử form, tìm/gợi ý/trùng, xóa dòng mới, lỗi/retry, 375px/1440px và nhiều phiên.
- Không seed/test giao dịch trên production. Áp dụng migration sau khi kiểm tra cách ly; đối chiếu số chứng từ/tổng tồn trước và sau.

## Kết quả thực hiện 01/11/2026
- `npm.cmd run typecheck`, `npm.cmd test` (27 đạt), `npm.cmd run test:inventory` (71 đạt), `npm.cmd run build`, `npm.cmd run skills:check`: đạt. Runner PostgreSQL cách ly không đọc `.env` hoặc tạo fixture trong production.
- Migration `202611010002` đã áp dụng vào Supabase project liên kết của ứng dụng sau dry-run chỉ liệt kê đúng migration mới. `migration list --linked` xác nhận local/remote khớp.
- Trước/sau giữ nguyên: 2 phụ tùng, 3 phiếu nhập, 4 đơn bán, 4 cash entries, 9 biến động kho, tổng tồn 2 và tổng cash entries 10.230.050đ. Không tạo giao dịch mẫu, không đổi tài khoản ngân hàng, không tự ẩn hàng thật.
- Cả hai mặt hàng hiện hữu mặc định hiển thị POS. Authenticated được đọc flag nhưng không UPDATE trực tiếp; các helper wrapper cũ không mở EXECUTE cho client.
- Chưa kiểm tra browser có đăng nhập, chưa deploy frontend lên Vercel. Cần thử nhập mới/chọn cũ, bộ lọc và ẩn/hiện trên UI trước nghiệm thu vận hành.
- Lần rút gọn UI tiếp theo: typecheck và build đạt; không thêm migration hoặc đổi RPC. Giữ kiểm tra trùng, khóa form/retry khi chưa rõ kết quả. Chưa kiểm tra browser cho các thao tác tìm/chọn/tăng số lượng, editor hàng mới, tự chọn nhà cung cấp và ba lựa chọn thanh toán; 71 kiểm tra DB ở trên thuộc lần triển khai migration trước, không chạy lại chỉ cho thay đổi bố cục này.
