# Gợi ý tên phụ tùng và nhắc trùng

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
