# Sidebar thống nhất và tối ưu điều hướng — 26/10/2026

Vấn đề: Workspace tự render sidebar đầy đủ; AccessShell dùng sidebar rút gọn khác, khiến trang `/parts` đổi bố cục, mất icon, nhóm mục và thẻ cửa hàng. Hai component nay dùng chung ShopSidebar, có mobile drawer và bộ lọc quyền. Tên cửa hàng lấy cấu hình đã lưu; icon/nhóm/link chỉ được định nghĩa một lần.

Link hiển thị pending ngay khi bấm. Chỉ prefetch theo hover/focus thay vì tải trước toàn bộ menu. Không thêm loading boundary trước guard làm đổi redirect 307 thành response streaming 200.

Auth: xác minh claims có chữ ký bằng SDK, rồi một RPC đọc live profile và kiểm tra auth.sessions cho chính auth.uid/session_id. Chặn profile inactive, session đã thu hồi hoặc quá not_after. Không cache quyền qua request. sessionClient chỉ cache trong cùng request để tránh khởi tạo lặp; RLS vẫn giữ nguyên.

Local dev có chi phí biên dịch route; cần phân biệt `next dev` với production `next build`/`next start` khi đo. Kiểm thử HTTP chưa có phiên không chứng minh độ trễ điều hướng sau đăng nhập. Không chạy fixture trên production; runner tích hợp đầy đủ cần môi trường test riêng.

Trang phụ tùng/nhân viên render AccessShell ngay sau guard; phần query dữ liệu nằm trong Suspense phía trong. Không đặt Suspense/loading trước guard. Store name có provider ở root để giữ tên khi chuyển route, nhận cập nhật từ màn hình cài đặt. Sidebar không có chế độ compact theo route.

Đăng nhập: limiter username và IP chạy song song; sau signInWithPassword dùng RPC session/profile thay getUser rồi query profile tách biệt. Số tầng chờ mạng từ 5 xuống 3 (chưa tính cold start/refresh).

Kiểm chứng 26/10/2026: 25 unit test pass, schema lint pass; 8 kiểm tra logic session/actor dùng bản copy đúng function body với bảng tạm, rollback toàn bộ (không ghi public/auth). Kiểm tra đúng phiên hiện hành, tắt tài khoản, session hết hạn/thu hồi, session thuộc user khác, profile chưa cấp login. Không mô tả test bảng tạm là E2E JWT/RLS. Local `/login` 107/56ms và production trước cập nhật 390/101ms là mẫu chưa đăng nhập, không dùng để cam kết tốc độ menu sau đăng nhập.

Production deploy `dpl_3m8HfP8rQEZZFTopF7DTZDsi2UyJ` READY. Kiểm tra sau deploy: local login 214ms, parts/staff chưa đăng nhập redirect 106/85ms; production login 750ms, parts/staff redirect 406/461ms. Các mẫu này bao gồm lượt ngay sau deploy và chưa đăng nhập, dao động cao; không kết luận tốc độ menu sau đăng nhập đã được đo cải thiện. Cả local/web đều từ chối cookie giả. Cần browser trace trong phiên người dùng nếu còn chậm sau bản cập nhật; không thay số đo HTTP bằng lời khẳng định UI đã nhanh.
