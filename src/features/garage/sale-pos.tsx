'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { garageCommand, posDraft } from './actions';
import { emptyPosDraft, type PosDraft, type SavedDraft } from './pos-types';
import type { GarageSnapshot, SaleRow } from './types';
import SaleCatalog from './sale-catalog';
import SaleCart from './sale-cart';
import { money, dateLabel } from '@/lib/data';

export default function SalePos({data}:{data:GarageSnapshot}) {
 const router=useRouter();
 const [draft,setDraft]=useState<PosDraft>(emptyPosDraft),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[saving,setSaving]=useState(false);
 const [error,setError]=useState(''),[confirmed,setConfirmed]=useState(false),[pending,setPending]=useState<SavedDraft|null>(null),[receipt,setReceipt]=useState<SaleRow|null>(null),[saved,setSaved]=useState(false);
 const [reference,setReference]=useState('');
 const revision=useRef(0),latest=useRef(draft),lastSaved=useRef(''),inFlight=useRef<Promise<boolean>|null>(null),blocked=useRef(false),paymentLock=useRef(false);
 const feedback=useRef<HTMLDivElement>(null),print=useRef<HTMLDivElement>(null);
 const apply=useCallback((state:SavedDraft|null)=>{
  revision.current=state?.revision||0;
  const body=state?.status==='pending'||state?.status==='completed'?state.body.draft:state?.body;
  const stored=body&&Array.isArray(body.lines)?body as unknown as PosDraft:emptyPosDraft();
  const memo=stored.reference||`MC${crypto.randomUUID().replaceAll('-','').slice(0,16)}`;
  const value={...stored,reference:memo};
  latest.current=value;setDraft(value);lastSaved.current=JSON.stringify(stored);
  setPending(state?.status==='pending'?state:null);setReceipt(state?.status==='completed'?state.body.receipt||null:null);
  if(state?.status==='completed'&&!state.body.receipt)throw Error('Thiếu kết quả đơn bán. Hãy tải lại trạng thái.');
  setConfirmed(false);setSaved(!!stored.reference);setReference(memo);
 },[]);
 const load=useCallback(async()=>{
  setBusy(true);setError('');blocked.current=true;
  try{const result=await posDraft('load');if(result.error)throw Error(result.error);apply(result.draft||null);blocked.current=false;setReady(true);router.refresh();}
  catch(e){setError(e instanceof Error?e.message:'Không tải được nháp POS.');setReady(false);}
  finally{setBusy(false);}
 },[apply,router]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{if(error||receipt||pending)feedback.current?.focus();},[error,receipt,pending]);
 const save=useCallback(():Promise<boolean>=>{
  if(blocked.current)return Promise.resolve(false);
  if(inFlight.current)return inFlight.current;
  const run=async()=>{
   setSaving(true);
   try{
    while(lastSaved.current!==JSON.stringify(latest.current)){
     const snapshot=JSON.stringify(latest.current);
     const result=await posDraft('save',revision.current,JSON.parse(snapshot));
     if(result.error)throw Error(result.error);
     if(!result.draft)throw Error('Chưa xác nhận lưu nháp.');
     revision.current=result.draft.revision;lastSaved.current=snapshot;
    }
    setSaved(true);return true;
   }catch(e){blocked.current=true;setError(e instanceof Error?e.message:'Không lưu được nháp.');return false;}
   finally{setSaving(false);inFlight.current=null;}
  };
  inFlight.current=Promise.resolve().then(run);return inFlight.current;
 },[]);
 useEffect(()=>{
  if(!ready||pending||receipt||busy)return;
  const timer=setTimeout(()=>void save(),500);return()=>clearTimeout(timer);
 },[draft,ready,pending,receipt,busy,save]);
 useEffect(()=>{
  const unsaved=()=>lastSaved.current!==JSON.stringify(latest.current)||paymentLock.current;
  const unload=(e:BeforeUnloadEvent)=>{if(unsaved()){e.preventDefault();e.returnValue='';}};
  const navigate=(e:MouseEvent)=>{if(e.target instanceof Element&&e.target.closest('a[href]')&&unsaved()&&!window.confirm('Nháp chưa lưu xong hoặc đang kiểm tra thanh toán. Bạn vẫn muốn rời trang?'))e.preventDefault();};
  window.addEventListener('beforeunload',unload);document.addEventListener('click',navigate,true);
  return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',navigate,true);};
 },[]);
 function change(value:PosDraft){if(paymentLock.current||pending||receipt||blocked.current)return;latest.current=value;setDraft(value);setConfirmed(false);setSaved(false);}
 async function execute(state:SavedDraft){
  setPending(state);
  try{
   const result=await garageCommand('sale',state.body.command!,state.request_id!);
   if(result.error){setError(result.error);return;}
   if(!result.result?.receipt){setError('Chưa lấy được kết quả đơn bán. Kiểm tra lại trạng thái trước khi bán tiếp.');return;}
   setReceipt(result.result.receipt);setPending(null);setError('');router.refresh();
  }catch{setError('Chưa xác nhận kết quả. Kiểm tra lại cùng yêu cầu bên dưới; không tạo đơn mới.');}
 }
 async function pay(){
  if(paymentLock.current||blocked.current||!confirmed||!draft.lines.length)return;
  paymentLock.current=true;setBusy(true);setError('');
  try{
   if(!await save())return;
   const command={pos:true,customer:draft.customer.trim(),method:draft.method,receivedConfirmed:true,cashReceived:Number(draft.cashReceived||0),transferReference:reference,lines:draft.lines.map(l=>({partId:l.partId,quantity:l.quantity,price:data.parts.find(p=>p.id===l.partId)?.price??-1}))};
   const requestId=crypto.randomUUID();
   const prepared=await posDraft('prepare',revision.current,{draft,command,requestId});
   if(prepared.error||!prepared.draft){blocked.current=true;setError(prepared.error||'Chưa xác nhận yêu cầu thanh toán. Tải lại trạng thái trước khi tiếp tục.');return;}
   revision.current=prepared.draft.revision;await execute(prepared.draft);
  }finally{paymentLock.current=false;setBusy(false);setConfirmed(false);}
 }
 async function checkPending(){
  if(paymentLock.current||!pending)return;
  paymentLock.current=true;setBusy(true);setError('');
  try{
   const current=await posDraft('load');
   if(current.error)throw Error(current.error);
   if(current.draft?.status!=='pending'){apply(current.draft||null);blocked.current=false;router.refresh();return;}
   if(current.draft.request_id!==pending.request_id)throw Error('Yêu cầu đã đổi ở phiên khác. Hãy tải lại trạng thái.');
   const result=await posDraft('resume',current.draft.revision);
   if(result.error)throw Error(result.error);
   apply(result.draft||null);blocked.current=false;router.refresh();
  }catch(e){setError(e instanceof Error?e.message:'Không kiểm tra được kết quả.');}
  finally{paymentLock.current=false;setBusy(false);}
 }
 async function retry(){if(!pending||paymentLock.current)return;paymentLock.current=true;setBusy(true);setError('');try{await execute(pending);}finally{paymentLock.current=false;setBusy(false);}}
 async function newSale(){
  setBusy(true);setError('');
  try{
   const current=await posDraft('load');if(current.error)throw Error(current.error);
   if(current.draft?.status!=='completed')throw Error('Trạng thái đơn đã thay đổi. Hãy tải lại trạng thái POS.');
   const result=await posDraft('clear',current.draft.revision);if(result.error)throw Error(result.error);
   apply(result.draft||null);blocked.current=false;router.refresh();
  }catch(e){setError(e instanceof Error?e.message:'Không mở được đơn mới.');}finally{setBusy(false);}
 }
 const total=draft.lines.reduce((sum,l)=>sum+l.quantity*(data.parts.find(p=>p.id===l.partId)?.price||0),0);
 const valid=draft.lines.length>0&&draft.lines.every(l=>data.parts.find(p=>p.id===l.partId)?.pos_visible!==false&&Number.isInteger(l.quantity)&&l.quantity>0&&l.quantity<=(data.parts.find(p=>p.id===l.partId)?.stock??0))&&(draft.method!=='cash'||(Number.isSafeInteger(Number(draft.cashReceived))&&Number(draft.cashReceived)>=total));
 useEffect(()=>setConfirmed(false),[total,draft.method]);
 return <section className="sale-pos"><form className="live-form" aria-busy={busy} onSubmit={e=>{e.preventDefault();if(e.nativeEvent instanceof SubmitEvent&&e.nativeEvent.submitter instanceof HTMLButtonElement&&e.nativeEvent.submitter.dataset.pay==='true')void pay();}} onKeyDown={e=>{if(e.key==='Enter'&&e.target instanceof HTMLInputElement)e.preventDefault();}}>
  <div className="sale-pos-layout"><fieldset className="pos-catalog-fieldset" disabled={!ready||busy||!!pending||!!receipt}><SaleCatalog parts={data.parts} quantities={Object.fromEntries(draft.lines.map(l=>[l.partId,l.quantity]))} onAdd={part=>{
   const existing=draft.lines.find(l=>l.partId===part.id);
   if(!existing&&draft.lines.length>=100)return;
   change({...draft,lines:existing?draft.lines.map(l=>l.partId===part.id?{...l,quantity:Math.min(part.stock,l.quantity+1)}:l):[...draft.lines,{partId:part.id,quantity:1,cost:0}]});
  }}/></fieldset>
  <aside className="sale-pos-checkout">
   <div ref={feedback} tabIndex={-1} className="pos-feedback" aria-label="Kết quả thanh toán">
    {error&&<p className="auth-error" role="alert">{error}</p>}
    {!ready&&!error&&<p role="status">Đang khôi phục nháp…</p>}
    {busy&&<p role="status">Đang xử lý, vui lòng chờ…</p>}
    {pending&&!receipt&&<><p role="status">Đang giữ yêu cầu thanh toán. Giỏ hàng đã khóa để tránh tạo đơn trùng.</p><button type="button" className="button" disabled={busy} onClick={()=>void retry()}>Thử lại cùng yêu cầu</button><button type="button" className="button" disabled={busy} onClick={()=>void checkPending()}>Kiểm tra kết quả / mở lại nháp</button></>}
    {error&&!pending&&<button type="button" className="button" disabled={busy} onClick={()=>{if(lastSaved.current!==JSON.stringify(latest.current)&&!window.confirm('Tải bản nháp trên server sẽ bỏ phần thay đổi chưa lưu ở màn hình này. Tiếp tục?'))return;void load();}}>Tải lại trạng thái POS</button>}
   </div>
   {receipt?<><div role="status" className="auth-success">Thanh toán thành công · BH-{receipt.code} · {money(receipt.total)}</div><div ref={print} className="live-document pos-receipt"><h2>{receipt.store_snapshot.name}</h2><p>{receipt.store_snapshot.phone} {receipt.store_snapshot.address}</p><h3>Phiếu bán BH-{receipt.code}</h3><p>{dateLabel(receipt.created_at)} · {receipt.customer_name}</p>{receipt.items.map(i=><p key={i.id}>{i.name} × {i.quantity}<br/>{money(i.price)} · <strong>{money(i.quantity*i.price)}</strong></p>)}<p>Tổng đã thu: <strong>{money(receipt.total)}</strong></p><p>{receipt.payment_method==='cash'?'Tiền mặt':'Chuyển khoản'}</p></div><button type="button" className="button" onClick={()=>{print.current?.classList.add('printing');window.print();print.current?.classList.remove('printing');}}>In phiếu</button><button type="button" className="button primary sale-pay" disabled={busy} onClick={()=>void newSale()}>Bán đơn mới</button></>:<fieldset className="pos-checkout-fieldset" disabled={!ready||busy||!!pending}>
    <div className="pos-checkout-scroll"><SaleCart parts={data.parts} draft={draft} onDraft={change} store={data.store} confirmed={confirmed} onConfirm={setConfirmed} reference={reference}/>
    <small className="pos-save-status" role="status">{saving?'Đang lưu nháp…':saved?'Đã lưu nháp trên server':'Nháp đang chờ lưu'}</small></div>
    <button type="submit" data-pay="true" className="button primary sale-pay" disabled={!valid||!confirmed||!!pending||!ready||blocked.current}>Xác nhận đã thu · {money(total)}</button>
   </fieldset>}
  </aside></div>
 </form></section>;
}
