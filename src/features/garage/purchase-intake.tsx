'use client';
import {useRef,useState} from 'react';
import {Plus,Pencil,Search,Trash2} from 'lucide-react';
import {CommandForm} from './command-form';
import PurchaseItemEditor,{type NewPurchasePart} from './purchase-item-editor';
import {normalizePartText} from '@/features/parts/catalog';
import type {GarageSnapshot} from './types';
import {money} from '@/lib/data';

type IntakeLine={id:string;partId?:string;quantity:number;cost:number;newPart?:NewPurchasePart};
const text=(f:FormData,key:string)=>String(f.get(key)||'').trim();
export default function PurchaseIntake({data}:{data:GarageSnapshot}){
 const [lines,setLines]=useState<IntakeLine[]>([]),[query,setQuery]=useState(''),[supplierId,setSupplierId]=useState('');
 const [editor,setEditor]=useState<{id:string;part:NewPurchasePart}|null>(null);
 const [itemError,setItemError]=useState('');
 const [supplierOpen,setSupplierOpen]=useState(false),[supplierName,setSupplierName]=useState(''),[createdSupplier,setCreatedSupplier]=useState<{id:string;name:string}|null>(null);
 const [payment,setPayment]=useState<'unpaid'|'full'|'partial'>('unpaid'),[partial,setPartial]=useState(''),[method,setMethod]=useState('cash');
 const search=useRef<HTMLInputElement>(null);
 const total=lines.reduce((s,l)=>s+l.quantity*l.cost,0),paid=payment==='full'?total:payment==='partial'?Number(partial||0):0;
 const results=query.trim()?data.parts.filter(p=>normalizePartText(`${p.name} ${p.sku} ${p.brand}`).includes(normalizePartText(query))).slice(0,7):[];
 const update=(id:string,patch:Partial<IntakeLine>)=>setLines(current=>current.map(l=>l.id===id?{...l,...patch}:l));
 function addExisting(partId:string,replacing?:string){
  const replaced=lines.find(l=>l.id===replacing),already=lines.find(l=>l.partId===partId&&l.id!==replacing);
  if(replaced&&already&&replaced.cost!==already.cost){setItemError('Hàng này đã có trong phiếu với giá nhập khác. Hãy đối chiếu giá và số lượng trước khi gộp.');return;}
  setItemError('');
  setLines(current=>{
   const removed=current.find(l=>l.id===replacing),quantity=removed?.quantity||1;
   const rest=current.filter(l=>l.id!==replacing),existing=rest.find(l=>l.partId===partId);
   if(existing)return rest.map(l=>l.id===existing.id?{...l,quantity:l.quantity+quantity}:l);
   if(rest.length>=100)return current;
   return [...rest,{id:replacing||crypto.randomUUID(),partId,quantity,cost:removed?.cost||0}];
  });setQuery('');setEditor(null);search.current?.focus();
 }
 function newItem(){setItemError('');setEditor({id:crypto.randomUUID(),part:{name:query.trim(),category:'',brand:'',price:0,min:5,allowSimilar:false}});}
 function saveNew(part:NewPurchasePart){if(!editor)return;const id=editor.id;setLines(current=>current.some(l=>l.id===id)?current.map(l=>l.id===id?{...l,newPart:part}:l):[...current,{id,newPart:part,quantity:1,cost:0}]);setEditor(null);setQuery('');search.current?.focus();}
 return <section className="panel live-panel simple-purchase">
  {supplierOpen&&<div className="purchase-supplier-editor"><strong>Nhà cung cấp mới</strong><CommandForm action="supplier" label="Lưu và chọn nhà cung cấp" preventEnter reset build={f=>({name:text(f,'name'),phone:text(f,'phone')})} onSuccess={result=>{if(result.id){setCreatedSupplier({id:result.id,name:supplierName.trim()});setSupplierId(result.id);}setSupplierOpen(false);}}><div className="intake-fields"><label className="field">Tên nhà cung cấp<input name="name" maxLength={180} required value={supplierName} onChange={e=>setSupplierName(e.target.value)}/></label><label className="field">Số điện thoại (nếu có)<input name="phone" maxLength={30}/></label></div><button type="button" className="button" onClick={()=>setSupplierOpen(false)}>Hủy</button></CommandForm></div>}
  <CommandForm action="purchase_intake" label="Chốt nhập hàng" successText="Đã nhập hàng vào kho." preventEnter reset submitDisabled={!lines.length||!!editor||supplierOpen} onSuccess={()=>{setLines([]);setSupplierId('');setPayment('unpaid');setPartial('');setMethod('cash');setQuery('');search.current?.focus();}} build={()=>({supplierId,paid,method,lines:lines.map(l=>({quantity:l.quantity,cost:l.cost,...(l.newPart?{newPart:l.newPart}:{partId:l.partId})}))})}>
   <div className="purchase-supplier"><label className="field">Nhập từ ai?<select required value={supplierId} onChange={e=>setSupplierId(e.target.value)}><option value="">Chọn nhà cung cấp</option>{createdSupplier&&!data.suppliers?.some(s=>s.id===createdSupplier.id)&&<option value={createdSupplier.id}>{createdSupplier.name}</option>}{data.suppliers?.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><button className="button" type="button" onClick={()=>{setSupplierName('');setSupplierOpen(true);}} disabled={supplierOpen}><Plus size={16}/>Nhà cung cấp</button></div>
   <div className="purchase-search"><label className="field">Thêm hàng vào phiếu<span className="purchase-search-input"><Search size={18}/><input ref={search} type="search" disabled={!!editor} placeholder="Gõ tên, mã hoặc thương hiệu để tìm hàng…" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&results.length===1){e.preventDefault();addExisting(results[0].id);}}}/></span></label><button className="button" type="button" disabled={!!editor||lines.length>=100} onClick={newItem}><Plus size={16}/>Hàng mới</button></div>
   {query.trim()&&!editor&&<div className="purchase-search-results" aria-label="Kết quả tìm hàng">{results.map(p=><button key={p.id} type="button" disabled={lines.length>=100&&!lines.some(l=>l.partId===p.id)} onClick={()=>addExisting(p.id)}><span><strong>{p.name}</strong><small>{p.brand} · {p.sku}{p.pos_visible===false?' · Đã ẩn POS':''}</small></span><span>Tồn {p.stock} · + Thêm</span></button>)}{!results.length&&<p>Chưa tìm thấy hàng. Bấm <strong>Hàng mới</strong> để thêm.</p>}</div>}
   {itemError&&<p className="auth-error" role="alert">{itemError}</p>}
   {editor&&<PurchaseItemEditor key={editor.id} data={data} initial={editor.part} otherNewParts={lines.filter(l=>l.id!==editor.id&&l.newPart).map(l=>l.newPart!)} onSave={part=>{setItemError('');saveNew(part);}} onUseExisting={id=>addExisting(id,editor.id)} onCancel={()=>{setEditor(null);setItemError('');search.current?.focus();}}/>}
   <div className="purchase-items"><div className="purchase-row purchase-row-head" aria-hidden="true"><span>Mặt hàng</span><span>Số lượng</span><span>Giá nhập (đ)</span><span>Thành tiền</span><span/></div>
    {!lines.length&&<p className="purchase-empty">Tìm và chọn hàng ở trên để bắt đầu.</p>}
    {lines.map(line=>{const part=data.parts.find(p=>p.id===line.partId),name=line.newPart?.name||part?.name||'Mặt hàng không còn trong danh mục';return <div className="purchase-row" key={line.id}>
     <div className="purchase-item-name"><strong>{name}</strong><small>{line.newPart?`${line.newPart.brand} · Hàng mới`:part?.brand}{line.newPart&&<button className="icon-button" type="button" aria-label={`Sửa thông tin ${name}`} onClick={()=>setEditor({id:line.id,part:line.newPart!})}><Pencil size={14}/></button>}</small></div>
     <label className="field"><span className="purchase-mobile-label">Số lượng</span><input aria-label={`Số lượng nhập ${name}`} type="number" min={1} max={1000000} step={1} required value={line.quantity||''} onChange={e=>update(line.id,{quantity:Number(e.target.value)})}/></label>
     <label className="field"><span className="purchase-mobile-label">Giá nhập (đ)</span><input aria-label={`Giá nhập ${name}`} type="number" min={0} max={1000000000} step={1} required value={line.cost} onChange={e=>update(line.id,{cost:Number(e.target.value)})}/></label>
     <strong className="purchase-line-amount">{money(line.quantity*line.cost)}</strong><button className="icon-button" type="button" aria-label={`Xóa ${name} khỏi phiếu nhập`} onClick={()=>{setLines(current=>current.filter(l=>l.id!==line.id));if(editor?.id===line.id)setEditor(null);}}><Trash2 size={17}/></button>
    </div>;})}
   </div>
   <div className="purchase-payment"><div><span className="purchase-total-label">Tổng tiền nhập · {lines.length} mặt hàng</span><strong className="purchase-total">{money(total)}</strong></div><div className="purchase-payment-options"><label className="field">Thanh toán nhà cung cấp<select value={payment} onChange={e=>setPayment(e.target.value as typeof payment)}><option value="unpaid">Chưa trả tiền</option><option value="full">Đã trả đủ</option><option value="partial">Trả một phần</option></select></label>
    {payment==='partial'&&<label className="field">Số tiền đã trả (đ)<input type="number" min={1} max={total} step={1} required value={partial} onChange={e=>setPartial(e.target.value)}/></label>}
    {payment!=='unpaid'&&<label className="field">Trả bằng<select value={method} onChange={e=>setMethod(e.target.value)}><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản</option></select></label>}
    <p className="form-hint">Còn nợ nhà cung cấp: <strong>{money(Math.max(0,total-paid))}</strong></p></div></div>
   {editor&&<p className="form-hint" role="status">Thêm hàng đang sửa vào phiếu hoặc bấm Hủy trước khi chốt.</p>}
  </CommandForm>
 </section>;
}
