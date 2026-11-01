'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {PackagePlus,Pencil,Search} from 'lucide-react';
import {useRouter} from 'next/navigation';
import {money,type Part} from '@/lib/data';
import {normalizePartText} from './catalog';
import {CommandForm} from '@/features/garage/command-form';
import PartDetailsEditor from './part-details-editor';

export function PartsManager({initialParts,count,error}:{initialParts:Part[];count:number;error?:string}){
 const [query,setQuery]=useState(''),[visibility,setVisibility]=useState('all');const router=useRouter();
 const [catalog,setCatalog]=useState(initialParts),[editing,setEditing]=useState<Part|null>(null),[message,setMessage]=useState('');
 const editTrigger=useRef<HTMLButtonElement|null>(null);
 useEffect(()=>setCatalog(initialParts),[initialParts]);
 const parts=catalog.filter(p=>normalizePartText(`${p.name} ${p.brand} ${p.category} ${p.sku}`).includes(normalizePartText(query))&&(visibility==='all'||(visibility==='visible'?p.pos_visible!==false:p.pos_visible===false)));
 return <><div className="catalog-toolbar"><p>{count} mặt hàng trong kho</p><Link className="button primary" href="/purchases"><PackagePlus size={18}/>Nhập hàng</Link></div>
 {message&&<p role="status" className="auth-success">{message}</p>}
 {editing&&<PartDetailsEditor key={editing.id} part={editing} parts={catalog} returnFocusTo={editTrigger.current} onCancel={()=>{setEditing(null);router.refresh();}} onSaved={details=>{setCatalog(current=>current.map(p=>p.id===details.id?{...p,...details}:p));setEditing(null);setQuery('');setMessage('Đã cập nhật tên, nhóm và thương hiệu.');}}/>}
 {error?<div className="auth-error" role="alert">{error}<button className="button" onClick={()=>router.refresh()}>Thử lại</button></div>:<section className="panel"><div className="table-toolbar"><div className="search-box"><Search size={16}/><input aria-label="Tìm phụ tùng" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tên, mã, thương hiệu…"/></div><select aria-label="Lọc hiển thị POS" value={visibility} onChange={e=>setVisibility(e.target.value)}><option value="all">Tất cả mặt hàng</option><option value="visible">Đang hiện trên POS</option><option value="hidden">Đã ẩn khỏi POS</option></select><span className="section-count">{parts.length} kết quả</span></div>
 <div className="table-scroll"><table><thead><tr><th>PHỤ TÙNG</th><th>NHÓM HÀNG</th><th>THƯƠNG HIỆU</th><th className="right">GIÁ VỐN</th><th className="right">GIÁ BÁN</th><th className="right">TỒN KHO</th><th>HIỂN THỊ POS</th></tr></thead><tbody>{parts.map(p=><tr key={p.id}><td><strong>{p.name}</strong><small className="subtext">{p.sku}</small><button className="button part-edit-button" type="button" disabled={!!editing} onClick={e=>{editTrigger.current=e.currentTarget;setMessage('');setEditing({...p});}}><Pencil size={14}/>Sửa thông tin</button></td><td>{p.category}</td><td>{p.brand}</td><td className="right">{money(p.cost)}</td><td className="right amount">{money(p.price)}</td><td className="right">{p.stock}</td><td className="part-visibility-form"><span>{p.pos_visible===false?'Đã ẩn khỏi POS':'Đang bán trên POS'}</span><CommandForm action="part_visibility" label={p.pos_visible===false?'Hiện trên POS':'Ẩn khỏi POS'} successText={p.pos_visible===false?'Đã hiện lại trên POS.':'Đã ẩn khỏi POS. Tồn kho và lịch sử giữ nguyên.'} build={()=>({partId:p.id,expected:p.pos_visible!==false,visible:p.pos_visible===false})}>{null}</CommandForm></td></tr>)}</tbody></table>
 {!parts.length&&<div className="empty"><p>{initialParts.length?'Không tìm thấy hàng phù hợp. Hãy đổi từ khóa hoặc bộ lọc.':'Chưa có mặt hàng. Vào Nhập hàng để nhận hàng mới vào kho.'}</p></div>}
 </div>{count>1000&&<p className="table-footer">Đang hiển thị tối đa 1.000 mặt hàng mới nhất.</p>}</section>}</>;
}
