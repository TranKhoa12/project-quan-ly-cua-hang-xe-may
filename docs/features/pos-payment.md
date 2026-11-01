# Thanh toán POS và khôi phục nháp

## Mục tiêu và phạm vi
- Quản lý/bán hàng: thanh toán tại quầy, biết rõ kết quả, lấy phiếu ngay và khôi phục sau tải lại/mất mạng.
- Theo phần bán tại quầy trong `business-workflows.md`. Đã triển khai mã nguồn và kiểm tra migration `202611010001` trên PostgreSQL cách ly; đã áp dụng vào Supabase ứng dụng đang dùng ngày 01/11/2026 theo yêu cầu người dùng, chưa browser verified.
- Có tài khoản ngân hàng cấu hình, QR VietQR theo số tiền, tiền khách đưa/tiền thừa, xác nhận nhận đủ tiền. Không tự đối soát ngân hàng, không thêm bán chịu hoặc giảm giá.

## Luồng và trạng thái
- Mỗi nhân viên một nháp trên server. Tải lại hoặc quay về POS khôi phục nháp của chính actor. Lưu sau 500ms; hiển thị lưu/chưa lưu/lỗi. Khi nháp chưa lưu xong có cảnh báo rời trang; không lưu nghiệp vụ vào localStorage.
- `editing` → `pending` bằng prepare (revision kỳ vọng, request UUID, payload bất biến) → `completed` cùng transaction chốt đơn/thu tiền/xuất kho.
- Tiền mặt: nhập tiền thực nhận không nhỏ hơn tổng, tính tiền trả; xác nhận nhận đủ. Chuyển khoản: hiện tài khoản/QR; nhân viên đối chiếu tiền vào và xác nhận thủ công. Mỗi lần sửa đơn/phương thức phải xác nhận lại.
- Enter trong input không chốt đơn; chỉ nút xác nhận thanh toán mới gửi yêu cầu.
- Pending khóa sửa và tạo đơn khác; retry giữ nguyên request/payload. Kiểm tra kết quả: nếu đã ghi nhận thì khôi phục phiếu; nếu chưa ghi nhận thì mở nháp và vô hiệu hóa yêu cầu POS cũ đến muộn.
- Thành công hiển thị ngay cạnh nút thanh toán: số BH, số tiền, phiếu server, In phiếu, Bán đơn mới. Không xóa kết quả trước khi người dùng chọn đơn mới.
- Không thông báo thành công khi chưa nhận được receipt server. Mạng lỗi/timeout giữ pending và các nút kiểm tra/retry ngay trong giỏ.

## Giao diện
- `/sales`: hai cột POS, phần phản hồi nằm trong checkout, phiếu có tên/điện thoại/địa chỉ snapshot, dòng hàng, tổng, phương thức. Không có giá vốn trên phiếu.
- `/settings`: quản lý nhập bốn trường ngân hàng: mã/BIN, tên ngân hàng, số tài khoản, chủ tài khoản. Nhập đủ hoặc xóa cả bốn; CAS theo version chung; thay đổi có audit/idempotency.
- QR tải khi bấm Hiện mã QR, qua Quick Link của VietQR (`https://www.vietqr.io/qr-dong`); gửi tài khoản, số tiền và mã tham chiếu ngẫu nhiên, không gửi tên khách/giỏ hàng. Lỗi ảnh có thông báo và vẫn có thông tin chuyển khoản bằng chữ. QR không xác minh tiền vào.

## Backend, kho/tiền và bảo mật
- Migration nối tiếp, không sửa migration đã áp dụng. Thêm bank fields trong store_settings và bảng pos_drafts bật RLS, không grant trực tiếp anon/authenticated.
- `garage_pos_draft(load/save/prepare/resume/clear)` kiểm tra live actor/role và khóa advisory theo actor. Revision tăng đơn điệu, kể cả sau clear; tab cũ không ghi đè nháp.
- `garage_command` wrapper: bank_settings chỉ manager; sale bắt buộc receivedConfirmed; cashReceived >= tổng payload (giá/số lượng sau đó được core xác minh với DB). Core cũ bị thu hồi execute cho client; RPC wrapper giữ nguyên server validation/lock/idempotency/rollback cho kho/tiền.
- POS payload phải trùng pending/completed request của actor. Giữ nguyên thứ tự khóa actor → idempotency → transaction core. Publish phiếu và completed trong cùng transaction.
- Không kết nối ngân hàng; receivedConfirmed là xác nhận của nhân viên, không phải bằng chứng chuyển tiền tự động.
- Một nháp/actor: nhiều tab cùng nhân viên sẽ phát hiện conflict; chưa hỗ trợ nhiều đơn nháp song song.

## Tiêu chí nghiệm thu và bằng chứng
- PostgreSQL native cách ly: 52 kiểm tra đạt, gồm retry, last-item concurrency, rollback, quyền ngân hàng/nháp/helper, cash thiếu/thiếu xác nhận, reload pending/completed, tab cũ, delayed request, clear và tài khoản bị tắt. Không dùng production hay `.env`.
- `npm.cmd run typecheck`, `npm.cmd run build`, `npm.cmd test` (27 đạt) và `npm.cmd run skills:check` đạt. `npm.cmd run test:inventory` đạt 52 kiểm tra trên PostgreSQL cách ly.
- Browser chưa thực hiện: công cụ CUA dừng vì không xác định được URL Chrome hiện tại để kiểm tra quyền truy cập. Chưa nghiệm thu success/failure/timeout, Enter, tiền thừa, reload trong mỗi trạng thái, in giấy, QR lỗi/thành công, bố cục 375px/1440px, focus và nhiều tab. Runner DB dùng Auth schema tối thiểu, không phải Supabase JWT HTTP.

## Rollout và giới hạn
- Áp dụng `202611010001_pos_checkout.sql` trước khi dùng bản UI mới, sau đó quản lý nhập tài khoản ngân hàng thật tại Cài đặt. Không điền tài khoản mẫu trên production.
- Migration đã áp dụng vào Supabase project liên kết, trùng project trong `.env.local`. Chưa deploy frontend lên Vercel, chưa quét QR bằng app ngân hàng thực tế.
- Không rollback bằng cách xóa chứng từ/nháp; giữ dữ liệu và sửa tiếp bằng migration nối tiếp nếu cần.

### Bằng chứng áp dụng 01/11/2026
- CLI `migration list --linked`: thiếu duy nhất `202611010001`; `db push --linked --dry-run`: chỉ migration POS; `db push --linked --yes`: thành công; danh sách sau chạy khớp local/remote đến `202611010001`.
- Đối chiếu trước/sau bằng truy vấn chỉ đọc: 2 phụ tùng, 4 đơn bán, 4 payments, 4 cash entries, 9 movements, tổng tồn 2; tất cả giữ nguyên. Không tạo đơn/fixture hoặc sửa dữ liệu giao dịch thật.
- `pos_drafts` bật RLS; authenticated không SELECT trực tiếp; authenticated được EXECUTE `garage_pos_draft`, anon không được EXECUTE; core cũ không mở EXECUTE cho authenticated. Đủ 4 cột cấu hình ngân hàng.
- PostgREST gọi `garage_pos_draft` với publishable key, không session: HTTP 401 / SQLSTATE 42501 `permission denied for function garage_pos_draft`, xác nhận API nhận RPC mới và chặn ẩn danh. Chưa thử RPC qua browser có phiên đăng nhập.
