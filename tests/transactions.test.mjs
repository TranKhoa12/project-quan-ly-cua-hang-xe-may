import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seed } from '../src/lib/data.ts';
import { completeSale, receiveStock } from '../src/lib/transactions.ts';

const saleInput = (cart) => ({ id: 'TEST-SALE', cart, customer: '', method: 'Tiền mặt', createdAt: '2026-10-25T08:00:00Z' });

test('chốt đơn bảo toàn số lượng, chốt giá và không thay đổi dữ liệu gốc', () => {
  const before = seed();
  const after = completeSale(before, saleInput({ PT001: 2, PT003: 1 }));
  assert.equal(before.parts[0].stock, 24);
  assert.equal(after.parts[0].stock, 22);
  assert.equal(after.parts[2].stock, 17);
  assert.equal(after.sales[0].total, 455000);
  assert.equal(after.sales[0].customer, 'Khách lẻ');
  assert.equal(after.movements.reduce((a,m)=>a+m.quantity,0), -3);
  after.parts[0].price = 999999;
  after.parts[0].cost = 888888;
  assert.equal(after.sales[0].items[0].price, 185000);
  assert.equal(after.sales[0].items[0].cost, 125000);
});

test('không thể bán quá tồn hoặc bán hai lần món cuối', () => {
  const state = seed();
  assert.throws(() => completeSale(state, saleInput({ PT006: 3 })), /Không đủ tồn/);
  const last = completeSale(state, saleInput({ PT006: 2 }));
  assert.equal(last.parts.find(p=>p.id==='PT006').stock, 0);
  assert.throws(() => completeSale(last, { ...saleInput({ PT006: 1 }), id: 'NEXT' }), /Không đủ tồn/);
});

test('từ chối giỏ rỗng, mã lạ, số lượng âm, lẻ hoặc không hữu hạn', () => {
  for (const cart of [{}, { UNKNOWN: 1 }, { PT001: -1 }, { PT001: 0 }, { PT001: 1.5 }, { PT001: Infinity }]) {
    assert.throws(() => completeSale(seed(), saleInput(cart)));
  }
});

test('gửi lại cùng mã đơn không trừ kho hoặc ghi thu trùng', () => {
  const input = saleInput({ PT001: 1 });
  const once = completeSale(seed(), input);
  assert.strictEqual(completeSale(once, input), once);
});

test('nhập hàng tính giá vốn theo lượng tồn cũ và lượng mới', () => {
  const state = seed();
  const input = { id: 'TEST-IN', partId: 'PT006', quantity: 2, cost: 255000, reason: 'Nhập hàng', createdAt: '2026-10-25T08:00:00Z' };
  const after = receiveStock(state, input);
  assert.equal(after.parts.find(p=>p.id==='PT006').stock, 4);
  assert.equal(after.parts.find(p=>p.id==='PT006').cost, 250000);
  assert.equal(state.parts.find(p=>p.id==='PT006').stock, 2);
  assert.strictEqual(receiveStock(after, input), after);
  assert.throws(() => receiveStock(state, { ...input, quantity: -2 }));
  assert.throws(() => receiveStock(state, { ...input, cost: -1 }));
});
