# Tính năng cấu hình nhận diện cửa hàng

## Mục tiêu và phạm vi

Chủ cửa hàng thay tên, điện thoại và địa chỉ mà không sửa source. MotoCare là tên sản phẩm, không phải tên cửa hàng hoặc người quản lý.

Đã triển khai phạm vi demo trên trình duyệt. Backend cấu hình, phân quyền và snapshot chứng từ nằm trong giai đoạn tiếp theo; không mở rộng schema hiện tại bằng cách sửa migration nền đã có.

## Luồng giao diện đã triển khai

Mở `/settings` → sửa bản nháp → bấm Lưu → validate → ghi localStorage → cập nhật cấu hình dùng chung và tiêu đề tab. Dữ liệu sai hoặc storage ghi lỗi không cập nhật cấu hình đã lưu.

- Tên bắt buộc, trim/gộp khoảng trắng, tối đa 100 ký tự.
- Điện thoại tùy chọn, tối đa 30 ký tự, chỉ chữ số và dấu `+ ().-`.
- Địa chỉ tùy chọn, tối đa 250 ký tự.
- Cấu hình lưu cũ hợp lệ được đọc lại; JSON hỏng/sai kiểu trả về cấu hình mặc định.
- Sidebar, nhãn cửa hàng, lời chào, footer, tab title và phần nhận diện trên phiếu in lấy cùng cấu hình. Avatar người dùng hiển thị quản lý mẫu riêng.

Chưa có Auth nên không thể chứng minh “chỉ quản lý được sửa” trong bản demo. Phiếu in demo dùng cấu hình hiện tại, chưa snapshot theo thời điểm chốt.

## Hợp đồng production cần xây dựng

`update_store_settings` nhận `{ name, phone, address, expected_version, idempotency_key }`, actor lấy từ session. Chỉ quản lý active được cập nhật. Server validate lại, khóa hoặc compare version, ghi cấu hình và audit trong transaction; trả cấu hình/version đã lưu. Không tìm thấy profile hoặc thiếu quyền thì từ chối.

Bảng singleton `store_settings` cần ID ổn định, các field, version, updated_by/updated_at. Chứng từ đã chốt có snapshot thông tin cửa hàng; đổi tên không thay bản in lịch sử. Một key khác payload trả conflict, cập nhật stale version trả conflict. Không nhận client tự cấp updated_by hoặc quyền.

## Tiêu chí nghiệm thu

| ID | Given / When / Then | Bằng chứng hiện tại |
| --- | --- | --- |
| DEMO-01 | Tên tiếng Việt có khoảng trắng / validate / chuẩn hóa và giữ Unicode | Unit tự động |
| DEMO-02 | Tên rỗng/quá dài hoặc field sai kiểu / lưu / bị từ chối | Unit tự động |
| DEMO-03 | JSON cũ hoặc bị hỏng / restore / khôi phục đúng hoặc dự phòng | Unit tự động |
| DEMO-04 | Nhập draft / chưa lưu / nhận diện đã lưu không đổi | Tách state trong code; chưa browser test |
| DEMO-05 | Lưu tên mới / chuyển trang và reload / toàn UI/title/phiếu in đồng bộ | Chưa browser test |
| DEMO-06 | Tên 100 ký tự / mở 375px và 1440px / không đè thao tác | CSS đã xử lý; chưa visual test |
| PROD-01 | Nhân viên/ẩn danh / gọi mutation trực tiếp / từ chối | Chưa có backend và test RLS |
| PROD-02 | Quản lý / lưu version cũ / conflict, không mất thay đổi khác | Chưa triển khai |
| PROD-03 | Chứng từ chốt trước đổi tên / in lại / giữ snapshot cũ | Chưa triển khai |

Các tiêu chí demo pass không thay thế các tiêu chí production còn thiếu.
