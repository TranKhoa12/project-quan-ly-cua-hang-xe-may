import type {SupabaseClient} from '@supabase/supabase-js';
import type {PartTerm} from './catalog';
// Read under the caller's session/RLS. Range avoids PostgREST's default 1,000 row cap.
export async function loadDictionary(client:SupabaseClient):Promise<{data:PartTerm[];error:string|null}>{
 const all:PartTerm[]=[];
 for(let from=0;from<10000;from+=500){
  const {data,error}=await client.from('part_terms').select('id,kind,name,aliases,category').order('kind').order('normalized_name').range(from,from+499);
  if(error)return {data:[],error:'Không tải được từ điển phụ tùng. Vui lòng thử lại.'};
  all.push(...(data||[]) as PartTerm[]);
  if(!data||data.length<500)return {data:all,error:null};
 }
 return {data:[],error:'Từ điển vượt giới hạn tải. Liên hệ quản lý để kiểm tra.'};
}
