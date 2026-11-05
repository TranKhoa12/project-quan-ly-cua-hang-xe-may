# Ảnh đại diện mặt hàng

## Mục tiêu và phạm vi
- Quản lý thêm/thay/gỡ một ảnh ở Phụ tùng & kho; ảnh xuất hiện ở bảng danh mục và POS, người có quyền nhân viên chỉ xem. Liên quan luồng quản lý phụ tùng và bán tại quầy trong `docs/business-workflows.md`.
- Không thêm ảnh vào chứng từ cũ, không thay kho/tiền/giá, không tạo mặt hàng mới. Chưa có gallery nhiều ảnh.

## Luồng và trạng thái
- Chọn mặt hàng → Thêm ảnh / Đổi, gỡ ảnh → chọn JPG/PNG/WebP tĩnh ≤2 MB → preview → Lưu → server xác nhận rồi mới cập nhật.
- Loading khóa thao tác; lỗi validation cho đổi file; lỗi mạng/5xx giữ file/request ID và thử lại cùng yêu cầu. Conflict version yêu cầu reload; ảnh cũ giữ tới khi binding mới commit.
- Hủy chỉ bỏ preview; gỡ ảnh cần xác nhận và tăng version. Ảnh lỗi tải có fallback, POS chưa có ảnh vẫn dùng hình minh họa.
- Preview dùng object URL tạm và revoke; không lưu ảnh/URL thật vào localStorage.

## Backend và quyền
- Migration `202611050002_part_images.sql`: private bucket `part-images` chỉ nhận WebP ≤2 MB; bảng `part_images` FK part, version riêng, updated_by và thời gian.
- `POST /api/parts/[id]/image`: same-origin, xác minh session manager trước đọc body, giới hạn body stream và limiter theo actor, kiểm tra part active. Sharp decode ≤20 megapixel, loại ảnh động/SVG, rotate/resize trong 1600px, xuất WebP quality82 không EXIF. Chỉ server có credential ghi Storage, client không có policy ghi blob.
- Đường dẫn bất biến `partId/requestId/sha256.webp`; upload không overwrite. Server Storage admin chỉ sau guard/file validation; binding phải qua session RPC `set_part_image`, kiểm tra lại manager, version, part, object metadata/path và audit. Không mở quyền ghi rộng để upload.
- RPC idempotency theo actor/request qua garage_requests: cùng key/cùng payload trả cũ, khác payload conflict. Lock request rồi part; binding/audit/request cùng transaction. Không thay transaction tiền/kho.
- Upload blob và transaction PostgreSQL không nguyên tử: blob được staging trước; chỉ dọn blob cũ sau commit. Lỗi hoặc kết quả chưa rõ có thể để blob chưa gắn, không xóa mù file staging. Hiện chưa có job thu gom staging/ảnh của mặt hàng đã xóa; cần vận hành cleanup có kiểm tra tham chiếu.
- `GET` xác minh staff/RLS rồi signed redirect 60 giây, no-store. Storage SELECT chỉ cho object đang gắn với part active. URL ký đã phát hành còn dùng được tối đa TTL kể cả phiên vừa bị tắt.
- Loader chỉ gửi URL API cùng version; không gửi key. Auth/client không INSERT/UPDATE/DELETE trực tiếp bảng ảnh. Không tạo ảnh fixture production.

## Tiêu chí nghiệm thu
| ID | Tiêu chí | Tầng |
| --- | --- | --- |
| IMG-01 | Kiểm tra loại/dung lượng, body quá giới hạn, ảnh lỗi/SVG/bomb | Unit/server |
| IMG-02 | Thêm/thay/gỡ/retry/conflict, audit rollback, bảo toàn kho/tiền | PostgreSQL cách ly |
| IMG-03 | Staff đọc, anon/nhân viên không ghi, account tắt từ chối | PostgreSQL RLS, HTTP khi có môi trường |
| IMG-04 | Preview, lỗi mạng, retry cùng request, reload, POS fallback | Browser harness cách ly |
| IMG-05 | Storage thật, signed URL và browser Auth production | Chưa chạy đến khi có bằng chứng |

## Triển khai/rollback
- Apply migration trước deploy; bucket private tạo nếu chưa có, không thay bucket khác. Không seed ảnh/dữ liệu thật.
- Frontend cũ tương thích schema thêm. Rollback code không xóa ảnh/binding. Kết quả và giới hạn được ghi vào implementation-status khi bàn giao.

## Bằng chứng 05/11/2026
- `npm.cmd test`: 45 pass; TypeScript/build/skills checker pass. Unit dùng Sharp thật xác nhận decode, resize, bỏ EXIF, WebP xác định; validator/giới hạn stream và loader ảnh.
- `npm.cmd run test:inventory`: 158 pass, gồm ảnh/RLS/retry/version, hai kết nối cùng đổi ảnh chỉ một thành công, audit failure rollback. Runner mô phỏng bảng metadata Storage tối thiểu, không phải Storage HTTP thật.
- `node tests/integration/part-image-route.mjs`: guard anon/staff/CSRF, signed redirect60s, file sai loại trước ghi Storage; auth/Storage boundaries giả lập.
- `node tests/browser/parts-pagination.mjs`: thêm/preview/thay/gỡ, sai loại, mạng lỗi, thử lại giữ key, desktop/mobile pass với HTTP giả lập; đã xem ảnh mobile. `node tests/browser/sale-layout.mjs`: 10 pass; `npm.cmd run test:purchase-ui`: 18 nhóm pass.
- Đã dry-run và áp dụng duy nhất migration ảnh mới trên project liên kết. Storage trước đó không có bucket; sau apply `part-images` private, limit2097152 bytes, chỉ WebP; 0 binding ảnh, anon không SELECT được bảng ảnh. Không tạo fixture ảnh production.
- Chưa thử upload/signed URL thật trong browser của quản lý; không có file ảnh người dùng để nghiệm thu. Chưa có job gom blob staging/ảnh sau xóa mặt hàng.
- Deploy production `dpl_F88mV4EJcnP2rbDNp22PpSugaVF3` READY, alias `https://dangkietmoto.vercel.app`.
