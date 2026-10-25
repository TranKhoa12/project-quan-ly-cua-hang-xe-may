---
name: garage-testing
description: Choose and execute meaningful unit, database, RLS, concurrency and browser tests for this shop repository and report release evidence honestly. Use for test work, acceptance checks and production-readiness claims.
---

# Kiểm thử và bằng chứng

Đọc `docs/testing-strategy.md`. Khi nghiệm thu phát hành đọc thêm `docs/release-process.md`; không áp dụng mọi gate phát hành cho sửa lỗi nhỏ.

1. Ánh xạ tiêu chí nghiệm thu thành quan sát được: dữ liệu và số dư trước/sau, quyền bị từ chối, phản hồi lỗi, chứng từ không bị lặp. Test không chỉ so khớp wording hoặc mô phỏng lại công thức implementation.
2. Chọn tầng đúng: hàm thuần kiểm tra tính toán; database thật kiểm tra transaction/lock/RLS; browser kiểm tra người dùng hoàn tất tác vụ. Không dùng mock service-role để chứng minh RLS.
3. Với kho/tiền: test món cuối từ hai kết nối độc lập, trả lỗi ở giữa transaction để chứng minh rollback, retry cùng key, cùng key khác payload và giới hạn hoàn tiền/thu tiền.
4. Với cửa hàng đổi tên: lưu rồi tải lại/chuyển trang, title/menu/lời chào/footer/mẫu in đồng bộ; tên dài, tiếng Việt, tên rỗng, draft chưa lưu và người không có quyền lưu khi có Auth.
5. Dùng database test riêng và dữ liệu tổng hợp. Cleanup đúng tài nguyên test, không reset production. Không tải dữ liệu khách thật về máy test.
6. Chạy lệnh có thật trong package.json. Hiện có `typecheck`, `test`, `build`, `skills:check`; runner DB/RLS/browser chưa được xây dựng. Ghi blocked/not-run cùng lý do nếu thiếu môi trường, không gán pass.
7. Báo kết quả bằng lệnh, số pass/fail, phạm vi và giới hạn. Chỉ chạy lại khi input thay đổi hoặc có lỗi/chưa rõ cần giải quyết.

Đầu ra: test phù hợp rủi ro, kết quả thực tế và tiêu chí chưa đạt. Không dùng build thành công hoặc HTTP 200 làm bằng chứng luồng nghiệp vụ đã chạy trên trình duyệt.
