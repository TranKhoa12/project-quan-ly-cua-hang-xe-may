import type { State, Sale } from './data';

function positiveInteger(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Số lượng phải là số nguyên dương.');
}
function amount(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('Số tiền không hợp lệ.');
}

/** Demo state transitions only. Production must run these operations atomically in PostgreSQL. */
export function completeSale(state: State, input: { id: string; cart: Record<string, number>; customer: string; method: string; createdAt: string }): State {
  if (state.sales.some(s => s.id === input.id)) return state;
  const entries = Object.entries(input.cart);
  if (!entries.length) throw new Error('Đơn hàng chưa có phụ tùng.');
  if (!['Tiền mặt', 'Chuyển khoản'].includes(input.method)) throw new Error('Phương thức thanh toán không hợp lệ.');
  const items = entries.map(([id, quantity]) => {
    positiveInteger(quantity);
    const p = state.parts.find(p => p.id === id);
    if (!p) throw new Error('Phụ tùng không tồn tại.');
    if (quantity > p.stock) throw new Error(`Không đủ tồn kho: ${p.name}.`);
    amount(p.price); amount(p.cost);
    return { partId: p.id, name: p.name, quantity, price: p.price, cost: p.cost };
  });
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  amount(total);
  const sale: Sale = { id: input.id, customer: input.customer.trim() || 'Khách lẻ', method: input.method, items, total, createdAt: input.createdAt };
  return {
    ...state,
    parts: state.parts.map(p => ({ ...p, stock: p.stock - (input.cart[p.id] || 0) })),
    sales: [sale, ...state.sales],
    movements: [...items.map(i => ({ id: `${input.id}-${i.partId}`, partId: i.partId, quantity: -i.quantity, reason: `Bán hàng ${input.id}`, createdAt: input.createdAt })), ...state.movements],
  };
}

export function receiveStock(state: State, input: { id: string; partId: string; quantity: number; cost: number; reason: string; createdAt: string }): State {
  if (state.movements.some(m => m.id === input.id)) return state;
  positiveInteger(input.quantity); amount(input.cost);
  const part = state.parts.find(p => p.id === input.partId);
  if (!part) throw new Error('Phụ tùng không tồn tại.');
  const stock = part.stock + input.quantity;
  if (!Number.isSafeInteger(stock)) throw new Error('Số lượng vượt giới hạn.');
  return {
    ...state,
    parts: state.parts.map(p => p.id === input.partId ? { ...p, stock, cost: Math.round((p.stock * p.cost + input.quantity * input.cost) / stock) } : p),
    movements: [{ id: input.id, partId: input.partId, quantity: input.quantity, reason: input.reason, createdAt: input.createdAt }, ...state.movements],
  };
}
