import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePartWebQuery,parsePartWebResults,fetchPartWebResults} from '../src/features/garage/part-web-provider.ts';
test('web query bounds and whitespace normalization',()=>{
 assert.equal(validatePartWebQuery('  bố   thắng '),'bố thắng');
 for(const input of [null,{},' ','a','x'.repeat(241),Array(61).fill('a').join(' ')])assert.equal(validatePartWebQuery(input),null);
});
test('web results remove markup, unsafe links, duplicates and bound output',()=>{
 const item={title:'<b>Má phanh</b> &amp; phụ tùng',url:'https://example.com/item',content:'<script>bad()</script><b>Mô tả</b>'};
 const result=parsePartWebResults({results:[null,{}, {...item,url:'javascript:alert(1)'},{...item,url:'https://user:secret@example.com'},item,item,...Array.from({length:8},(_,i)=>({...item,url:`https://example.com/${i}`}))]});
 assert.equal(result.length,5);assert.equal(result[0].title,'Má phanh & phụ tùng');assert.equal(result[0].source,'example.com');assert.ok(!result[0].description.includes('<'));
 assert.deepEqual(parsePartWebResults(null),[]);
});
test('provider uses fixed host, server header and no cache',async()=>{
 const result=await fetchPartWebResults('bố thắng','test-key',async(url,options)=>{
  assert.equal(url.href,'https://api.tavily.com/search');assert.equal(options.method,'POST');
  const body=JSON.parse(options.body);assert.equal(body.query,'bố thắng phụ tùng xe máy');assert.equal(body.search_depth,'basic');assert.equal(body.auto_parameters,false);assert.equal(body.max_results,5);assert.equal(body.include_answer,false);assert.equal(body.include_raw_content,false);assert.equal(body.include_images,false);
  assert.equal(options.headers.Authorization,'Bearer test-key');assert.equal(options.headers['Content-Type'],'application/json');assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');assert.ok(options.signal);
  return new Response(JSON.stringify({results:[]}));
 });assert.deepEqual(result,{items:[]});
});
test('provider redacts remote errors and supports retry after failure',async()=>{
 for(const status of [401,429,432,433,500]){const result=await fetchPartWebResults('má phanh','secret',async()=>new Response('secret',{status}));assert.ok(result.error);assert.ok(!result.error.includes('secret'));if(status===432||status===433)assert.match(result.error,/hạn mức/);}
 const failure=await fetchPartWebResults('má phanh','secret',async()=>{throw Error('secret');});assert.ok(failure.error);
 const retry=await fetchPartWebResults('má phanh','secret',async()=>new Response('{"results":[]}'));assert.deepEqual(retry,{items:[]});
});
