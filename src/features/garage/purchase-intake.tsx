'use client';
import {capitalizeWords} from '@/lib/text-input';
import {useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import {Plus,Pencil,Search,Trash2,PackagePlus} from 'lucide-react';
import {CommandForm} from './command-form';
import PurchaseItemEditor,{type NewPurchasePart} from './purchase-item-editor';
import SupplierDetailsEditor from './supplier-details-editor';
import SupplierPurchasedItems from './supplier-purchased-items';
import {normalizePartText} from '@/features/parts/catalog';
import type {GarageSnapshot,SupplierRow} from './types';
import {money} from '@/lib/data';

type IntakeLine={id:string;partId?:string;quantity:number;cost:number;newPart?:NewPurchasePart};
const text=(f:FormData,key:string)=>String(f.get(key)||'').trim();
export default function PurchaseIntake({data}:{data:GarageSnapshot}){
 const router=useRouter();
 const [lines,setLines]=useState<IntakeLine[]>([]),[query,setQuery]=useState(''),[supplierId,setSupplierId]=useState('');
 const [editor,setEditor]=useState<{id:string;part:NewPurchasePart}|null>(null);
 const [itemError,setItemError]=useState('');
 const [supplierOpen,setSupplierOpen]=useState(false),[supplierName,setSupplierName]=useState(''),[supplierPhone,setSupplierPhone]=useState(''),[createdSupplier,setCreatedSupplier]=useState<SupplierRow|null>(null);
 const [supplierEditing,setSupplierEditing]=useState<SupplierRow|null>(null),[supplierSaved,setSupplierSaved]=useState<Record<string,SupplierRow>>({}),[supplierMessage,setSupplierMessage]=useState('');
 const supplierSelect=useRef<HTMLSelectElement>(null);
 const [deletedSuppliers,setDeletedSuppliers]=useState<string[]>([]);
 const suppliers=[...(data.suppliers||[]),...(createdSupplier&&!data.suppliers?.some(s=>s.id===createdSupplier.id)?[createdSupplier]:[])].filter(s=>!deletedSuppliers.includes(s.id)).map(s=>supplierSaved[s.id]&&(supplierSaved[s.id].details_version||1)>=(s.details_version||1)?supplierSaved[s.id]:s);
 const selectedSupplier=suppliers.find(s=>s.id===supplierId);
 const [paidInput,setPaidInput]=useState(''),[method,setMethod]=useState('cash');
 const search=useRef<HTMLInputElement>(null);
 const entryRoot=useRef<HTMLDivElement>(null);
 const total=lines.reduce((s,l)=>s+l.quantity*l.cost,0),paid=Number(paidInput||0);
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
  });setQuery('');setEditor(null);requestAnimationFrame(()=>{const input=entryRoot.current?.querySelector<HTMLInputElement>(`[data-part-id="${partId}"] input`);input?.focus();input?.select();});
 }
 function newItem(){setItemError('');setEditor({id:crypto.randomUUID(),part:{name:query.trim(),category:'',brand:'',price:0,min:5,allowSimilar:false}});}
 function saveNew(part:NewPurchasePart){if(!editor)return;const id=editor.id;setLines(current=>current.some(l=>l.id===id)?current.map(l=>l.id===id?{...l,newPart:part}:l):[...current,{id,newPart:part,quantity:1,cost:0}]);setEditor(null);setQuery('');search.current?.focus();}
 return <section className="purchase-v2">
  <header className="purchase-page-heading"><div><span className="purchase-eyebrow">KHO HÀNG</span><h2>Tạo phiếu nhập</h2><p>Chọn hàng, nhập số lượng và giá, rồi xác nhận nhập kho.</p></div><span className="purchase-draft-badge">Phiếu chưa chốt</span></header>
  {supplierMessage&&<p role="status" className="auth-success">{supplierMessage}</p>}
  {supplierEditing&&<SupplierDetailsEditor key={`${supplierEditing.id}-${supplierEditing.details_version||1}`} supplier={supplierEditing} onDeleted={()=>{setDeletedSuppliers(current=>[...current,supplierEditing.id]);setSupplierId('');setSupplierEditing(null);setSupplierMessage('Đã xóa nhà cung cấp.');requestAnimationFrame(()=>supplierSelect.current?.focus());}} onCancel={()=>{setSupplierEditing(null);router.refresh();requestAnimationFrame(()=>supplierSelect.current?.focus());}} onSaved={saved=>{setSupplierSaved(current=>({...current,[saved.id]:saved}));setSupplierEditing(null);setSupplierMessage('Đã cập nhật nhà cung cấp.');requestAnimationFrame(()=>supplierSelect.current?.focus());}}/>}
  {supplierOpen&&<div className="purchase-supplier-editor"><strong>Thêm nhà cung cấp</strong><CommandForm action="supplier" label="Lưu nhà cung cấp" preventEnter reset build={f=>({name:text(f,'name'),phone:text(f,'phone')})} onSuccess={result=>{if(result.id){setCreatedSupplier({id:result.id,name:supplierName.trim(),phone:supplierPhone.trim(),details_version:1});setSupplierId(result.id);}setSupplierOpen(false);requestAnimationFrame(()=>search.current?.focus());}}><div className="intake-fields"><label className="field">Tên nhà cung cấp *<input name="name" maxLength={180} required autoFocus value={supplierName} onCompositionEnd={e=>setSupplierName(capitalizeWords(e.currentTarget.value))} onChange={e=>setSupplierName((e.nativeEvent as InputEvent).isComposing?e.target.value:capitalizeWords(e.target.value))}/></label><label className="field">Số điện thoại<input name="phone" type="tel" maxLength={30} value={supplierPhone} onChange={e=>setSupplierPhone(e.target.value)}/></label></div><button type="button" className="button" onClick={()=>{setSupplierOpen(false);requestAnimationFrame(()=>supplierSelect.current?.focus());}}>Hủy</button></CommandForm></div>}
  <CommandForm action="purchase_intake" label="Xác nhận nhập kho" successText="Đã nhập hàng vào kho." preventEnter reset submitDisabled={!supplierId||!lines.length||!!editor||supplierOpen||!!supplierEditing} onSuccess={()=>{setLines([]);setSupplierId('');setPaidInput('');setMethod('cash');setQuery('');search.current?.focus();}} build={()=>({supplierId,paid,method,lines:lines.map(l=>({quantity:l.quantity,cost:l.cost,...(l.newPart?{newPart:l.newPart}:{partId:l.partId})}))})}
   submitPanel={<>
    <div className="purchase-review-heading"><span className="purchase-section-number">2</span><h3>Thông tin phiếu</h3></div>
    <label className="field purchase-review-supplier">Nhà cung cấp *<select ref={supplierSelect} required disabled={supplierOpen||!!supplierEditing} value={supplierId} onChange={e=>{setSupplierId(e.target.value);setSupplierMessage('');}}><option value="">Chọn nhà cung cấp</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}{s.phone?` · ${s.phone}`:''}</option>)}</select></label>
    <div className="purchase-supplier-buttons"><button className="purchase-text-button" type="button" disabled={supplierOpen||!!supplierEditing} onClick={()=>{setSupplierName('');setSupplierPhone('');setSupplierEditing(null);setSupplierMessage('');setSupplierOpen(true);}}><Plus size={14}/>Thêm nhà cung cấp</button>{selectedSupplier&&<button className="purchase-text-button" type="button" disabled={supplierOpen||!!supplierEditing} onClick={()=>{setSupplierEditing({...selectedSupplier});setSupplierMessage('');}}>Sửa / xóa</button>}</div>
    <div className="purchase-review-totals"><div><span>Số mặt hàng</span><strong>{lines.length}</strong></div><div><span>Tổng số lượng</span><strong>{lines.reduce((sum,line)=>sum+line.quantity,0).toLocaleString('vi-VN')}</strong></div><div className="purchase-grand-total"><span>Tổng tiền nhập</span><strong>{money(total)}</strong></div></div>
    <div className="purchase-payment-heading"><strong>Thanh toán nhà cung cấp</strong><span>Đơn vị: VND</span></div>
    <label className="field">Số tiền đã trả<input type="number" min={0} max={total} step={1} placeholder="0" value={paidInput} onChange={e=>setPaidInput(e.target.value)}/></label>
    <div className="purchase-payment-shortcuts"><button className="button" type="button" onClick={()=>setPaidInput('')}>Chưa trả</button><button className="button" type="button" disabled={!total} onClick={()=>setPaidInput(String(total))}>Trả đủ</button></div>
    {paid>0&&<label className="field">Phương thức<select value={method} onChange={e=>setMethod(e.target.value)}><option value="cash">Tiền mặt</option><option value="transfer">Chuyển khoản</option></select></label>}
    <div className="purchase-debt"><span>Còn nợ nhà cung cấp</span><strong>{money(Math.max(0,total-paid))}</strong></div>
    <p className="purchase-submit-note">{!supplierId?'Chọn nhà cung cấp để hoàn tất phiếu.':!lines.length?'Thêm ít nhất một mặt hàng để nhập kho.':editor?'Hoàn tất thông tin hàng mới trước khi nhập kho.':`Xác nhận sẽ tăng tồn kho ${lines.reduce((sum,line)=>sum+line.quantity,0).toLocaleString('vi-VN')} sản phẩm và ghi nhận số tiền đã trả.`}</p>
   </>}>
   <div className="purchase-entry" ref={entryRoot}>
    <div className="purchase-mobile-supplier"><label className="field">Nhà cung cấp *<select aria-label="Nhà cung cấp trên điện thoại" value={supplierId} disabled={supplierOpen||!!supplierEditing} onChange={e=>{setSupplierId(e.target.value);setSupplierMessage('');}}><option value="">Chọn nhà cung cấp</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}{s.phone?` · ${s.phone}`:''}</option>)}</select></label><div className="purchase-supplier-buttons"><button className="purchase-text-button" type="button" disabled={supplierOpen||!!supplierEditing} onClick={()=>{setSupplierName('');setSupplierPhone('');setSupplierMessage('');setSupplierOpen(true);}}><Plus size={14}/>Thêm nhà cung cấp</button>{selectedSupplier&&<button className="purchase-text-button" type="button" disabled={supplierOpen||!!supplierEditing} onClick={()=>setSupplierEditing({...selectedSupplier})}>Sửa / xóa</button>}</div></div>
    <div className="purchase-entry-heading"><div><span className="purchase-section-number">1</span><h3>Hàng nhập kho</h3></div><button className="button" type="button" disabled={!!editor||lines.length>=100} onClick={newItem}><Plus size={16}/>Tạo hàng mới</button></div>
    <div className="purchase-find"><Search size={19}/><input ref={search} aria-label="Tìm hàng để nhập" type="search" disabled={!!editor} placeholder="Tìm tên hàng, mã hàng hoặc thương hiệu…" value={query} onCompositionEnd={e=>setQuery(capitalizeWords(e.currentTarget.value))} onChange={e=>setQuery((e.nativeEvent as InputEvent).isComposing?e.target.value:capitalizeWords(e.target.value))} onKeyDown={e=>{if(e.key==='Enter'&&!(e.nativeEvent as KeyboardEvent).isComposing&&results.length===1){e.preventDefault();addExisting(results[0].id);}}}/>{query&&<button type="button" className="purchase-text-button" onClick={()=>{setQuery('');search.current?.focus();}}>Xóa tìm</button>}</div>
    {!editor&&<div className="purchase-picker">
     {query.trim()?<><div className="purchase-picker-heading"><strong>Kết quả tìm hàng</strong><span>Bấm + để thêm vào phiếu</span></div><div className="purchase-picker-list">{results.map(p=><button className="purchase-picker-item" key={p.id} type="button" disabled={lines.length>=100&&!lines.some(l=>l.partId===p.id)} onClick={()=>addExisting(p.id)}><span><strong>{p.name}</strong><small>{p.brand} · {p.sku} · Tồn {p.stock}</small></span><span className="purchase-add-marker"><Plus size={16}/></span></button>)}{!results.length&&<div className="purchase-picker-empty"><p>Chưa có hàng phù hợp với “{query}”.</p><button type="button" className="purchase-text-button" disabled={lines.length>=100} onClick={newItem}><Plus size={15}/>Tạo hàng mới từ tên này</button></div>}</div></>:
      selectedSupplier?<SupplierPurchasedItems key={selectedSupplier.id} supplierId={selectedSupplier.id} supplierName={selectedSupplier.name} availableIds={data.parts.map(p=>p.id)} onAdd={id=>addExisting(id)} disabled={lines.length>=100||supplierOpen||!!supplierEditing}/>:
      <><div className="purchase-picker-heading"><strong>Chọn nhanh từ kho</strong><span>Hoặc chọn nhà cung cấp để xem hàng từng nhập</span></div><div className="purchase-picker-list">{data.parts.slice(0,6).map(p=><button className="purchase-picker-item" key={p.id} type="button" disabled={lines.length>=100&&!lines.some(l=>l.partId===p.id)} onClick={()=>addExisting(p.id)}><span><strong>{p.name}</strong><small>{p.brand} · {p.sku} · Tồn {p.stock}</small></span><span className="purchase-add-marker"><Plus size={16}/></span></button>)}{!data.parts.length&&<p className="purchase-picker-empty">Kho chưa có hàng. Bấm Tạo hàng mới để bắt đầu.</p>}</div></>}
    </div>}
    {itemError&&<p className="auth-error" role="alert">{itemError}</p>}
    {editor&&<PurchaseItemEditor key={editor.id} data={data} initial={editor.part} otherNewParts={lines.filter(l=>l.id!==editor.id&&l.newPart).map(l=>l.newPart!)} onSave={part=>{setItemError('');saveNew(part);}} onUseExisting={id=>addExisting(id,editor.id)} onCancel={()=>{setEditor(null);setItemError('');search.current?.focus();}}/>}
    <div className="purchase-cart-heading"><strong>Hàng trong phiếu <span>{lines.length}</span></strong><span>Giá theo một đơn vị · VND</span></div>
    <div className="purchase-cart" aria-label="Hàng trong phiếu nhập">
     {!lines.length&&<div className="purchase-cart-empty"><PackagePlus size={34}/><strong>Chưa có hàng trong phiếu</strong><p>Tìm hàng ở trên, bấm dấu + rồi nhập số lượng và giá nhập.</p></div>}
     {lines.map((line,index)=>{const part=data.parts.find(p=>p.id===line.partId),name=line.newPart?.name||part?.name||'Mặt hàng không còn trong danh mục';return <div className="purchase-cart-row" data-part-id={line.partId} key={line.id}>
      <div className="purchase-cart-name"><span className="purchase-line-index">{index+1}</span><div><strong>{name}</strong><small>{line.newPart?'Hàng mới':part?.sku}{(line.newPart?.brand||part?.brand)?` · ${line.newPart?.brand||part?.brand}`:''}</small></div><div className="purchase-line-actions">{line.newPart&&<button className="icon-button" type="button" aria-label={`Sửa thông tin ${name}`} onClick={()=>setEditor({id:line.id,part:line.newPart!})}><Pencil size={15}/></button>}<button className="purchase-text-button purchase-remove" type="button" aria-label={`Xóa ${name} khỏi phiếu nhập`} onClick={()=>{setLines(current=>current.filter(l=>l.id!==line.id));if(editor?.id===line.id)setEditor(null);}}><Trash2 size={14}/>Xóa</button></div></div>
      <div className="purchase-cart-values"><label className="field">Số lượng<input aria-label={`Số lượng nhập ${name}`} type="number" min={1} max={1000000} step={1} required value={line.quantity||''} onFocus={e=>e.target.select()} onChange={e=>update(line.id,{quantity:Number(e.target.value)})}/></label><label className="field">Giá nhập (đ)<input aria-label={`Giá nhập ${name}`} type="number" min={0} max={1000000000} step={1} required value={line.cost} onFocus={e=>e.target.select()} onChange={e=>update(line.id,{cost:Number(e.target.value)})}/></label>
       {line.newPart?<label className="field">Giá bán (đ)<input aria-label={`Giá bán ${name}`} type="number" min={0} max={1000000000} step={1} required value={line.newPart.price} onFocus={e=>e.target.select()} onChange={e=>{if(line.newPart)update(line.id,{newPart:{...line.newPart,price:Number(e.target.value)}});}}/></label>:<div className="purchase-cart-price"><span>Giá bán hiện tại</span><strong>{money(part?.price??0)}</strong></div>}
       <div className="purchase-cart-price purchase-cart-amount"><span>Thành tiền</span><strong>{money(line.quantity*line.cost)}</strong></div>
      </div>
     </div>;})}
    </div>
   </div>
  </CommandForm>
 </section>;
}
