'use server';
import {currentActor,consumeAuthAttempt} from '@/lib/auth/server';
import {fetchPartWebResults,validatePartWebQuery,type PartWebResponse} from './part-web-provider';
export async function searchPartsOnWeb(value:unknown):Promise<PartWebResponse>{
 try{
  const actor=await currentActor();
  if(!actor)return {error:'Phiên đăng nhập đã hết. Hãy đăng nhập lại để tìm trên web.'};
  if(actor.role!=='manager')return {error:'Chỉ quản lý được tìm mặt hàng mới trên web.'};
  const query=validatePartWebQuery(value);
  if(!query)return {error:'Nhập mô tả từ 2–240 ký tự, tối đa 60 từ.'};
  const key=process.env.TAVILY_API_KEY;
  if(!key)return {error:'Chưa bật tìm kiếm web. Quản lý cần cấu hình dịch vụ tìm kiếm trước khi sử dụng.'};
  await consumeAuthAttempt(`part-web:${actor.id}`);
  return await fetchPartWebResults(query,key);
 }catch{return {error:'Chưa thể tìm kiếm. Hãy thử lại sau; số lượt tra cứu có thể đã đạt giới hạn.'};}
}
