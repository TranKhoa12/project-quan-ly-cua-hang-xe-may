'use client';
import {useEffect,useRef,useState} from 'react';
import type {Part} from '@/lib/data';
import {CommandForm} from '@/features/garage/command-form';

export default function PartDeletePanel({part,onDeleted,onCancel}:{part:Part;onDeleted:()=>void;onCancel:()=>void}){
 const [confirmed,setConfirmed]=useState(false);const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{root.current?.focus();root.current?.scrollIntoView({block:'nearest'});},[]);
 return <div className="panel" ref={root} tabIndex={-1} aria-label="Xác nhận xóa mặt hàng"><h3>Xóa mặt hàng: {part.name}</h3><p>Chỉ xóa hẳn hàng chưa có giao dịch hoặc báo giá và tồn kho bằng 0. Hàng đã phát sinh hãy dùng Ẩn khỏi POS để giữ lịch sử.</p><CommandForm action="part_delete" label="Xác nhận xóa mặt hàng" submitDisabled={!confirmed||part.stock!==0} build={()=>({partId:part.id,version:part.details_version||1})} onSuccess={onDeleted}>
  {part.stock!==0?<p className="auth-error">Mặt hàng đang còn {part.stock} trong kho, không thể xóa.</p>:<label className="live-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Tôi xác nhận xóa hẳn mặt hàng này khỏi danh mục.</label>}
  <button type="button" className="button" onClick={onCancel}>Hủy / Đóng</button>
 </CommandForm></div>;
}
