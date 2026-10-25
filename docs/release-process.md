# Quy trình giao hàng và đưa vào sử dụng thật

## Vòng đời một tính năng

Yêu cầu → đặc tả nghiệp vụ/tiêu chí → thiết kế UI và hợp đồng → triển khai → kiểm thử → review → staging → nghiệm thu vận hành → production → theo dõi.

Đây là các bước công việc, không phải mỗi bước đều xin người dùng duyệt. AI tiếp tục các việc đã được giao; chỉ hỏi khi thiếu quyết định cần thiết hoặc hành động vượt quyền đã có. Viết tài liệu không tự cấp quyền truy cập tài khoản, thay dữ liệu thật hoặc xuất bản.

## Mức hoàn thành

| Mức | Có nghĩa |
| --- | --- |
| Specified | Có hợp đồng và tiêu chí; chưa triển khai |
| Demo | Tương tác local/mock; không có bảo đảm server |
| Integrated | Đã nối backend với Auth và quyền; phải có bằng chứng môi trường |
| Verified | Tiêu chí của tính năng đã test thực tế, ghi rõ phạm vi |
| Production verified | Đã deploy đúng cấu hình và qua nghiệm thu vận hành; không chỉ build |

Không dùng trạng thái Integrated khi mới có client Supabase hoặc file SQL. Một tính năng có thể verified ở phạm vi demo, nhưng không được mô tả là verified cho production.

## Thứ tự phát triển đề xuất

1. Nền tảng: cấu hình cửa hàng ở server, Auth/phiên, quyền, migration và môi trường test.
2. Khách/xe và danh mục, nhà cung cấp, nhập hàng/tồn đầu kỳ.
3. Bán tại quầy xuyên backend, thanh toán, ledger kho/tiền, idempotency.
4. Sửa chữa: báo giá/duyệt, giữ/xuất dùng, chất lượng, bàn giao, thu tiền/nợ.
5. Trả hàng/hủy/hoàn, bảo hành, kiểm kê, thu chi và đối soát.
6. Báo cáo đúng thời điểm/snapshot, audit, sao lưu/khôi phục, staging và đào tạo sử dụng.

Ưu tiên luồng chạy xuyên suốt hơn việc tạo thêm nhiều trang rỗng. Bán online là phạm vi sau.

## Điều kiện đưa vào vận hành

- Các luồng cửa hàng sẽ dùng thực tế đã có backend; không dựa localStorage hoặc role giả.
- Các test kho/tiền/RLS liên quan trong `testing-strategy.md` đã pass trên môi trường thật tương đương; không có fail nghiêm trọng còn mở.
- Dữ liệu đầu kỳ nhập và đối soát; thông tin cửa hàng/quyền đúng; tài khoản test không nằm trong production.
- Vercel production dùng env riêng, Supabase URL/key đúng, migration tương thích code; trang demo không bị nhầm với hệ thống thật.
- Quản lý thử tiếp nhận → báo giá → sửa → thu/bàn giao và nhập → bán → trả/đối soát theo phạm vi đưa vào sử dụng.
- Có log theo request, cảnh báo lỗi, người chịu trách nhiệm, kế hoạch backup database + Storage, kết quả thử khôi phục và hướng dẫn sự cố.
- Nếu cần hóa đơn điện tử, chốt và triển khai tích hợp riêng trước khi coi phiếu nội bộ là quy trình hóa đơn của cửa hàng.

## Triển khai và quay lui

Trước deploy: chạy checks, kiểm tra env không in secret, backup trước migration có rủi ro, xác định tương thích code cũ/mới. Ưu tiên thay đổi schema thêm trước rồi chuyển code, không xóa cột đang dùng.

Sau deploy: smoke test đăng nhập/quyền, đọc cấu hình, thao tác an toàn trên dữ liệu thử được chỉ định; kiểm tra log và đối soát. Không dùng giao dịch khách thật làm thử nghiệm.

Lỗi release: ngừng đường ghi lỗi khi cần, giữ bằng chứng, rollback code nếu tương thích; database ưu tiên migration sửa tiếp. Không tự chạy SQL đảo phá dữ liệu. Khôi phục từ backup chỉ theo kế hoạch đã xác minh phạm vi mất dữ liệu.
