'use client';
import {useMemo,useState} from 'react';
import {normalizePartText,type PartTerm} from '@/features/parts/catalog';
import {partSearchIndex} from '@/features/parts/dictionary';
import type {StockPart} from './types';
export default function StockPartPicker({parts,terms=[],value,onChange,label='Phụ tùng',required=false}:{parts:StockPart[];terms?:PartTerm[];value:string;onChange:(id:string)=>void;label?:string;required?:boolean}){
 const [query,setQuery]=useState('');
 const index=useMemo(()=>partSearchIndex(parts,terms),[parts,terms]);
 const filtered=parts.filter(p=>p.id===value||index.get(p.id)?.includes(normalizePartText(query)));
 return <div className="stock-part-picker"><label className="field">Tìm {label.toLocaleLowerCase('vi')}<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tên, tên gọi khác, mã hoặc thương hiệu…"/></label><label className="field">{label}<select required={required} value={value} onChange={e=>onChange(e.target.value)}><option value="">Chọn phụ tùng</option>{filtered.map(p=><option key={p.id} value={p.id}>{p.name} · {p.brand} · {p.sku} · Còn {p.stock}</option>)}</select></label>{!filtered.length&&<small role="status">Không có phụ tùng phù hợp. Thử tên gọi hoặc mã khác.</small>}</div>;
}
