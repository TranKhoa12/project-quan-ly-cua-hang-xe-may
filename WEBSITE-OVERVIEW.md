# Khung tổng quan website quản lý cửa hàng xe máy

## 1. Phạm vi

Hệ thống quản lý nội bộ cho một cửa hàng sửa xe máy và bán phụ tùng. Có tài khoản quản lý và nhân viên; mỗi người sử dụng tài khoản riêng. Chưa triển khai bán hàng online, giỏ hàng, giao hàng hoặc thanh toán trực tuyến.

Đây là tài liệu định hướng triển khai, chưa phải ứng dụng hoạt động.

## 2. Cấu trúc màn hình

| Mục | Đường dẫn dự kiến | Nội dung |
| --- | --- | --- |
| Đăng nhập | /login | Đăng nhập bằng tài khoản được quản lý cấp, khôi phục mật khẩu |
| Tổng quan | /dashboard | Xe đang sửa, xe chờ giao, doanh thu và tiền thu hôm nay, hàng sắp hết |
| Phiếu sửa chữa | /repairs | Danh sách, tìm theo biển số/số điện thoại, lọc trạng thái, tạo phiếu |
| Chi tiết sửa chữa | /repairs/[id] | Khách và xe, tình trạng, báo giá, thợ phụ trách, công sửa, phụ tùng, thanh toán, lịch sử |
| Bán tại quầy | /sales/new | Tìm hoặc quét mã phụ tùng, giỏ bán, khách hàng, giảm giá theo quyền, thanh toán, in phiếu |
| Lịch sử bán hàng | /sales | Đơn bán, chi tiết, thanh toán bổ sung, hủy/trả hàng theo quyền |
| Phụ tùng | /parts | Mã hàng, tên, nhóm, hãng, xe tương thích, đơn vị, giá bán, ngưỡng tồn tối thiểu |
| Dịch vụ sửa chữa | /services | Danh mục công sửa, giá tham khảo, chính sách bảo hành |
| Kho | /inventory | Tồn thực tế, đang giữ, có thể sử dụng, lịch sử nhập/xuất, cảnh báo tồn thấp |
| Nhập hàng | /purchases | Phiếu nhập, nhà cung cấp, chi tiết phụ tùng và giá nhập |
| Kiểm kê | /inventory/counts | Đếm thực tế, đối chiếu, duyệt chênh lệch và lý do điều chỉnh |
| Khách hàng | /customers | Liên hệ, danh sách xe, lịch sử sửa và mua, số dư cần thanh toán |
| Xe | /vehicles | Biển số, hãng/dòng xe, đời xe nếu có, số km theo từng lần tiếp nhận, lịch sử sửa |
| Nhà cung cấp | /suppliers | Liên hệ, lịch sử nhập hàng, số dư phải trả |
| Thu chi | /cashbook | Thu tiền, chi tiền, phương thức thanh toán, đối tượng và chứng từ liên quan |
| Công nợ | /debts | Khách còn nợ, còn nợ nhà cung cấp, lịch sử trả và đối soát |
| Báo cáo | /reports | Doanh thu, tiền đã thu, giá vốn, lợi nhuận gộp, chi phí, tồn kho |
| Nhân viên | /staff | Cấp/vô hiệu hóa tài khoản, vai trò, quyền, phân công công việc |
| Cài đặt | /settings | Thông tin cửa hàng, đánh số phiếu, mẫu in, phương thức thanh toán |
| Nhật ký | /audit-logs | Ai thay đổi gì, lúc nào; hủy phiếu, đổi giá, chỉnh kho, phân quyền |

Menu có thể gom thành: Tổng quan; Sửa chữa; Bán hàng; Hàng hóa & kho; Khách hàng & xe; Nhà cung cấp; Tài chính; Báo cáo; Quản trị.

## 3. Bố cục giao diện

- Thanh bên: menu theo quyền người dùng.
- Thanh trên: tìm nhanh biển số, số điện thoại, mã phụ tùng; tài khoản đang đăng nhập.
- Nội dung: tiêu đề, nút thao tác chính, bộ lọc, bảng dữ liệu có phân trang.
- Nút nhanh: Tiếp nhận xe, Bán phụ tùng, Nhập hàng.
- Màn hình máy tính ưu tiên thao tác tại quầy; điện thoại ưu tiên xem và cập nhật công việc của thợ.
- Tiếng Việt, tiền VND, hiển thị thời gian theo Asia/Ho_Chi_Minh; lưu thời điểm giao dịch bằng timestamptz.

Trang tổng quan hiển thị riêng doanh thu và số tiền thực thu. Chỉ quản lý được xem giá vốn, lợi nhuận và các chỉ số tài chính nhạy cảm.

## 4. Luồng vận hành

### Sửa chữa

Tiếp nhận → Kiểm tra/báo giá → Chờ khách duyệt → Đang sửa → Chờ bàn giao → Đã bàn giao.

Có nhánh hủy kèm lý do. Trạng thái thanh toán độc lập: chưa thu, thu một phần, đã thu. Có thể bàn giao khi còn nợ nếu người có quyền cho phép.

Phiếu ghi khách hàng, xe, số km, yêu cầu, tình trạng ban đầu, ảnh tùy chọn, thợ phụ trách, công sửa, phụ tùng, báo giá và lần khách xác nhận. Phát sinh sau báo giá phải được ghi nhận và xác nhận bổ sung.

Thêm phụ tùng vào báo giá chưa làm giảm tồn thực tế. Khi duyệt có thể giữ hàng; khi giao phụ tùng cho thợ phải ghi xuất kho và giải phóng phần giữ tương ứng. Trả phụ tùng chưa dùng phải có giao dịch nhập trả. Hủy phiếu không tự động nhập lại phụ tùng đã lắp vào xe.

### Bán tại quầy

Tạo đơn nháp → Chọn phụ tùng → Chốt đơn/xuất kho → Thu tiền → In phiếu.

Cho phép khách lẻ không lưu thông tin. Đơn bán chịu phải gắn khách hàng. Một đơn có thể có nhiều lần thanh toán. Hủy hoặc trả đơn đã chốt phải tạo nghiệp vụ đảo/điều chỉnh, không xóa lịch sử.

### Nhập hàng và kiểm kê

Phiếu nhập nháp → Kiểm tra → Xác nhận nhận hàng/tăng kho → Ghi nhận thanh toán hoặc phải trả.

Kiểm kê → Ghi số lượng thực tế → Tính chênh lệch → Quản lý duyệt → Tạo giao dịch điều chỉnh kho.

## 5. Phân quyền

| Nhóm quyền | Quản lý | Nhân viên bán hàng | Thợ sửa xe |
| --- | --- | --- | --- |
| Quản lý tài khoản/cấu hình | Có | Không | Không |
| Xem giá vốn/lợi nhuận | Có | Mặc định không | Không |
| Tạo bán hàng/thu tiền | Có | Có theo quyền | Mặc định không |
| Tạo/cập nhật phiếu sửa | Có | Có theo quyền | Phiếu được giao, trường được phép |
| Hủy phiếu, hoàn tiền, chỉnh giá | Có | Cần quyền riêng | Không |
| Nhập hàng/kiểm kê | Có | Có thể nhập nháp theo quyền | Không |
| Duyệt điều chỉnh kho | Có | Không | Không |

Quản lý và nhân viên là hai nhóm tài khoản chính. Nhân viên được gán tập quyền bán hàng, sửa xe hoặc cả hai. Áp dụng kiểm tra quyền ở server và database, không chỉ ẩn menu. Không cho đăng ký tài khoản nhân viên công khai.

## 6. Khung dữ liệu

| Nhóm | Bảng dự kiến |
| --- | --- |
| Tài khoản | profiles, roles, permissions, user_roles, role_permissions |
| Khách và xe | customers, vehicles |
| Danh mục | parts, part_categories, vehicle_models, part_compatibilities, services, suppliers |
| Sửa chữa | repair_orders, repair_labor_items, repair_part_items, repair_assignments, repair_status_history |
| Bán hàng | sales_orders, sales_order_items, sales_returns, sales_return_items |
| Mua hàng | purchase_orders, purchase_order_items |
| Kho | stock_movements, stock_reservations, inventory_counts, inventory_count_items |
| Tài chính | payments, expenses |
| Kiểm soát | audit_logs, store_settings |

Quan hệ chính: một khách có nhiều xe; một xe có nhiều phiếu sửa; một phiếu có nhiều công sửa/phụ tùng; một chứng từ có nhiều lần thanh toán. Thanh toán phải tham chiếu chứng từ bằng khóa ngoại và ràng buộc rõ ràng. Công nợ tính từ chứng từ hợp lệ và thanh toán/điều chỉnh liên quan, không sửa tay một số dư riêng.

Các bảng nghiệp vụ cần mã phiếu, thời gian tạo, người tạo và dấu vết cập nhật. Lưu giá, tên hàng/dịch vụ, mức giảm và giá vốn tại thời điểm chốt; đổi danh mục không được thay đổi lịch sử. Dùng numeric hoặc số nguyên VND phù hợp cho tiền, không dùng số thực dấu phẩy động.

Tồn kho dựa trên giao dịch nhập/xuất đã xác nhận. Có thể duy trì bảng số dư để truy vấn nhanh nhưng phải cập nhật cùng giao dịch. Tồn có thể dùng = tồn thực tế - số lượng đang giữ. Giá vốn đề xuất tính bình quân gia quyền theo từng lần nhập; quy tắc trả hàng phải giữ được giá vốn liên quan.

## 7. Kiến trúc kỹ thuật

- Next.js + TypeScript: giao diện và xử lý nghiệp vụ phía server.
- Tailwind CSS + shadcn/ui: bộ thành phần giao diện.
- Supabase PostgreSQL: dữ liệu, ràng buộc, giao dịch và phân quyền RLS.
- Supabase Auth: đăng nhập và phiên làm việc.
- Supabase Storage: ảnh xe/phụ tùng, chứng từ trong bucket có quyền phù hợp.
- Vercel: triển khai website và hàm phía server.

Khung thư mục dự kiến:

```text
src/
  app/
    (auth)/login/
    (management)/
      dashboard/
      repairs/
      sales/
      parts/
      services/
      inventory/
      purchases/
      customers/
      vehicles/
      suppliers/
      cashbook/
      debts/
      reports/
      staff/
      settings/
      audit-logs/
  components/
    ui/
    layout/
  features/
    repairs/
    sales/
    inventory/
    payments/
  lib/
    supabase/
    auth/
    validation/
supabase/
  migrations/
  seed.sql
```

Chốt đơn, xuất/giữ kho, thanh toán và hủy nghiệp vụ phải chạy trong giao dịch nguyên tử, kiểm soát đồng thời và chống xử lý lặp. Không cho sửa tồn trực tiếp từ trình duyệt. Khóa bí mật quyền cao chỉ đặt ở server. Môi trường thử nghiệm và dữ liệu thật phải tách riêng; không dùng dữ liệu khách thật làm seed.

## 8. Trình tự triển khai và nghiệm thu

1. Nền tảng: đăng nhập, quyền, bố cục, cấu hình cửa hàng, migrations.
2. Danh mục và kho: phụ tùng, dịch vụ, khách/xe, nhà cung cấp, nhập hàng, lịch sử tồn.
3. Vận hành: sửa chữa, bán tại quầy, xuất/trả kho, thu tiền và in phiếu.
4. Hoàn thiện: kiểm kê, công nợ, hoàn trả, báo cáo và nhật ký.
5. Chạy thử bằng dữ liệu mẫu, nhập tồn đầu kỳ, đối soát trước khi sử dụng thật.

Nghiệm thu bắt buộc: hai người cùng bán món cuối không gây âm kho; bấm chốt hai lần không tạo giao dịch trùng; thu một phần thể hiện đúng công nợ; trả/hủy không làm mất lịch sử; nhân viên không truy cập được dữ liệu vượt quyền; báo cáo khớp chứng từ; sao lưu có thử khôi phục. Sao lưu file Storage cần thực hiện riêng với sao lưu database.

Giai đoạn đầu yêu cầu Internet. Phiếu in là chứng từ nội bộ; tích hợp hóa đơn điện tử là phạm vi riêng nếu cửa hàng cần. Chưa có website bán online, lương/hoa hồng, nhiều chi nhánh hoặc đồng bộ offline.
