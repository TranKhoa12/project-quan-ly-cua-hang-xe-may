import type {PartTerm} from './catalog';
import {normalizePartText} from './normalize.mjs';
import type {Part} from '@/lib/data';
export type DictionaryPart=Pick<Part,'id'|'name'|'category'|'brand'|'sku'>;
export type DictionaryOption={name:string;aliases:string[];category?:string|null;brand?:string;detail?:string};
export function dictionaryOptions(terms:PartTerm[],parts:DictionaryPart[],kind:PartTerm['kind']):DictionaryOption[]{
 const values:DictionaryOption[]=terms.filter(t=>t.kind===kind).map(t=>({name:t.name,aliases:t.aliases,category:t.category,detail:kind==='name'?t.category||'Tên tham khảo':'Từ điển dùng chung'}));
 values.push(...parts.map(p=>({name:p[kind],aliases:[],...(kind==='name'?{category:p.category,brand:p.brand,detail:`${p.brand} · ${p.sku||''}`}:{})})));
 const merged=new Map<string,DictionaryOption>();
 for(const item of values){if(!normalizePartText(item.name))continue;const key=`${normalizePartText(item.name)}:${normalizePartText(item.brand||'')}`;const previous=merged.get(key);merged.set(key,previous?{...previous,aliases:[...new Set([...previous.aliases,...item.aliases])]}:item);}
 return [...merged.values()];
}
export function partSearchIndex(parts:DictionaryPart[],terms:PartTerm[]):Map<string,string>{
 const vocabulary=terms.map(t=>({...t,words:[t.name,...t.aliases].map(normalizePartText)}));
 return new Map(parts.map(p=>{
  const text=normalizePartText(`${p.name} ${p.sku||''} ${p.category} ${p.brand}`),extra:string[]=[];
  for(const term of vocabulary){const field=` ${normalizePartText(p[term.kind])} `;if(term.words.some(word=>word&&field.includes(` ${word} `)))extra.push(...term.words);}
  return [p.id,`${text} ${extra.join(' ')}`];
 }));
}
