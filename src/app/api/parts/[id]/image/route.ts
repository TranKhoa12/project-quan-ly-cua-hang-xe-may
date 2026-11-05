import {createHash} from 'node:crypto';
import {processPartImage} from '@/features/parts/process-image';
import {currentActor,sessionClient,adminClient,consumeAuthAttempt} from '@/lib/auth/server';
import {limitedFormData,validateImageFile,MAX_PART_IMAGE_BYTES} from '@/features/parts/image-input';
import {partImageInfo} from '@/features/parts/load-images';
import {revalidatePath} from 'next/cache';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const actor=await currentActor();if(!actor)return json({error:'Cần đăng nhập.'},401);
 const {id}=await params;if(!uuid.test(id))return json({error:'Mặt hàng không hợp lệ.'},400);
 const client=await sessionClient();const {data,error}=await client.from('part_images').select('path').eq('part_id',id).maybeSingle();
 if(error||!data?.path)return json({error:'Chưa có ảnh.'},404);
 const signed=await client.storage.from('part-images').createSignedUrl(data.path,60);
 if(signed.error||!signed.data)return json({error:'Chưa tải được ảnh.'},503);
 return new Response(null,{status:302,headers:{Location:signed.data.signedUrl,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Nguồn yêu cầu không hợp lệ.'},403);
 const actor=await currentActor();if(!actor)return json({error:'Phiên đăng nhập đã hết.'},401);
 if(actor.role!=='manager')return json({error:'Chỉ quản lý được thay đổi ảnh.'},403);
 const {id}=await params;if(!uuid.test(id))return json({error:'Mặt hàng không hợp lệ.'},400);
 try{
  await consumeAuthAttempt(`part-image:${actor.id}`);
  const form=await limitedFormData(request),requestId=String(form.get('requestId')||'').toLowerCase(),version=Number(form.get('version'));
  if(!uuid.test(requestId)||!Number.isSafeInteger(version)||version<0)return json({error:'Yêu cầu ảnh không hợp lệ.'},400);
  const client=await sessionClient();
  const target=await client.from('parts').select('id').eq('id',id).eq('active',true).maybeSingle();
  if(target.error||!target.data)return json({error:'Không tìm thấy mặt hàng.'},404);
  const operation=form.get('operation');if(!['upload','remove'].includes(String(operation)))return json({error:'Thao tác không hợp lệ.'},400);
  let path:string|null=null;
  if(operation==='upload'){
   const file=form.get('file');if(!(file instanceof File))return json({error:'Chọn ảnh cần tải lên.'},400);
   validateImageFile(file.size,file.type);
   let bytes:Buffer;
   try{
    bytes=await processPartImage(Buffer.from(await file.arrayBuffer()));
   }catch{return json({error:'Không đọc được ảnh. Hãy chọn ảnh JPG, PNG hoặc WebP tĩnh hợp lệ, tối đa 20 megapixel.'},400);}
   if(bytes.length>MAX_PART_IMAGE_BYTES)return json({error:'Ảnh sau xử lý vẫn quá 2 MB. Hãy chọn ảnh nhỏ hơn.'},400);
   const hash=createHash('sha256').update(bytes).digest('hex');path=`${id}/${requestId}/${hash}.webp`;
   // Server has verified actor, object and file. Blob writes never expose service credentials to client.
   const storage=adminClient().storage.from('part-images');
   const upload=await storage.upload(path,bytes,{contentType:'image/webp',cacheControl:'60',upsert:false});
   if(upload.error){
    // Duplicate-upload status codes vary. Retry is safe only if the immutable blob matches exactly.
    const existing=await storage.download(path);
    if(existing.error||!existing.data||existing.data.size!==bytes.length||createHash('sha256').update(Buffer.from(await existing.data.arrayBuffer())).digest('hex')!==hash)return json({error:'Chưa tải được ảnh lên. Giữ nguyên ảnh cũ và thử lại.'},503);
   }
  }
  const {data,error}=await client.rpc('set_part_image',{p_part:id,p_path:path,p_version:version,p_request:requestId});
  if(error){
   if(error.message.includes('VERSION_CONFLICT'))return json({error:'Ảnh đã đổi ở phiên khác. Hãy tải lại trang trước khi tiếp tục.'},409);
   return json({error:'Chưa xác nhận lưu ảnh. Hãy thử lại cùng yêu cầu.'},503);
  }
  // Only remove an old blob after the new binding has committed. Failures never undo the saved reference.
  if(data.previous_path&&data.previous_path!==data.path)await adminClient().storage.from('part-images').remove([data.previous_path]).catch(()=>{});
  revalidatePath('/parts');revalidatePath('/sales');
  return json({image:partImageInfo(id,data.path,data.version)});
 }catch(error){return json({error:error instanceof Error&&/^(Ảnh|Chỉ nhận|Thiếu ảnh)/.test(error.message)?error.message:'Không thể xử lý ảnh. Giữ nguyên lựa chọn và thử lại sau.'},400);}
}
