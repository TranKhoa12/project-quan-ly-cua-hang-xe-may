# Từ điển phụ tùng dùng chung

## Mục tiêu và phạm vi
- Quản lý nhập/sửa tên, nhóm, thương hiệu từ nguồn gợi ý thống nhất; mọi nhân viên có quyền dùng tên gọi khác để tìm mặt hàng thật ở chức năng được phép.
- Khôi phục 253 tên tham chiếu và mục dầu nhớt có trước đây sau thao tác TRUNCATE; tổng 254 tên, 18 nhóm, 12 thương hiệu, 375 alias. Nguồn tên: `data/part-name-reference.json`; nhóm/brand bổ sung: `data/part-dictionary-extra.json`. Chưa phải catalogue OEM đầy đủ theo đời xe hoặc khả năng lắp lẫn.
- Theo nghiệp vụ danh mục/nhập hàng/bán hàng/báo giá/kiểm kê trong `docs/business-workflows.md`.

## Luồng và trạng thái
- Nhập hàng → mặt hàng mới; Phụ tùng & kho → sửa thông tin: combobox tên, nhóm, thương hiệu dùng chung helper; mở danh sách khi ô trống, tìm không dấu/tên gọi khác, dùng bàn phím hoặc nhập tên riêng. Chọn tên tham chiếu gợi ý nhóm, không suy đoán thương hiệu.
- Tìm hàng thật ở Nhập hàng, Phụ tùng & kho, Bán tại quầy, chọn vật tư báo giá sửa chữa và kiểm kê: tìm cả tên chuẩn/alias/mã/nhóm/brand, chỉ trả hàng thật có trong danh mục hiện tải. Không tạo hàng từ thao tác tìm/chọn tham chiếu.
- Tìm không thấy cho đổi từ khóa; form tạo/sửa vẫn cho nhập mới. Lỗi tải từ điển được báo, không fallback sang dữ liệu kinh doanh local. Không thay mẫu in/chứng từ cũ.
- Tavily là tra cứu bổ sung, không tự ghi kết quả vào từ điển. Tên đã lưu qua RPC có sẵn tiếp tục được học sau khi server xác nhận như hành vi hiện tại.

## Backend và dữ liệu
- Tập trung ở bảng `part_terms` hiện có, loader dùng session/RLS và đọc từng 500 dòng, tổng tối đa 10.000, tránh giới hạn mặc định PostgREST; UI nhận dữ liệu từ server, không đóng gói JSON tham chiếu vào bundle client.
- Migration `202611050001_shared_part_dictionary.sql` chỉ upsert từ điển; gộp alias, giữ ID/category/source đã có. Không xóa term riêng của cửa hàng, không sửa schema/quyền, không tạo parts/cost/tồn/chứng từ/thu chi.
- Generator riêng `scripts/build-shared-dictionary.mjs`; `--check` đối chiếu tái tạo. Không chạy generator cũ để sửa migration đã áp dụng.
- Không thay giao dịch tiền/kho, idempotency hoặc snapshot/version chứng từ. SQL upsert nguyên tử, chạy lại giữ kết quả, không cần khóa nghiệp vụ mới.

## Quyền và nguồn
- RLS `part_terms` giữ nguyên: staff active có session đọc, anon/tài khoản bị thu hồi bị chặn; client không có INSERT/UPDATE/DELETE. Ghi học từ qua RPC quản lý hiện hữu.
- Thương hiệu xác nhận từ trang hãng, từng URL trong JSON. Nguồn chỉ chứng minh hãng/sản phẩm, không gắn brand với tên phụ tùng chung. Không lưu secret hoặc gọi API ngoài khi dùng từ điển.
- Nguồn gốc tên/catalogue và alias địa phương phân biệt: alias là biên tập tiếng Việt, không phải tên được hãng chứng nhận. Bộ này là cơ sở mở rộng, không tuyên bố bao phủ mọi thương hiệu/phụ tùng trên thị trường.

## Tiêu chí nghiệm thu
| ID | Tiêu chí | Bằng chứng |
| --- | --- | --- |
| DICT-01 | Key duy nhất, nhóm đầy đủ, nguồn brand, SQL tái tạo | Unit |
| DICT-02 | Tìm alias 3 loại, không suy đoán brand, không gộp khác hãng | Unit helper |
| DICT-03 | Browse khi trống, chọn tên/nhóm/brand trong form | Harness browser cách ly |
| DICT-04 | Apply/reapply giữ ID, dữ liệu nghiệp vụ và quyền RLS | PostgreSQL cách ly |
| DICT-05 | Các màn hình tìm cùng tên gọi khác | Wiring + browser/unit; ghi rõ phạm vi khi bàn giao |

## Chuyển giao
- Apply migration sau khi kiểm tra dry-run đúng file mới. Từ điển nhỏ không phải dữ liệu hàng mẫu. Không seed production nghiệp vụ hoặc reset database.
- Rollback frontend về bản trước vẫn đọc được bảng cùng schema. Không cần xóa dữ liệu từ điển khi quay lui.
- Kết quả lệnh, apply production, deploy và phần chưa kiểm tra được ghi trong `docs/implementation-status.md` khi hoàn tất.

## Bằng chứng 05/11/2026
- `npm.cmd test`: 40 pass; `npm.cmd run test:inventory`: 140 pass trên PostgreSQL native cách ly, có kiểm tra dictionary RLS và migration chạy lại giữ ID/alias.
- `npm.cmd run test:purchase-ui`: 18 nhóm pass; `node tests/browser/parts-pagination.mjs`: pass cả alias/sửa tên gợi ý nhóm/giữ thương hiệu; `node tests/browser/sale-layout.mjs`: 10 kiểm tra pass, gồm tìm alias ở POS và picker chung báo giá/kiểm kê. Browser dùng component/CSS thật, dữ liệu tổng hợp và server giả lập.
- Typecheck/build/skills checker pass. Chưa chạy browser E2E Auth/database thật; picker kiểm tra cách ly, chưa hoàn tất phiếu sửa/kiểm kê thật qua browser.
- Supabase đã áp dụng duy nhất migration mới, không seed nghiệp vụ; từ 45 lên 329 mục gồm 288 tên, 23 nhóm, 18 brand (giữ mục riêng cửa hàng). Số lượng parts/cost/balance 31 mỗi bảng, movements 33, payments 0, profiles/settings 1 mỗi bảng không đổi.
- Vercel `dpl_AuMvDYiDbhkBpt1xnvLCv33F9kyM` READY, alias `https://dangkietmoto.vercel.app`.
