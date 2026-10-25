import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const project = 'ozypilffzhbunjlzgdgc';
// Capture privileged output in memory. Never print keys or put them in shell arguments.
const result = spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `npx.cmd --yes supabase projects api-keys --project-ref ${project} --output json`], { encoding: 'utf8', windowsHide: true });
if (result.status !== 0) throw new Error('Không thể lấy cấu hình quản trị Supabase. Không in output để tránh lộ key.');
let value;
try { value = JSON.parse(result.stdout); } catch { throw new Error('Định dạng cấu hình CLI chưa được hỗ trợ.'); }
const rows = Array.isArray(value) ? value : value.api_keys || value.keys || value.data;
if (!Array.isArray(rows)) throw new Error('Không tìm thấy danh sách key trong phản hồi CLI.');
const entry = rows.find(row => row.name === 'service_role' || row.role === 'service_role');
const key = entry?.api_key || entry?.key;
if (typeof key !== 'string' || key.length < 30 || /[\r\n]/.test(key)) throw new Error('Không tìm thấy key quản trị phù hợp.');
const file = '.env.local';
let env = fs.readFileSync(file, 'utf8');
env = env.replace(/^SUPABASE_SERVICE_ROLE_KEY=.*\r?\n?/m, '');
fs.writeFileSync(file, `${env.trimEnd()}\nSUPABASE_SERVICE_ROLE_KEY=${key}\n`);
console.log('Đã lưu key quản trị phía server vào .env.local (gitignored). Không hiển thị key.');
