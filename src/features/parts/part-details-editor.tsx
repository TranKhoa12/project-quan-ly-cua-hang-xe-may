'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {CommandForm} from '@/features/garage/command-form';
import {normalizePartText} from './catalog';
import type {Part} from '@/lib/data';

export type PartDetails=Pick<Part,'id'|'name'|'category'|'brand'|'details_version'>;
export default function PartDetailsEditor({part,parts,onSaved,onCancel,returnFocusTo}:{part:Part;parts:Part[];onSaved:(details:PartDetails)=>void;onCancel:()=>void;returnFocusTo:HTMLButtonElement|null}){
 const [name,setName]=useState(part.name),[category,setCategory]=useState(part.category),[brand,setBrand]=useState(part.brand);
 const root=useRef<HTMLDivElement>(null),id=useId();
 useEffect(()=>{
  const previous=returnFocusTo;
  root.current?.querySelector<HTMLInputElement>('input')?.focus();root.current?.scrollIntoView({block:'nearest'});
  return()=>{requestAnimationFrame(()=>{if(previous?.isConnected)previous.focus();});};
 },[returnFocusTo]);
 const duplicate=parts.find(p=>p.id!==part.id&&normalizePartText(p.name)===normalizePartText(name)&&normalizePartText(p.brand)===normalizePartText(brand));
 const invalid=!normalizePartText(name)||!normalizePartText(category)||!normalizePartText(brand);
 return <div className="part-details-editor" ref={root}><strong>Sửa thông tin · {part.sku||part.name}</strong>
  <CommandForm action="part_details" label="Lưu thay đổi" successText="Đã lưu thông tin mặt hàng." preventEnter submitDisabled={!!duplicate||!!invalid||(name===part.name&&category===part.category&&brand===part.brand)} build={()=>({partId:part.id,version:part.details_version||1,name,category,brand})} onSuccess={result=>{if(result.partDetails)onSaved(result.partDetails);}}>
   <div className="intake-fields"><label className="field">Tên mặt hàng<input required maxLength={180} value={name} onChange={e=>setName(e.target.value)}/></label><label className="field">Nhóm hàng<input required maxLength={100} list={`${id}-categories`} value={category} onChange={e=>setCategory(e.target.value)}/></label><label className="field">Thương hiệu<input required maxLength={100} list={`${id}-brands`} value={brand} onChange={e=>setBrand(e.target.value)}/></label></div>
   <datalist id={`${id}-categories`}>{Array.from(new Set(parts.map(p=>p.category))).filter(Boolean).map(v=><option value={v} key={v}/>)}</datalist><datalist id={`${id}-brands`}>{Array.from(new Set(parts.map(p=>p.brand))).filter(Boolean).map(v=><option value={v} key={v}/>)}</datalist>
   {duplicate&&<p className="auth-error" role="alert">Trùng tên và thương hiệu với {duplicate.name} · {duplicate.sku}. Hãy dùng tên hoặc thương hiệu khác.</p>}
   <button className="button" type="button" onClick={onCancel}>Hủy / Đóng</button>
  </CommandForm>
 </div>;
}
