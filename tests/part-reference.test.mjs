import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizePartText, rankSuggestions } from '../src/features/parts/catalog.ts';
const { terms, sources } = JSON.parse(readFileSync(new URL('../data/part-name-reference.json', import.meta.url), 'utf8'));
test('reference dictionary has unique normalized names and known primary sources', () => {
  assert.equal(new Set(terms.map(t => normalizePartText(t.name))).size, terms.length);
  for (const t of terms) {
    assert.ok(t.name.length <= 180 && t.category && Array.isArray(t.aliases));
    assert.ok(Object.values(sources).includes(t.source_url));
    assert.deepEqual(Object.keys(t).sort(), ['aliases','category','name','source_url']);
    assert.ok(!t.name.includes('?') && !t.name.includes('\uFFFD'));
  }
});
test('local workshop vocabulary and accent-free names find intended suggestions', () => {
  for (const [query, name] of [['bac dan den','Vòng bi trục khuỷu'],['bo thang dia','Má phanh đĩa'],['day cu roa','Dây curoa'],['piston','Pít tông'],['loc gio noi','Lọc gió hộp truyền động'],['remote smartkey','Điều khiển khóa thông minh']]) {
    assert.ok(rankSuggestions(terms, query).some(t => t.name === name), query);
  }
});
