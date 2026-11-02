'use server';
import { revalidatePath } from 'next/cache';
import { currentActor, requireActor, sessionClient } from '@/lib/auth/server';
import { canAccess } from '@/lib/auth/permissions';
import type { GarageSnapshot, SaleRow, Store, SupplierRow } from './types';

const messages:Record<string,string>={
 SUPPLIER_DETAILS_INVALID:'Tên nhà cung cấp không được để trống và tối đa 180 ký tự. Số điện thoại tối đa 30 ký tự.',
 PART_DETAILS_INVALID:'Tên, nhóm và thương hiệu không được để trống. Tên tối đa 180 ký tự; nhóm và thương hiệu tối đa 100 ký tự.',
 PART_DETAILS_DUPLICATE:'Tên và thương hiệu này đã có ở một mặt hàng khác. Hãy đổi thông tin hoặc dùng mặt hàng đã có.',
 PART_DUPLICATE:'Có mặt hàng mới trùng tên và thương hiệu trong kho. Hãy chọn hàng đã có thay vì tạo mới; chưa chốt phiếu nhập.',
 PART_SIMILAR:'Có mặt hàng tên gần giống. Đối chiếu và đánh dấu xác nhận hàng khác tại dòng mới trước khi chốt; chưa lưu phiếu nhập.',
 PART_HIDDEN:'Có mặt hàng đã bị ẩn khỏi POS. Hãy kiểm tra lại trạng thái và xóa hàng đó khỏi đơn trước khi thanh toán.',
 PAYMENT_PENDING:'Có yêu cầu thanh toán cần kiểm tra. Hãy tải lại trạng thái POS trước khi tiếp tục.',
 PAYMENT_CONFIRMATION_REQUIRED:'Cần xác nhận đã nhận đủ tiền trước khi chốt đơn.',
 UNAUTHENTICATED:'Phiên đăng nhập không còn hợp lệ. Hãy đăng nhập lại.',FORBIDDEN:'Bạn không có quyền thực hiện thao tác này.',
 INSUFFICIENT_STOCK:'Không đủ tồn kho để chốt. Hãy tải lại và kiểm tra số lượng.',PRICE_CHANGED:'Giá bán đã thay đổi. Hãy tải lại và đối chiếu trước khi chốt.',
 VERSION_CONFLICT:'Dữ liệu đã được người khác cập nhật. Hãy tải lại và đối chiếu trước khi thực hiện tiếp.',
 IDEMPOTENCY_CONFLICT:'Yêu cầu trước có nội dung khác. Hãy đối chiếu chứng từ trước khi tạo yêu cầu mới.',
 VALIDATION_ERROR:'Thông tin hoặc số tiền không hợp lệ; không được vượt số còn lại.',INVALID_TRANSITION:'Trạng thái hiện tại không cho phép thao tác này.',
 PARTS_NOT_ISSUED:'Chưa xuất đủ phụ tùng theo báo giá đã duyệt.',PAYMENT_REQUIRED:'Cần thu đủ tiền trước khi bàn giao.',
 QUALITY_CONFIRMATION_REQUIRED:'Cần xác nhận hàng trả còn bán được.',NOT_FOUND:'Không tìm thấy dữ liệu. Hãy tải lại.',DUPLICATE_LINES:'Mỗi phụ tùng chỉ được có một dòng trên chứng từ.',
 HAS_TRANSACTIONS:'Phiếu đã phát sinh giao dịch, không thể hủy trực tiếp.',INVALID_TECHNICIAN:'Thợ được chọn không còn hoạt động.',
};
export async function loadGarage(section:string,page=0,from?:string,to?:string):Promise<{data?:GarageSnapshot;error?:string}> {
 const actor=await requireActor();
 if(!canAccess(actor.role,section))return {error:messages.FORBIDDEN};
 const c=await sessionClient();
 const {data,error}=await c.rpc('garage_snapshot',{p_section:section,p_page:page,p_from:from||null,p_to:to||null});
 if(error)return {error:'Không tải được dữ liệu Supabase. Vui lòng thử lại.'};
 if(section==='purchases'){
  const terms=await c.from('part_terms').select('id,kind,name,aliases,category').order('name').limit(2000);
  if(terms.error)return {error:'Không tải được gợi ý mặt hàng. Vui lòng tải lại trước khi nhập hàng.'};
  return {data:{...data,partTerms:terms.data} as GarageSnapshot};
 }
 return {data:data as GarageSnapshot};
}
export async function garageCommand(action:string,payload:Record<string,unknown>,requestId:string):Promise<{result?:{id:string|null;action:string;total:number;receipt?:SaleRow;partDetails?:{id:string;name:string;category:string;brand:string;details_version:number};supplierDetails?:SupplierRow};error?:string;uncertain?:boolean}> {
 const actor=await requireActor();
 if(['part_details','supplier_details'].includes(action)&&actor.role!=='manager')return {error:messages.FORBIDDEN};
 if(!/^[a-f0-9-]{36}$/i.test(requestId)||!payload||JSON.stringify(payload).length>100000)return {error:messages.VALIDATION_ERROR};
 const c=await sessionClient();
 try{
  const {data,error}=['part_details','supplier_details'].includes(action)
   ?await c.rpc(action==='part_details'?'update_part_details':'update_supplier_details',{p_payload:payload,p_request_id:requestId})
   :await c.rpc('garage_command',{p_action:action,p_payload:payload,p_request_id:requestId});
  if(error){
   const known=Object.keys(messages).find(key=>error.message.includes(key));
   if(known)return {error:messages[known]};
   if(error.code==='23505')return {error:'Dữ liệu bị trùng (ví dụ biển số xe). Hãy dùng bản ghi đã có.'};
   return {error:'Chưa xác nhận được kết quả. Hãy giữ nguyên nội dung và thử lại để kiểm tra cùng yêu cầu.',uncertain:true};
  }
  for(const path of ['/','/parts','/purchases','/sales','/repairs','/customers','/cashbook','/reports','/settings'])revalidatePath(path);
  return {result:data};
 }catch{return {error:'Mất kết nối. Giữ nguyên nội dung và thử lại cùng yêu cầu để tránh ghi lặp.',uncertain:true};}
}
export async function posDraft(operation:'load'|'save'|'prepare'|'resume'|'clear',revision=0,body:Record<string,unknown>={}):Promise<{draft?:import('./pos-types').SavedDraft|null;error?:string}> {
 const actor=await currentActor();
 if(!actor||!canAccess(actor.role,'sales'))return {error:messages.FORBIDDEN};
 if(!['load','save','prepare','resume','clear'].includes(operation)||!Number.isSafeInteger(revision)||revision<0||JSON.stringify(body).length>100000)return {error:messages.VALIDATION_ERROR};
 try{
  const c=await sessionClient();
  const {data,error}=await c.rpc('garage_pos_draft',{p_operation:operation,p_revision:revision,p_body:body});
  if(error){const known=Object.keys(messages).find(key=>error.message.includes(key));return {error:known?messages[known]:'Không truy cập được nháp POS. Kiểm tra kết nối và migration POS trên database.'};}
  return {draft:data};
 }catch{return {error:'Không kết nối được nơi lưu nháp POS. Hãy thử lại.'};}
}
export async function readStoreSettings():Promise<Store|null> {
 if(!await currentActor())return null;
 const c=await sessionClient();const {data,error}=await c.rpc('garage_store');
 return !error&&data?data as Store:null;
}
