import { mkdirSync, writeFileSync } from 'node:fs';
import { normalizePartText } from '../src/features/parts/catalog.ts';

// Editorial Vietnamese vocabulary, not an OEM SKU/fitment catalogue.
const sources = {
  wave: 'https://boonsiewhonda.com.my/wp-content/uploads/2023/08/Wave-Alpha-Parts-Catalogue_18K71LM2.pdf',
  vario: 'https://boonsiewhonda.com.my/wp-content/uploads/2022/11/vario160-parts.pdf',
  yamaha: 'https://global.yamaha-motor.com/business/mc/customer-support/vn/genuine-parts/',
};
const groups = [
  ['Động cơ', 'wave', `Pít tông|Piston
Xéc măng|Bạc piston;Bạc xéc măng
Chốt pít tông|Ắc piston
Phe chốt pít tông|Phe piston
Xi lanh|Nòng xi lanh;Nòng máy
Đầu xi lanh|Đầu bò;Quy lát
Nắp đầu xi lanh|Nắp đầu bò
Trục khuỷu|Dên;Cốt máy
Thanh truyền|Tay dên
Trục cam|Cốt cam
Cò mổ|Cò xupáp
Xupáp nạp|Súp páp hút;Van nạp
Xupáp xả|Súp páp xả;Van xả
Lò xo xupáp|Lò xo súp páp
Ống dẫn hướng xupáp|Ống dẫn hướng súp páp
Phớt xupáp|Phốt ghít;Phớt súp páp
Sên cam|Xích cam
Nhông cam|Bánh răng cam
Tăng sên cam|Tăng xích cam
Thanh dẫn hướng sên cam|Thanh dẫn hướng xích cam
Bơm nhớt|Bơm dầu động cơ
Lưới lọc nhớt|Lưới lọc dầu
Que thăm nhớt|Thước thăm dầu
Ốc xả nhớt|Bu lông xả dầu
Lốc máy trái|Cácte trái
Lốc máy phải|Cácte phải
Nắp lốc máy trái|Nắp máy trái
Nắp lốc máy phải|Nắp máy phải`],
  ['Gioăng, phớt và vòng bi', 'wave', `Gioăng đầu xi lanh|Ron quy lát;Gioăng quy lát
Gioăng chân xi lanh|Ron chân nòng
Gioăng nắp đầu xi lanh|Ron nắp đầu bò
Gioăng lốc máy|Ron lốc máy
Gioăng cổ pô|Ron cổ pô
Gioăng cổ hút|Ron cổ hút
Phớt trục khuỷu|Phốt dên
Phớt cần số|Phốt cần số
Phớt trục đạp|Phốt giò đạp
Phớt nhông trước|Phốt nhông tải
Vòng bi trục khuỷu|Bạc đạn dên
Vòng bi bánh trước|Bạc đạn bánh trước
Vòng bi bánh sau|Bạc đạn bánh sau
Vòng bi hộp số|Bạc đạn hộp số
Vòng bi cổ lái|Bạc đạn cổ;Chén cổ
Vòng đệm chữ O|O-ring;Ron O
Phớt bụi bánh xe|Phốt bụi bánh xe`],
  ['Truyền động xe số', 'wave', `Bộ nhông sên dĩa|Bộ nhông xích;Nhông sên đĩa
Nhông trước|Nhông tải;Nhông nhỏ
Dĩa sau|Đĩa tải;Nhông sau
Sên tải|Xích tải;Sên truyền động
Khóa sên|Mắt nối xích
Tăng sên bánh sau|Tăng xích bánh sau
Cao su đùm|Cao su giảm chấn đùm
Bộ ly hợp|Bộ nồi;Bộ côn
Lá bố ly hợp|Lá bố nồi;Lá côn
Lá thép ly hợp|Lá sắt nồi
Lò xo ly hợp|Lò xo nồi
Chuông ly hợp xe số|Chuông nồi xe số
Bố ba càng xe số|Guốc ly hợp xe số
Dây côn|Dây ly hợp
Tay côn|Tay ly hợp
Trục sơ cấp hộp số|Trục chính hộp số
Trục thứ cấp hộp số|Trục phụ hộp số
Bánh răng hộp số|Nhông hộp số
Càng gạt số|Heo số
Trống số|Heo quay số
Cần số|Cần sang số
Trục cần số|Cốt cần số
Cần đạp khởi động|Giò đạp;Cần đạp máy
Trục đạp khởi động|Cốt giò đạp
Lò xo cần đạp|Lò xo giò đạp`],
  ['Truyền động xe ga', 'vario', `Dây curoa|Dây đai truyền động;Dây cu roa
Bi nồi|Bi văng;Bi nồi trước
Chén bi nồi|Đĩa dẫn động biến tốc
Má puly trước|Mặt puly trước
Ống lót puly trước|Ắc nồi trước
Miếng trượt nồi trước|Kẹp trượt nồi
Puly sau|Bộ puly bị động
Bố ba càng xe ga|Bố nồi sau;Guốc ly hợp xe ga
Chuông nồi xe ga|Chuông ly hợp xe ga
Lò xo bố ba càng|Lò xo guốc ly hợp
Lò xo nồi sau|Lò xo trụ nồi sau
Vòng bi nồi sau|Bạc đạn nồi sau
Phớt láp|Phốt láp
Bánh răng láp|Bánh răng truyền động cuối
Trục láp|Trục truyền động cuối
Gioăng nắp láp|Ron hộp láp
Lọc gió hộp truyền động|Lọc gió nồi`],
  ['Nhiên liệu và khí nạp', 'vario', `Bơm xăng|Cụm bơm nhiên liệu
Lọc xăng|Lọc nhiên liệu
Kim phun|Béc phun;Vòi phun xăng
Họng ga|Thân bướm ga
Cổ hút|Ống góp nạp
Ống dẫn xăng|Ống nhiên liệu
Bình xăng|Bình nhiên liệu
Nắp bình xăng|Nắp thùng xăng
Phao xăng|Cảm biến mức nhiên liệu
Dây ga|Dây tay ga
Hộp lọc gió|Bầu lọc gió
Ống hút gió|Ống dẫn khí nạp
Cảm biến vị trí bướm ga|TPS
Cảm biến áp suất khí nạp|MAP
Cảm biến nhiệt độ khí nạp|IAT
Van điều khiển không tải|Van garanti`],
  ['Nhiên liệu và khí nạp', 'wave', `Bộ chế hòa khí|Bình xăng con;Chế hoà khí
Phao bình xăng con|Phao chế hòa khí
Kim phao|Van kim bình xăng con
Giclơ chính|Jiclơ chính;Béc xăng chính
Giclơ không tải|Jiclơ phụ;Béc garanti
Van xăng|Khóa xăng
Dây le gió|Dây kéo e`],
  ['Làm mát', 'vario', `Két nước|Két làm mát
Bơm nước|Bơm nước làm mát
Quạt két nước|Quạt làm mát
Nắp két nước|Nắp két làm mát
Bình nước phụ|Bình giãn nở nước làm mát
Ống nước làm mát|Ống két nước
Van hằng nhiệt|Thermostat
Cảm biến nhiệt độ nước làm mát|ECT
Phớt bơm nước|Phốt bơm nước
Gioăng bơm nước|Ron bơm nước`],
  ['Điện và ắc quy', 'wave', `Ắc quy|Bình điện;Bình ắc quy
Mâm lửa|Cuộn phát điện;Stator
Vô lăng mâm lửa|Rotor máy phát
Bộ chỉnh lưu điều áp|Cục sạc;Bộ sạc
Mô tơ đề|Củ đề;Máy đề
Chổi than mô tơ đề|Than đề
Rơ le đề|Rơle khởi động
Bánh răng đề|Nhông đề
Ly hợp đề một chiều|Bi đề;Bộ ly hợp khởi động
Cầu chì|Cầu chì điện
Hộp cầu chì|Đế cầu chì
Bộ dây điện|Bó dây điện;Dây điện sườn
Còi|Kèn xe
Ổ khóa điện|Khóa máy
Công tắc đề|Nút đề
Công tắc đèn|Nút bật đèn
Công tắc xi nhan|Công tắc báo rẽ
Công tắc còi|Nút còi
Công tắc đèn phanh|Công tắc đèn thắng
Công tắc chân chống|Công tắc chống nghiêng`],
  ['Đánh lửa', 'wave', `Bugi|Bu gi;Spark plug
Chụp bugi|Nắp bugi
Mô bin sườn|Bô bin đánh lửa;Cuộn đánh lửa
Bộ đánh lửa CDI|IC đánh lửa
Cuộn kích lửa|Cuộn nhận tín hiệu đánh lửa`],
  ['Điện tử điều khiển', 'vario', `Bộ điều khiển động cơ|ECU;ECM
Cảm biến ô xy|Cảm biến oxy;O2 sensor
Cảm biến vị trí trục khuỷu|CKP
Cảm biến tốc độ xe|VSS
Cảm biến nghiêng xe|Cảm biến góc nghiêng
Cụm khóa thông minh|Bộ khóa smartkey
Bộ điều khiển khóa thông minh|SCU
Điều khiển khóa thông minh|Remote smartkey
Cảm biến tốc độ bánh xe|Cảm biến ABS
Bộ điều khiển ABS|Cụm ABS`],
  ['Đèn và đồng hồ', 'wave', `Cụm đèn pha|Đèn trước
Bóng đèn pha|Bóng đèn trước
Cụm đèn hậu|Đèn sau
Bóng đèn hậu|Bóng đèn sau
Đèn xi nhan trước|Đèn báo rẽ trước
Đèn xi nhan sau|Đèn báo rẽ sau
Bóng đèn xi nhan|Bóng báo rẽ
Rơ le xi nhan|Cục chớp;Rơle báo rẽ
Cụm đồng hồ|Bảng đồng hồ
Dây công tơ mét|Dây đồng hồ tốc độ
Nhông công tơ mét|Bánh răng đồng hồ tốc độ`],
  ['Hệ thống phanh', 'vario', `Má phanh đĩa|Bố thắng đĩa;Má phanh dầu
Đĩa phanh trước|Đĩa thắng trước
Đĩa phanh sau|Đĩa thắng sau
Heo phanh trước|Heo dầu trước;Cùm phanh trước
Heo phanh sau|Heo dầu sau;Cùm phanh sau
Pít tông heo phanh|Piston heo dầu
Phớt heo phanh|Phốt heo dầu
Chốt má phanh|Chốt bố thắng
Tổng phanh trước|Heo cái trước;Xi lanh phanh chính trước
Tổng phanh sau|Heo cái sau;Xi lanh phanh chính sau
Ống dầu phanh|Dây dầu thắng
Bình dầu phanh|Bình dầu thắng
Tay phanh trái|Tay thắng trái
Tay phanh phải|Tay thắng phải
Vòng tín hiệu ABS|Đĩa xung ABS`],
  ['Hệ thống phanh', 'wave', `Má phanh tang trống|Bố thắng đùm;Bố thắng cơ
Dây phanh|Dây thắng
Cần đạp phanh|Cần đạp thắng;Bàn đạp phanh
Đũa phanh|Đũa thắng
Cam phanh|Cốt má phanh
Lò xo má phanh|Lò xo bố thắng
Lò xo bàn đạp phanh|Lò xo cần thắng`],
  ['Lốp và ruột xe', 'yamaha', `Lốp trước|Vỏ trước
Lốp sau|Vỏ sau
Săm trước|Ruột trước
Săm sau|Ruột sau
Van lốp không săm|Van vòi vỏ không ruột`],
  ['Bánh xe và hệ thống treo', 'wave', `Vành trước|Niềng trước
Vành sau|Niềng sau
Mâm trước|Bánh mâm trước
Mâm sau|Bánh mâm sau
Đùm trước|Moay ơ trước
Đùm sau|Moay ơ sau
Nan hoa|Căm xe
Đầu nan hoa|Ốc căm
Trục bánh trước|Cốt bánh trước
Trục bánh sau|Cốt bánh sau
Ống căn bánh xe|Ống chỉ bánh xe
Phuộc trước|Giảm xóc trước
Phuộc sau|Giảm xóc sau
Ty phuộc trước|Ống trượt phuộc trước
Phớt dầu phuộc trước|Phốt dầu phuộc trước
Phớt bụi phuộc trước|Phốt bụi phuộc trước
Lò xo phuộc trước|Lò xo giảm xóc trước
Chảng ba|Cụm cổ lái
Gắp sau|Càng sau
Bạc gắp|Ống lót gắp
Trục gắp|Cốt gắp
Tay lái|Ghi đông
Bao tay trái|Tay nắm trái
Ống tay ga|Cùm tay ga`],
  ['Khung gầm', 'vario', `Chân chống đứng|Chống giữa
Chân chống nghiêng|Chống bên
Lò xo chân chống đứng|Lò xo chống giữa
Lò xo chân chống nghiêng|Lò xo chống bên
Gác chân trước|Để chân trước
Gác chân sau|Để chân sau
Cao su gác chân|Cao su để chân
Yên xe|Cụm yên
Khóa yên|Ổ khóa yên
Dây mở yên|Cáp khóa yên
Bản lề yên|Bát bản lề yên
Tay dắt sau|Cản sau
Gương trái|Kính chiếu hậu trái
Gương phải|Kính chiếu hậu phải`],
  ['Dàn áo và thân xe', 'vario', `Mặt nạ trước|Ốp mặt nạ
Ốp đầu trước|Ốp đầu đèn trước
Ốp đầu sau|Ốp đồng hồ
Yếm trái|Bửng trái
Yếm phải|Bửng phải
Ốp hông trái|Dè sườn trái
Ốp hông phải|Dè sườn phải
Ốp đuôi|Ốp đuôi xe
Dè trước|Chắn bùn trước
Dè sau|Chắn bùn sau
Sàn để chân|Sàn chân xe ga
Cốp xe|Hộc chứa đồ dưới yên
Móc treo đồ|Móc treo túi
Ốp pô|Che pô;Tấm chắn nhiệt ống xả
Pát biển số|Giá biển số
Chốt nhựa dàn áo|Nút nhựa dàn áo`],
  ['Ống xả', 'wave', `Ống xả|Pô xe;Bô xe
Cổ ống xả|Cổ pô
Ống giảm thanh|Bầu pô
Pát treo ống xả|Giá treo pô`],
  ['Bộ lọc', 'yamaha', `Lọc gió|Tấm lọc gió
Lọc nhớt|Lọc dầu`],
];
const terms = groups.flatMap(([category, source, lines]) => lines.split('\n').map(line => {
  const [name, aliases = ''] = line.split('|');
  return { name, aliases: aliases.split(';').filter(Boolean), category, source_url: sources[source] };
}));
const seen = new Set();
for (const term of terms) {
  const key = normalizePartText(term.name);
  if (!key || seen.has(key) || term.name.length > 180) throw new Error(`Invalid/duplicate name: ${term.name}`);
  seen.add(key);
}
const quote = value => `'${value.replaceAll("'", "''")}'`;
const rows = terms.map(t => `('name', ${quote(t.name)}, ARRAY[${t.aliases.map(quote).join(', ')}]::text[], ${quote(t.category)}, ${quote(t.source_url)})`);
const categories = [...new Set(terms.map(t => t.category))];
rows.push(...categories.map(name => `('category', ${quote(name)}, '{}'::text[], NULL, NULL)`));
const sql = `-- Reference vocabulary only: no parts, prices, stock or permissions changed.
-- Generated by scripts/build-part-reference.mjs; reviewed 2026-10-26.
BEGIN;
INSERT INTO public.part_terms AS existing (kind, name, aliases, category, source_url)
VALUES
${rows.join(',\n')}
ON CONFLICT (kind, normalized_name) DO UPDATE SET
  aliases = ARRAY(SELECT DISTINCT a FROM unnest(existing.aliases || EXCLUDED.aliases) AS a ORDER BY a),
  category = COALESCE(existing.category, EXCLUDED.category),
  source_url = COALESCE(existing.source_url, EXCLUDED.source_url);
COMMIT;
`;
mkdirSync('data', { recursive: true });
writeFileSync('data/part-name-reference.json', JSON.stringify({ reviewedOn: '2026-10-26', scope: 'Generic Vietnamese reference names; no OEM codes or model/year fitment claims. Aliases are editorial local terminology.', sources, terms }, null, 2) + '\n');
writeFileSync('supabase/migrations/202610260002_part_reference_vocabulary.sql', sql);
console.log(JSON.stringify({ names: terms.length, categories: categories.length, aliases: terms.reduce((n,t) => n+t.aliases.length,0) }));
