import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePartText, exactDuplicate, rankSuggestions, validatePartInput } from '../src/features/parts/catalog.ts';
const input=()=>({name:' Lọc gió   Vision ',category:'Bộ lọc',brand:'Honda',price:100000,cost:60000,min:5,requestId:'e5673812-bb80-423b-bd47-b4b656ca3611',allowSimilar:false});

test('Vietnamese, case, punctuation and spacing normalize for duplicate checking',()=>{
  assert.equal(normalizePartText('  LỌC–GIÓ   Vision  '),'loc gio vision');
  assert.equal(normalizePartText('Đĩa phanh'),'dia phanh');
  assert(exactDuplicate([{name:'Lọc gió Vision',brand:'Honda'}],'loc-gio VISION',' HONDA '));
});
test('same name under a different brand or model is not an exact duplicate',()=>{
  assert(!exactDuplicate([{name:'Bugi',brand:'Honda'}],'Bugi','NGK'));
  assert(!exactDuplicate([{name:'Lọc gió Vision',brand:'Honda'}],'Lọc gió Lead','Honda'));
});
test('search finds aliases without accents and ranks exact before partial matches',()=>{
  const options=[{name:'Má phanh đĩa',aliases:['Bố thắng đĩa']},{name:'Lọc gió Vision'},{name:'Lọc gió'}];
  assert.equal(rankSuggestions(options,'bo thang')[0].name,'Má phanh đĩa');
  assert.deepEqual(rankSuggestions(options,'loc gio').map(o=>o.name),['Lọc gió','Lọc gió Vision']);
  assert.deepEqual(rankSuggestions(options,'Tên mới hoàn toàn'),[]);
});
test('validation cleans fields and rejects invalid amounts and request metadata',()=>{
  assert.equal(validatePartInput(input()).name,'Lọc gió Vision');
  for(const patch of [{name:'   '},{brand:'--'},{category:''},{name:'a'.repeat(181)},{price:-1},{cost:1.5},{min:Infinity},{requestId:'fake'},{allowSimilar:'true'}])assert.throws(()=>validatePartInput({...input(),...patch}));
});
test('choosing or searching a suggestion never mutates or inserts a product',()=>{
  const options=[{name:'Bugi',aliases:['Bu gi']}];const snapshot=JSON.stringify(options);
  rankSuggestions(options,'bugi');
  assert.equal(JSON.stringify(options),snapshot);
});
