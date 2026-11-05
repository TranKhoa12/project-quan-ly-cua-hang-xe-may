'use client';
import {useEffect,useRef,useState} from 'react';
import type {Part} from '@/lib/data';
import type {PartImageInfo} from './load-images';
import {validateImageFile} from './image-input';
export default function PartImageEditor({part,onSaved,onCancel}:{part:Part;onSaved:(image:PartImageInfo)=>void;onCancel:()=>void}){
 const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[uncertain,setUncertain]=useState(false);
 const request=useRef(crypto.randomUUID()),operation=useRef<'upload'|'remove'>('upload'),input=useRef<HTMLInputElement>(null);
 useEffect(()=>{input.current?.focus();},[]);
 useEffect(()=>{if(!file){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
 async function save(next:'upload'|'remove'){
  if(busy)return;
  if(!uncertain){operation.current=next;if(next==='remove')request.current=crypto.randomUUID();}
  if(operation.current==='upload'&&!file){setError('Chọn ảnh trước khi tải lên.');return;}
  setBusy(true);setError('');
  const form=new FormData();form.set('requestId',request.current);form.set('version',String(part.image_version||0));form.set('operation',operation.current);if(file&&operation.current==='upload')form.set('file',file);
  try{
   const response=await fetch(`/api/parts/${part.id}/image`,{method:'POST',body:form});const result=await response.json();
   if(!response.ok||!result.image){setError(result.error||'Chưa xác nhận lưu ảnh.');setUncertain(response.status>=500);return;}
   onSaved(result.image);
  }catch{setError('Mất kết nối. Chưa xác nhận kết quả; thử lại cùng yêu cầu.');setUncertain(true);}
  finally{setBusy(false);}
 }
 return <section className="part-image-editor" aria-label={`Ảnh sản phẩm ${part.name}`} aria-busy={busy}><strong>Ảnh sản phẩm · {part.name}</strong><p>JPG, PNG hoặc WebP, tối đa 2 MB. Một ảnh đại diện cho mỗi mặt hàng.</p>
  {(preview||part.image_url)&&<img className="part-image-preview" src={preview||part.image_url||''} alt={`Xem trước ảnh ${part.name}`} referrerPolicy="no-referrer"/>}
  <label className="field">Chọn ảnh<input ref={input} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy||uncertain} onChange={e=>{setError('');setFile(null);const selected=e.target.files?.[0];if(!selected)return;try{validateImageFile(selected.size,selected.type);setFile(selected);request.current=crypto.randomUUID();operation.current='upload';}catch(error){setError(error instanceof Error?error.message:'Ảnh không hợp lệ.');e.target.value='';}}}/></label>
  {error&&<p role="alert" className="auth-error">{error}</p>}{busy&&<p role="status">Đang xử lý và lưu ảnh…</p>}
  <div className="part-image-actions"><button type="button" className="button primary" disabled={busy||(!file&&!uncertain)} onClick={()=>void save(uncertain?operation.current:'upload')}>{uncertain?'Thử lại cùng yêu cầu':'Lưu ảnh'}</button>{part.image_url&&!uncertain&&<button type="button" className="button" disabled={busy} onClick={()=>{if(window.confirm('Gỡ ảnh đại diện của mặt hàng này?'))void save('remove');}}>Gỡ ảnh</button>}<button type="button" className="button" disabled={busy} onClick={onCancel}>{uncertain?'Đóng và tải lại trạng thái':'Hủy / Đóng'}</button></div>
 </section>;
}
