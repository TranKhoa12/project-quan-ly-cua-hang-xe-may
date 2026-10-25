---
name: garage-delivery
description: Plan and implement end-to-end business workflows in this motorcycle repair shop repository, aligning UI, backend, permissions and acceptance evidence. Use for new features or cross-layer process changes.
---

# Triển khai nghiệp vụ xuyên suốt

Đọc `docs/business-workflows.md` và `docs/implementation-status.md` tính từ gốc repository. Với UI/backend/quyền/test, đọc thêm skill tương ứng theo `AGENTS.md`; không tải tất cả tài liệu cho một thay đổi nhỏ.

## Quy trình

1. Chọn nghiệp vụ và ranh giới: ai bắt đầu, điều kiện trước, trạng thái cuối, ảnh hưởng kho/tiền. Xác định thao tác hiện là demo hay đã chạy trên server.
2. Tạo hoặc cập nhật đặc tả tính năng theo `docs/templates/feature-spec.md`. Nếu thiếu quyết định kinh doanh ảnh hưởng tiền hoặc quyền, ghi rõ câu hỏi và tiếp tục phần độc lập; không âm thầm chọn quy tắc có thể làm thất thoát.
3. Chốt hợp đồng UI/backend: input, output, mã lỗi, quyền, tính lặp lại. Coi backend là nguồn dữ liệu thật; UI không tự xác nhận nghiệp vụ.
4. Triển khai một luồng đủ chiều sâu: dữ liệu → giao dịch → quyền → màn hình → kiểm thử. Giữ demo tách khỏi chế độ có Auth, không fallback sang demo khi backend thật bị lỗi.
5. Đối chiếu hành vi với tiêu chí nghiệm thu, cập nhật bằng chứng và trạng thái. Không triển khai thêm bán online hoặc nhiều chi nhánh ngoài phạm vi yêu cầu.

## Đầu ra cần có

- Đặc tả được điền và code/migration phù hợp phạm vi.
- Kiểm thử tình huống chính, thất bại, vượt quyền và retry cho phần đã thay đổi.
- Tóm tắt: đã làm, cách kiểm chứng, việc còn thiếu. Chỉ gọi là vận hành thật sau các điều kiện trong `docs/release-process.md`.
