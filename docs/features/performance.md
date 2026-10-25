# Tối ưu độ trễ

## Quan sát trước thay đổi

Ngày 25/10/2026: HTTP production `/login` trả 318–711ms, `/` (chưa đăng nhập) trả redirect 299–334ms trong ba lượt đo. Header Vercel có `sin1::iad1`, hàm chạy ở iad1 (Mỹ); Supabase project đặt tại ap-southeast-1 (Singapore).

Proxy và currentActor đều gọi getUser khi có session. CSS còn dùng @import Google Fonts làm thêm chuỗi tải stylesheet/font bên ngoài. Đây là các điểm tối ưu có bằng chứng cấu hình; chưa có browser trace hoặc số đo phiên đăng nhập thật của người dùng.

## Thay đổi

- `vercel.json` chọn sin1 để hàm chạy gần Supabase và người dùng Việt Nam.
- Proxy dùng getClaims để refresh/verify token; pages/actions vẫn xác minh getUser và profile active ở server. Không cache quyền xuyên request hoặc bỏ RLS. Với key HS256, getClaims có thể vẫn gọi Auth; không cam kết loại bỏ mọi request Auth.
- Cập nhật 26/10: pages/actions dùng getClaims + một RPC kiểm tra live profile/session; thay hai lượt getUser/profile nối tiếp. Đối chiếu session trong database giữ kiểm tra thu hồi phiên, không chỉ dựa JWT. Xem `docs/features/sidebar-and-navigation.md`.
- Khi không có cookie session, bỏ khởi tạo client Auth ở Proxy/currentActor. Cookie có mặt không được coi là xác thực; cookie đơn hoặc chia chunk đều phải qua kiểm tra đầy đủ.
- Font được phục vụ từ asset trong dự án, bỏ @import bên ngoài; display swap để chữ hiển thị sớm.
- Các truy vấn đọc độc lập của màn hình nhân viên chạy song song, vẫn dùng cùng client và RLS của người dùng.

Kiểm chứng: unit/typecheck/build, kiểm tra HTTP guard, deploy, kiểm tra region/header và đo lại cùng URL. Bộ 25 kiểm tra Auth/RLS/Server Action trước đây vẫn giữ trong repository nhưng không chạy lại runner tạo fixture trên project nay đã deploy production; cần môi trường test riêng cho lần tích hợp kế tiếp. Số đo HTTP không thay thế Core Web Vitals hoặc trải nghiệm trên mọi mạng/thiết bị.

## Kết quả sau triển khai

Deployment cuối: `dpl_A2eDmJ73c3siePwSh7U3f1777efc`, READY và alias `https://dangkietmoto.vercel.app`. Header phản hồi xác nhận `sin1::sin1`.

| Endpoint chưa đăng nhập | Trước: 3 mẫu (ms) | Sau: 3 mẫu (ms) | Trung vị trước → sau |
| --- | --- | --- | --- |
| `/login` | 466, 711, 318 | 334, 162, 104 | 466 → 162ms |
| `/` (redirect login) | 334, 319, 299 | 99, 107, 97 | 319 → 99ms |

Mỗi lượt fetch cùng máy, đo đến khi đọc hết HTML, redirect manual. Mẫu nhỏ và lượt đầu sau deploy có dao động; không suy ra mọi thiết bị, mạng hoặc phiên đã đăng nhập sẽ có cùng tỷ lệ cải thiện. Bản trung gian có lượt 906ms ngay sau deploy, cũng lưu trong `docs/performance-measurements.json`.

20 unit test pass, typecheck/build pass. Production: login có form; trang được bảo vệ và cookie giả (đơn/chunk) redirect login. Font WOFF2 trả 200, cache immutable một năm theo tên băm nội dung. Không tạo tài khoản hay dữ liệu test trên production; chưa browser trace.
