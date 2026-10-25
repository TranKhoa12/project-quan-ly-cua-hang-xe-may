export type Customer = { id: string; name: string; phone: string; plate: string; vehicle: string };
export type Part = { id: string; sku?: string; name: string; category: string; brand: string; stock: number; min: number; price: number; cost: number };
export type Repair = { id: string; customerId: string; issue: string; status: string; technician: string; labor: number; paid: number; items: { partId: string; quantity: number; price: number }[]; createdAt: string };
export type Sale = { id: string; customer: string; items: { partId: string; name: string; quantity: number; price: number; cost: number }[]; total: number; method: string; createdAt: string };
export type Movement = { id: string; partId: string; quantity: number; reason: string; createdAt: string };
export type State = { customers: Customer[]; parts: Part[]; repairs: Repair[]; sales: Sale[]; movements: Movement[] };
export const statuses = ['Chờ kiểm tra', 'Chờ khách duyệt', 'Đang sửa', 'Chờ bàn giao', 'Đã bàn giao'];
export const money = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
export const shortMoney = (n: number) => new Intl.NumberFormat('vi-VN').format(n);
export const dateLabel = (s: string) => new Date(s).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
export const repairTotal = (r: Repair) => r.labor + r.items.reduce((a, i) => a + i.price * i.quantity, 0);
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
export function createEmptyState(): State {
  return { customers: [], parts: [], repairs: [], sales: [], movements: [] };
}
