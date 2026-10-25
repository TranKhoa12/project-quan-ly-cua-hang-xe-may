# MotoCare — Quản lý cửa hàng xe máy

Khung ứng dụng Next.js bằng tiếng Việt, dành cho một cửa hàng sửa xe và bán phụ tùng tại quầy. Chưa triển khai bán online.

## Bộ quy trình làm việc cho AI

Điểm vào là [AGENTS.md](AGENTS.md). Các skill theo dự án nằm trong `skills/`; được định tuyến qua AGENTS.md, chưa cài thành skill toàn cục của tài khoản.

| Skill | Khi dùng |
| --- | --- |
| [garage-delivery](skills/garage-delivery/SKILL.md) | Đặc tả và triển khai tính năng xuyên UI/backend |
| [garage-ui](skills/garage-ui/SKILL.md) | Luồng giao diện, form, trạng thái, nhận diện và mẫu in |
| [garage-backend](skills/garage-backend/SKILL.md) | Schema, hợp đồng, RPC, transaction, khóa và chống lặp |
| [garage-security](skills/garage-security/SKILL.md) | Auth, quyền, RLS, dữ liệu nhạy cảm và kiểm chứng từ chối |
| [garage-testing](skills/garage-testing/SKILL.md) | Unit, integration, RLS, đồng thời, browser và bằng chứng nghiệm thu |

Tài liệu dùng chung:

- [Quy trình nghiệp vụ đầy đủ](docs/business-workflows.md).
- [Quy trình giao diện](docs/ui-process.md) và [backend](docs/backend-process.md).
- [Mô hình bảo mật](docs/security-model.md) và [chiến lược kiểm thử](docs/testing-strategy.md).
- [Quy trình phát hành](docs/release-process.md) và [hiện trạng triển khai](docs/implementation-status.md).
- [Mẫu đặc tả tính năng](docs/templates/feature-spec.md) và [đặc tả đổi tên cửa hàng](docs/features/store-identity.md).

Ví dụ giao việc cho AI:

> Đọc AGENTS.md, skills/garage-delivery/SKILL.md và các skill liên quan. Triển khai luồng bán tại quầy nối Supabase theo docs/business-workflows.md. Viết đặc tả, quyền và transaction chống ghi lặp, kiểm thử theo tầng phù hợp. Báo chính xác phần đã chạy/chưa chạy và cập nhật docs/implementation-status.md; không gọi localStorage là backend thật.

Các tài liệu quy trình mô tả hệ thống đích. Chúng không có nghĩa toàn bộ backend, bảo mật hoặc E2E đã được triển khai.

## Đổi tên cửa hàng

Vào `/settings`, đổi tên/điện thoại/địa chỉ và bấm **Lưu thông tin**. Menu, lời chào, tab, footer và phiếu in dùng cấu hình đã lưu. Bản nháp chưa lưu không thay nhận diện. Hiện cấu hình vẫn lưu trên trình duyệt; chưa đồng bộ nhiều thiết bị hoặc lưu snapshot chứng từ.

## Chạy ứng dụng

Đăng nhập đã được triển khai. Xem [thiết lập Auth và phân quyền](docs/auth-setup.md). Không cần email cá nhân; người dùng đăng nhập bằng tên và mật khẩu.

Để tạo quản lý đầu tiên, chạy `npm.cmd run auth:create-manager` trong Terminal và tự nhập mật khẩu. Script cần `.env.local` có key quản trị phía server; key này đã được cấu hình cục bộ, không được commit hoặc đưa vào client.

Khuyến nghị Node.js 22.18 trở lên để chạy cả ứng dụng và bộ kiểm thử TypeScript bằng Node.

```powershell
npm.cmd install
npm.cmd run dev
```

Mở http://localhost:3000. Trên shell không phải PowerShell có thể dùng `npm` thay `npm.cmd`.

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run skills:check
npm.cmd run build
npm.cmd start
```

## Các màn hình

- `/`: tổng quan, doanh thu trong ngày, tiến độ sửa chữa, cảnh báo tồn kho.
- `/repairs`: tìm/lọc phiếu, tiếp nhận xe, phân công thợ, cập nhật tiến độ, xuất phụ tùng, ghi nhận thu thêm, in phiếu.
- `/sales`: chọn phụ tùng, chỉnh số lượng, thanh toán mẫu, trừ tồn và xem lịch sử bán.
- `/parts`: danh mục Supabase thật; tên/nhóm/thương hiệu gợi ý và cho nhập mới; cảnh báo trùng, lưu từ mới sau khi tạo thành công. Tạo danh mục có tồn 0, không nhập hàng.
- `/purchases`: nhập hàng và xem lịch sử giao dịch kho.
- `/customers`: thêm khách và xe, xem số phiếu sửa và khoản còn phải thu.
- `/cashbook`: tổng hợp tiền đã thu; chưa có nghiệp vụ chi.
- `/reports`: tổng hợp doanh thu, lợi nhuận gộp bán tại quầy và giá trị tồn.
- `/login`: đăng nhập bằng tên tài khoản/mật khẩu.
- `/account`: đổi mật khẩu và đăng xuất.
- `/staff`: quản lý tạo tài khoản, gán vai trò, bật/tắt và đặt lại mật khẩu.
- `/settings`: thông tin cửa hàng, xuất/nhập JSON, xóa dữ liệu nghiệp vụ cục bộ.

## Trạng thái dữ liệu — cần đọc trước khi dùng

**Đây là khung tương tác, chưa phải hệ thống sẵn sàng vận hành kinh doanh.**

Ứng dụng khởi tạo trống, không còn khách hàng, xe, phụ tùng, phiếu sửa, đơn bán hoặc nhân viên mẫu. Khi mở phiên bản mới, key `motocare-demo-v1` được xóa; dữ liệu mới lưu bằng `motocare-workspace-v2`. Thông tin cửa hàng được giữ riêng. Fixture tổng hợp chỉ nằm trong tests, không được import vào ứng dụng hoặc seed lên Supabase.

Đã có đăng nhập, guard server, quyền Auth/RLS, quản lý nhân viên và tạo danh mục phụ tùng thật. Trang `/parts` lưu Supabase; dữ liệu cũ từ prototype không tự chuyển lên database. Nghiệp vụ ghi kho/tiền cũ vẫn chỉ là prototype của quản lý, được tách localStorage theo user ID; nhân viên có workspace đọc Supabase theo quyền. Chưa đồng bộ các thao tác ghi nghiệp vụ và chưa dùng được như sổ sách kinh doanh thật.

Phiếu mẫu dùng ngày tạo để phân nhóm báo cáo; khi triển khai thật phải dùng ngày chốt, ngày bàn giao và ngày thanh toán tương ứng. Một khách trong UI mẫu gắn một xe; schema thật đã tách nhiều xe/khách. Nhập kho mẫu chưa tạo khoản chi/phải trả nhà cung cấp. Chưa có giữ kho, trả hàng, duyệt báo giá, hóa đơn điện tử, kiểm kê hoặc xử lý mất mạng. Chưa có lợi nhuận sửa chữa vì cần chốt giá vốn từng lần xuất dùng.

## Chuẩn bị Supabase

1. Tạo project Supabase riêng cho môi trường phát triển.
2. Sao chép `.env.example` thành `.env.local`, điền URL và publishable key của project. Không đặt service-role key vào biến `NEXT_PUBLIC_*`.
3. Chạy migration trong `supabase/migrations/` trên project mới bằng quy trình migration của Supabase.
4. Tạo tài khoản Auth và cấp profile quản lý bằng công cụ quản trị tin cậy; không cho phép người dùng tự gán role.

Client Auth/server nằm tại `src/lib/auth/server.ts`. Auth, quản lý nhân viên và màn hình đọc theo role đã nối Supabase; các thao tác ghi nghiệp vụ cũ chưa được chuyển sang backend. `src/lib/supabase.ts` là client nền cũ, không phải luồng Auth mới.

Đã áp dụng hai migration nền và Auth/phân quyền, có RPC quản lý profile/limiter; chặn ghi profile trực tiếp. Chưa có RPC chốt đơn, thu tiền hoặc xuất kho. Không nới RLS để đưa phần prototype vào sản xuất.

Các bước tiếp theo để vận hành thật: Auth/phiên server; quyền từng nghiệp vụ; RPC giao dịch nguyên tử, khóa dòng và chống ghi lặp; UI gọi backend; lịch sử thanh toán/giá vốn; duyệt/hủy/trả/kiểm kê; kiểm thử đồng thời và RLS; sao lưu và thử khôi phục database cùng file Storage.

## Triển khai Vercel

Đưa repository lên tài khoản Git của bạn, import trong Vercel và chọn framework Next.js. Build command `npm run build`, thư mục gốc là thư mục dự án này. Nếu chưa cấu hình backend, bản triển khai vẫn chỉ là demo localStorage. Chọn gói phù hợp hoạt động thương mại khi sử dụng thật.

Supabase đã liên kết và cấu hình Auth. Website đã triển khai lên https://dangkietmoto.vercel.app, có ba biến môi trường production theo `docs/auth-setup.md`; key quản trị lưu dạng Secret và chỉ dùng server. Source mới vẫn cần một deployment thành công để xuất hiện trên URL thật; build cục bộ không tự cập nhật Vercel.

## Kiểm tra đã thực hiện

- TypeScript: `npm.cmd run typecheck`.
- Build production: `npm.cmd run build`.
- Kiểm thử: `npm.cmd test` — giá/tồn/nhập hàng với fixture chỉ dành cho test, cấu hình cửa hàng, khởi tạo trống và dọn storage demo cũ.
- Skill theo dự án: `npm.cmd run skills:check` — frontmatter đơn giản, tên skill và tham chiếu tài liệu. Checker Node thay thế kiểm tra cấu trúc cục bộ do Python không khả dụng; không phải chứng nhận hành vi AI hoặc bảo mật.
- HTTP smoke check cho 10 trang chính.

Đã áp dụng migration trên Supabase thật, kiểm tra Auth/RLS bằng JWT và HTTP local; chưa kiểm tra tương tác/hiển thị trong trình duyệt. Xem `docs/auth-setup.md` để phân biệt phạm vi đã kiểm chứng.
