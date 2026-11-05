// Real catalog/cart/CSS, synthetic data, no Auth or production calls.
import {build} from 'esbuild';
import {chromium,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const output=resolve('.browser-test/sale');mkdirSync(output,{recursive:true});
const reference=JSON.parse(readFileSync('data/part-name-reference.json','utf8'));
const terms=reference.terms.map((t,i)=>({id:String(i),kind:'name',...t}));
const parts=Array.from({length:32},(_,i)=>({id:`part-${i}`,sku:`PT-${i}`,name:i===0?'Má phanh đĩa':i===1?'Bộ Phụ Tùng Có Tên Rất Dài Để Kiểm Tra Khả Năng Xuống Dòng Trên Màn Hình Nhỏ':i%2?'Nhớt Xe Máy '+i:'Má Phanh '+i,category:i%2?'Dầu nhớt':'Phanh',brand:'Hãng thử',price:120000,stock:i===31?0:10,min:1}));
const js=await build({stdin:{contents:`import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import SaleCatalog from './src/features/garage/sale-catalog';import SaleCart from './src/features/garage/sale-cart';import StockPartPicker from './src/features/garage/stock-part-picker';const terms=${JSON.stringify(terms)};const parts=${JSON.stringify(parts)};function App(){const [draft,setDraft]=useState({lines:[],customer:'',method:'cash',cashReceived:''}),[confirmed,setConfirmed]=useState(false);return <div className="compact-shell"><div className="test-sidebar">MotoCare</div><main><StockPartPicker parts={parts} terms={terms} value="" onChange={()=>{}} label="Vật tư thử"/><h1>Bán tại quầy</h1><section className="sale-pos"><form className="live-form" onSubmit={e=>e.preventDefault()}><div className="sale-pos-layout"><fieldset className="pos-catalog-fieldset"><SaleCatalog parts={parts} terms={terms} quantities={Object.fromEntries(draft.lines.map(l=>[l.partId,l.quantity]))} onAdd={p=>setDraft({...draft,lines:[{partId:p.id,quantity:1,cost:0}]})}/></fieldset><aside className="sale-pos-checkout"><fieldset className="pos-checkout-fieldset"><div className="pos-checkout-scroll"><SaleCart parts={parts} draft={draft} onDraft={setDraft} store={{name:'Cửa hàng thử',phone:'',address:'',version:1}} confirmed={confirmed} onConfirm={setConfirmed} reference="TEST"/></div><button className="button primary sale-pay">Xác nhận đã thu</button></fieldset></aside></div></form></section></main></div>}createRoot(document.getElementById('root')).render(<App/>);`,loader:'tsx',resolveDir:process.cwd()},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
const css=['globals.css','auth.css','catalog.css','sidebar.css','garage.css','purchase.css','sale-receipt.css'].map(n=>readFileSync('src/app/'+n,'utf8')).join('\n');
const html=`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}\n.compact-shell{display:grid;grid-template-columns:260px minmax(0,1fr)}.test-sidebar{background:#18313d;color:white;padding:24px}.compact-shell main{min-width:0}h1{margin-bottom:16px}@media(max-width:760px){.compact-shell{grid-template-columns:minmax(0,1fr)}.test-sidebar{display:none}}</style><div id="root"></div><script src="/bundle.js"></script></html>`;
const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/bundle.js'?'text/javascript':'text/html; charset=utf-8');res.end(req.url==='/bundle.js'?js.outputFiles[0].text:html);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;let checks=0;const pass=label=>{checks++;console.log('PASS '+label);};
try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:')?r.continue():r.abort());await page.goto(`http://127.0.0.1:${server.address().port}`);
 for(const width of [1440,1386,1100,900,768,375]){
  await page.setViewportSize({width,height:980});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`);
  const card=page.locator('.sale-product').first(),info=card.locator('.sale-product-info');
  const cardBox=await card.boundingBox(),infoBox=await info.boundingBox();assert.ok(infoBox.y+infoBox.height<=cardBox.y+cardBox.height+1,`card clips info at ${width}`);
  const checkout=await page.locator('.sale-pos-checkout').boundingBox();assert.ok(checkout.x>=0&&checkout.x+checkout.width<=width+1,`checkout outside screen at ${width}`);
  await page.screenshot({path:resolve(output,`layout-${width}.png`),fullPage:true});pass(`card information and checkout fit ${width}px`);
 }
 await page.setViewportSize({width:1386,height:980});await page.getByRole('button',{name:'Thêm Má phanh đĩa, mã PT-0 vào đơn',exact:true}).click();await expect(page.locator('.sale-cart-item-name')).toContainText('Má phanh đĩa');pass('choosing visible product adds it to cart');
 await page.getByRole('searchbox',{name:'Tìm phụ tùng'}).fill('bo thang dia');await expect(page.locator('.sale-product')).toHaveCount(1);pass('POS resolves shared dictionary aliases');
 await page.getByRole('searchbox',{name:'Tìm vật tư thử'}).fill('bo thang dia');await expect(page.getByRole('combobox',{name:'Vật tư thử'}).locator('option')).toHaveCount(2);pass('shared repair/inventory picker resolves aliases');
 await page.getByRole('searchbox',{name:'Tìm phụ tùng'}).fill('không có hàng này');await expect(page.getByText(/Không tìm thấy phụ tùng phù hợp/)).toBeVisible();pass('empty search preserves cart');
 assert.deepEqual(errors,[]);console.log(`PASS ${checks} isolated sale layout checks`);
}finally{await browser?.close();await new Promise(r=>server.close(r));}
