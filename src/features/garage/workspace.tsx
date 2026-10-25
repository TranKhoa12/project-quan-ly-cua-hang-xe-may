'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Plus, RefreshCw, Printer, Trash2 } from 'lucide-react';
import { money, dateLabel } from '@/lib/data';
import type { Actor } from '@/lib/auth/permissions';
import { garageCommand } from './actions';
import { repairLabels, type GarageSnapshot, type RepairRow, type StockPart, type Store } from './types';

type Payload=Record<string,unknown>;
const text=(f:FormData,k:string)=>String(f.get(k)||'').trim();
const num=(f:FormData,k:string)=>Number(f.get(k)||0);
export function CommandForm({action,build,children,label,onSuccess,reset=false}:{action:string;build:(f:FormData)=>Payload;children:ReactNode;label:string;onSuccess?:()=>void;reset?:boolean}) {
 const router=useRouter();const ref=useRef<HTMLFormElement>(null);
 const request=useRef<{key:string;json:string;payload:Payload}|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(''),[uncertain,setUncertain]=useState(false);
 async function send(payload:Payload){
  if(busy)return;
  const json=JSON.stringify(payload);
  if(!request.current||request.current.json!==json)request.current={key:crypto.randomUUID(),json,payload};
  setBusy(true);setError('');setSuccess('');
  try{
   const result=await garageCommand(action,payload,request.current.key);
   if(result.error){setError(result.error);setUncertain(!!result.uncertain);return;}
   request.current=null;setUncertain(false);setSuccess('Đã lưu trên Supabase.');if(reset)ref.current?.reset();
   onSuccess?.();router.refresh();
   if(action==='settings')window.dispatchEvent(new Event('shop-settings-updated'));
  }catch{setError('Chưa xác nhận kết quả. Thử lại cùng yêu cầu bên dưới.');setUncertain(true);}
  finally{setBusy(false);}
 }
 return <form ref={ref} aria-busy={busy} className="live-form" onSubmit={e=>{e.preventDefault();void send(build(new FormData(e.currentTarget)));}}>
  <fieldset disabled={busy||uncertain}>{children}<button className="button primary" type="submit">{busy?'Đang lưu…':label}</button></fieldset>
  {error&&<p className="auth-error" role="alert">{error}</p>}{success&&<p className="auth-success" role="status">{success}</p>}
  {uncertain&&<button className="button" type="button" disabled={busy} onClick={()=>request.current&&void send(request.current.payload)}>Kiểm tra lại cùng yêu cầu</button>}
 </form>;
}
function Field({label,...props}:{label:string}&React.InputHTMLAttributes<HTMLInputElement>){return <label className="field">{label}<input {...props}/></label>;}
function Method(){return <label className="field">Phương thức<select name="method" defaultValue="cash"><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản</option></select></label>;}
function Panel({title,children}:{title:string;children:ReactNode}){return <section className="panel live-panel"><h3>{title}</h3>{children}</section>;}
function Empty(){return <p className="empty">Chưa có dữ liệu.</p>;}
function Pager({count,page}:{count:number;page:number}){
 const router=useRouter(),path=usePathname(),params=useSearchParams();
 function go(n:number){const p=new URLSearchParams(params);p.set('page',String(n));router.push(`${path}?${p}`);}
 return <div className="live-pager"><span>{count} bản ghi · Trang {page+1}</span><button className="button" disabled={!page} onClick={()=>go(page-1)}>Trước</button><button className="button" disabled={(page+1)*50>=count} onClick={()=>go(page+1)}>Sau</button></div>;
}
function StoreHeader({store}:{store:Store}){return <div className="live-print-store"><h3>{store.name}</h3><p>{store.phone} {store.address}</p></div>;}
function PrintButton(){return <button className="button no-print" type="button" onClick={e=>{const container=e.currentTarget.closest('.live-document');container?.classList.add('printing');window.print();container?.classList.remove('printing');}}><Printer size={16}/>In phiếu</button>;}
type DraftLine={partId:string;quantity:number;cost:number};
function LineEditor({parts,lines,setLines,purchase=false}:{parts:StockPart[];lines:DraftLine[];setLines:(v:DraftLine[])=>void;purchase?:boolean}){
 const update=(index:number,v:Partial<DraftLine>)=>setLines(lines.map((line,i)=>i===index?{...line,...v}:line));
 return <div className="live-lines">{lines.map((line,i)=><div className="live-line" key={i}>
  <label className="field">Phụ tùng<select aria-label={`Phụ tùng dòng ${i+1}`} required value={line.partId} onChange={e=>update(i,{partId:e.target.value})}><option value="">Chọn phụ tùng</option>{parts.filter(p=>p.id===line.partId||!lines.some(l=>l.partId===p.id)).map(p=><option key={p.id} value={p.id}>{p.name} · {p.sku} · Còn {p.stock}</option>)}</select></label>
  <Field label="Số lượng" aria-label={`Số lượng dòng ${i+1}`} type="number" min={1} max={1000000} step={1} required value={line.quantity} onChange={e=>update(i,{quantity:Number(e.target.value)})}/>
  {purchase?<Field label="Giá nhập/đơn vị (đ)" type="number" min={0} max={1000000000} step={1} required value={line.cost} onChange={e=>update(i,{cost:Number(e.target.value)})}/>:<p className="live-line-price">{money(parts.find(p=>p.id===line.partId)?.price||0)}/đơn vị</p>}
  <button type="button" className="icon-button" aria-label={`Xóa dòng ${i+1}`} onClick={()=>setLines(lines.filter((_,j)=>j!==i))}><Trash2 size={17}/></button>
 </div>)}<button className="button" type="button" disabled={lines.length>=100||!parts.length} onClick={()=>setLines([...lines,{partId:'',quantity:1,cost:0}])}><Plus size={16}/>Thêm dòng phụ tùng</button></div>;
}
function Stats({data}:{data:GarageSnapshot}){
 const s=data.summary;if(!s)return <p className="form-hint">Dữ liệu hiển thị theo quyền của bạn.</p>;
 return <div className="live-stats">{[
  ['Doanh thu thuần',money(s.sales+s.repairs-s.refunds)],['Tiền thực thu',money(s.received)],['Tiền thực chi',money(s.spent)],['Lợi nhuận gộp',money(s.sales+s.repairs-s.refunds-s.cost)],
  ['Phải thu sửa chữa',money(s.receivable)],['Phải trả nhà cung cấp',money(s.payable)],['Giá trị tồn kho',money(s.inventoryValue)],['Xe đang xử lý',String(s.activeRepairs)],
 ].map(([label,value])=><div className="mini-stat" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>;
}
function Dates(){const router=useRouter(),path=usePathname(),params=useSearchParams();const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Ho_Chi_Minh'});return <form className="live-dates" onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);const p=new URLSearchParams();p.set('from',text(f,'from'));p.set('to',text(f,'to'));router.push(`${path}?${p}`);}}><Field label="Từ ngày" name="from" type="date" defaultValue={params.get('from')||`${today.slice(0,7)}-01`} required/><Field label="Đến ngày" name="to" type="date" defaultValue={params.get('to')||today} required/><button className="button">Xem báo cáo</button></form>;}
export default function LiveWorkspace({actor,section,data,error}:{actor:Actor;section:string;data?:GarageSnapshot;error?:string}){
 const router=useRouter();
 return <div className="live-workspace"><div className="catalog-toolbar"><p>Dữ liệu đồng bộ từ Supabase</p><button className="button" onClick={()=>router.refresh()}><RefreshCw size={16}/>Tải lại</button></div>
 {error||!data?<p role="alert" className="auth-error">{error||'Không tải được dữ liệu.'}</p>:<>
 {data.partCount>data.parts.length&&<p className="auth-error">Đang tải {data.parts.length}/{data.partCount} phụ tùng để lựa chọn. Cần thu hẹp danh mục trước khi thao tác hàng ngoài danh sách.</p>}
 {['dashboard','cashbook','reports'].includes(section)&&<><Dates/><Stats data={data}/><p className="form-hint">Doanh thu, thu/chi và lợi nhuận theo khoảng ngày đã chọn (giờ Việt Nam). Công nợ, tồn kho và số xe là số hiện tại. Lợi nhuận gộp chưa trừ chi phí vận hành.</p></>}
 {section==='dashboard'&&<Panel title="Phiếu sửa chữa mới nhất"><RepairList data={data} actor={actor}/></Panel>}
 {section==='customers'&&<Customers data={data}/>}
 {section==='purchases'&&<Purchases data={data}/>}
 {section==='sales'&&<Sales data={data} manager={actor.role==='manager'}/>}
 {section==='repairs'&&<Repairs data={data} actor={actor}/>}
 {section==='cashbook'&&<Cashbook data={data}/>}
 {section==='settings'&&<Panel title="Thông tin cửa hàng"><CommandForm key={data.store.version} action="settings" label="Lưu thông tin cửa hàng" build={f=>({name:text(f,'name'),phone:text(f,'phone'),address:text(f,'address'),version:data.store.version})}><Field label="Tên cửa hàng" name="name" required maxLength={100} defaultValue={data.store.name}/><Field label="Số điện thoại" name="phone" maxLength={30} defaultValue={data.store.phone}/><Field label="Địa chỉ" name="address" maxLength={250} defaultValue={data.store.address}/></CommandForm><p className="form-hint">Thông tin lưu chung cho cửa hàng. Phiếu đã chốt giữ thông tin tại thời điểm tạo.</p></Panel>}
 {section==='parts'&&<Panel title="Tồn kho"><div className="table-scroll"><table><thead><tr><th>Phụ tùng</th><th>Giá bán</th><th>Tồn</th></tr></thead><tbody>{data.parts.map(p=><tr key={p.id}><td>{p.name}<small className="subtext">{p.sku}</small></td><td>{money(p.price)}</td><td>{p.stock}</td></tr>)}</tbody></table></div></Panel>}
 </> }</div>;
}
function Customers({data}:{data:GarageSnapshot}){return <div className="live-grid"><Panel title="Thêm khách hàng"><CommandForm action="customer" label="Lưu khách hàng" reset build={f=>({name:text(f,'name'),phone:text(f,'phone'),address:text(f,'address')})}><Field label="Tên khách" name="name" required maxLength={180}/><Field label="Số điện thoại" name="phone" maxLength={30}/><Field label="Địa chỉ" name="address" maxLength={250}/></CommandForm></Panel><Panel title="Thêm xe cho khách"><CommandForm action="vehicle" label="Lưu xe" reset build={f=>({customerId:text(f,'customerId'),plate:text(f,'plate'),model:text(f,'model')})}><label className="field">Khách hàng<select name="customerId" required defaultValue=""><option value="">Chọn khách trên trang này</option>{data.customers?.map(c=><option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}</select></label><Field label="Biển số" name="plate" required maxLength={30}/><Field label="Hãng / dòng xe" name="model" required maxLength={100}/></CommandForm></Panel><Panel title="Khách hàng và xe">{!data.customers?.length?<Empty/>:data.customers.map(c=><details key={c.id} className="live-document"><summary>{c.name} · {c.phone}</summary><p>{c.address}</p>{data.vehicles?.filter(v=>v.customer_id===c.id).map(v=><p key={v.id}>{v.plate} · {v.model}</p>)}</details>)}<Pager count={data.customerCount||0} page={data.page}/>{(data.vehicleCount||0)>(data.vehicles?.length||0)&&<p className="form-hint">Danh sách lựa chọn xe giới hạn 2.000 xe mới nhất.</p>}</Panel></div>;}
function Purchases({data}:{data:GarageSnapshot}){
 const [lines,setLines]=useState<DraftLine[]>([{partId:'',quantity:1,cost:0}]);const total=lines.reduce((s,l)=>s+l.quantity*l.cost,0);
 return <><div className="live-grid"><Panel title="Nhà cung cấp mới"><CommandForm action="supplier" label="Lưu nhà cung cấp" reset build={f=>({name:text(f,'name'),phone:text(f,'phone')})}><Field label="Tên nhà cung cấp" name="name" required maxLength={180}/><Field label="Số điện thoại" name="phone" maxLength={30}/></CommandForm></Panel><Panel title="Nhận hàng vào kho"><CommandForm action="purchase" label="Chốt nhập hàng" build={f=>({supplierId:text(f,'supplierId'),lines,paid:num(f,'paid'),method:text(f,'method')})} onSuccess={()=>setLines([{partId:'',quantity:1,cost:0}])} reset><label className="field">Nhà cung cấp<select name="supplierId" required defaultValue=""><option value="">Chọn nhà cung cấp</option>{data.suppliers?.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><LineEditor parts={data.parts} lines={lines} setLines={setLines} purchase/><p>Tổng nhập: <strong>{money(total)}</strong></p><Field label="Đã trả nhà cung cấp (đ)" type="number" name="paid" min={0} max={total} step={1} defaultValue={0} required/><Method/></CommandForm></Panel></div><Panel title="Phiếu nhập đã chốt">{data.purchases?.map(p=><details key={p.id} className="live-document"><summary>NK-{p.code} · {p.supplier_snapshot.name} · {money(p.total)} · {dateLabel(p.created_at)}</summary><StoreHeader store={p.store_snapshot}/>{p.items.map((i,n)=><p key={n}>{i.name} × {i.quantity} · {money(i.cost)}/đơn vị</p>)}<p>Đã trả: {money(p.paid)} · Còn phải trả: <strong>{money(p.total-p.paid)}</strong></p>{p.paid<p.total&&<CommandForm key={p.paid} action="purchase_payment" label="Ghi nhận trả nhà cung cấp" build={f=>({id:p.id,amount:num(f,'amount'),method:text(f,'method')})}><Field label="Số tiền trả thêm (đ)" name="amount" type="number" min={1} max={p.total-p.paid} step={1} required/><Method/></CommandForm>}<PrintButton/></details>)}{!data.purchases?.length&&<Empty/>}<Pager count={data.purchaseCount||0} page={data.page}/></Panel><MovementTable data={data}/></>;
}
function Sales({data,manager}:{data:GarageSnapshot;manager:boolean}){
 const [lines,setLines]=useState<DraftLine[]>([{partId:'',quantity:1,cost:0}]);
 return <><Panel title="Bán phụ tùng tại quầy"><CommandForm action="sale" label="Chốt đơn và thu đủ tiền" reset onSuccess={()=>setLines([{partId:'',quantity:1,cost:0}])} build={f=>({customer:text(f,'customer'),method:text(f,'method'),lines:lines.map(l=>({partId:l.partId,quantity:l.quantity,price:data.parts.find(p=>p.id===l.partId)?.price??-1}))})}><Field label="Tên khách (để trống nếu khách lẻ)" name="customer" maxLength={180}/><LineEditor parts={data.parts} lines={lines} setLines={setLines}/><p>Tổng dự tính: <strong>{money(lines.reduce((s,l)=>s+l.quantity*(data.parts.find(p=>p.id===l.partId)?.price||0),0))}</strong></p><Method/></CommandForm></Panel><Panel title="Đơn bán đã chốt">{data.sales?.map(s=><details className="live-document" key={s.id}><summary>BH-{s.code} · {s.customer_name} · {money(s.total)} · {dateLabel(s.created_at)}</summary><StoreHeader store={s.store_snapshot}/><p>Đã thu đủ · {s.payment_method==='cash'?'Tiền mặt':'Chuyển khoản'}</p>{s.items.map(i=><div key={i.id}><p>{i.name} × {i.quantity} · {money(i.price)}/đơn vị {i.returned>0&&`· Đã trả ${i.returned}`}</p>{manager&&i.returned<i.quantity&&<details className="no-print"><summary>Nhận trả hàng / hoàn tiền</summary><CommandForm key={i.returned} action="sale_return" label="Nhận trả và hoàn tiền" build={f=>({itemId:i.id,quantity:num(f,'quantity'),reason:text(f,'reason'),resellable:f.get('resellable')==='on',method:text(f,'method')})}><Field label="Số lượng trả" type="number" name="quantity" min={1} max={i.quantity-i.returned} step={1} required/><Field label="Lý do" name="reason" required maxLength={500}/><label className="live-check"><input name="resellable" type="checkbox" required/>Đã kiểm tra hàng còn bán được và nhập lại kho</label><Method/></CommandForm></details>}</div>)}<PrintButton/></details>)}{!data.sales?.length&&<Empty/>}<Pager count={data.saleCount||0} page={data.page}/></Panel></>;
}
function Repairs({data,actor}:{data:GarageSnapshot;actor:Actor}){return <>{actor.role!=='technician'&&<Panel title="Tiếp nhận xe"><CommandForm action="repair" label="Tạo phiếu sửa chữa" reset build={f=>({vehicleId:text(f,'vehicleId'),issue:text(f,'issue'),km:num(f,'km'),technicianId:text(f,'technicianId')})}><label className="field">Khách và xe<select name="vehicleId" required defaultValue=""><option value="">Chọn xe đã lưu</option>{data.vehicles?.map(v=><option key={v.id} value={v.id}>{v.plate} · {v.model} · {v.customer}</option>)}</select></label><Field label="Yêu cầu / tình trạng xe" name="issue" required maxLength={2000}/><Field label="Số km lúc nhận" name="km" type="number" min={0} max={10000000} step={1} defaultValue={0} required/><label className="field">Thợ phụ trách<select name="technicianId" defaultValue=""><option value="">Chưa phân công</option>{data.technicians?.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></label></CommandForm><p className="form-hint">Chưa có xe? Thêm khách và xe tại mục Khách hàng & xe trước.</p></Panel>}<Panel title="Phiếu sửa chữa"><RepairList data={data} actor={actor}/></Panel></>;}
function RepairList({data,actor}:{data:GarageSnapshot;actor:Actor}){return <>{data.repairs?.map(r=><details className="live-document" key={r.id}><summary>SC-{r.code} · {r.customer.plate} · {r.customer.name} · {repairLabels[r.status]}</summary><RepairDetail key={r.version} r={r} data={data} actor={actor}/></details>)}{!data.repairs?.length&&<Empty/>}<Pager count={data.repairCount||0} page={data.page}/></>;}
function RepairDetail({r,data,actor}:{r:RepairRow;data:GarageSnapshot;actor:Actor}){
 const [lines,setLines]=useState<DraftLine[]>(r.quote?.items.map(l=>({partId:l.partId,quantity:l.quantity,cost:0}))||[]);
 const front=actor.role!=='technician';const payload={id:r.id,version:r.version};
 return <><StoreHeader store={r.store_snapshot}/><p>{r.customer.model} · {r.customer.plate} · {r.customer.name} {r.customer.phone}</p><p>Yêu cầu: {r.issue} · Km: {r.km} · Thợ: {r.technician||'Chưa phân công'}</p>
 {actor.role==='manager'&&!['delivered','cancelled'].includes(r.status)&&<details className="no-print"><summary>Phân công thợ</summary><CommandForm action="assign" label="Lưu phân công" build={f=>({...payload,technicianId:text(f,'technicianId')})}><label className="field">Thợ phụ trách<select name="technicianId" required defaultValue={r.technician_id||''}><option value="">Chọn thợ</option>{data.technicians?.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></label></CommandForm></details>}
 {front&&['received','awaiting_approval'].includes(r.status)&&<details open={!r.quote} className="no-print"><summary>{r.quote?'Sửa báo giá (tạo phiên bản mới)':'Lập báo giá'}</summary><CommandForm action="quote" label="Lưu báo giá chờ khách duyệt" build={f=>({...payload,labor:num(f,'labor'),lines:lines.map(l=>({partId:l.partId,quantity:l.quantity}))})}><LineEditor parts={data.parts} lines={lines} setLines={setLines}/><Field label="Tiền công (đ)" name="labor" type="number" min={0} max={1000000000} step={1} defaultValue={r.quote?.labor||0} required/></CommandForm></details>}
 {r.quote&&<div><h4>Báo giá phiên bản {r.quote.version}</h4>{r.quote.items.map(l=><p key={l.partId}>{l.name} × {l.quantity} · {money(l.price)}/đơn vị</p>)}<p>Tiền công: {money(r.quote.labor)} · Tổng: <strong>{money(r.quote.total)}</strong></p>{r.quote.approved_at&&<p>Khách xác nhận: {r.quote.customer_confirmation} · {dateLabel(r.quote.approved_at)}</p>}</div>}
 {front&&r.status==='awaiting_approval'&&<CommandForm action="approve" label="Ghi nhận khách duyệt và bắt đầu sửa" build={f=>({...payload,confirmation:text(f,'confirmation')})}><Field label="Người xác nhận và cách xác nhận (trực tiếp / điện thoại…)" name="confirmation" required maxLength={500}/></CommandForm>}
 <h4>Phụ tùng đã xuất</h4>{r.items.length?r.items.map(i=><p key={i.id}>{i.name} × {i.quantity}</p>):<p>Chưa xuất phụ tùng.</p>}
 {front&&r.status==='in_progress'&&!!r.quote?.items.length&&!r.items.length&&<CommandForm action="issue" label="Xuất toàn bộ phụ tùng theo báo giá" build={()=>payload}><p className="form-hint">Chỉ xuất khi kho đủ toàn bộ số lượng đã duyệt.</p></CommandForm>}
 {r.status==='in_progress'&&<CommandForm action="transition" label="Xác nhận chất lượng, chuyển chờ bàn giao" build={f=>({...payload,status:'ready',quality:text(f,'quality')})}><Field label="Kết quả kiểm tra chất lượng" name="quality" required maxLength={500}/></CommandForm>}
 {front&&r.quote&&<p>Đã thu: {money(r.paid||0)} · Còn phải thu: <strong>{money(r.quote.total-(r.paid||0))}</strong></p>}
 {front&&['in_progress','ready'].includes(r.status)&&r.quote&&r.quote.total>(r.paid||0)&&<CommandForm action="payment" label="Ghi nhận thu tiền sửa chữa" build={f=>({...payload,amount:num(f,'amount'),method:text(f,'method')})}><Field label="Số tiền thu (đ)" name="amount" type="number" min={1} max={r.quote.total-(r.paid||0)} step={1} required/><Method/></CommandForm>}
 {front&&r.status==='ready'&&<CommandForm action="transition" label="Xác nhận bàn giao xe" build={()=>({...payload,status:'delivered'})}><p className="form-hint">Chỉ bàn giao khi đã thu đủ.</p></CommandForm>}
 {actor.role==='manager'&&['received','awaiting_approval'].includes(r.status)&&<details className="no-print"><summary>Hủy phiếu chưa phát sinh</summary><CommandForm action="transition" label="Hủy phiếu" build={f=>({...payload,status:'cancelled',reason:text(f,'reason')})}><Field label="Lý do hủy" name="reason" required maxLength={500}/></CommandForm></details>}
 {r.quality_note&&<p>Ghi chú: {r.quality_note}</p>}<PrintButton/></>;
}
function Cashbook({data}:{data:GarageSnapshot}){return <><Panel title="Ghi chi phí vận hành"><CommandForm action="expense" label="Ghi khoản chi" reset build={f=>({reason:text(f,'reason'),amount:num(f,'amount'),method:text(f,'method')})}><Field label="Nội dung chi" name="reason" maxLength={500} required/><Field label="Số tiền (đ)" name="amount" type="number" min={1} max={1000000000} step={1} required/><Method/></CommandForm></Panel><Panel title="Sổ thu chi"><div className="table-scroll"><table><thead><tr><th>Ngày</th><th>Nội dung / chứng từ</th><th>Thu</th><th>Chi</th><th>Phương thức</th><th>Người ghi</th></tr></thead><tbody>{data.cash?.map(c=><tr key={c.id}><td>{dateLabel(c.created_at)}</td><td>{c.reason}<small className="subtext">{c.purchase_id||c.sale_id||c.repair_id}</small></td><td>{c.direction==='in'?money(c.amount):'—'}</td><td>{c.direction==='out'?money(c.amount):'—'}</td><td>{c.method==='cash'?'Tiền mặt':'Chuyển khoản'}</td><td>{c.actor}</td></tr>)}</tbody></table></div>{!data.cash?.length&&<Empty/>}<Pager count={data.cashCount||0} page={data.page}/></Panel></>;}
export function MovementTable({data}:{data:GarageSnapshot}){return <Panel title="Lịch sử nhập / xuất / điều chỉnh"><div className="table-scroll"><table><thead><tr><th>Ngày</th><th>Phụ tùng</th><th>Thay đổi</th><th>Lý do</th></tr></thead><tbody>{data.movements?.map(m=><tr key={m.id}><td>{dateLabel(m.created_at)}</td><td>{m.name}</td><td>{m.quantity>0?'+':''}{m.quantity}</td><td>{m.reason}</td></tr>)}</tbody></table></div>{!data.movements?.length&&<Empty/>}<Pager count={data.movementCount||0} page={data.page}/></Panel>;}
export function InventoryTools({data}:{data:GarageSnapshot}){
 const [id,setId]=useState('');const selected=data.parts.find(p=>p.id===id);
 return <div className="live-workspace"><Panel title="Quản lý tồn kho">
 <label className="field">Phụ tùng<select value={id} onChange={e=>setId(e.target.value)}><option value="">Chọn phụ tùng</option>{data.parts.map(p=><option key={p.id} value={p.id}>{p.name} · {p.sku}</option>)}</select></label>
 {selected&&<div className="live-grid"><div><h4>Kiểm kê tồn kho</h4><CommandForm key={`count-${id}-${selected.stock_version}`} action="adjustment" label="Duyệt điều chỉnh tồn kho" build={f=>({partId:id,counted:num(f,'counted'),expected:selected.stock,stockVersion:selected.stock_version,reason:text(f,'reason')})}>
 <p>Tồn đang hiển thị: {selected.stock}</p><Field label="Số lượng thực đếm" type="number" name="counted" min={0} max={1000000} step={1} required/><Field label="Lý do chênh lệch" name="reason" maxLength={500} required/>
 </CommandForm></div><div><h4>Giá bán và cảnh báo tồn</h4><CommandForm key={`price-${id}-${selected.price}-${selected.min}`} action="part_settings" label="Lưu giá bán và ngưỡng tồn" build={f=>({partId:id,expectedPrice:selected.price,expectedMin:selected.min,price:num(f,'price'),min:num(f,'min')})}>
 <Field label="Giá bán (đ)" name="price" type="number" min={0} max={1000000000} step={1} defaultValue={selected.price} required/><Field label="Ngưỡng tồn tối thiểu" name="min" type="number" min={0} max={1000000} step={1} defaultValue={selected.min} required/>
 </CommandForm></div></div>}</Panel><MovementTable data={data}/></div>;
}
