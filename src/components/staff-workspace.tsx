import AccessShell from './access-shell';
import { sessionClient } from '@/lib/auth/server';
import { type Actor } from '@/lib/auth/permissions';
import { money, dateLabel } from '@/lib/data';

const titles:Record<string,string>={dashboard:'Công việc của tôi',parts:'Phụ tùng & tồn kho',repairs:'Phiếu sửa chữa',customers:'Khách hàng',sales:'Bán tại quầy'};
export default async function StaffWorkspace({actor,section}:{actor:Actor;section:string}) {
  const client = await sessionClient();
  const repairs = ['dashboard','repairs'].includes(section) ? await client.from('repair_orders').select('id,code,issue,status,created_at').order('created_at',{ascending:false}).limit(100) : null;
  const parts = ['dashboard','parts'].includes(section) ? await client.from('parts').select('id,sku,name,sale_price').eq('active',true).order('name').limit(100) : null;
  const stocks = section==='parts' ? await client.from('stock_balances').select('part_id,quantity').limit(1000) : null;
  const customers = section==='customers' ? await client.from('customers').select('id,name,phone').order('name').limit(100) : null;
  const error = repairs?.error || parts?.error || stocks?.error || customers?.error;
  return <AccessShell actor={actor} section={section} title={titles[section]||'Công việc'}><div className="info-banner"><div><strong>Dữ liệu từ Supabase theo quyền tài khoản</strong><p>{actor.role==='technician'?'Chỉ hiển thị phiếu sửa được giao cho bạn. ':' ' }Các thao tác ghi nghiệp vụ đang được hoàn thiện; màn hình này chưa cho phép chốt bán, xuất kho hoặc thu tiền.</p></div></div>{error ? <div role="alert" className="auth-error">Không tải được dữ liệu theo quyền hiện tại. Vui lòng thử lại hoặc liên hệ quản lý.</div> : <>
  {section==='dashboard'&&<section className="mini-stats"><div className="mini-stat"><span>Phiếu có quyền xem (tối đa 100)</span><strong>{repairs?.data?.length||0}</strong></div><div className="mini-stat"><span>Phụ tùng được tải (tối đa 100)</span><strong>{parts?.data?.length||0}</strong></div></section>}
  {section==='repairs'&&<section className="panel"><div className="table-scroll"><table><thead><tr><th>MÃ PHIẾU</th><th>YÊU CẦU</th><th>TRẠNG THÁI</th><th>NGÀY TẠO</th></tr></thead><tbody>{repairs?.data?.map(r=><tr key={r.id}><td>SC-{r.code}</td><td>{r.issue}</td><td>{({received:'Tiếp nhận',awaiting_approval:'Chờ duyệt',in_progress:'Đang sửa',ready:'Chờ bàn giao',delivered:'Đã bàn giao',cancelled:'Đã hủy'} as Record<string,string>)[r.status]||r.status}</td><td>{dateLabel(r.created_at)}</td></tr>)}</tbody></table>{!repairs?.data?.length&&<p className="empty">Chưa có phiếu sửa chữa trong phạm vi được cấp.</p>}</div></section>}
  {section==='parts'&&<section className="panel"><div className="table-scroll"><table><thead><tr><th>MÃ HÀNG</th><th>PHỤ TÙNG</th><th>GIÁ BÁN</th><th>TỒN KHO</th></tr></thead><tbody>{parts?.data?.map(p=><tr key={p.id}><td>{p.sku}</td><td>{p.name}</td><td>{money(p.sale_price)}</td><td>{stocks?.data?.find(s=>s.part_id===p.id)?.quantity||0}</td></tr>)}</tbody></table>{!parts?.data?.length&&<p className="empty">Chưa có phụ tùng.</p>}</div></section>}
  {section==='customers'&&<section className="panel"><div className="table-scroll"><table><thead><tr><th>KHÁCH HÀNG</th><th>SỐ ĐIỆN THOẠI</th></tr></thead><tbody>{customers?.data?.map(c=><tr key={c.id}><td>{c.name}</td><td>{c.phone}</td></tr>)}</tbody></table>{!customers?.data?.length&&<p className="empty">Chưa có khách hàng.</p>}</div></section>}
  {section==='sales'&&<section className="panel"><p className="empty">Tài khoản bán hàng đã được cấp quyền vào khu vực này. Backend chốt đơn và thu tiền chưa được triển khai.</p></section>}
  </>}</AccessShell>;
}
