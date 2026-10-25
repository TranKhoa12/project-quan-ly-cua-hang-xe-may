export type StoreSettings = { name: string; phone: string; address: string };
export const STORE_SETTINGS_KEY = 'motocare-store';
export const DEFAULT_STORE: Readonly<StoreSettings> = {
  name: 'Cửa hàng xe máy',
  phone: '',
  address: '',
};

export function validateStoreSettings(value: unknown): StoreSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Thông tin cửa hàng không hợp lệ.');
  const input = value as Record<string, unknown>;
  for (const field of ['name', 'phone', 'address']) {
    if (typeof input[field] !== 'string') throw new Error('Thông tin cửa hàng phải là văn bản.');
  }
  const name = (input.name as string).trim().replace(/\s+/g, ' ');
  const phone = (input.phone as string).trim();
  const address = (input.address as string).trim();
  if (!name || name.length > 100) throw new Error('Tên cửa hàng cần từ 1 đến 100 ký tự.');
  if (phone.length > 30 || (phone && !/^[0-9+ ().-]+$/.test(phone))) throw new Error('Số điện thoại không hợp lệ.');
  if (address.length > 250) throw new Error('Địa chỉ tối đa 250 ký tự.');
  return { name, phone, address };
}

export function restoreStoreSettings(raw: string | null): StoreSettings {
  if (!raw) return { ...DEFAULT_STORE };
  try { return validateStoreSettings(JSON.parse(raw)); }
  catch { return { ...DEFAULT_STORE }; }
}

export function storeDocumentTitle(store: StoreSettings): string {
  return `${store.name} — Quản lý cửa hàng`;
}
