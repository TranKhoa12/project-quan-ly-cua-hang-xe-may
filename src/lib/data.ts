export type Customer = { id: string; name: string; phone: string; plate: string; vehicle: string };
export type Part = { id: string; name: string; category: string; brand: string; stock: number; min: number; price: number; cost: number };
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
export function seed(): State {
  const now = new Date().toISOString();
  return {
    customers: [
      { id: 'KH001', name: 'Nguyễn Minh Tuấn', phone: '0901234567', plate: '59-X3 128.68', vehicle: 'Honda Air Blade 160' },
      { id: 'KH002', name: 'Trần Thị Mai', phone: '0912345678', plate: '59-G2 456.89', vehicle: 'Honda Vision' },
      { id: 'KH003', name: 'Lê Hoàng Nam', phone: '0934567890', plate: '59-P1 789.12', vehicle: 'Yamaha Exciter 155' },
      { id: 'KH004', name: 'Phạm Quốc Huy', phone: '0987654321', plate: '59-S2 234.56', vehicle: 'Honda Wave RSX' },
      { id: 'KH005', name: 'Võ Ngọc Anh', phone: '0909876543', plate: '59-C1 567.23', vehicle: 'Yamaha Grande' },
    ],
    parts: [
      { id: 'PT001', name: 'Nhớt Motul Scooter Expert 1L', category: 'Dầu nhớt', brand: 'Motul', stock: 24, min: 8, price: 185000, cost: 125000 },
      { id: 'PT002', name: 'Má phanh trước Honda Air Blade', category: 'Hệ thống phanh', brand: 'Honda', stock: 4, min: 5, price: 145000, cost: 85000 },
      { id: 'PT003', name: 'Bugi NGK CPR8EA-9', category: 'Điện & đánh lửa', brand: 'NGK', stock: 18, min: 5, price: 85000, cost: 45000 },
      { id: 'PT004', name: 'Lọc gió Honda Vision', category: 'Động cơ', brand: 'Honda', stock: 3, min: 5, price: 120000, cost: 65000 },
      { id: 'PT005', name: 'Lốp Michelin City Extra 80/90-14', category: 'Lốp & bánh xe', brand: 'Michelin', stock: 8, min: 3, price: 520000, cost: 370000 },
      { id: 'PT006', name: 'Ắc quy GS GTZ5S', category: 'Điện & đánh lửa', brand: 'GS', stock: 2, min: 3, price: 350000, cost: 245000 },
      { id: 'PT007', name: 'Bộ nhông sên dĩa DID Wave', category: 'Truyền động', brand: 'DID', stock: 12, min: 4, price: 280000, cost: 195000 },
    ],
    repairs: [
      { id: 'SC-001', customerId: 'KH001', issue: 'Thay nhớt, kiểm tra phanh trước', status: 'Đang sửa', technician: 'Anh Minh', labor: 50000, paid: 0, items: [{ partId: 'PT001', quantity: 1, price: 185000 }], createdAt: now },
      { id: 'SC-002', customerId: 'KH002', issue: 'Xe khó đề, kiểm tra ắc quy', status: 'Chờ kiểm tra', technician: 'Anh Hùng', labor: 0, paid: 0, items: [], createdAt: now },
      { id: 'SC-003', customerId: 'KH003', issue: 'Bảo dưỡng định kỳ 10.000 km', status: 'Chờ khách duyệt', technician: 'Anh Minh', labor: 250000, paid: 0, items: [{ partId: 'PT003', quantity: 1, price: 85000 }], createdAt: now },
      { id: 'SC-004', customerId: 'KH004', issue: 'Thay bộ nhông sên dĩa', status: 'Chờ bàn giao', technician: 'Anh Hùng', labor: 80000, paid: 360000, items: [{ partId: 'PT007', quantity: 1, price: 280000 }], createdAt: now },
      { id: 'SC-005', customerId: 'KH005', issue: 'Thay lốp sau, cân chỉnh bánh', status: 'Đã bàn giao', technician: 'Anh Minh', labor: 60000, paid: 580000, items: [{ partId: 'PT005', quantity: 1, price: 520000 }], createdAt: now },
    ],
    sales: [
      { id: 'BH-001', customer: 'Khách lẻ', items: [{ partId: 'PT001', name: 'Nhớt Motul Scooter Expert 1L', quantity: 2, price: 185000, cost: 125000 }], total: 370000, method: 'Tiền mặt', createdAt: now },
      { id: 'BH-002', customer: 'Nguyễn Văn Bình', items: [{ partId: 'PT003', name: 'Bugi NGK CPR8EA-9', quantity: 1, price: 85000, cost: 45000 }], total: 85000, method: 'Chuyển khoản', createdAt: now },
    ],
    movements: [],
  };
}
