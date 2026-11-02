// Render the actual React receipt and production styles with synthetic data only.
// Chromium CLI flags: https://developer.chrome.com/docs/automation-and-testing/headless-cli
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url),cache=new Map();
function load(file){
 file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
 const module={exports:{}};cache.set(file,module);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',code)(specifier=>specifier.startsWith('.')?load(path.resolve(path.dirname(file),specifier)+(specifier.endsWith('.tsx')||specifier.endsWith('.ts')?'':'.ts')):require(specifier),module,module.exports);
 return module.exports;
}
const Receipt=load('src/features/garage/sale-receipt.tsx').default;
const {receiptPageStyle}=load('src/features/garage/receipt-format.ts');
const dir=path.resolve('tmp/pdfs');fs.mkdirSync(dir,{recursive:true});
const css=['globals','auth','catalog','sidebar','garage','sale-receipt'].map(name=>fs.readFileSync(`src/app/${name}.css`,'utf8')).join('\n');
const item=(id,name,quantity,price)=>({id,name,quantity,price,returned:0});
const base={id:'synthetic',code:123,customer_name:'Khách kiểm tra bố cục',created_at:'2026-11-02T03:25:00Z',payment_method:'cash',cashier_name:'Nhân viên kiểm tra',cash_received:250000,store_snapshot:{name:'CỬA HÀNG KIỂM TRA BỐ CỤC',address:'Địa chỉ tổng hợp - chỉ dùng kiểm tra mẫu in',phone:'000 000 0000',version:1},items:[item('1','Dầu nhớt động cơ 10W-40, chai 0,8 lít',2,85000),item('2','Bugi tiêu chuẩn',1,60000)],total:230000};
const longItems=Array.from({length:30},(_,i)=>item(String(i),`Mặt hàng ${i+1}: Bộ phụ tùng có tên dài để kiểm tra xuống dòng khi in trên giấy A5, bao gồm thông tin loại xe và quy cách`,i%3+1,40000+i*1000));
const cases=[['short-a5','A5',base],['short-a4','A4',base],['long-a5','A5',{...base,items:longItems,total:longItems.reduce((s,i)=>s+i.quantity*i.price,0),cash_received:null,payment_method:'transfer'}],['large-a5','A5',{...base,total:1000000000000,cash_received:1000000000000,items:[item('large','Mặt hàng kiểm tra số tiền lớn',1000,1000000000)]}]];
const browser=process.env.RECEIPT_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
if(!fs.existsSync(browser))throw Error('Set RECEIPT_BROWSER to an installed Chromium executable.');
for(const [name,paper,sale] of cases){
 const html=path.join(dir,`${name}.html`),pdf=path.join(dir,`${name}.pdf`);
 fs.writeFileSync(html,`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Receipt layout test</title><style>${css}\n${receiptPageStyle(paper,sale.code)}</style></head><body><div class="main-shell">KHÔNG ĐƯỢC IN - SIDEBAR VÀ GIÁ VỐN</div><div class="sale-print-surface receipt-paper-${paper.toLowerCase()}">${renderToStaticMarkup(React.createElement(Receipt,{sale}))}</div></body></html>`);
 execFileSync(browser,['--headless','--disable-gpu','--no-first-run','--disable-background-networking','--disable-component-update','--disable-sync',`--user-data-dir=${path.join(dir,'browser-'+name)}`,'--no-pdf-header-footer',`--print-to-pdf=${pdf}`,pathToFileURL(html).href],{windowsHide:true,timeout:45000,stdio:'pipe'});
 if(!fs.existsSync(pdf)||fs.statSync(pdf).size<1000)throw Error('No rendered PDF for '+name);
 const text=execFileSync('pdftotext',['-layout',pdf,'-'],{encoding:'utf8',windowsHide:true});
 if(text.includes('KHÔNG ĐƯỢC IN')||!text.includes('PHIẾU BÁN HÀNG')||!text.includes('Cảm ơn quý khách'))throw Error('Missing or leaking print content: '+name);
 const pages=text.split('\f').filter(p=>p.trim());
 if(pages.some(p=>!p.includes('BH-123')||!p.includes('Trang ')))throw Error('Missing receipt ID/page counter on continuation page: '+name);
 if(name!=='long-a5'&&pages.length!==1)throw Error('Short receipt must fit one page: '+name);
 console.log('PASS PDF '+name);
}
