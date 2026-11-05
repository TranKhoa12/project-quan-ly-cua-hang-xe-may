import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {validateImageFile,limitedFormData,MAX_PART_IMAGE_BYTES} from '../src/features/parts/image-input.ts';
import {processPartImage} from '../src/features/parts/process-image.ts';
import {partImageInfo,attachPartImages} from '../src/features/parts/load-images.ts';
test('image validation rejects SVG, empty and oversized files',()=>{
 for(const type of ['image/jpeg','image/png','image/webp'])assert.doesNotThrow(()=>validateImageFile(200,type));
 for(const [size,type] of [[0,'image/png'],[MAX_PART_IMAGE_BYTES+1,'image/png'],[100,'image/svg+xml'],[100,'text/html']])assert.throws(()=>validateImageFile(size,type));
});
test('image processing decodes real image, limits dimensions, strips EXIF and outputs deterministic WebP',async()=>{
 const input=await sharp({create:{width:2000,height:1000,channels:3,background:'#008866'}}).jpeg().withMetadata({orientation:6}).toBuffer();
 const output=await processPartImage(input),metadata=await sharp(output).metadata();assert.equal(metadata.format,'webp');assert.ok(metadata.width<=1600&&metadata.height<=1600);assert.equal(metadata.exif,undefined);assert.equal(metadata.orientation,undefined);assert.deepEqual(await processPartImage(input),output);
});
test('invalid images and SVG are rejected even when given an image extension',async()=>{
 await assert.rejects(()=>processPartImage(Buffer.from('not an image')));
 await assert.rejects(()=>processPartImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>')));
});
test('multipart stream is bounded before parsing and valid form data survives',async()=>{
 const form=new FormData();form.set('operation','remove');const good=await limitedFormData(new Request('http://localhost',{method:'POST',body:form}));assert.equal(good.get('operation'),'remove');
 const large=new Request('http://localhost',{method:'POST',body:new Uint8Array(MAX_PART_IMAGE_BYTES+65537)});await assert.rejects(()=>limitedFormData(large),/2 MB/);
});
test('image loader preserves missing image versions and never exposes storage paths',async()=>{
 const client={from(){return {select(){return this;},async in(){return {data:[{part_id:'a',path:'private/object',version:2},{part_id:'b',path:null,version:3}],error:null};}};}};
 const result=await attachPartImages(client,[{id:'a'},{id:'b'},{id:'c'}]);assert.deepEqual(result[0],{id:'a',image_url:'/api/parts/a/image?v=2',image_version:2});assert.equal(result[1].image_version,3);assert.equal(result[1].image_url,null);assert.equal(result[2].image_version,0);assert.equal(JSON.stringify(result).includes('private/object'),false);
 assert.deepEqual(partImageInfo('a',null,9),{image_url:null,image_version:9});
});
