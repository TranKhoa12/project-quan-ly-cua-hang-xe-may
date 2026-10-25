'use client';
import { useId, useState } from 'react';
import { ChevronDown, Plus, Search } from 'lucide-react';
import { normalizePartText, rankSuggestions } from '@/features/parts/catalog';

export type ComboOption={name:string;aliases?:string[];category?:string|null;brand?:string;detail?:string};
export function EditableCombobox({label,value,onChange,onSelect,options,placeholder,maxLength=100,disabled=false}:{label:string;value:string;onChange:(value:string)=>void;onSelect?:(option:ComboOption)=>void;options:ComboOption[];placeholder?:string;maxLength?:number;disabled?:boolean}) {
  const id=useId();const [open,setOpen]=useState(false);const [active,setActive]=useState(-1);
  const showSuggestions=open&&!disabled&&Boolean(normalizePartText(value));
  const matches=rankSuggestions(options,value) as ComboOption[];
  const isNew=normalizePartText(value)&&!options.some(o=>normalizePartText(o.name)===normalizePartText(value));
  function choose(option:ComboOption){onChange(option.name);onSelect?.(option);setOpen(false);setActive(-1);}
  return <div className="combo-field" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false);}}><label className="field" htmlFor={id}>{label}<span className="combo-input"><Search size={16}/><input id={id} role="combobox" aria-autocomplete="list" aria-expanded={showSuggestions} aria-controls={`${id}-options`} aria-activedescendant={showSuggestions&&active>=0?`${id}-option-${active}`:undefined} value={value} onChange={e=>{onChange(e.target.value);setOpen(true);setActive(-1);}} onFocus={()=>setOpen(true)} onKeyDown={e=>{
    if(e.key==='ArrowDown'&&normalizePartText(value)){e.preventDefault();setOpen(true);setActive(i=>Math.min(i+1,matches.length-1));}
    if(e.key==='ArrowUp'&&showSuggestions){e.preventDefault();setActive(i=>matches.length?Math.max(i-1,0):-1);}
    if(e.key==='Enter'&&showSuggestions){e.preventDefault();if(active>=0&&matches[active])choose(matches[active]);else setOpen(false);}
    if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();setOpen(false);setActive(-1);}
  }} autoComplete="off" placeholder={placeholder} required maxLength={maxLength} disabled={disabled}/><button type="button" aria-label={`Mở gợi ý ${label}`} disabled={disabled} onMouseDown={e=>e.preventDefault()} onClick={()=>setOpen(!open)}><ChevronDown size={16}/></button></span></label>{showSuggestions&&<div id={`${id}-options`} role="listbox" aria-label={`Gợi ý ${label}`} className="combo-options">{matches.map((option,index)=><button key={`${option.name}:${option.brand||''}`} id={`${id}-option-${index}`} type="button" role="option" aria-selected={active===index} className={active===index?'highlighted':''} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(option)}><span>{option.name}<small>{option.detail||option.brand||option.category||'Tên gợi ý'}</small></span></button>)}{isNew&&<button type="button" className="combo-new" onMouseDown={e=>e.preventDefault()} onClick={()=>setOpen(false)}><Plus size={15}/><span>Dùng tên mới: <strong>{value.trim()}</strong><small>Chỉ ghi nhớ sau khi bấm Lưu thông tin</small></span></button>}{!matches.length&&!isNew&&<p className="combo-empty">Nhập để tìm hoặc thêm tên mới.</p>}</div>}<span className="combo-hint">Chọn gợi ý hoặc tự nhập nếu chưa có.</span></div>;
}
