'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {EditableCombobox,type ComboOption} from '@/components/ui/editable-combobox';
import {normalizePartText} from '@/features/parts/catalog';
import type {GarageSnapshot} from './types';
import PartWebSearch from './part-web-search';

export type NewPurchasePart={name:string;category:string;brand:string;price:number;min:number;allowSimilar:boolean};
export default function PurchaseItemEditor({data,initial,otherNewParts,onSave,onUseExisting,onCancel}:{data:GarageSnapshot;initial:NewPurchasePart;otherNewParts:NewPurchasePart[];onSave:(part:NewPurchasePart)=>void;onUseExisting:(id:string)=>void;onCancel:()=>void}){
 const [part,setPart]=useState(initial);const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{root.current?.querySelector<HTMLInputElement>('input')?.focus();},[]);
 const change=(patch:Partial<NewPurchasePart>)=>setPart(p=>({...p,...patch,allowSimilar:patch.allowSimilar??false}));
 const options=useMemo(()=>{
  const make=(kind:'name'|'category'|'brand'):ComboOption[]=>{
   const all:ComboOption[]=[...(data.partTerms||[]).filter(t=>t.kind===kind).map(t=>({name:t.name,aliases:t.aliases,category:t.category})),...data.parts.map(p=>({name:p[kind],category:kind==='name'?p.category:undefined,brand:kind==='name'?p.brand:undefined,detail:kind==='name'?p.brand:undefined}))];
   return all.filter((v,i)=>all.findIndex(o=>normalizePartText(o.name)===normalizePartText(v.name)&&(o.brand||'')===(v.brand||''))===i);
  };return {name:make('name'),category:make('category'),brand:make('brand')};
 },[data.parts,data.partTerms]);
 const same=(p:Pick<NewPurchasePart,'name'|'brand'>)=>!!normalizePartText(part.name)&&!!normalizePartText(part.brand)&&normalizePartText(p.name)===normalizePartText(part.name)&&normalizePartText(p.brand)===normalizePartText(part.brand);
 const exact=data.parts.filter(same),duplicate=exact.length>0||otherNewParts.some(same);
 const near=data.parts.filter(p=>normalizePartText(part.name).length>=3&&normalizePartText(p.brand)===normalizePartText(part.brand)&&(normalizePartText(p.name).includes(normalizePartText(part.name))||normalizePartText(part.name).includes(normalizePartText(p.name)))).slice(0,4);
 function save(){
  const fields=root.current?.querySelectorAll<HTMLInputElement|HTMLSelectElement>('input,select');
  if(fields)for(const field of fields){if(!field.checkValidity()){field.closest('details')?.setAttribute('open','');field.reportValidity();return;}}
  if(!duplicate)onSave(part);
 }
 return <div className="purchase-item-editor" ref={root}><div className="purchase-editor-heading"><strong>Thông tin mặt hàng mới</strong><button className="button" type="button" onClick={onCancel}>Hủy</button></div>
  <EditableCombobox capitalize label="Tên mặt hàng" value={part.name} maxLength={180} options={options.name} onChange={name=>change({name})} onSelect={o=>change({name:o.name,category:o.category||part.category,brand:o.brand||part.brand})} rememberText="Chỉ lưu khi chốt phiếu nhập"/>
  <PartWebSearch name={part.name} onChoose={name=>{change({name});requestAnimationFrame(()=>root.current?.querySelector<HTMLInputElement>('input')?.focus());}}/>
  <div className="intake-fields"><EditableCombobox label="Nhóm hàng" value={part.category} options={options.category} onChange={category=>change({category})} rememberText="Chỉ lưu khi chốt phiếu nhập"/><EditableCombobox label="Thương hiệu" value={part.brand} options={options.brand} onChange={brand=>change({brand})} rememberText="Chỉ lưu khi chốt phiếu nhập"/></div>
  {(duplicate||near.length>0)&&<div className="duplicate-notice" role="status"><strong>{duplicate?'Mặt hàng này đã có trong kho hoặc phiếu.':'Có hàng tên gần giống, hãy đối chiếu.'}</strong>{(exact.length?exact:near).map(p=><p key={p.id}>{p.name} · {p.brand} <button className="button" type="button" onClick={()=>onUseExisting(p.id)}>Dùng hàng này</button></p>)}</div>}
  <details className="purchase-extra" open={part.allowSimilar||undefined}><summary>Tùy chọn thêm: cảnh báo tồn, xác nhận hàng tương tự</summary><label className="field">Cảnh báo khi tồn dưới<input type="number" min={0} max={1000000} step={1} required value={part.min} onChange={e=>change({min:Number(e.target.value)})}/></label><label className="live-check"><input type="checkbox" checked={part.allowSimilar} onChange={e=>change({allowSimilar:e.target.checked})}/>Tôi đã kiểm tra: đây là hàng khác với những tên gần giống.</label></details>
  <button type="button" className="button primary" disabled={duplicate} onClick={save}>Thêm vào phiếu</button>
 </div>;
}
