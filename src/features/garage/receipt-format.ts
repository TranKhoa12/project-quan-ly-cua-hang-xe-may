const digits=['không','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
function triplet(value:number,padded:boolean){
 const hundreds=Math.floor(value/100),tens=Math.floor(value%100/10),units=value%10,words:string[]=[];
 if(hundreds||padded)words.push(digits[hundreds],'trăm');
 if(tens>1)words.push(digits[tens],'mươi');else if(tens===1)words.push('mười');else if(units&&(hundreds||padded))words.push('lẻ');
 if(units)words.push(units===1&&tens>1?'mốt':units===5&&tens>0?'lăm':digits[units]);
 return words.join(' ');
}
export function vndInWords(value:number){
 if(!Number.isSafeInteger(value)||value<0||value>1000000000000)return '';
 if(value===0)return 'Không đồng';
 const scales=['','nghìn','triệu','tỷ','nghìn tỷ'],groups:number[]=[];
 for(let n=value;n>0;n=Math.floor(n/1000))groups.push(n%1000);
 const words:string[]=[];
 for(let i=groups.length-1;i>=0;i--)if(groups[i])words.push(triplet(groups[i],words.length>0&&groups[i]<100),scales[i]);
 const result=words.filter(Boolean).join(' ');
 return result.charAt(0).toUpperCase()+result.slice(1)+' đồng';
}
export function saleTime(value:string){
 return new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23',timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(value));
}
export function receiptPageStyle(paper:'A5'|'A4',code:number){
 const safeCode=Number.isSafeInteger(code)&&code>=0?String(code):'';
 return `@page {size:${paper} portrait;margin:${paper==='A5'?'10mm':'15mm'};@top-left{content:"BH-${safeCode}";font:8pt Arial;color:#526574}@bottom-right{content:"Trang " counter(page) " / " counter(pages);font:8pt Arial;color:#526574}}`;
}
