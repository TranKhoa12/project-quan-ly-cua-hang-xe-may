import type {SupabaseClient} from '@supabase/supabase-js';
export type PartImageInfo={image_url:string|null;image_version:number};
export function partImageInfo(id:string,path:string|null,version:number):PartImageInfo{return {image_url:path?`/api/parts/${id}/image?v=${version}`:null,image_version:version};}
export async function attachPartImages<T extends {id:string}>(client:SupabaseClient,parts:T[]):Promise<(T&PartImageInfo)[]>{
 const images=new Map<string,PartImageInfo>();
 for(let i=0;i<parts.length;i+=100){
  const {data,error}=await client.from('part_images').select('part_id,path,version').in('part_id',parts.slice(i,i+100).map(p=>p.id));
  if(error)throw Error('Không tải được ảnh phụ tùng. Vui lòng thử lại.');
  for(const row of data||[])images.set(row.part_id,partImageInfo(row.part_id,row.path,row.version));
 }
 return parts.map(p=>({...p,...(images.get(p.id)||{image_url:null,image_version:0})}));
}
