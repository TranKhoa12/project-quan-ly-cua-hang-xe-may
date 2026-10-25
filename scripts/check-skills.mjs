import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Repository format: exactly two plain single-line YAML scalars, name and description.
// This is a local structure/reference checker, not a general YAML parser or behavior test.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillRoot = path.join(root, 'skills');
const directories = fs.readdirSync(skillRoot, { withFileTypes: true }).filter(d => d.isDirectory());
assert(directories.length > 0, 'No project skills found');
const checked = [];
for (const dir of directories) {
  const file = path.join(skillRoot, dir.name, 'SKILL.md');
  const text = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const front = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]+)$/);
  assert(front, `Invalid frontmatter: ${file}`);
  const fields = new Map();
  for (const line of front[1].split('\n')) {
    const scalar = line.match(/^(name|description): ([^\n]+)$/);
    assert(scalar, `Only plain name/description fields supported: ${file}`);
    assert(!fields.has(scalar[1]), `Duplicate field: ${file}`);
    assert(!/[:\n]\s|[<>]|^[\[\]{}&*!|>'"#@`]/.test(scalar[2]), `Use a plain scalar in ${file}`);
    fields.set(scalar[1], scalar[2]);
  }
  assert.equal(fields.size, 2, `Missing metadata: ${file}`);
  assert.equal(fields.get('name'), dir.name);
  assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(dir.name) && dir.name.length <= 64, `Invalid name: ${dir.name}`);
  assert(fields.get('description').length > 0 && fields.get('description').length <= 1024);
  assert(!/^\s*\[TODO:/m.test(front[2]), `Unfinished scaffold: ${file}`);
  checked.push(file);
}
function collectDocs(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(d => d.isDirectory() ? collectDocs(path.join(folder,d.name)) : d.name.endsWith('.md') ? [path.join(folder,d.name)] : []);
}
const docs = [path.join(root,'AGENTS.md'), ...collectDocs(path.join(root,'docs')), ...checked];
for (const file of docs) {
  const text = fs.readFileSync(file,'utf8');
  for (const match of text.matchAll(/`((?:docs|skills)\/[a-zA-Z0-9_./-]+\.md)`/g)) {
    assert(fs.existsSync(path.join(root,match[1])), `Broken project reference ${match[1]} in ${file}`);
  }
  for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    const link = match[1].split('#')[0];
    if (!link || /^[a-z]+:/i.test(link)) continue;
    assert(fs.existsSync(path.resolve(path.dirname(file), link)), `Broken link ${link} in ${file}`);
  }
}
console.log(`PASS: ${checked.length} project skills; references checked across ${docs.length} documents.`);
console.log('Scope: flat metadata, names, unfinished scaffold and local references. No behavioral/security certification.');
