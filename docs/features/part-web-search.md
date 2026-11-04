# Tra cứu mặt hàng mới trên web

## Mục tiêu và phạm vi
- Quản lý tra tên quen gọi, mô tả hoặc mã bao bì ngay trong form Nhập hàng → Tạo hàng mới. Theo luồng nhập hàng trong `docs/business-workflows.md`.
- Không lưu từ điển web, không tạo hàng/tồn/thu chi từ thao tác tìm kiếm. Chỉ tên được người dùng chọn mới vào draft; chốt phiếu vẫn qua RPC hiện có.
- Tích hợp Tavily Search Basic; chưa có API key cục bộ, chưa xác minh tìm kiếm thật hoặc deploy.

## Luồng và giao diện
- Mở Tìm trên web → nhập 2–240 ký tự (tối đa 60 từ) → bấm Tìm gợi ý hoặc Enter → tối đa 5 kết quả gồm tiêu đề, mô tả và link nguồn.
- Loading khóa nút tìm; cho sửa truy vấn, bỏ kết quả cũ nếu truy vấn đổi khi đang chờ. Lỗi mạng/hạn mức cho thử lại, giữ draft; không có kết quả hướng dẫn đổi từ khóa. Có thể đóng panel, nhập thủ công hoặc hủy form.
- Chọn Dùng làm tên điền tiêu đề tối đa 180 ký tự và focus tên để sửa. Không suy đoán nhóm, thương hiệu, fitment, giá hoặc tồn từ trang web. Không tự thêm dòng phiếu.
- Nguồn mở tab mới, `noopener noreferrer`; bàn phím và responsive dùng CSS hiện có. Không thay đổi thương hiệu cửa hàng hay mẫu in.

## Backend, quyền và dữ liệu
- Server action `searchPartsOnWeb(unknown)` xác minh session và role manager trước kiểm tra cấu hình/gọi provider; không cho nhân viên hoặc ẩn danh tiêu thụ API.
- Server-only `TAVILY_API_KEY`; không đưa secret/provider response thô vào client/log. Gửi duy nhất truy vấn người dùng với ngữ cảnh phụ tùng xe máy; fixed upstream host, timeout 10 giây, không follow redirect, không cache kết quả.
- Gọi `POST https://api.tavily.com/search` bằng Bearer token; cố định `search_depth: basic`, `auto_parameters: false`, tối đa 5 kết quả. Tắt answer/raw content/images; lấy mô tả từ `results[].content`. Không tự nâng lên Advanced. Khi Tavily trả 432/433, báo hết hạn mức và giữ nguyên draft.
- Dùng limiter database hiện có với bucket HMAC riêng theo actor (`part-web:`). Không tạo migration, mở quyền bảng hoặc thay RLS.
- Lọc URL chỉ HTTP(S), không userinfo; loại trùng, bỏ markup trong text, React render text. Không fetch trang nguồn. Không ảnh hưởng kho/tiền, không cần idempotency hoặc transaction mới cho query.

## Cấu hình và nguồn
1. Tạo key trên dashboard dịch vụ, tự xem gói/chi phí phù hợp. Không gửi key vào chat.
2. Đặt `TAVILY_API_KEY` trong `.env.local` khi chạy local và biến server Production trên Vercel khi triển khai. Restart/redeploy để nhận env mới. Không thêm tiền tố `NEXT_PUBLIC_`.
3. Khi chưa cấu hình, form báo chưa bật tìm kiếm, vẫn cho nhập tay. Không có kết quả giả.
- API chính thức: https://docs.tavily.com/documentation/api-reference/endpoint/search
- Bảo vệ key: https://docs.tavily.com/documentation/quickstart

## Tiêu chí nghiệm thu và bằng chứng
| ID | Tình huống | Tầng / trạng thái |
| --- | --- | --- |
| WEB-01 | Validation, URL không an toàn, markup/trùng, giới hạn 5 | Pass: unit 04/11/2026 |
| WEB-02 | Upstream lỗi/hạn mức/mạng, retry, no-store | Pass: unit provider giả lập; không chứng minh API thật |
| WEB-03 | Lỗi/empty/retry, nguồn, chọn tên, giữ nhóm/brand, mobile | Pass: harness Edge cách ly, 17 nhóm tổng; ảnh `.browser-test/purchase/web-search-mobile-375.png` |
| WEB-04 | Anonymous/non-manager bị chặn | Có guard server; chưa chạy Auth HTTP thật cho action mới |
| WEB-05 | Kết quả thật và phiên đăng nhập production | Chưa chạy: thiếu key, chưa deploy |

## Rollback
Gỡ điểm vào Tìm trên web hoặc bỏ key để dừng tra cứu. Không có dữ liệu từ điển hay schema cần rollback. Các tên đã được người dùng chốt là dữ liệu mặt hàng bình thường.

## Bàn giao 04/11/2026
- `npm.cmd run typecheck`: pass; `npm.cmd test`: 36 pass; `npm.cmd run skills:check`: pass; `npm.cmd run build`: pass.
- `npm.cmd run test:purchase-ui`: 17 nhóm pass trên Edge cách ly; ban đầu sandbox chặn esbuild đọc thư mục, chạy lại có quyền thực thi phù hợp đã pass. Không kết nối production.
- Chưa có `TAVILY_API_KEY`, chưa gọi provider thật, chưa deploy hoặc chạy E2E Auth. Người dùng xác nhận chưa có key và cần hướng dẫn tạo.
- Theo lựa chọn người dùng, đã chuyển provider sang Tavily và cập nhật unit fixtures đúng response Tavily. 36 unit pass; giao diện không đổi, bằng chứng 17 nhóm UI ở lần trước dùng provider giả lập, không phải tìm kiếm Tavily thật.
