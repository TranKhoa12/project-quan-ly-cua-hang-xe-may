export type PartWebResult={title:string;description:string;url:string;source:string};
export type PartWebResponse={items?:PartWebResult[];error?:string};
export function validatePartWebQuery(value:unknown):string|null{
 if(typeof value!=='string')return null;
 const query=value.trim().replace(/\s+/g,' ');
 return query.length>=2&&query.length<=240&&query.split(' ').length<=60?query:null;
}
const plain=(value:unknown,max:number)=>typeof value==='string'?value.replace(/<[^>]*>/g,'').replace(/&(?:amp|lt|gt|quot|#39);/g,entity=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[entity]||entity)).trim().slice(0,max):'';
export function parsePartWebResults(value:unknown):PartWebResult[]{
 const rows=(value as {results?:unknown[]}|null)?.results;
 if(!Array.isArray(rows))return [];
 const items:PartWebResult[]=[];
 for(const row of rows){
  if(!row||typeof row!=='object')continue;
  const r=row as Record<string,unknown>,title=plain(r.title,180);
  try{
   if(typeof r.url!=='string'||r.url.length>2048||!title)continue;
   const url=new URL(r.url);
   if(!['https:','http:'].includes(url.protocol)||url.username||url.password)continue;
   if(items.some(item=>item.url===url.href))continue;
   items.push({title,description:plain(r.content,450),url:url.href,source:url.hostname});
   if(items.length===5)break;
  }catch{continue;}
 }
 return items;
}
export async function fetchPartWebResults(query:string,key:string,request:typeof fetch=fetch):Promise<PartWebResponse>{
 const url=new URL('https://api.tavily.com/search');
 try{
  const response=await request(url,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({query:`${query} phụ tùng xe máy`,search_depth:'basic',auto_parameters:false,max_results:5,topic:'general',include_answer:false,include_raw_content:false,include_images:false}),cache:'no-store',signal:AbortSignal.timeout(10000),redirect:'error'});
  if(response.status===429)return {error:'Dịch vụ tìm kiếm đang giới hạn lượt tra cứu. Hãy thử lại sau.'};
  if(response.status===432||response.status===433)return {error:'Đã hết hạn mức tìm kiếm. Quản lý cần kiểm tra hạn mức Tavily hoặc chờ kỳ miễn phí tiếp theo.'};
  if(!response.ok)return {error:'Dịch vụ tìm kiếm chưa sẵn sàng. Liên hệ quản lý kiểm tra cấu hình.'};
  return {items:parsePartWebResults(await response.json())};
 }catch{return {error:'Không kết nối được dịch vụ tìm kiếm. Hãy thử lại.'};}
}
