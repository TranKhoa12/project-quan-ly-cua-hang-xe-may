'use client';
import { useMemo, useRef, useState, useTransition } from 'react';
import { Check } from 'lucide-react';
import type { Part } from '@/lib/data';
import { EditableCombobox, type ComboOption } from '@/components/ui/editable-combobox';
import { exactDuplicate, normalizePartText, type PartTerm, type PartSaveResult } from './catalog';
import { savePart } from './actions';

export function PartForm({terms,parts,onSaved,onCancel,onView}:{terms:PartTerm[];parts:Part[];onSaved:(part:Part)=>void;onCancel:()=>void;onView:(name:string)=>void}) {
  const [fields,setFields]=useState({name:'',category:'',brand:'',price:'',cost:'',min:'5'});
  const [result,setResult]=useState<PartSaveResult>({});const [confirmed,setConfirmed]=useState(false);const [pending,startTransition]=useTransition();const request=useRef<string|null>(null);
  const options=useMemo(()=>{
    const build=(kind:PartTerm['kind'],key:'name'|'category'|'brand')=>{
      const values:ComboOption[]=[...terms.filter(t=>t.kind===kind).map(t=>({name:t.name,aliases:t.aliases,category:t.category})),...parts.map(p=>({name:p[key],category:key==='name'?p.category:undefined,brand:key==='name'?p.brand:undefined,detail:key==='name'?`${p.brand} · ${p.sku||p.id}`:'Đã sử dụng'}))];
      return values.filter((v,i,all)=>all.findIndex(o=>normalizePartText(o.name)===normalizePartText(v.name)&&(o.brand||'')===(v.brand||''))===i);
    };
    return {name:build('name','name'),category:build('category','category'),brand:build('brand','brand')};
  },[terms,parts]);
  const duplicate=fields.name&&fields.brand&&exactDuplicate(parts,fields.name,fields.brand);
  const existing=parts.filter(p=>normalizePartText(p.name)===normalizePartText(fields.name)&&normalizePartText(p.brand)===normalizePartText(fields.brand));
  const nearby=normalizePartText(fields.name).length>=4?parts.filter(p=>normalizePartText(p.brand)===normalizePartText(fields.brand)&&normalizePartText(p.name)!==normalizePartText(fields.name)&&(normalizePartText(p.name).includes(normalizePartText(fields.name))||normalizePartText(fields.name).includes(normalizePartText(p.name)))).slice(0,5):[];
  function change(key:keyof typeof fields,value:string){setFields(f=>({...f,[key]:value}));setResult({});setConfirmed(false);}
  return <form aria-busy={pending} onSubmit={e=>{e.preventDefault();if(duplicate||pending)return;request.current ||= crypto.randomUUID();const snapshot={...fields,price:Number(fields.price),cost:Number(fields.cost),min:Number(fields.min),requestId:request.current,allowSimilar:confirmed};startTransition(async()=>{try{const saved=await savePart(snapshot);setResult(saved);if(saved.part)onSaved(saved.part);}catch{setResult({error:'Kết nối bị gián đoạn. Hãy thử lại; hệ thống giữ mã yêu cầu để tránh tạo lặp.'});}});}}>
    <EditableCombobox label="Tên phụ tùng" value={fields.name} onChange={v=>change('name',v)} onSelect={option=>setFields(f=>({...f,category:option.category||f.category,brand:option.brand||f.brand}))} options={options.name} maxLength={180} placeholder="Tìm tên phụ tùng hoặc tự nhập tên mới" disabled={pending}/>
    <div className="form-row"><EditableCombobox label="Nhóm hàng" value={fields.category} onChange={v=>change('category',v)} options={options.category} disabled={pending}/><EditableCombobox label="Thương hiệu" value={fields.brand} onChange={v=>change('brand',v)} options={options.brand} disabled={pending}/></div>
    {(duplicate||result.duplicates?.length||nearby.length>0)&&<div className="duplicate-notice" role="status"><strong>{duplicate?'Phụ tùng này đã có trong danh mục':'Có phụ tùng tên gần giống'}</strong><p>Đối chiếu tên, loại xe/đời xe ghi trong tên và thương hiệu trước khi tạo mới.</p><ul>{(existing.length?existing:result.duplicates?.length?result.duplicates:nearby).map(p=><li key={p.id}><span>{p.name}<small>{p.brand} · {p.category}</small></span><button type="button" className="text-link" disabled={pending} onClick={()=>onView(p.name)}>Xem bản ghi</button></li>)}</ul>{result.needsConfirmation&&!duplicate&&<label className="checkbox-label"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Tôi đã kiểm tra, đây là phụ tùng khác.</label>}</div>}
    <div className="form-row"><label className="field">Giá vốn tham khảo (đ)<input type="number" min="0" max="1000000000" step="1" value={fields.cost} onChange={e=>change('cost',e.target.value)} required disabled={pending}/></label><label className="field">Giá bán (đ)<input type="number" min="0" max="1000000000" step="1" value={fields.price} onChange={e=>change('price',e.target.value)} required disabled={pending}/></label></div>
    <label className="field">Ngưỡng tồn tối thiểu<input type="number" min="0" max="1000000" step="1" value={fields.min} onChange={e=>change('min',e.target.value)} required disabled={pending}/></label>
    <p className="form-hint">Phụ tùng mới có tồn kho bằng 0. Tên, nhóm và thương hiệu mới sẽ được ghi nhớ để gợi ý lần sau.</p>
    {result.error&&!result.duplicates?.length&&<p role="alert" className="auth-error">{result.error}</p>}
    <div className="dialog-actions"><button className="button" type="button" onClick={onCancel} disabled={pending}>Hủy</button><button className="button primary" type="submit" disabled={pending||!!duplicate||!!(result.needsConfirmation&&!confirmed)}><Check size={17}/>{pending?'Đang lưu...':'Lưu thông tin'}</button></div>
  </form>;
}
