'use client';
import { useEffect, useRef, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { money, type Part } from '@/lib/data';
import { normalizePartText, type PartTerm } from './catalog';
import { PartForm } from './part-form';
import { WORKSPACE_STORAGE_KEY } from '@/lib/workspace-storage';

export function PartsManager({initialParts,terms,count,error,ownerId}:{initialParts:Part[];terms:PartTerm[];count:number;error?:string;ownerId:string}) {
  const [legacyCount,setLegacyCount]=useState(0);
  useEffect(()=>{try{const legacy=JSON.parse(localStorage.getItem(`${WORKSPACE_STORAGE_KEY}:${ownerId}`)||'null');if(Array.isArray(legacy?.parts))setLegacyCount(legacy.parts.length);}catch{/* Do not alter old local data. */}},[ownerId]);
  const [parts,setParts]=useState(initialParts);const [open,setOpen]=useState(false);const [query,setQuery]=useState('');const [message,setMessage]=useState('');const router=useRouter();
  useEffect(()=>setParts(initialParts),[initialParts]);
  const filtered=parts.filter(p=>normalizePartText(`${p.name} ${p.brand} ${p.category} ${p.sku}`).includes(normalizePartText(query)));
  return <>{legacyCount>0&&<div className="info-banner"><p>Có {legacyCount} phụ tùng từ bản trước trên thiết bị này, chưa được đồng bộ vào danh mục mới. Dữ liệu cũ vẫn được giữ lại.</p></div>}<div className="catalog-toolbar"><p>Danh mục đã lưu trên Supabase · {Math.max(count,parts.length)} phụ tùng</p><button className="button primary" disabled={!!error} onClick={()=>{setMessage('');setOpen(true);}}><Plus size={17}/>Thêm phụ tùng</button></div>{error?<div className="auth-error" role="alert">{error}<button className="button" onClick={()=>router.refresh()}>Thử lại</button></div>:<><p className="form-hint catalog-description">Tên trong danh sách gợi ý chỉ dùng để điền form. Chọn tên không tự tạo hàng hóa hoặc nhập kho.</p>{message&&<p className="auth-success" role="status">{message}</p>}<section className="panel"><div className="table-toolbar"><div className="search-box"><Search size={16}/><input aria-label="Tìm phụ tùng" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tên, mã, thương hiệu..."/></div><span className="section-count">{filtered.length} kết quả</span></div><div className="table-scroll"><table><thead><tr><th>PHỤ TÙNG</th><th>NHÓM HÀNG</th><th>THƯƠNG HIỆU</th><th className="right">GIÁ VỐN</th><th className="right">GIÁ BÁN</th><th className="right">TỒN KHO</th></tr></thead><tbody>{filtered.map(p=><tr key={p.id}><td><strong>{p.name}</strong><small className="subtext">{p.sku}</small></td><td>{p.category}</td><td>{p.brand}</td><td className="right">{money(p.cost)}</td><td className="right amount">{money(p.price)}</td><td className="right">{p.stock}</td></tr>)}</tbody></table>{!filtered.length&&<div className="empty"><p>{parts.length?'Không tìm thấy phụ tùng phù hợp.':'Chưa có phụ tùng. Chọn Thêm phụ tùng để bắt đầu.'}</p></div>}</div>{count>1000&&<p className="table-footer">Đang hiển thị tối đa 1.000 phụ tùng mới nhất.</p>}</section></>}{open&&<PartDialog close={()=>setOpen(false)}><PartForm parts={parts} terms={terms} onCancel={()=>setOpen(false)} onView={name=>{setQuery(name);setOpen(false);router.refresh();}} onSaved={part=>{setParts(current=>[part,...current.filter(p=>p.id!==part.id)]);setOpen(false);setMessage(`Đã lưu ${part.name}. Thông tin mới đã được ghi nhớ để gợi ý lần sau.`);router.refresh();}}/></PartDialog>}</>;
}
function PartDialog({close,children}:{close:()=>void;children:React.ReactNode}) {
  const ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{const previous=document.activeElement as HTMLElement;const old=document.body.style.overflow;document.body.style.overflow='hidden';ref.current?.querySelector<HTMLInputElement>('input')?.focus();return()=>{document.body.style.overflow=old;previous?.focus();};},[]);
  return <div className="dialog-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target&&!ref.current?.querySelector('form[aria-busy="true"]'))close();}}><div className="dialog part-dialog" role="dialog" aria-modal="true" aria-label="Thêm phụ tùng" ref={ref} onKeyDown={e=>{
    if(e.key==='Escape'){if(!ref.current?.querySelector('form[aria-busy="true"]'))close();}
    if(e.key!=='Tab')return;const elements=ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled)');if(!elements?.length)return;const first=elements[0],last=elements[elements.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }}><div className="dialog-header"><h2>Thêm phụ tùng</h2><button className="icon-button" type="button" aria-label="Đóng form phụ tùng" onClick={()=>{if(!ref.current?.querySelector('form[aria-busy="true"]'))close();}}><X size={20}/></button></div><div className="dialog-content">{children}</div></div></div>;
}
