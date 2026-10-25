import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyState } from '../src/lib/data.ts';
import { loadWorkspace, LEGACY_DEMO_STORAGE_KEY, WORKSPACE_STORAGE_KEY } from '../src/lib/workspace-storage.ts';

function memoryStorage(entries) {
  const map = new Map(entries);
  return { getItem: key => map.get(key) ?? null, removeItem: key => map.delete(key), map };
}
test('application starts empty and each initialization is independent', () => {
  const first = createEmptyState();
  assert.deepEqual(first, { customers: [], parts: [], repairs: [], sales: [], movements: [] });
  first.customers.push({ id: 'TEST' });
  assert.equal(createEmptyState().customers.length, 0);
});
test('old demo storage is removed without importing its records or deleting store settings', () => {
  const storage = memoryStorage([[LEGACY_DEMO_STORAGE_KEY, '{"customers":[{"id":"OLD-DEMO"}]}'], ['motocare-store', '{"name":"My shop"}']]);
  assert.deepEqual(loadWorkspace(storage), createEmptyState());
  assert.equal(storage.map.has(LEGACY_DEMO_STORAGE_KEY), false);
  assert.equal(storage.getItem('motocare-store'), '{"name":"My shop"}');
});
test('new locally created records survive reload; corrupt data never restores demo records', () => {
  const state = createEmptyState();
  state.customers.push({ id: 'NEW', name: 'User entered customer' });
  assert.deepEqual(loadWorkspace(memoryStorage([[WORKSPACE_STORAGE_KEY, JSON.stringify(state)]])), state);
  for (const raw of ['null', '{broken', '{}']) assert.deepEqual(loadWorkspace(memoryStorage([[WORKSPACE_STORAGE_KEY, raw]])), createEmptyState());
});
test('account-scoped storage never falls back to another account or shared workspace', () => {
  const shared = { ...createEmptyState(), customers: [{ id: 'SHARED' }] };
  const owner = { ...createEmptyState(), customers: [{ id: 'OWNER' }] };
  const storage = memoryStorage([[WORKSPACE_STORAGE_KEY, JSON.stringify(shared)], [`${WORKSPACE_STORAGE_KEY}:manager-a`, JSON.stringify(owner)]]);
  assert.deepEqual(loadWorkspace(storage, `${WORKSPACE_STORAGE_KEY}:manager-a`), owner);
  assert.deepEqual(loadWorkspace(storage, `${WORKSPACE_STORAGE_KEY}:manager-b`), createEmptyState());
});
