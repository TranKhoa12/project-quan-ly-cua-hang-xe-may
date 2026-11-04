'use client';
import {useId,useRef,useState} from 'react';
import {ExternalLink,Search} from 'lucide-react';
import {searchPartsOnWeb} from './part-web-actions';
import type {PartWebResult} from './part-web-provider';
export default function PartWebSearch({name,onChoose}:{name:string;onChoose:(name:string)=>void}){
 const [open,setOpen]=useState(false),[description,setDescription]=useState('');
 const [busy,setBusy]=useState(false),[items,setItems]=useState<PartWebResult[]|null>(null),[error,setError]=useState('');
 const id=useId(),version=useRef(0),pending=useRef(false);
 function edit(value:string){version.current++;setDescription(value);setItems(null);setError('');}
 async function search(){
  if(pending.current)return;
  const query=description.trim();
  if(query.length<2){setError('Nhập mô tả hoặc mã hàng có ít nhất 2 ký tự.');return;}
  const current=++version.current;pending.current=true;setBusy(true);setItems(null);setError('');
  try{const result=await searchPartsOnWeb(query);if(current===version.current){setItems(result.items||null);setError(result.error||'');}}
  catch{if(current===version.current)setError('Mất kết nối. Hãy thử lại.');}
  finally{pending.current=false;setBusy(false);}
 }
 return <div className="part-web-search">
  <button type="button" className="purchase-text-button" aria-expanded={open} aria-controls={id} onClick={()=>{if(!open&&!description)edit(name);setOpen(value=>!value);}}><Search size={14}/>Tìm trên web</button>
  {open&&<div id={id} className="part-web-search-panel" aria-busy={busy}>
   <label className="field">Mô tả hoặc mã trên bao bì<input type="text" maxLength={240} value={description} onChange={e=>edit(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!(e.nativeEvent as KeyboardEvent).isComposing){e.preventDefault();e.stopPropagation();void search();}}} placeholder="Ví dụ: miếng phanh bánh trước Wave, mã trên hộp…"/></label>
   <p>Tra cứu tên gọi, mô tả hoặc mã hàng. Chỉ nội dung ô tìm kiếm được gửi đến dịch vụ tìm kiếm khi bạn bấm Tìm.</p>
   <button type="button" className="button" disabled={busy||description.trim().length<2} onClick={()=>void search()}>{busy?'Đang tìm…':'Tìm gợi ý'}</button>
   {error&&<p role="alert">{error} Bạn vẫn có thể nhập thông tin mặt hàng thủ công.</p>}
   {items?.length===0&&<p role="status">Chưa có kết quả. Thử tên quen gọi, mã hàng hoặc thêm loại xe.</p>}
   {!!items?.length&&<><p role="status">Tìm được {items.length} kết quả tham khảo. Kiểm tra mã và thông số trước khi chọn tên; nhóm và thương hiệu do bạn xác nhận.</p><ul className="part-web-results">{items.map(item=><li key={item.url}><a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Xem nguồn ${item.source}: ${item.title} (mở tab mới)`}>{item.title} <ExternalLink size={13}/></a><small>{item.source}</small><p>{item.description}</p><button type="button" className="button" onClick={()=>{onChoose(item.title);version.current++;setOpen(false);}}>Dùng làm tên</button></li>)}</ul></>}
  </div>}
 </div>;
}
