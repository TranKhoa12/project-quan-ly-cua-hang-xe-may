import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const expectedProject = 'prj_miR0T7uE3uVNC0pJ8sfTsYzESOUs';
const project = JSON.parse(fs.readFileSync('.vercel/project.json', 'utf8'));
if (project.projectId !== expectedProject) throw new Error('Project Vercel không khớp đích triển khai đã xác minh.');
process.loadEnvFile('.env.local');
const keys = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
for (const name of keys) {
  const value = process.env[name];
  if (!value || /[\r\n]/.test(value)) throw new Error(`Thiếu giá trị hợp lệ cho ${name}`);
  const type = name === 'SUPABASE_SERVICE_ROLE_KEY' ? '--sensitive' : '--no-sensitive';
  // Pass values through stdin only; capture and suppress CLI output in case it echoes input.
  const command = `npx.cmd --yes vercel env add ${name} --environment production ${type} --yes`;
  const result = spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', command], {
    input: value, encoding: 'utf8', windowsHide: true,
  });
  if (result.status !== 0) throw new Error(`Không cấu hình được ${name}; không in CLI output để tránh lộ giá trị.`);
  console.log(`Đã cấu hình ${name} cho production (${type === '--sensitive' ? 'Secret' : 'Config'}).`);
}
