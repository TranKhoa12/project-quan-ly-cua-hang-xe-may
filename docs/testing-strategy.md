# Chiến lược kiểm thử và nghiệm thu

## Lệnh và khả năng hiện có

| Lệnh | Thực sự kiểm tra | Không chứng minh |
| --- | --- | --- |
| `npm.cmd run typecheck` | Kiểu TypeScript | Hành vi runtime/quyền |
| `npm.cmd test` | Hàm chuyển trạng thái bán/nhập mẫu và cấu hình cửa hàng | Transaction thật, RLS, thao tác trình duyệt |
| `npm.cmd run build` | Build production Next.js | Đã deploy, đúng nghiệp vụ hoặc an toàn production |
| `npm.cmd run skills:check` | Cấu trúc/frontmatter skill và tham chiếu tài liệu nội bộ | AI luôn tuân thủ hoặc bảo mật đã đạt |

Chưa có runner integration Supabase, database concurrency hoặc E2E browser. Khi thêm runner, thêm script có thật và hướng dẫn setup; không ghi tên lệnh giả như lệnh đã hoạt động.

## Ma trận bắt buộc theo rủi ro

| ID | Tình huống | Tầng kiểm chứng / tiêu chí |
| --- | --- | --- |
| CFG-01 | Đổi tên, lưu, reload và chuyển trang | Browser: sidebar, lời chào, title, footer và in đồng bộ |
| CFG-02 | Draft chưa lưu, rỗng/quá dài, Unicode | Unit + browser: không áp dụng draft; lỗi rõ; không vỡ bố cục |
| CFG-03 | Nhân viên gọi API đổi tên | DB/API: bị từ chối; cấu hình không đổi |
| CFG-04 | Đổi tên rồi in lại phiếu đã chốt | Integration: phiếu cũ dùng snapshot cũ, mới dùng cấu hình mới |
| AUTH-01 | Ẩn danh, token giả/hết hạn, account tắt | API/RLS: không đọc/ghi được nghiệp vụ |
| AUTH-02 | Thợ không được giao đổi ID phiếu | DB/API: bị từ chối, không rò dữ liệu |
| AUTH-03 | Bán hàng yêu cầu cost/export giá vốn | DB/API/network: không có dữ liệu bị cấm |
| STK-01 | Hai kết nối mua cùng món cuối | DB: đúng một thành công, không âm tồn, một bộ chứng từ |
| STK-02 | Lỗi giữa chốt đơn và ghi thanh toán | DB fault injection: không tồn tại thay đổi từng phần |
| STK-03 | Xuất dùng hàng đang giữ | DB: giảm tồn và giữ đúng một lần, khả dụng đúng |
| IDEM-01 | Cùng key/cùng payload và hai request đồng thời | DB: một giao dịch, kết quả nhất quán |
| IDEM-02 | Cùng key/khác payload | DB/API: conflict, không ghi thêm |
| PAY-01 | Hai lần thu đồng thời sát số dư | DB: tổng thu không vượt số phải thu |
| PAY-02 | Trả/hoàn nhiều lần | DB: lũy kế không vượt lượng/tiền được phép |
| REP-01 | Mọi cạnh trạng thái hợp lệ và bị cấm | Domain + DB: chặn bỏ qua duyệt/QC hoặc bàn giao nợ không quyền |
| RET-01 | Hủy phiếu có hàng đã dùng và tiền đã thu | Integration: không tự hoàn kho/tiền thiếu chứng từ |
| INV-01 | Kiểm kê lúc có xuất/nhập xen kẽ | DB: đối chiếu mốc và chuyển động chính xác |
| FIN-01 | Tổng báo cáo khớp chứng từ đã chốt | Integration: loại nháp/hủy đúng, tiền thu theo ngày thu |
| MIG-01 | Apply database trống và nâng cấp baseline | Database test: schema, grants/RLS, dữ liệu cũ hợp lệ |
| OPS-01 | Khôi phục backup database + file | Môi trường cách ly: đối soát bản ghi và file mẫu |

Các test unit hiện tại chỉ bao phủ một phần invariant demo; không tự đánh dấu STK-01 hoặc IDEM-01 đạt nhờ hai lần gọi hàm tuần tự.

## Setup kiểm thử thật

- Unit dùng Node test và dữ liệu tổng hợp.
- DB integration dùng Supabase local hoặc project test riêng; fixture có quản lý, bán hàng, thợ được giao, thợ khác và người bị tắt. Thiết lập fixture bằng tài khoản quản trị, assertions bằng phiên người dùng đúng vai trò.
- Concurrency dùng ít nhất hai kết nối độc lập và điểm đồng bộ để cùng cạnh tranh; kiểm tra số dư lẫn số chứng từ cuối cùng.
- Browser dùng công cụ trình duyệt được môi trường cung cấp hoặc runner E2E đã được xây dựng trong repository. Không nói đã test tương tác nếu chỉ fetch HTML.
- Kiểm tra màn hình 375/1440px, bàn phím, timeout, server trả lỗi, thiếu quyền, tên dài và in. Dữ liệu test không chứa PII thật.

## Báo cáo kết quả

Với mỗi nhóm ghi: tiêu chí/ID → môi trường → lệnh/cách thực hiện → kết quả thực tế → bằng chứng → giới hạn. Trạng thái: pass, fail, not-run, blocked. Không đổi not-run thành pass vì thiếu công cụ.

Khi code đã đổi, chạy lại phần liên quan. Lần build cuối phải sau thay đổi code/config cuối. Nếu không thể kiểm tra DB/browser, vẫn giao phần hoàn tất có thể review và nêu phần còn thiếu.
