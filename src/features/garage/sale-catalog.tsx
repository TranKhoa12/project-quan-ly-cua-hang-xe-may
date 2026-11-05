'use client';
import { useMemo,useState } from 'react';
import { money } from '@/lib/data';
import ProductImage from '@/features/parts/product-image';
import type { StockPart } from './types';
import {normalizePartText,type PartTerm} from '@/features/parts/catalog';
import {partSearchIndex} from '@/features/parts/dictionary';

// Hình theo nhóm chỉ hỗ trợ nhận diện; không phải ảnh hay xác nhận mẫu hàng.
function PartIllustration({name}:{name:string}) {
 const key=name.toLocaleLowerCase('vi');
 const shape=/lốp|vỏ xe|ruột/.test(key)?'tire':/nhớt|dầu/.test(key)?'oil':/bugi/.test(key)?'plug':/ắc quy|bình điện/.test(key)?'battery':/sên|xích|nhông|đĩa/.test(key)?'gear':'box';
 return <svg viewBox="0 0 240 150" aria-hidden="true" focusable="false">
  <ellipse cx="120" cy="132" rx="68" ry="8" fill="#cedbd8"/>
  <g stroke="#254a51" strokeWidth="5" strokeLinejoin="round" fill="#d8e8e4">
   {shape==='tire'&&<><circle cx="120" cy="73" r="53" fill="#354851"/><circle cx="120" cy="73" r="30" fill="#f4f8f6"/><circle cx="120" cy="73" r="42" fill="none" stroke="#859a9e" strokeDasharray="8 7"/></>}
   {shape==='oil'&&<><path d="M91 45h52l15 25v53H82V66z" fill="#e6b650"/><path d="M97 26h36v19H97z" fill="#435962"/><path d="M136 57h9l6 15h-15z" fill="#f4f8f6"/><path d="M94 80h47v29H94z" fill="#fff4ce"/><path d="M116 85q-17 20 0 20t0-20" fill="#cf8a21" stroke="none"/></>}
   {shape==='plug'&&<><path d="M112 19h16v30h-16z" fill="#879caa"/><path d="M103 49h34v42h-34z" fill="#fff"/><path d="M102 60h36m-36 12h36m-36 12h36"/><path d="M97 93h46v17H97z" fill="#879caa"/><path d="M109 110h22v17h-22zm22 17v9h-11"/></>}
   {shape==='battery'&&<><path d="M73 48h94v76H73z" fill="#405966"/><path d="M80 35h20v13H80zm60 0h20v13h-20z" fill="#b9c9cc"/><path d="M83 66h74v39H83z" fill="#e9f3ed"/><path d="M93 80h18m-9-9v18m28-9h18"/></>}
   {shape==='gear'&&<><circle cx="120" cy="74" r="48" fill="#a1b3bd" strokeWidth="12" strokeDasharray="12 5"/><circle cx="120" cy="74" r="17" fill="#f4f8f6"/>{[0,72,144,216,288].map(a=><circle key={a} cx="120" cy="43" r="5" transform={`rotate(${a} 120 74)`} fill="#f4f8f6" stroke="none"/>)}</>}
   {shape==='box'&&<><path d="m120 30 58 30v58l-58 19-58-29V55z" fill="#d9bc8b"/><path d="m62 55 58 27 58-22m-58 22v55m-28-97 58 28v24" fill="none"/><path d="m75 85 27 12"/></>}
  </g>
 </svg>;
}

export default function SaleCatalog({parts,terms=[],quantities,onAdd}:{parts:StockPart[];terms?:PartTerm[];quantities:Record<string,number>;onAdd:(part:StockPart)=>void}) {
 const [query,setQuery]=useState(''),[category,setCategory]=useState('');
 const index=useMemo(()=>partSearchIndex(parts,terms),[parts,terms]);
 const sellable=parts.filter(p=>p.pos_visible!==false);
 const matches=sellable.filter(p=>(!category||p.category===category)&&index.get(p.id)?.includes(normalizePartText(query)));
 return <section className="sale-catalog" aria-label="Chọn phụ tùng bằng hình">
  <div className="sale-catalog-filters"><label className="field">Tìm phụ tùng<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Tên, mã hoặc thương hiệu…"/></label><label className="field">Nhóm phụ tùng<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Tất cả nhóm</option>{Array.from(new Set(sellable.map(p=>p.category))).filter(Boolean).sort().map(c=><option key={c} value={c}>{c}</option>)}</select></label></div>
  <p className="form-hint">Hình minh họa theo loại phụ tùng. Đối chiếu tên và mã hàng trước khi bán.</p>
  {Object.keys(quantities).length>=100&&<p role="status">Đơn đã đủ 100 mặt hàng. Thanh toán đơn này trước khi tạo đơn tiếp.</p>}
  <div className="sale-catalog-grid">{matches.map(p=>{const quantity=quantities[p.id]||0;return <button key={p.id} type="button" className="sale-product" disabled={p.stock<=quantity||(!quantity&&Object.keys(quantities).length>=100)} onClick={()=>onAdd(p)} aria-label={`Thêm ${p.name}, mã ${p.sku} vào đơn`}>
   <span className="sale-product-art"><ProductImage key={p.image_url||'empty'} src={p.image_url} name={p.name} fallback={<><PartIllustration name={`${p.name} ${p.category}`}/><small>Hình minh họa</small></>}/></span>
   <span className="sale-product-info"><small>{p.sku} · {p.brand}</small><strong>{p.name}</strong><b>{money(p.price)}</b><span>{p.stock>0?`Tồn kho: ${p.stock}`:'Hết hàng'}{quantity>0&&` · Trong đơn: ${quantity}`}</span><span className="sale-product-add">{p.stock<=quantity?(p.stock<=0?'Hết hàng':'Đã chọn hết tồn'):'+ Thêm vào đơn'}</span></span>
  </button>;})}</div>
  {!matches.length&&<p role="status">{parts.length?'Không tìm thấy phụ tùng phù hợp. Hãy đổi từ khóa hoặc nhóm hàng.':'Chưa có phụ tùng trong danh mục.'}</p>}
 </section>;
}
