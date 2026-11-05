// Route handlers with isolated session/Storage boundaries; not Supabase HTTP or E2E.
import {build} from 'esbuild';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const out=resolve('.browser-test/image-route');mkdirSync(out,{recursive:true});
const bundle=await build({entryPoints:['src/app/api/parts/[id]/image/route.ts'],bundle:true,write:false,format:'esm',platform:'node',packages:'external',plugins:[{name:'isolated',setup(b){
 b.onResolve({filter:/^@\/lib\/auth\/server$/},()=>({path:'auth',namespace:'mock'}));b.onResolve({filter:/^next\/cache$/},()=>({path:'cache',namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='cache'?'export function revalidatePath(){}':`export async function currentActor(){return globalThis.__imageActor;}export function adminClient(){globalThis.__adminCalls++;throw Error('Unexpected Storage admin call');}export async function consumeAuthAttempt(){}export async function sessionClient(){return {from(){return {select(){return this},eq(){return this},async maybeSingle(){return {data:{id:'test',path:'bound/file.webp'},error:null}}}},storage:{from(){return {async createSignedUrl(path,ttl){globalThis.__ttl=ttl;return {data:{signedUrl:'https://example.com/signed'},error:null}}}}}}}`,loader:'js'}));
}}]});const file=resolve(out,'route.mjs');writeFileSync(file,bundle.outputFiles[0].text);const {GET,POST}=await import(pathToFileURL(file));
const id='11111111-1111-4111-8111-111111111111',params={params:Promise.resolve({id})};globalThis.__adminCalls=0;
const request=origin=>new Request(`https://example.com/api/parts/${id}/image`,{method:'POST',headers:{origin}});
globalThis.__imageActor=null;assert.equal((await GET(request('https://example.com'),params)).status,401);assert.equal((await POST(request('https://example.com'),params)).status,401);
globalThis.__imageActor={id,role:'sales'};assert.equal((await POST(request('https://example.com'),params)).status,403);
globalThis.__imageActor={id,role:'manager'};assert.equal((await POST(request('https://evil.example'),params)).status,403);
const signed=await GET(request('https://example.com'),params);assert.equal(signed.status,302);assert.equal(globalThis.__ttl,60);assert.equal(signed.headers.get('cache-control'),'private, no-store');
const form=new FormData();form.set('operation','upload');form.set('version','0');form.set('requestId',id);form.set('file',new File(['<svg/>'],'bad.svg',{type:'image/svg+xml'}));const invalid=await POST(new Request(`https://example.com/api/parts/${id}/image`,{method:'POST',headers:{origin:'https://example.com'},body:form}),params);assert.equal(invalid.status,400);assert.equal(globalThis.__adminCalls,0);
console.log('PASS image routes: anonymous, staff, CSRF, 60s private signed redirect, invalid file rejected before Storage admin (isolated boundaries).');
