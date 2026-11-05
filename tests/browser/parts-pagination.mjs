// Isolated real PartsManager/CSS with synthetic records and mocked server boundaries.
import {build} from 'esbuild';
import {chromium,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
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
 await page.getByRole('textbox',{name:'Tìm phụ tùng'}).fill('');
 for(const width of [1386,768,375]){await page.setViewportSize({width,height:980});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${width}`);await page.screenshot({path:resolve(out,`parts-${width}.png`),fullPage:true});}
 assert.deepEqual(errors,[]);console.log('PASS parts pagination: 20/20/5 rows, boundaries, search reset, 50 rows, visibility filter, empty state, 1386/768/375px containment. No Auth/database calls.');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
