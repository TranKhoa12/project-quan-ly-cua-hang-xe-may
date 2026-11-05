export const MAX_PART_IMAGE_BYTES=2*1024*1024;
export const PART_IMAGE_TYPES=['image/jpeg','image/png','image/webp'];
export function validateImageFile(size:number,type:string){
 if(!Number.isSafeInteger(size)||size<=0||size>MAX_PART_IMAGE_BYTES)throw Error('Ảnh phải có dung lượng từ 1 byte đến 2 MB.');
 if(!PART_IMAGE_TYPES.includes(type))throw Error('Chỉ nhận ảnh JPG, PNG hoặc WebP.');
}
export async function limitedFormData(request:Request){
 const limit=MAX_PART_IMAGE_BYTES+65536;
 if(Number(request.headers.get('content-length')||0)>limit)throw Error('Ảnh tối đa 2 MB.');
 const reader=request.body?.getReader();if(!reader)throw Error('Thiếu ảnh tải lên.');
 const chunks:Uint8Array[]=[];let length=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();throw Error('Ảnh tối đa 2 MB.');}chunks.push(value);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
 return new Response(bytes,{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData();
}
