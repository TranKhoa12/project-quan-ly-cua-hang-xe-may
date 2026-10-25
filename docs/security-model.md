# Mô hình bảo mật

Đây là yêu cầu đích và kế hoạch kiểm chứng. Ứng dụng demo hiện không có Auth hoặc bảo vệ quyền thật.

## Phân quyền nghiệp vụ dự kiến

| Hành động / dữ liệu | Quản lý | Bán hàng | Thợ |
| --- | --- | --- | --- |
| Đổi thông tin cửa hàng | Có | Không | Không |
| Cấp/tắt tài khoản, đổi quyền | Có | Không | Không |
| Xem giá vốn/lợi nhuận | Có | Không mặc định | Không |
| Khách hàng/xe | Có | Theo tác vụ | Chỉ dữ liệu cần trên phiếu được giao |
| Tạo phiếu/báo giá | Có | Có theo quyền | Đề xuất chẩn đoán/công trên phiếu được giao |
| Xuất phụ tùng sửa chữa | Có | Quyền riêng | Quyền riêng + được giao + báo giá duyệt |
| Thu tiền/bán hàng | Có | Có | Không mặc định |
| Giảm giá/bán chịu | Có | Theo hạn mức/quyền riêng | Không |
| Hủy/hoàn/duyệt chỉnh kho | Có | Không mặc định | Không |
| Xem audit/export toàn bộ | Có | Không mặc định | Không |

UI chưa cho phép cấu hình các quyền này. Khi triển khai cần chuyển thành permission kiểm tra server/database, không chỉ chuỗi role trên client. Bảo vệ tài khoản quản lý cuối cùng khỏi tự tắt/hạ quyền gây mất quyền quản trị.

## Ranh giới và biện pháp

| Rủi ro | Kiểm soát bắt buộc | Bằng chứng yêu cầu |
| --- | --- | --- |
| Gọi trực tiếp API bỏ qua menu | Xác minh user và quyền mỗi thao tác; RLS | Gọi từ tài khoản thiếu quyền nhận từ chối |
| Đổi ID xem/sửa phiếu người khác | Scope theo assignment và action | Thợ không được giao bị từ chối ở query lẫn mutation |
| Tự tăng quyền | Cấm sửa role/active bằng profile update thông thường | Thử payload role giả và endpoint trực tiếp |
| Nhân viên đọc cost | Bảng/view riêng, response không chứa cost | Kiểm tra DB, RPC, network payload và export |
| Token còn hạn sau tắt account | Policy/transaction kiểm tra active profile | Token cũ không ghi/đọc dữ liệu nghiệp vụ sau tắt |
| Hàm/view vượt RLS | Giới hạn grants; definer kiểm tra caller; view dùng quyền phù hợp | Test với JWT người dùng thật, không service-role |
| Lộ secret | Env server, ignore file, redaction log | Review bundle/repository/log chỉ có public key được phép |
| CSRF/phiên | Session server xác minh, cookie secure/httpOnly khi dùng cookie, Origin/CSRF theo kiến trúc | Request khác origin không tạo mutation |
| Injection/XSS | Validation, SQL tham số hóa, render text an toàn | Input có SQL/HTML không được thực thi |
| Upload/export lộ file | Bucket private, policy theo đối tượng, URL ký có hạn, export theo quyền | Link không quyền/hết hạn không truy cập được |
| Log thiếu hoặc chứa dữ liệu nhạy cảm | Audit tối thiểu, redaction PII/secret, retention | Tái dựng được giao dịch; không lộ token/password |

## Vận hành

Tách dev/test/production và secret. Tài khoản test dùng dữ liệu tổng hợp. Sao lưu database và Storage riêng, kiểm tra khôi phục trong môi trường cách ly. Xác định thời gian/số dữ liệu chấp nhận mất với chủ cửa hàng trước khi chọn lịch sao lưu; không tự cam kết RPO/RTO chưa thử.

Kiểm tra dependency theo phiên bản cài thực tế; đánh giá đường ảnh hưởng và bản vá thay vì chạy sửa breaking change mù quáng. Không phát hành có lỗ hổng nghiêm trọng có đường khai thác trong phạm vi hoặc test quyền quan trọng còn fail.

Khi có sự cố: chặn đường lỗi phù hợp → bảo toàn audit/bằng chứng → xác định phạm vi dữ liệu → thu hồi/đổi credential bị lộ nếu có → sửa và test → khôi phục/đối soát → ghi báo cáo. Không đưa secret vào báo cáo sự cố.
