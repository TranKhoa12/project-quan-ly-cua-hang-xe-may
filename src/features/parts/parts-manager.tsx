'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {PackagePlus,Pencil,Search} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {money,type Part} from '@/lib/data';
import {normalizePartText} from './catalog';
import type {PartTerm} from './catalog';
import {partSearchIndex} from './dictionary';
import {CommandForm} from '@/features/garage/command-form';
import PartDetailsEditor from './part-details-editor';
import PartDeletePanel from './part-delete-panel';

export function PartsManager({initialParts,count,error,terms=[]}:{initialParts:Part[];count:number;error?:string;terms?:PartTerm[]}){
 const [query,setQuery]=useState(''),[visibility,setVisibility]=useState('all');const router=useRouter();
 const [page,setPage]=useState(0),[pageSize,setPageSize]=useState(20);
 const [catalog,setCatalog]=useState(initialParts),[editing,setEditing]=useState<Part|null>(null),[message,setMessage]=useState('');
 const [deleting,setDeleting]=useState<Part|null>(null),[currentCount,setCurrentCount]=useState(count);
 const editTrigger=useRef<HTMLButtonElement|null>(null);
 useEffect(()=>{setCatalog(initialParts);setCurrentCount(count);},[initialParts,count]);
 const searchIndex=useMemo(()=>partSearchIndex(catalog,terms),[catalog,terms]);
 const parts=catalog.filter(p=>searchIndex.get(p.id)?.includes(normalizePartText(query))&&(visibility==='all'||(visibility==='visible'?p.pos_visible!==false:p.pos_visible===false)));
 const pageCount=Math.max(1,Math.ceil(parts.length/pageSize)),currentPage=Math.min(page,pageCount-1),start=currentPage*pageSize;
 const visibleParts=parts.slice(start,start+pageSize);
 return <><div className="catalog-toolbar"><p>{currentCount} mặt hàng trong kho</p><Link className="button primary" href="/purchases"><PackagePlus size={18}/>Nhập hàng</Link></div>
 {message&&<p role="status" className="auth-success">{message}</p>}
 {deleting&&<PartDeletePanel key={deleting.id} part={deleting} onCancel={()=>{setDeleting(null);editTrigger.current?.focus();}} onDeleted={()=>{setCatalog(current=>current.filter(p=>p.id!==deleting.id));setCurrentCount(n=>n-1);setDeleting(null);setMessage('Đã xóa mặt hàng.');}}/>}
 {editing&&<PartDetailsEditor key={editing.id} part={editing} parts={catalog} terms={terms} returnFocusTo={editTrigger.current} onCancel={()=>{setEditing(null);router.refresh();}} onSaved={details=>{setCatalog(current=>current.map(p=>p.id===details.id?{...p,...details}:p));setEditing(null);setQuery('');setMessage('Đã cập nhật tên, nhóm và thương hiệu.');}}/>}
 {error?<div className="auth-error" role="alert">{error}<button className="button" onClick={()=>router.refresh()}>Thử lại</button></div>:<section className="panel parts-catalog-panel"><div className="table-toolbar"><div className="search-box"><Search size={16}/><input aria-label="Tìm phụ tùng" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}} placeholder="Tên, mã, thương hiệu…"/></div><select aria-label="Lọc hiển thị POS" value={visibility} onChange={e=>{setVisibility(e.target.value);setPage(0);}}><option value="all">Tất cả mặt hàng</option><option value="visible">Đang hiện trên POS</option><option value="hidden">Đã ẩn khỏi POS</option></select><span className="section-count">{parts.length} kết quả</span></div>
 <div className="table-scroll"><table><thead><tr><th>PHỤ TÙNG</th><th>NHÓM HÀNG</th><th>THƯƠNG HIỆU</th><th className="right">GIÁ VỐN</th><th className="right">GIÁ BÁN</th><th className="right">TỒN KHO</th><th>HIỂN THỊ POS</th></tr></thead><tbody>{visibleParts.map(p=><tr key={p.id}><td><strong>{p.name}</strong><small className="subtext">{p.sku}</small><button className="button part-edit-button" type="button" disabled={!!editing||!!deleting} onClick={e=>{editTrigger.current=e.currentTarget;setMessage('');setEditing({...p});}}><Pencil size={14}/>Sửa thông tin</button><button className="button part-edit-button" type="button" disabled={!!editing||!!deleting} onClick={e=>{editTrigger.current=e.currentTarget;setMessage('');setDeleting({...p});}}>Xóa mặt hàng</button></td><td>{p.category}</td><td>{p.brand}</td><td className="right">{money(p.cost)}</td><td className="right amount">{money(p.price)}</td><td className="right">{p.stock}</td><td className="part-visibility-form"><span>{p.pos_visible===false?'Đã ẩn khỏi POS':'Đang bán trên POS'}</span><CommandForm action="part_visibility" label={p.pos_visible===false?'Hiện trên POS':'Ẩn khỏi POS'} successText={p.pos_visible===false?'Đã hiện lại trên POS.':'Đã ẩn khỏi POS. Tồn kho và lịch sử giữ nguyên.'} build={()=>({partId:p.id,expected:p.pos_visible!==false,visible:p.pos_visible===false})}>{null}</CommandForm></td></tr>)}</tbody></table>
 {!parts.length&&<div className="empty"><p>{initialParts.length?'Không tìm thấy hàng phù hợp. Hãy đổi từ khóa hoặc bộ lọc.':'Chưa có mặt hàng. Vào Nhập hàng để nhận hàng mới vào kho.'}</p></div>}
 </div><nav className="parts-pagination" aria-label="Phân trang phụ tùng"><span role="status">{parts.length?`${start+1}–${Math.min(start+pageSize,parts.length)}`:'0'} / {parts.length} kết quả · Trang {currentPage+1}/{pageCount}</span><label>Số hàng/trang<select aria-label="Số phụ tùng mỗi trang" value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(0);}}><option value={20}>20</option><option value={50}>50</option></select></label><div><button type="button" className="button" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>Trang trước</button><button type="button" className="button" disabled={currentPage>=pageCount-1} onClick={()=>setPage(currentPage+1)}>Trang sau</button></div></nav>{currentCount>catalog.length&&<p className="table-footer">Tìm kiếm và phân trang trong {catalog.length}/{currentCount} mặt hàng mới nhất đã tải.</p>}</section>}</>;
}
