'use client';
import {useEffect,useRef,useState} from 'react';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {ArrowLeft,ReceiptText,Search,ShoppingCart} from 'lucide-react';
import SalePos from './sale-pos';
import SaleReceipt from './sale-receipt';
import SaleReceiptPrint from './sale-receipt-print';
import {CommandForm} from './command-form';
import {normalizePartText} from '@/features/parts/catalog';
import {money} from '@/lib/data';
import type {GarageSnapshot,SaleRow} from './types';

const saleDateTime=(value:string)=>new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});

export default function SalesScreen({data,manager}:{data:GarageSnapshot;manager:boolean}){
 const params=useSearchParams(),router=useRouter(),path=usePathname();
 const history=params.get('view')==='history';
 // Keep a visited POS mounted so switching tabs never discards an unsaved/pending cart.
 const [visited,setVisited]=useState(!history);
 useEffect(()=>{if(!history)setVisited(true);},[history]);
 function tab(value:boolean){const query=new URLSearchParams(params);query.set('view',value?'history':'sell');router.replace(`${path}?${query}`,{scroll:false});}
 return <section className="sales-screen"><nav className="sales-view-tabs" aria-label="Chức năng bán hàng"><button type="button" aria-pressed={!history} onClick={()=>tab(false)}><ShoppingCart size={18}/>Bán hàng</button><button type="button" aria-pressed={history} onClick={()=>tab(true)}><ReceiptText size={18}/>Đơn đã bán <span>{data.saleCount||0}</span></button></nav>
  {visited&&<div hidden={history}><SalePos data={data}/></div>}
  {history&&<SalesHistory data={data} manager={manager}/>}
 </section>;
}
export function SalesHistory({data,manager}:{data:GarageSnapshot;manager:boolean}){
 const [query,setQuery]=useState(''),[method,setMethod]=useState(''),[selected,setSelected]=useState<string|null>(null);
 const router=useRouter(),params=useSearchParams(),path=usePathname(),heading=useRef<HTMLHeadingElement>(null),buttons=useRef(new Map<string,HTMLButtonElement>());
 const sales=data.sales||[],count=data.saleCount||0,page=data.page,totalPages=Math.max(1,Math.ceil(count/50));
 const filtered=sales.filter(s=>normalizePartText(`BH-${s.code} ${s.customer_name}`).includes(normalizePartText(query))&&(!method||s.payment_method===method));
 const detail=sales.find(s=>s.id===selected);
 useEffect(()=>{if(selected){heading.current?.focus();heading.current?.scrollIntoView({block:'start',behavior:'smooth'});}},[selected]);
 function go(next:number){const q=new URLSearchParams(params);q.set('view','history');q.set('page',String(next));setQuery('');setSelected(null);router.push(`${path}?${q}`);}
 function close(){const id=selected;setSelected(null);requestAnimationFrame(()=>{if(id)buttons.current.get(id)?.focus();});}
 return <section className="sales-history-panel" aria-label="Đơn đã bán">
  {detail?<><div className="sales-history-heading"><div><button type="button" className="sales-back" onClick={close}><ArrowLeft size={16}/>Danh sách đơn</button><h2 tabIndex={-1} ref={heading}>Đơn BH-{detail.code}</h2><p>{saleDateTime(detail.created_at)} · {detail.customer_name}</p></div><SaleReceiptPrint sale={detail}/></div><div className="sales-order-receipt"><SaleReceipt sale={detail}/></div>{manager&&<SaleReturns sale={detail}/>}</>:<>
   <header className="sales-history-heading"><div><h2>Đơn đã bán</h2><p>Xem chi tiết, in lại phiếu và đối chiếu hàng đã trả.</p></div><span className="sales-history-count">{count} đơn</span></header>
   <div className="sales-history-tools"><label className="sales-order-search"><Search size={17}/><input type="search" aria-label="Tìm đơn trên trang này" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Mã đơn hoặc tên khách…"/></label><select aria-label="Lọc phương thức thanh toán" value={method} onChange={e=>setMethod(e.target.value)}><option value="">Tất cả thanh toán</option><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản</option></select></div>
   <p className="sales-history-scope">{filtered.length}/{sales.length} đơn trên trang này · Đơn mới nhất trước</p>
   {filtered.length?<div className="sales-orders"><div className="sales-orders-labels" aria-hidden="true"><span>Đơn hàng / Khách</span><span>Thời gian</span><span>Thanh toán</span><span>Tổng tiền bán</span><span/></div>{filtered.map(s=><article className="sales-order-row" key={s.id}><div className="sales-order-name"><strong>BH-{s.code}</strong><span>{s.customer_name}</span><small>{s.items.reduce((sum,i)=>sum+i.quantity,0)} sản phẩm{s.items.some(i=>i.returned>0)&&' · Có hàng đã trả'}</small></div><time dateTime={s.created_at}>{saleDateTime(s.created_at)}</time><span className="sales-method">{s.payment_method==='cash'?'Tiền mặt':'Chuyển khoản'}</span><strong className="sales-order-amount">{money(s.total)}</strong><button type="button" className="button" aria-label={`Xem đơn BH-${s.code}`} ref={element=>{if(element)buttons.current.set(s.id,element);else buttons.current.delete(s.id);}} onClick={()=>setSelected(s.id)}>Xem đơn</button></article>)}</div>:<div className="sales-history-empty"><ReceiptText size={32}/><strong>{sales.length?'Không có đơn phù hợp trên trang này':'Chưa có đơn bán trên trang này'}</strong><p>{sales.length?'Thử mã đơn, tên khách hoặc phương thức khác.':'Đơn đã thanh toán thành công sẽ xuất hiện tại đây.'}</p></div>}
   <div className="sales-history-pager"><span>Trang {page+1}/{totalPages} · {count} đơn</span><div><button type="button" className="button" disabled={page===0} onClick={()=>go(page-1)}>Trang trước</button><button type="button" className="button" disabled={(page+1)*50>=count} onClick={()=>go(page+1)}>Trang sau</button></div></div>
  </>}
 </section>;
}
function SaleReturns({sale}:{sale:SaleRow}){
 const available=sale.items.filter(i=>i.returned<i.quantity);
 return <details className="sales-return-panel no-print"><summary>Nhận trả / hoàn tiền</summary><p>Chỉ nhận trả hàng đã kiểm tra còn bán được. Số đã trả được đối chiếu trên server.</p>{available.length?available.map(i=><details className="sales-return-item" key={i.id}><summary>{i.name} · Còn được trả {i.quantity-i.returned}</summary><CommandForm key={i.returned} action="sale_return" label="Nhận trả và hoàn tiền" build={f=>({itemId:i.id,quantity:Number(f.get('quantity')||0),reason:String(f.get('reason')||'').trim(),resellable:f.get('resellable')==='on',method:String(f.get('method')||'')})}><label className="field">Số lượng trả<input type="number" name="quantity" min={1} max={i.quantity-i.returned} step={1} required/></label><label className="field">Lý do<input name="reason" required maxLength={500}/></label><label className="live-check"><input name="resellable" type="checkbox" required/>Đã kiểm tra hàng còn bán được và nhập lại kho</label><label className="field">Phương thức<select name="method" defaultValue="cash"><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản</option></select></label></CommandForm></details>):<p>Tất cả hàng trong đơn đã được nhận trả.</p>}</details>;
}
