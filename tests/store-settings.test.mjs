import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_STORE, restoreStoreSettings, validateStoreSettings, storeDocumentTitle } from '../src/lib/store-settings.ts';

test('tên cửa hàng tùy chỉnh giữ tiếng Việt và tạo tiêu đề theo cấu hình', () => {
  const store = validateStoreSettings({ name: '  Xe máy   An Bình  ', phone: '0901 234 567', address: '12 Nguyễn Trãi' });
  assert.equal(store.name, 'Xe máy An Bình');
  assert.equal(storeDocumentTitle(store), 'Xe máy An Bình — Quản lý cửa hàng');
  assert.deepEqual(restoreStoreSettings(JSON.stringify(store)), store);
});
test('cấu hình trống, quá dài hoặc sai kiểu bị từ chối', () => {
  for (const value of [null, [], {}, { ...DEFAULT_STORE, name: '   ' }, { ...DEFAULT_STORE, name: 'a'.repeat(101) }, { ...DEFAULT_STORE, phone: 'abc' }, { ...DEFAULT_STORE, address: 'a'.repeat(251) }]) {
    assert.throws(() => validateStoreSettings(value));
  }
});
test('khôi phục cấu hình cũ và dự phòng khi dữ liệu lưu bị hỏng', () => {
  const old = { name: 'Cửa hàng xe máy Minh Phát', phone: '0901 234 567', address: 'Thành phố Hồ Chí Minh' };
  assert.deepEqual(restoreStoreSettings(JSON.stringify(old)), old);
  for (const raw of [null, '{broken', 'null', '[]', '{"name":42}']) assert.deepEqual(restoreStoreSettings(raw), DEFAULT_STORE);
});
