'use client';
import { Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { money } from '@/lib/data';
import { useState } from 'react';
import type { StockPart, Store } from './types';
import type { PosDraft } from './pos-types';

export type CartLine={partId:string;quantity:number;cost:number};
export default function SaleCart({parts,draft,onDraft,store,confirmed,onConfirm,reference}:{parts:StockPart[];draft:PosDraft;onDraft:(draft:PosDraft)=>void;store:Store;confirmed:boolean;onConfirm:(value:boolean)=>void;reference:string}) {
 const {lines}=draft;
 const [qrOpen,setQrOpen]=useState(false),[qrError,setQrError]=useState(false);
 const onChange=(next:CartLine[])=>onDraft({...draft,lines:next});
 const update=(id:string,quantity:number)=>onChange(lines.map(l=>l.partId===id?{...l,quantity}:l));
 const total=lines.reduce((sum,l)=>sum+l.quantity*(parts.find(p=>p.id===l.partId)?.price||0),0);
 return <><div className="sale-cart-heading"><h2><ShoppingCart size={20}/> Đơn đang bán</h2><span>{lines.length} mặt hàng</span></div>
 <div className="sale-cart-items">{!lines.length&&<div className="sale-cart-empty"><ShoppingCart size={38}/><p>Chưa có phụ tùng</p><small>Chọn hàng bên cạnh để thêm vào đơn.</small></div>}
 {lines.map(line=>{const part=parts.find(p=>p.id===line.partId);if(!part)return null;return <div className="sale-cart-item" key={part.id}>
  <div className="sale-cart-item-name"><strong>{part.name}</strong><button className="icon-button" type="button" aria-label={`Xóa ${part.name} khỏi đơn`} onClick={()=>onChange(lines.filter(l=>l.partId!==part.id))}><Trash2 size={17}/></button></div>
  <small>{part.sku} · {money(part.price)}/đơn vị</small>
  <div className="sale-cart-item-bottom"><div className="sale-quantity"><button type="button" aria-label={`Giảm số lượng ${part.name}`} disabled={line.quantity<=1} onClick={()=>update(part.id,line.quantity-1)}><Minus size={16}/></button><input aria-label={`Số lượng ${part.name}`} type="number" min={1} max={part.stock} step={1} required value={line.quantity||''} onChange={e=>update(part.id,Number(e.target.value))}/><button type="button" aria-label={`Tăng số lượng ${part.name}`} disabled={line.quantity>=part.stock} onClick={()=>update(part.id,line.quantity+1)}><Plus size={16}/></button></div><strong>{money(part.price*line.quantity)}</strong></div>
  {line.quantity>part.stock&&<p role="alert">Tồn kho hiện còn {part.stock}. Hãy giảm số lượng.</p>}
 </div>;})}</div>
 <label className="field">Khách hàng<input name="customer" value={draft.customer} onChange={e=>onDraft({...draft,customer:e.target.value})} maxLength={180} placeholder="Khách lẻ (không bắt buộc nhập)"/></label>
 <div className="sale-cart-total"><span>Tổng thanh toán</span><strong>{money(total)}</strong></div>
 <label className="field">Phương thức thanh toán<select name="method" value={draft.method} onChange={e=>onDraft({...draft,method:e.target.value as PosDraft['method']})}><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản</option></select></label>
 {draft.method==='cash'?<><label className="field">Tiền khách đưa (đ)<input name="cashReceived" type="number" required min={total} max={1000000000000} step={1} value={draft.cashReceived} onChange={e=>onDraft({...draft,cashReceived:e.target.value})} placeholder="Nhập số tiền đã nhận"/></label><p className="sale-change">{Number(draft.cashReceived)>=total?<>Tiền trả khách: <strong>{money(Number(draft.cashReceived)-total)}</strong></>:<>Còn thiếu: <strong>{money(total-Number(draft.cashReceived||0))}</strong></>}</p></>:<div className="sale-bank">
 {store.bank_code&&store.bank_account&&store.bank_holder?<><strong>{store.bank_name} ({store.bank_code})</strong><p>Số tài khoản: <b>{store.bank_account}</b></p><p>Chủ tài khoản: {store.bank_holder}</p><p>Nội dung: <b>{reference}</b></p><button type="button" className="button" onClick={()=>{setQrError(false);setQrOpen(v=>!v);}}>{qrOpen?'Ẩn mã QR':'Hiện mã QR chuyển khoản'}</button>{qrOpen&&<>{!qrError&&<img key={`${total}-${reference}`} className="sale-bank-qr" alt={`QR chuyển ${money(total)} đến ${store.bank_account}`} referrerPolicy="no-referrer" src={`https://img.vietqr.io/image/${encodeURIComponent(store.bank_code)}-${encodeURIComponent(store.bank_account)}-qr_only.png?${new URLSearchParams({amount:String(total),addInfo:reference,accountName:store.bank_holder})}`} onError={()=>setQrError(true)}/>}<small>{qrError?'Không tải được QR. Dùng thông tin tài khoản bên trên.':'QR do VietQR tạo từ tài khoản, số tiền và nội dung trên.'}</small></>}</>:<p role="alert">Chưa cấu hình tài khoản nhận tiền. Quản lý cần bổ sung ở Cài đặt → Tài khoản ngân hàng.</p>}
 <small>Đối chiếu tiền vào tài khoản trước khi xác nhận. QR không tự xác minh thanh toán.</small></div>}
 <label className="live-check"><input type="checkbox" checked={confirmed} onChange={e=>onConfirm(e.target.checked)}/>{draft.method==='cash'?'Tôi đã nhận đủ tiền mặt':'Tôi đã kiểm tra tài khoản và nhận đủ tiền chuyển khoản'}</label>
 </>;
}
