export const roles = ['manager', 'sales', 'technician'] as const;
export type Role = typeof roles[number];
export type Actor = { id: string; fullName: string; username: string; role: Role };
export const roleLabels: Record<Role, string> = { manager: 'Quản lý', sales: 'Nhân viên bán hàng', technician: 'Thợ sửa xe' };
const sections = ['dashboard', 'repairs', 'sales', 'parts', 'purchases', 'customers', 'cashbook', 'reports', 'staff', 'settings'];
export function isRole(value: unknown): value is Role { return roles.includes(value as Role); }
export function canAccess(role: Role, section: string): boolean {
  if (!isRole(role) || !sections.includes(section)) return false;
  if (role === 'manager') return true;
  if (role === 'sales') return ['dashboard', 'repairs', 'sales', 'parts', 'customers'].includes(section);
  return ['dashboard', 'repairs', 'parts'].includes(section);
}
export function normalizeUsername(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Tên đăng nhập không hợp lệ.');
  const username = value.trim().toLowerCase();
  if (!/^[a-z][a-z0-9._-]{2,31}$/.test(username)) throw new Error('Tên đăng nhập cần 3–32 ký tự, bắt đầu bằng chữ; chỉ dùng a–z, số, dấu chấm, gạch ngang hoặc gạch dưới.');
  return username;
}
export function internalEmail(username: string) { return `${normalizeUsername(username)}@accounts.motocare.invalid`; }
export function validatePassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128 || !/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) throw new Error('Mật khẩu cần 12–128 ký tự, gồm chữ và số.');
  return value;
}
