// Isolated real PartsManager/CSS with synthetic records and mocked server boundaries.
import {build} from 'esbuild';
import {chromium,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const out=resolve('.browser-test/parts');mkdirSync(out,{recursive:true});
const reference=JSON.parse(readFileSync('data/part-name-reference.json','utf8'));
const extra=JSON.parse(readFileSync('data/part-dictionary-extra.json','utf8'));
const terms=[...reference.terms.map(t=>({...t,kind:'name'})),...extra.brands.map(t=>({...t,kind:'brand'})),...extra.categories.map(t=>({...t,kind:'category'}))].map((t,i)=>({id:String(i),category:null,...t}));
const parts=Array.from({length:45},(_,i)=>({id:`part-${i}`,sku:`PT-${i}`,name:i===0?'Má phanh đĩa':`Phụ tùng ${String(i).padStart(2,'0')}`,category:'Phanh',brand:'Hãng thử',cost:80000,price:120000,stock:10,min:1,pos_visible:i!==44}));
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {PartsManager} from './src/features/parts/parts-manager';createRoot(document.getElementById('root')).render(<PartsManager initialParts={${JSON.stringify(parts)}} count={45} terms={${JSON.stringify(terms)}}/>);`,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'isolated',setup(b){
 b.onResolve({filter:/^next\/navigation$/},()=>({path:'router',namespace:'mock'}));b.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'mock'}));
 b.onResolve({filter:/(?:^|\/)actions$/},()=>({path:'actions',namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='router'?'export const useRouter=()=>({refresh(){}});':a.path==='link'?`import React from 'react';export default function Link(props){return React.createElement('a',props);}`:'export async function garageCommand(){return {error:"Không gọi server trong test"}};export async function updatePartDetails(){return {error:"test"}};export async function deletePart(){return {error:"test"}};',loader:'js',resolveDir:process.cwd()}));
}}]});
const css=['globals.css','auth.css','catalog.css','sidebar.css','garage.css'].map(n=>readFileSync('src/app/'+n,'utf8')).join('\n');
const html=`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}#root{margin:20px;min-width:0}</style><div id="root"></div><script src="/bundle.js"></script></html>`;
const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':'text/html; charset=utf-8');res.end(req.url==='/bundle.js'?bundle.outputFiles[0].text:html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1386,height:980}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:')?r.continue():r.abort());await page.goto(`http://127.0.0.1:${server.address().port}`);
 const rows=page.locator('tbody tr'),next=page.getByRole('button',{name:'Trang sau',exact:true}),previous=page.getByRole('button',{name:'Trang trước',exact:true});
 await expect(rows).toHaveCount(20);await expect(previous).toBeDisabled();await next.click();await expect(rows).toHaveCount(20);await expect(rows.first()).toContainText('Phụ tùng 20');await next.click();await expect(rows).toHaveCount(5);await expect(next).toBeDisabled();
 await page.getByRole('textbox',{name:'Tìm phụ tùng'}).fill('PT-44');await expect(rows).toHaveCount(1);await expect(previous).toBeDisabled();await expect(page.getByRole('navigation',{name:'Phân trang phụ tùng'})).toContainText('Trang 1/1');
 await page.getByRole('textbox',{name:'Tìm phụ tùng'}).fill('');await page.getByRole('combobox',{name:'Số phụ tùng mỗi trang'}).selectOption('50');await expect(rows).toHaveCount(45);
 await page.getByRole('combobox',{name:'Lọc hiển thị POS'}).selectOption('hidden');await expect(rows).toHaveCount(1);await expect(rows).toContainText('Phụ tùng 44');
 await page.getByRole('textbox',{name:'Tìm phụ tùng'}).fill('không có');await expect(rows).toHaveCount(0);await expect(next).toBeDisabled();await expect(previous).toBeDisabled();
 await page.getByRole('textbox',{name:'Tìm phụ tùng'}).fill('');await page.getByRole('combobox',{name:'Lọc hiển thị POS'}).selectOption('all');
 await page.getByRole('textbox',{name:'Tìm phụ tùng'}).fill('bo thang dia');await expect(rows).toHaveCount(1);await expect(rows).toContainText('Má phanh đĩa');
 await page.getByRole('button',{name:'Sửa thông tin',exact:true}).click();const nameInput=page.getByRole('combobox',{name:'Tên mặt hàng',exact:true});await nameInput.fill('bo thang dia');await page.getByRole('option').filter({hasText:'Má phanh đĩa'}).first().click();await expect(page.getByRole('combobox',{name:'Nhóm hàng',exact:true})).toHaveValue('Hệ thống phanh');await expect(page.getByRole('combobox',{name:'Thương hiệu',exact:true})).toHaveValue('Hãng thử');await page.getByRole('button',{name:'Hủy / Đóng',exact:true}).click();
 const png=await sharp({create:{width:400,height:300,channels:3,background:'#317660'}}).png().toBuffer();
 let imageMode='error',imageVersion=0;const imageRequests=[];
 await page.route('**/api/parts/*/image*',async route=>{
  if(route.request().method()==='GET'){await route.fulfill({contentType:'image/png',body:png});return;}
  const request=route.request(),form=await new Request('http://localhost',{method:'POST',headers:{'Content-Type':request.headers()['content-type']},body:request.postDataBuffer()}).formData();
  imageRequests.push({key:form.get('requestId'),operation:form.get('operation')});
  if(imageMode==='error'){await route.fulfill({status:503,json:{error:'Chưa xác nhận lưu ảnh.'}});return;}
  imageVersion++;await route.fulfill({json:{image:{image_version:imageVersion,image_url:form.get('operation')==='remove'?null:`/api/parts/part-0/image?v=${imageVersion}`}}});
 });
 await page.getByRole('button',{name:'Thêm ảnh',exact:true}).click();const file=page.getByLabel('Chọn ảnh',{exact:true});
 await file.setInputFiles({name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});await expect(page.getByRole('alert')).toContainText('Chỉ nhận ảnh');
 await file.setInputFiles({name:'part.png',mimeType:'image/png',buffer:png});await expect(page.getByAltText('Xem trước ảnh Má phanh đĩa')).toHaveJSProperty('naturalWidth',400);
 await page.screenshot({path:resolve(out,'image-editor-desktop.png'),fullPage:true});await page.setViewportSize({width:375,height:980});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:resolve(out,'image-editor-mobile.png'),fullPage:true});await page.setViewportSize({width:1386,height:980});
 await page.getByRole('button',{name:'Lưu ảnh',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Chưa xác nhận');await expect(file).toBeDisabled();
 imageMode='success';await page.getByRole('button',{name:'Thử lại cùng yêu cầu',exact:true}).click();await expect(page.getByText('Đã cập nhật ảnh sản phẩm.',{exact:true})).toBeVisible();assert.equal(imageRequests[0].key,imageRequests[1].key);await expect(page.getByAltText('Ảnh Má phanh đĩa')).toBeVisible();
 await page.getByRole('button',{name:'Đổi / Gỡ ảnh',exact:true}).click();await file.setInputFiles({name:'replacement.png',mimeType:'image/png',buffer:png});await page.getByRole('button',{name:'Lưu ảnh',exact:true}).click();assert.equal(imageVersion,2);
 await page.getByRole('button',{name:'Đổi / Gỡ ảnh',exact:true}).click();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Gỡ ảnh',exact:true}).click();await expect(page.getByRole('button',{name:'Thêm ảnh',exact:true})).toBeVisible();assert.equal(imageVersion,3);assert.equal(imageRequests.at(-1).operation,'remove');
 console.log('PASS image editor: invalid type, preview, failure, locked retry with same request, upload, replacement and removal (mock HTTP).');
 await page.getByRole('textbox',{name:'Tìm phụ tùng'}).fill('');
 await page.setViewportSize({width:1386,height:980});assert.ok((await rows.first().boundingBox()).height<=110,'desktop product rows stay compact');
 for(const width of [1386,768,375]){await page.setViewportSize({width,height:980});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);if(width<900)assert.ok((await rows.first().boundingBox()).height<=310,'mobile cards stay compact');await page.screenshot({path:resolve(out,`parts-${width}.png`),fullPage:false});}
 assert.deepEqual(errors,[]);console.log('PASS parts pagination: 20/20/5 rows, boundaries, search reset, 50 rows, visibility filter, empty state, 1386/768/375px containment. No Auth/database calls.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
