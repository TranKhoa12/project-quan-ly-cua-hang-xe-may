'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {CommandForm} from '@/features/garage/command-form';
import {normalizePartText} from './catalog';
import type {Part} from '@/lib/data';
import type {PartTerm} from './catalog';
import {dictionaryOptions} from './dictionary';
import {EditableCombobox} from '@/components/ui/editable-combobox';

export type PartDetails=Pick<Part,'id'|'name'|'category'|'brand'|'details_version'>;
export default function PartDetailsEditor({part,parts,terms=[],onSaved,onCancel,returnFocusTo}:{part:Part;parts:Part[];terms?:PartTerm[];onSaved:(details:PartDetails)=>void;onCancel:()=>void;returnFocusTo:HTMLButtonElement|null}){
 const [name,setName]=useState(part.name),[category,setCategory]=useState(part.category),[brand,setBrand]=useState(part.brand);
 const root=useRef<HTMLDivElement>(null);
 const options=useMemo(()=>({name:dictionaryOptions(terms,parts,'name'),category:dictionaryOptions(terms,parts,'category'),brand:dictionaryOptions(terms,parts,'brand')}),[terms,parts]);
 useEffect(()=>{
  const previous=returnFocusTo;
  root.current?.querySelector<HTMLInputElement>('input')?.focus();root.current?.scrollIntoView({block:'nearest'});
  return()=>{requestAnimationFrame(()=>{if(previous?.isConnected)previous.focus();});};
 },[returnFocusTo]);
 const duplicate=parts.find(p=>p.id!==part.id&&normalizePartText(p.name)===normalizePartText(name)&&normalizePartText(p.brand)===normalizePartText(brand));
 const invalid=!normalizePartText(name)||!normalizePartText(category)||!normalizePartText(brand);
 return <div className="part-details-editor" ref={root}><strong>Sửa thông tin · {part.sku||part.name}</strong>
  <CommandForm action="part_details" label="Lưu thay đổi" successText="Đã lưu thông tin mặt hàng." preventEnter submitDisabled={!!duplicate||!!invalid||(name===part.name&&category===part.category&&brand===part.brand)} build={()=>({partId:part.id,version:part.details_version||1,name,category,brand})} onSuccess={result=>{if(result.partDetails)onSaved(result.partDetails);}}>
   <EditableCombobox browse label="Tên mặt hàng" value={name} maxLength={180} options={options.name} onChange={setName} onSelect={option=>{if(option.category)setCategory(option.category);}}/>
   <div className="intake-fields"><EditableCombobox browse label="Nhóm hàng" value={category} options={options.category} onChange={setCategory}/><EditableCombobox browse label="Thương hiệu" value={brand} options={options.brand} onChange={setBrand}/></div>
   {duplicate&&<p className="auth-error" role="alert">Trùng tên và thương hiệu với {duplicate.name} · {duplicate.sku}. Hãy dùng tên hoặc thương hiệu khác.</p>}
   <button className="button" type="button" onClick={onCancel}>Hủy / Đóng</button>
  </CommandForm>
 </div>;
}
