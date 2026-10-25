'use server';
import { revalidatePath } from 'next/cache';
import { currentActor, requireActor, sessionClient } from '@/lib/auth/server';
import { canAccess } from '@/lib/auth/permissions';
import type { GarageSnapshot, Store } from './types';

const messages:Record<string,string>={
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
 return {data:data as GarageSnapshot};
}
export async function garageCommand(action:string,payload:Record<string,unknown>,requestId:string):Promise<{result?:{id:string|null;action:string;total:number};error?:string;uncertain?:boolean}> {
 await requireActor();
 if(!/^[a-f0-9-]{36}$/i.test(requestId)||!payload||JSON.stringify(payload).length>100000)return {error:messages.VALIDATION_ERROR};
 const c=await sessionClient();
 try{
  const {data,error}=await c.rpc('garage_command',{p_action:action,p_payload:payload,p_request_id:requestId});
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
export async function readStoreSettings():Promise<Store|null> {
 if(!await currentActor())return null;
 const c=await sessionClient();const {data,error}=await c.rpc('garage_store');
 return !error&&data?data as Store:null;
}
