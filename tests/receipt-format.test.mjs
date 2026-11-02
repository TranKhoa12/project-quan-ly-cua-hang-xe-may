import test from 'node:test';
import assert from 'node:assert/strict';
import {vndInWords,saleTime} from '../src/features/garage/receipt-format.ts';

test('receipt words handle zero, teen, alternate one/five and missing hundreds',()=>{
 assert.equal(vndInWords(0),'Không đồng');assert.equal(vndInWords(15),'Mười lăm đồng');
 assert.equal(vndInWords(21),'Hai mươi mốt đồng');assert.equal(vndInWords(105),'Một trăm lẻ năm đồng');
 assert.equal(vndInWords(1001),'Một nghìn không trăm lẻ một đồng');
});
test('receipt words support amounts up to the server transaction limit',()=>{
 assert.equal(vndInWords(12345000),'Mười hai triệu ba trăm bốn mươi lăm nghìn đồng');
 assert.equal(vndInWords(1000000001),'Một tỷ không trăm lẻ một đồng');
 assert.equal(vndInWords(1000000000000),'Một nghìn tỷ đồng');
});
test('invalid amounts are not printed as legitimate amounts in words',()=>{
 for(const value of [-1,1.5,NaN,Infinity,1000000000001])assert.equal(vndInWords(value),'');
});
test('receipt time includes Vietnam date and time across UTC day boundary',()=>{
 const value=saleTime('2026-11-01T18:30:00Z');assert.match(value,/02\/11\/2026/);assert.match(value,/01:30/);
});
