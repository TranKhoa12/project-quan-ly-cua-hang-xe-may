# Mẫu đặc tả tính năng

Sao chép mẫu vào `docs/features/<ten-tinh-nang>.md` khi triển khai tính năng nghiệp vụ. Đây là form làm việc, không phải tính năng đã hoàn thành.

## Mục tiêu và phạm vi

- Vấn đề và kết quả người dùng cần:
- Actor/quyền:
- Mức hiện tại và mức cần đạt (Demo/Integrated/Verified):
- Trong phạm vi / việc để sau:
- Quy trình nguồn trong `docs/business-workflows.md`:

## Luồng và trạng thái

- Điều kiện trước:
- Các bước thành công:
- Trạng thái nguồn → đích, actor, điều kiện:
- Nhánh lỗi, hủy, quay lại, retry:
- Thao tác được phép sau khi chốt:

## Giao diện

- Route, điểm vào/ra:
- Field, kiểu, bắt buộc, giới hạn, dữ liệu mặc định:
- Loading/empty/submitting/error/conflict/success:
- Tên cửa hàng, mẫu in, bàn phím và responsive nếu liên quan:

## Backend và dữ liệu

- Command/query; input/output/mã lỗi:
- Bảng/migration/index/ràng buộc:
- Nguồn giá/tồn/quyền tin cậy:
- Snapshot, version, idempotency key/phạm vi/hash payload:
- Thứ tự khóa, transaction boundary và rollback:
- Tác động kho/giữ hàng, thu/chi/công nợ, audit:

## Bảo mật

- Actor được phép và bị cấm; scope đối tượng:
- RLS/grants/function đặc quyền:
- Dữ liệu không trả client; file/export/secret nếu liên quan:

## Tiêu chí nghiệm thu và bằng chứng

| ID | Given / When / Then | Tầng test | Trạng thái và bằng chứng |
| --- | --- | --- | --- |
| AC-01 | Dữ liệu ban đầu / thao tác / kết quả quan sát được | Unit, DB hoặc browser phù hợp | Not-run cho đến khi thực hiện |

## Bàn giao

- Lệnh đã chạy và kết quả thực tế:
- Chưa kiểm tra, lý do, giới hạn:
- Chuyển dữ liệu, rollout/rollback nếu liên quan:
- Quyết định nghiệp vụ còn cần người dùng trả lời:
