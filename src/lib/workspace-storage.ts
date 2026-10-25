import type { State } from './data';

export const WORKSPACE_STORAGE_KEY = 'motocare-workspace-v2';
export const LEGACY_DEMO_STORAGE_KEY = 'motocare-demo-v1';
type WorkspaceStorage = Pick<Storage, 'getItem' | 'removeItem'>;

/** Retire the entire old demo workspace; keep store settings in their separate key. */
export function loadWorkspace(storage: WorkspaceStorage, key = WORKSPACE_STORAGE_KEY): State {
  storage.removeItem(LEGACY_DEMO_STORAGE_KEY);
  const empty: State = { customers: [], parts: [], repairs: [], sales: [], movements: [] };
  const raw = storage.getItem(key);
  if (!raw) return empty;
  try {
    const value = JSON.parse(raw);
    if (!value || !['customers', 'parts', 'repairs', 'sales', 'movements'].every(key => Array.isArray(value[key]))) return empty;
    return value;
  } catch { return empty; }
}
