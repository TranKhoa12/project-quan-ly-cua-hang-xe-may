// Isolated UI harness: renders real components/CSS, substitutes network boundaries.
// No .env, Supabase, credentials or production writes. Does not prove Auth/RLS.
import {build} from 'esbuild';
import {chromium,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';

const output=resolve('.browser-test/purchase');mkdirSync(output,{recursive:true});
const first='11111111-1111-4111-8111-111111111111',second='22222222-2222-4222-8222-222222222222';
const supplierA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',supplierB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const reference=JSON.parse(readFileSync('data/part-name-reference.json','utf8'));
const extra=JSON.parse(readFileSync('data/part-dictionary-extra.json','utf8'));
const dictionary=[...reference.terms.map(t=>({...t,kind:'name'})),...extra.categories.map(t=>({...t,kind:'category'})),...extra.brands.map(t=>({...t,kind:'brand'}))].map((t,i)=>({id:String(i),category:null,...t}));
const fixture={store:{name:'Cửa hàng kiểm thử',phone:'',address:'',version:1},page:0,from:'',to:'',partCount:2,partTerms:dictionary,suppliers:[{id:supplierA,name:'Nhà Cung Cấp A',phone:'',details_version:1},{id:supplierB,name:'Nhà Cung Cấp B',phone:'',details_version:1}],parts:[{id:first,sku:'PT-TEST-1',name:'Nhớt Xe Máy',category:'Dầu Nhớt',brand:'Thương Hiệu A',price:120000,stock:8,stock_version:1,min:1},{id:second,sku:'PT-TEST-2',name:'Phụ Tùng '+ 'Tên Dài '.repeat(12),category:'Phụ Tùng',brand:'Thương Hiệu B',price:200000,stock:2,stock_version:1,min:1}]};
const mockActions=`
export async function searchPartsOnWeb(query){
 window.__webQueries=(window.__webQueries||[]).concat(query);
 await new Promise(r=>setTimeout(r,80));
 if(window.__webMode==='error')return {error:'Không kết nối được dịch vụ tìm kiếm. Hãy thử lại.'};
 if(window.__webMode==='empty')return {items:[]};
 return {items:[{title:'Má Phanh Tham Khảo',description:'Đối chiếu mã trên bao bì',url:'https://example.com/part',source:'example.com'}]};
}
window.__requests=[];window.__historyError=false;window.__nextCommandMode='success';
export async function garageCommand(action,payload,key){
 window.__requests.push({action,payload,key});
 await new Promise(r=>setTimeout(r,60));
 if(window.__nextCommandMode==='uncertain')return {error:'Chưa xác nhận kết quả. Hãy thử lại cùng yêu cầu.',uncertain:true};
 if(window.__nextCommandMode==='business')return {error:'Thông tin chưa hợp lệ. Kiểm tra lại giá nhập.'};
 return {result:{id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',action,total:0}};
}
export async function loadSupplierItems(id,page){
 await new Promise(r=>setTimeout(r,id==='${supplierA}'?160:20));
 if(window.__historyError)return {error:'Không tải được hàng nhà cung cấp. Vui lòng thử lại.'};
 return {total:page===0?21:21,items:[{part_id:'${first}',name:id==='${supplierA}'?'Nhớt Của NCC A':'Nhớt Của NCC B',sku:'PT-TEST-1',brand:'Thương Hiệu A',price:120000,quantity:15,last_cost:80000,last_received_at:'2026-11-03T01:00:00Z'}]};
}`;
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import PurchaseIntake from './src/features/garage/purchase-intake';createRoot(document.getElementById('root')).render(<PurchaseIntake data={${JSON.stringify(fixture)}}/>);`,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'isolated-boundaries',setup(b){b.onResolve({filter:/^next\/navigation$/},()=>({path:'router',namespace:'mock'}));b.onResolve({filter:/^\.\/(?:actions|part-web-actions)$/},args=>args.importer.includes('garage')?{path:'actions',namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='router'?`export const useRouter=()=>({refresh(){}});`:mockActions,loader:'js'}));}}]});
const css=['globals.css','auth.css','catalog.css','sidebar.css','garage.css','purchase.css'].map(name=>readFileSync('src/app/'+name,'utf8')).join('\n');
const html=`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}\nbody{background:#f5f7f5;font-family:Arial,sans-serif}#root{margin:24px 24px 24px 270px;max-width:1600px}@media(max-width:900px){#root{margin:14px}}</style><div id="root"></div><script src="/bundle.js"></script></html>`;
writeFileSync(resolve(output,'index.html'),html);
const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript; charset=utf-8':'text/html; charset=utf-8');res.end(req.url==='/bundle.js'?bundle.outputFiles[0].text:html);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;let checks=0;const pass=label=>{checks++;console.log('PASS '+label);};
try{
 browser=await chromium.launch({channel:process.env.PURCHASE_BROWSER_CHANNEL||'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:')?route.continue():route.abort());
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 const submit=page.getByRole('button',{name:'Xác nhận nhập kho',exact:true});
 await expect(submit).toBeDisabled();await expect(page.getByText('Chưa có hàng trong phiếu',{exact:true})).toBeVisible();pass('empty draft cannot submit');
 const supplier=page.locator('.purchase-review-supplier select');await supplier.selectOption(supplierA);await supplier.selectOption(supplierB);
 await expect(page.getByText('Nhớt Của NCC B',{exact:true})).toBeVisible();await page.waitForTimeout(220);await expect(page.getByText('Nhớt Của NCC A',{exact:true})).toHaveCount(0);pass('changing supplier ignores stale history responses');
 await page.getByRole('button',{name:'Sau',exact:true}).click();await expect(page.getByText(/Trang 2\/2/)).toBeVisible();pass('supplier picker retains pagination');
 await page.evaluate(()=>{window.__historyError=true;});await supplier.selectOption(supplierA);await expect(page.getByRole('alert')).toContainText('Không tải');await page.evaluate(()=>{window.__historyError=false;});await page.getByRole('button',{name:'Thử lại',exact:true}).click();await expect(page.getByText('Nhớt Của NCC A',{exact:true})).toBeVisible();pass('history error has a working retry');
 await page.getByRole('button',{name:'Thêm Nhớt Của NCC A vào phiếu nhập'}).click();
 const quantity=page.getByRole('spinbutton',{name:'Số lượng nhập Nhớt Xe Máy',exact:true}),cost=page.getByRole('spinbutton',{name:'Giá nhập Nhớt Xe Máy',exact:true});
 await expect(quantity).toBeFocused();await cost.fill('80000');await quantity.fill('2');await expect(page.locator('.purchase-grand-total')).toContainText('160.000');pass('adding goods focuses quantity and calculates visible totals');
 const paid=page.getByRole('spinbutton',{name:'Số tiền đã trả',exact:true});await page.getByRole('button',{name:'Trả đủ',exact:true}).click();await expect(paid).toHaveValue('160000');await paid.fill('50000');await expect(page.locator('.purchase-debt')).toContainText('110.000');await page.getByRole('button',{name:'Chưa trả',exact:true}).click();await expect(paid).toHaveValue('');pass('full, partial and unpaid amounts update debt');
 await paid.fill('999999');await submit.click();assert.equal(await page.evaluate(()=>window.__requests.length),0);pass('payment above total is stopped by browser validation');await paid.fill('50000');
 await page.evaluate(()=>{window.__nextCommandMode='business';});await submit.click();await expect(page.getByRole('alert')).toContainText('Kiểm tra lại giá nhập');await expect(cost).toHaveValue('80000');pass('business rejection preserves draft');
 await page.evaluate(()=>{window.__nextCommandMode='uncertain';});await submit.click();await expect(page.getByRole('button',{name:'Kiểm tra lại cùng yêu cầu'})).toBeVisible();await expect(cost).toBeDisabled();
 const before=await page.evaluate(()=>window.__requests.at(-1));await page.evaluate(()=>{window.__nextCommandMode='success';});await page.getByRole('button',{name:'Kiểm tra lại cùng yêu cầu'}).click();await expect(page.getByText('Đã nhập hàng vào kho.',{exact:true})).toBeVisible();
 const after=await page.evaluate(()=>window.__requests.at(-1));assert.equal(before.key,after.key);assert.deepEqual(before.payload,after.payload);assert.equal(after.payload.supplierId,supplierA);assert.equal(after.payload.paid,50000);assert.equal(after.payload.lines[0].quantity,2);assert.equal(after.payload.lines[0].cost,80000);await expect(submit).toBeDisabled();pass('uncertain retry keeps exact request and resets only after success');
 await page.getByRole('button',{name:'Tạo hàng mới',exact:true}).click();
 const dictionaryName=page.getByRole('combobox',{name:'Tên mặt hàng',exact:true});
 await dictionaryName.focus();await expect(page.getByRole('listbox',{name:'Gợi ý Tên mặt hàng'})).toBeVisible();
 await dictionaryName.fill('bo thang dia');await page.getByRole('option').filter({hasText:'Má phanh đĩa'}).first().click();
 await expect(dictionaryName).toHaveValue('Má phanh đĩa');await expect(page.getByRole('combobox',{name:'Nhóm hàng',exact:true})).toHaveValue('Hệ thống phanh');await expect(page.getByRole('combobox',{name:'Thương hiệu',exact:true})).toHaveValue('');
 await page.getByRole('combobox',{name:'Thương hiệu',exact:true}).fill('did');await page.getByRole('option').filter({hasText:'D.I.D'}).first().click();await expect(page.getByRole('combobox',{name:'Thương hiệu',exact:true})).toHaveValue('D.I.D');
 await dictionaryName.fill('');await page.getByRole('combobox',{name:'Nhóm hàng',exact:true}).fill('');await page.getByRole('combobox',{name:'Thương hiệu',exact:true}).fill('');await page.getByRole('combobox',{name:'Thương hiệu',exact:true}).press('Escape');
 pass('shared dictionary browses empty input, resolves aliases, suggests category and requires explicit brand selection');
 await page.getByRole('button',{name:'Tìm trên web',exact:true}).click();
 const webQuery=page.getByRole('textbox',{name:'Mô tả hoặc mã trên bao bì',exact:true});
 await expect(page.getByRole('button',{name:'Tìm gợi ý',exact:true})).toBeDisabled();
 await webQuery.fill('bố thắng Wave');await page.evaluate(()=>{window.__webMode='error';});await page.getByRole('button',{name:'Tìm gợi ý',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Không kết nối được');await expect(webQuery).toHaveValue('bố thắng Wave');
 await page.evaluate(()=>{window.__webMode='empty';});await page.getByRole('button',{name:'Tìm gợi ý',exact:true}).click();await expect(page.getByText(/Chưa có kết quả/)).toBeVisible();
 await page.evaluate(()=>{window.__webMode='success';});await page.getByRole('button',{name:'Tìm gợi ý',exact:true}).click();
 await expect(page.getByRole('link',{name:/Xem nguồn example.com/})).toHaveAttribute('rel','noopener noreferrer');
 await page.setViewportSize({width:375,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:resolve(output,'web-search-mobile-375.png'),fullPage:true});await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('button',{name:'Dùng làm tên',exact:true}).click();await expect(page.getByRole('combobox',{name:'Tên mặt hàng',exact:true})).toHaveValue('Má Phanh Tham Khảo');
 await expect(page.getByRole('combobox',{name:'Nhóm hàng',exact:true})).toHaveValue('');await expect(page.getByRole('combobox',{name:'Thương hiệu',exact:true})).toHaveValue('');
 pass('inline web search handles empty input, failure, retry, no results, source links and confirmed name without inferring brand');
 await page.getByRole('combobox',{name:'Tên mặt hàng',exact:true}).fill('bố thắng thử');await page.getByRole('combobox',{name:'Nhóm hàng',exact:true}).fill('phụ tùng');await page.getByRole('combobox',{name:'Thương hiệu',exact:true}).fill('hãng thử');await page.getByRole('button',{name:'Thêm vào phiếu',exact:true}).click();
 await expect(page.getByRole('spinbutton',{name:'Giá bán Bố Thắng Thử',exact:true})).toBeVisible();await page.getByRole('spinbutton',{name:'Giá nhập Bố Thắng Thử',exact:true}).fill('40000');await page.getByRole('spinbutton',{name:'Giá bán Bố Thắng Thử',exact:true}).fill('60000');pass('new goods retain title casing and expose cost and sale price');
 await page.getByRole('button',{name:'Xóa Bố Thắng Thử khỏi phiếu nhập'}).click();await expect(page.getByText('Chưa có hàng trong phiếu',{exact:true})).toBeVisible();pass('remove draft line updates empty state');
 await page.getByRole('searchbox',{name:'Tìm hàng để nhập'}).fill('không tồn tại');await expect(page.getByText(/Chưa có hàng phù hợp/)).toBeVisible();await page.getByRole('button',{name:'Xóa tìm',exact:true}).click();pass('no search results offer creation and clear');
 await page.getByRole('button',{name:/Phụ Tùng Tên Dài/}).click();await expect(page.getByRole('spinbutton',{name:/Giá nhập Phụ Tùng/})).toBeVisible();
 await page.screenshot({path:resolve(output,'desktop-1440.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);pass('1440px layout fits long product names');
 await page.setViewportSize({width:375,height:900});await expect(page.getByRole('combobox',{name:'Nhà cung cấp trên điện thoại'})).toBeVisible();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:resolve(output,'mobile-375.png'),fullPage:true});pass('375px layout fits without horizontal overflow and supplier is first');
 await page.setViewportSize({width:768,height:1024});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);pass('768px layout has no horizontal overflow');
 assert.deepEqual(errors,[]);pass('no browser runtime errors');
 console.log(`PASS ${checks} isolated purchase UI checks; screenshots: ${output}. Network and Auth are mocked; no production connection.`);
}finally{await browser?.close();await new Promise(r=>server.close(r));}
