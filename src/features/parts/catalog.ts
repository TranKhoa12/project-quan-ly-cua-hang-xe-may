import type { Part } from '@/lib/data';

export type PartTerm = { id: string; kind: 'name'|'category'|'brand'; name: string; aliases: string[]; category: string | null };
export type PartInput = { name:string;category:string;brand:string;price:number;cost:number;min:number;requestId:string;allowSimilar:boolean };
export type PartSaveResult = { part?:Part; error?:string; duplicates?:{id:string;name:string;brand:string;category:string}[]; needsConfirmation?:boolean };
export function normalizePartText(value:string) {
  return value.normalize('NFD').replace(/\p{M}/gu,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
}
export function validatePartInput(value: PartInput): PartInput {
  if (!value || typeof value !== 'object') throw new Error('Thông tin phụ tùng không hợp lệ.');
  const result = {...value};
  for(const key of ['name','category','brand'] as const) {
    if(typeof result[key]!=='string')throw new Error('Tên, nhóm hàng và thương hiệu cần là văn bản.');
    result[key]=result[key].trim().replace(/\s+/g,' ');
    if(!normalizePartText(result[key])||result[key].length>(key==='name'?180:100))throw new Error('Tên phụ tùng tối đa 180 ký tự; nhóm và thương hiệu tối đa 100 ký tự, không được để trống.');
  }
  for(const key of ['price','cost','min'] as const) if(!Number.isSafeInteger(result[key])||result[key]<0||result[key]>(key==='min'?1000000:1000000000)) throw new Error('Giá phải là số nguyên từ 0 đến 1 tỷ; ngưỡng tồn từ 0 đến 1 triệu.');
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(result.requestId)||typeof result.allowSimilar!=='boolean')throw new Error('Yêu cầu lưu không hợp lệ.');
  return result;
}
export function exactDuplicate(parts:Pick<Part,'name'|'brand'>[],name:string,brand:string) {
  const n=normalizePartText(name),b=normalizePartText(brand);
  return parts.some(part=>normalizePartText(part.name)===n&&normalizePartText(part.brand)===b);
}
export function rankSuggestions(options:{name:string;aliases?:string[]}[],query:string) {
  const key=normalizePartText(query);
  return options.map(option=>{
    const names=[option.name,...(option.aliases||[])].map(normalizePartText);
    const score=!key?3:names.some(n=>n===key)?0:names.some(n=>n.startsWith(key))?1:names.some(n=>n.includes(key))?2:4;
    return {option,score};
  }).filter(row=>row.score<4).sort((a,b)=>a.score-b.score||a.option.name.localeCompare(b.option.name,'vi')).slice(0,8).map(row=>row.option);
}
