'use server';
import { revalidatePath } from 'next/cache';
import { requireManager, sessionClient } from '@/lib/auth/server';
import { validatePartInput, type PartInput, type PartTerm, type PartSaveResult } from './catalog';
import type { Part } from '@/lib/data';

export async function loadPartCatalog():Promise<{parts:Part[];terms:PartTerm[];error?:string;count:number}> {
  await requireManager();
  const client=await sessionClient();
  const [parts,terms]=await Promise.all([
    client.from('parts').select('id,sku,name,category,brand,sale_price,minimum_stock,part_costs(average_cost),stock_balances(quantity)',{count:'exact'}).eq('active',true).order('created_at',{ascending:false}).limit(1000),
    client.from('part_terms').select('id,kind,name,aliases,category').order('name').limit(2000),
  ]);
  if(parts.error||terms.error)return {parts:[],terms:[],count:0,error:'Không tải được danh mục phụ tùng. Vui lòng thử lại, không dùng dữ liệu cục bộ thay thế.'};
  const first=(value:unknown):Record<string,unknown>=> (Array.isArray(value)?value[0]:value) as Record<string,unknown> || {};
  return {parts:(parts.data||[]).map(p=>({id:p.id,sku:p.sku,name:p.name,category:p.category,brand:p.brand,price:Number(p.sale_price),cost:Number(first(p.part_costs).average_cost||0),stock:Number(first(p.stock_balances).quantity||0),min:p.minimum_stock})),terms:(terms.data||[]) as PartTerm[],count:parts.count||0};
}

export async function savePart(input:PartInput):Promise<PartSaveResult> {
  await requireManager();
  let value:PartInput;
  try {value=validatePartInput(input);} catch(error) {return {error:error instanceof Error?error.message:'Thông tin không hợp lệ.'};}
  const client=await sessionClient();
  const {data,error}=await client.rpc('create_part_with_terms',{p_name:value.name,p_category:value.category,p_brand:value.brand,p_price:value.price,p_cost:value.cost,p_min:value.min,p_request_id:value.requestId,p_allow_similar:value.allowSimilar});
  if(error) return {error:error.message.includes('IDEMPOTENCY_CONFLICT')?'Yêu cầu này đã lưu với nội dung khác. Hãy đóng form và kiểm tra danh mục trước khi tạo tiếp.':'Không lưu được phụ tùng. Vui lòng kiểm tra quyền và thử lại; thông tin chưa được xác nhận thành công.'};
  if(data?.status==='duplicate')return {error:'Phụ tùng cùng tên và thương hiệu đã tồn tại. Hãy dùng bản ghi có sẵn.',duplicates:data.matches||[]};
  if(data?.status==='similar')return {error:'Có phụ tùng tên gần giống. Hãy đối chiếu và xác nhận nếu đây là phụ tùng khác.',duplicates:data.matches||[],needsConfirmation:true};
  if(!data?.part)return {error:'Chưa xác nhận được kết quả lưu. Hãy thử lại với cùng nội dung.'};
  revalidatePath('/parts');
  return {part:data.part as Part};
}
