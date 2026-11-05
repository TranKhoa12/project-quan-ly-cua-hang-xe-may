import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dictionaryOptions,partSearchIndex} from '../src/features/parts/dictionary.ts';
import {normalizePartText,rankSuggestions} from '../src/features/parts/catalog.ts';
import {loadDictionary} from '../src/features/parts/load-dictionary.ts';
const reference=JSON.parse(readFileSync('data/part-name-reference.json','utf8'));
const extra=JSON.parse(readFileSync('data/part-dictionary-extra.json','utf8'));
const terms=[...[...reference.terms,...extra.names].map(t=>({...t,kind:'name'})),...extra.categories.map(t=>({...t,kind:'category'})),...extra.brands.map(t=>({...t,kind:'brand'}))].map((t,i)=>({id:String(i),category:null,...t}));
test('shared vocabulary has unique keys, complete groups and sourced brands; generated SQL stays reproducible',()=>{
 assert.equal(new Set(terms.map(t=>t.kind+normalizePartText(t.name))).size,terms.length);
 for(const t of reference.terms)assert.ok(extra.categories.some(c=>c.name===t.category));
 for(const b of extra.brands)assert.equal(new URL(b.source_url).protocol,'https:');
 execFileSync(process.execPath,['--experimental-strip-types','scripts/build-shared-dictionary.mjs','--check']);
});
test('all dictionary fields preserve aliases and generic names do not imply brand',()=>{
 const names=dictionaryOptions(terms,[],'name');
 const found=rankSuggestions(names,'bo thang dia').find(t=>t.name==='Má phanh đĩa');assert.ok(found);assert.equal(found.category,'Hệ thống phanh');assert.equal(found.brand,undefined);
 assert.ok(rankSuggestions(dictionaryOptions(terms,[],'category'),'vo ruot').some(t=>t.name==='Lốp và ruột xe'));
 assert.ok(rankSuggestions(dictionaryOptions(terms,[],'brand'),'did').some(t=>t.name==='D.I.D'));
});
test('shared product search resolves local aliases, groups, brands, SKU and keeps distinct brands',()=>{
 const parts=[{id:'a',name:'Má phanh đĩa Wave',category:'Hệ thống phanh',brand:'NGK',sku:'PT-001'},{id:'b',name:'Má phanh đĩa Wave',category:'Hệ thống phanh',brand:'DENSO',sku:'PT-002'}];
 const index=partSearchIndex(parts,terms);
 for(const query of ['bo thang dia','thang','pt 001','n g k'])assert.ok(index.get('a').includes(normalizePartText(query)),query);
 assert.ok(!index.get('b').includes('n g k'));
 const options=dictionaryOptions(terms,parts,'name');assert.ok(options.some(o=>o.brand==='NGK'));assert.ok(options.some(o=>o.brand==='DENSO'));
});
test('dictionary loader reads beyond one page and fails closed on partial error',async()=>{
 const rows=Array.from({length:1201},(_,i)=>({id:String(i),kind:'name',name:'Tên '+i,aliases:[],category:null}));const ranges=[];
 const mock=(fail=false)=>({from(){return {select(){return this;},order(){return this;},async range(from,to){ranges.push([from,to]);return fail&&from===500?{data:null,error:{message:'network'}}:{data:rows.slice(from,to+1),error:null};}};}});
 const loaded=await loadDictionary(mock());assert.equal(loaded.data.length,1201);assert.equal(loaded.error,null);assert.deepEqual(ranges,[[0,499],[500,999],[1000,1499]]);
 const partial=await loadDictionary(mock(true));assert.deepEqual(partial.data,[]);assert.ok(partial.error);
});
