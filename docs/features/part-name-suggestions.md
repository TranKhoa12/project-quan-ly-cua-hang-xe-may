# Gợi ý tên phụ tùng và nhắc trùng

## Mở rộng từ điển ngày 2026-10-26

- Đã áp dụng `202610260002_part_reference_vocabulary.sql`: bộ tham chiếu 253 tên, 297 alias, 17 nhóm. Sau gộp với danh sách cũ, database có 254 tên, 18 nhóm và 2 thương hiệu. Đây là dữ liệu tham chiếu được yêu cầu, không phải dữ liệu mẫu hàng hóa.
- Nguồn và toàn bộ danh sách: `data/part-name-reference.json`; tái tạo migration bằng `node --experimental-strip-types scripts/build-part-reference.mjs`. Không chạy lại generator để sửa một migration đã áp dụng; thay đổi tiếp theo cần migration mới.
- Đối chiếu nhóm cơ khí xe số với catalogue Honda Wave Alpha, xe ga/phun xăng/làm mát với catalogue Honda Vario 160, vật tư bảo dưỡng với Yamaha Genuine Parts. Tên tiếng Việt và alias địa phương là biên tập để tìm kiếm, không phải bản dịch được hãng chứng nhận. Các URL được ghi ở từng tên.
- Đây là từ điển tên chung phục vụ nhập phụ tùng Honda/Yamaha; chưa phải catalogue đầy đủ theo mã OEM, đời xe, phiên bản hoặc khả năng lắp lẫn. Không tự gắn thương hiệu/đời xe khi chọn tên. Có thể tiếp tục nhập tên mới theo luồng lưu hiện hữu.
- Migration chỉ upsert `part_terms`, gộp alias, giữ tên/category/source có sẵn; không thay RLS hoặc dữ liệu sản phẩm/kho/giá.
- Đối chiếu sau apply: đủ 253 tên và alias; dấu vân tay toàn bộ dữ liệu `parts`, `part_costs`, `stock_balances`, `stock_movements` giữ nguyên (đều 0 bản ghi tại lúc kiểm tra). 27 unit test pass, gồm kiểm tra duy nhất tên chuẩn hóa, nguồn và tìm alias không dấu. Không tạo fixture production, chưa kiểm tra tương tác browser.
- UI đang tải từ điển trực tiếp từ Supabase; dữ liệu mới có sau tải lại trang `/parts`, không cần deploy ứng dụng cho thay đổi chỉ gồm dữ liệu này. Tìm kiếm hiện trả tối đa 8 gợi ý phù hợp từ toàn bộ danh sách, không chỉ tìm trong 8 tên ban đầu.

Người dùng duyệt danh mục tham chiếu Honda/Yamaha và làm rõ: đây là gợi ý khi nhập form, không nhập hàng hay tạo tồn. Tên mới được lưu để chọn lại; cần cảnh báo trùng.

## Luồng

- Trang `/parts` của quản lý đọc danh mục thật từ Supabase. Nhân viên giữ quyền đọc theo role, không được tự tạo danh mục.
- Ô tên là combobox có thể tìm không dấu, chọn gợi ý hoặc nhập mới. Nhóm/thương hiệu cũng có gợi ý và cho nhập mới.
- Gợi ý tên bắt đầu bằng loại phụ tùng thông dụng đã được duyệt; không sinh SKU hãng, đời xe, giá hoặc số lượng tồn giả. Chỉ tạo bản ghi phụ tùng khi người dùng bấm Lưu.
- Trùng tên + thương hiệu sau chuẩn hóa hoa/thường, dấu tiếng Việt, khoảng trắng và dấu phân cách: chặn lưu, chỉ ra bản ghi có sẵn.
- Tên gần giống cùng thương hiệu: hiện danh sách để đối chiếu, yêu cầu người dùng xác nhận đây là phụ tùng khác trước khi tiếp tục. Khác thương hiệu không tự gộp.
- Tạo thành công: phụ tùng, giá vốn tham khảo, tồn ban đầu 0 và các từ gợi ý mới lưu trong một transaction; audit và idempotency key chống gửi lặp. Không phát sinh phiếu nhập hoặc khoản chi.

## Backend

Migration mới: từ điển gợi ý có RLS; khóa chuẩn hóa trên parts; RPC manager-only kiểm tra trùng và tạo bản ghi; không mở quyền ghi bảng trực tiếp. Cùng request key khác payload trả conflict. Bộ normalize client chỉ hỗ trợ tìm kiếm; database là nơi quyết định chặn trùng cuối cùng.

Phụ tùng cũ chỉ có ở workspace local không tự upload hoặc xóa. Trang danh mục mới không coi dữ liệu local là nguồn thật. Các luồng bán/nhập/sửa cũ vẫn là prototype và cần được nối backend riêng.

## Nghiệm thu

Tìm có/không dấu; chọn bằng chuột hoặc phím; nhập tên mới; gợi ý xuất hiện sau lưu và tải lại; trùng chính xác bị chặn; gần giống cần xác nhận; khác brand được phép; giá/qty sai bị từ chối; server kiểm tra lại quyền và trùng; cùng key không tạo lặp. Không tạo fixture trong database production để test.

## Bằng chứng hiện có

- 25 unit test pass, gồm chuẩn hóa dấu/hoa/thường, phân biệt thương hiệu, tìm alias, validation và không tạo sản phẩm khi tìm gợi ý.
- TypeScript/build pass trước kiểm tra cuối; migration đã áp dụng và `supabase db lint --linked --schema public` không tìm lỗi schema.
- Query metadata xác nhận 23 từ gợi ý, số sản phẩm vẫn 0; RLS từ điển bật, authenticated không có INSERT bảng trực tiếp, anon không có EXECUTE RPC tạo.
- Query chuẩn hóa Unicode dấu tổ hợp trả `loc gio`, khớp chuẩn hóa client.
- Không có trình duyệt kết nối để QA tương tác; chưa chạy test insert/rollback/concurrency với fixture vì project hiện là production. Các bảo đảm transaction/unique/idempotency được triển khai trong SQL, chưa ghi là kiểm thử tích hợp pass.
- Danh mục cục bộ cũ không tự xóa/upload; nếu phát hiện bản ghi cũ, UI hiện thông báo cần đồng bộ riêng.
- Đã deploy production `dpl_DXGMLrmQ7PukN5ZEhkVj5rXqrjX3` READY. Truy vấn PostgREST đúng như loader trả thành công (0 sản phẩm/23 từ gợi ý); HTTP `/parts` không có session trả 307 về `/login`; `/login` trả 200 có form.
