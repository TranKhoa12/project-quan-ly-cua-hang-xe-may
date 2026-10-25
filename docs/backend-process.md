# Quy trình backend và hợp đồng nghiệp vụ

## Kiến trúc đích

Browser → Next.js server entrypoint → Supabase Auth/profile/quyền → service nghiệp vụ → RPC PostgreSQL → dữ liệu + audit → response. RLS vẫn bảo vệ bảng/RPC dù gọi ngoài UI. Với luồng chỉ đọc được phép truy cập bằng client Supabase nếu policy và phạm vi trả về đã kiểm chứng.

Các module mới nên chia `features/<domain>/` (UI, schema input, service), `lib/supabase/` (client/server), migrations và test riêng. Đây là hướng tách dần, không đổi cấu trúc toàn repo chỉ để khớp tên thư mục.

## Chu trình xây dựng một thao tác

1. Viết input/output, actor/quyền, precondition và invariant.
2. Tạo hoặc bổ sung schema, constraint, index, snapshot và grants/RLS.
3. Viết RPC transaction và server entrypoint; idempotency/locking/version nằm trong database.
4. Map lỗi có cấu trúc về UI, không lộ stack/SQL/secret.
5. Test trên database test: quyền, đồng thời, rollback, retry, audit và đối soát.
6. Nối UI, tải lại dữ liệu sau success/conflict. Đánh dấu năng lực thật trong hiện trạng.

## Danh mục hợp đồng cần triển khai

Tên bên dưới là hợp đồng đề xuất, **chưa tồn tại trong code**. Đặc tả tính năng cần chốt payload cụ thể khi triển khai.

| Command | Input nghiệp vụ | Điều kiện / kết quả transaction |
| --- | --- | --- |
| `update_store_settings` | name, phone, address, expected_version | Chỉ quản lý; cập nhật version/audit; không đổi snapshot cũ |
| `create_customer_vehicle` | Thông tin khách/xe | Validate, chuẩn hóa biển số, chống trùng; trả IDs |
| `receive_vehicle` | vehicle_id, km, issue, technician_id | Tạo phiếu và lịch sử đầu tiên, chưa xuất kho |
| `submit_quote` | repair_id, expected_version, labor/parts/discount | Server tính tổng; tạo báo giá version mới |
| `approve_quote` | quote_id, xác nhận khách, version | Đúng phiên bản và trạng thái; giữ tồn nếu quy trình yêu cầu |
| `issue_repair_parts` | repair_id, lines part_id/qty, version | Đúng quyền/duyệt; khóa kho, xuất và giải phóng giữ; snapshot cost |
| `return_unused_parts` | issue_line_id, qty, reason | Không vượt lượng xuất chưa trả; lập nhập trả có liên kết |
| `transition_repair` | repair_id, target, expected_version, reason | Chỉ cạnh trạng thái hợp lệ; QC/bàn giao theo điều kiện |
| `complete_sale` | customer_id, lines part_id/qty, discount, amount_received, method | Tính giá tại server, kiểm tra quyền giảm/nợ; tạo đơn/dòng/xuất/thu trong một transaction |
| `receive_purchase` | supplier_id, receipt lines, expected_version | Chốt số nhận, tăng tồn, tính cost, tạo phải trả/chi khi áp dụng |
| `record_payment` | sale_id hoặc repair_id, amount, method | Khóa chứng từ, kiểm tra dư nợ, tạo khoản thu/audit |
| `process_return` | original_line_id, qty, condition, refund | Kiểm tra giới hạn lũy kế, nhập đúng loại tồn, điều chỉnh tiền/nợ |
| `approve_inventory_count` | count_id, expected_version, reason | Giải quyết giao dịch sau mốc đếm, chốt adjustment có audit |

Mọi command thay đổi dữ liệu có request_id/idempotency key. Chứng từ có version khi cần sửa đồng thời. Chỉ định actor từ session; không cho client quyết định created_by hoặc role.

## Response và lỗi

Success trả `{ data, requestId }`; lỗi trả `{ error: { code, message, fieldErrors? }, requestId }`. Nếu dùng Server Action thay HTTP route, giữ cùng phân loại nhưng không giả định mọi Action có HTTP status nghiệp vụ riêng.

| Code | Ý nghĩa / HTTP nếu là API route |
| --- | --- |
| `VALIDATION_ERROR` | Input sai, 400 |
| `UNAUTHENTICATED` | Không có phiên hợp lệ, 401 |
| `FORBIDDEN` | Thiếu quyền/tài khoản tắt, 403 |
| `NOT_FOUND` | Không tìm thấy hoặc không được phép biết đối tượng, 404 |
| `INSUFFICIENT_STOCK` | Tồn khả dụng không đủ, 409 |
| `VERSION_CONFLICT` | Bản ghi đã đổi, 409 |
| `INVALID_TRANSITION` | Cạnh trạng thái không hợp lệ, 409 |
| `IDEMPOTENCY_CONFLICT` | Cùng key khác payload, 409 |
| `PAYMENT_EXCEEDS_BALANCE` | Thu vượt dư nợ, 409 |
| `RATE_LIMITED` | Thao tác quá nhanh, 429 |
| `INTERNAL_ERROR` | Lỗi không dự kiến, 500; client chỉ nhận thông tin an toàn |

## Invariant dữ liệu

- `stock_balance` và `stock_movement` cập nhật cùng transaction; đối soát được từ số dư đầu kỳ.
- Khóa nhiều mặt hàng theo part_id tăng dần để giảm deadlock. Kiểm tra tồn sau khi lấy khóa; không read-check-write qua nhiều request rời.
- Số tiền lưu integer VND hoặc numeric đúng độ chính xác; cost bình quân dùng numeric. Quy tắc làm tròn và phần lẻ được quy định, test, không dùng JS float làm nguồn chốt sổ.
- Unique idempotency theo phạm vi nghiệp vụ, lưu hash payload chuẩn hóa/kết quả. Transaction cạnh tranh cùng key xử lý bằng unique constraint, không chỉ SELECT trước INSERT.
- Audit chứa actor, entity, event, request, thời gian, before/after phù hợp; không chứa password/token. Không cấp quyền sửa audit cho nhân viên.
- Report lấy từ chứng từ đã chốt và adjustment, không tổng hợp dữ liệu nháp hoặc dùng created_at thay ngày thu/bàn giao.

## Khoảng thiếu của schema hiện tại

Migration `202610250001_initial_schema.sql` mới có bảng nền và một số policy đọc. Chưa có cấu hình cửa hàng/version, báo giá/version, giữ kho, phân quyền chi tiết, nhập hàng đầy đủ, returns, inventory count, audit trigger/RPC, contract idempotency payload hash hoặc transaction ghi. `idempotency_key` đơn lẻ hiện chưa thỏa đầy đủ hợp đồng đề xuất. Không coi SQL file tồn tại là đã apply hay đã qua test RLS.
