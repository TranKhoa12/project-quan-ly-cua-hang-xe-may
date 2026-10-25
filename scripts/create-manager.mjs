import { createClient } from '@supabase/supabase-js';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { normalizeUsername, internalEmail, validatePassword } from '../src/lib/auth/permissions.ts';

if (!process.stdin.isTTY) throw new Error('Chạy lệnh trong Terminal tương tác để nhập mật khẩu riêng tư.');
process.loadEnvFile('.env.local');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Thiếu cấu hình Supabase phía server trong .env.local.');
const admin = createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const { count, error: countError } = await admin.from('profiles').select('id',{count:'exact',head:true}).eq('role','manager').eq('active',true);
if (countError) throw new Error('Không kiểm tra được quyền quản lý. Hãy áp dụng migration trước.');
if (count) throw new Error('Đã có quản lý. Hãy đăng nhập và cấp tài khoản tại mục Nhân viên.');
let muted = false;
const output = new Writable({ write(chunk,_encoding,callback) { if (!muted) process.stdout.write(chunk); callback(); } });
const rl = createInterface({ input:process.stdin, output, terminal:true });
try {
  const username = normalizeUsername(await rl.question('Tên đăng nhập quản lý (ví dụ quanly): '));
  const fullName = (await rl.question('Tên hiển thị: ')).trim();
  if (!fullName || fullName.length>100) throw new Error('Tên hiển thị cần 1–100 ký tự.');
  process.stdout.write('Mật khẩu (từ 12 ký tự, có chữ và số; không hiển thị khi nhập): ');
  muted = true;
  const password = validatePassword(await rl.question(''));
  process.stdout.write('\nNhập lại mật khẩu: ');
  const confirm = await rl.question('');
  muted = false;
  process.stdout.write('\n');
  if (password !== confirm) throw new Error('Mật khẩu xác nhận không khớp.');
  const { data, error } = await admin.auth.admin.createUser({email:internalEmail(username),password,email_confirm:true});
  if (error || !data.user) throw new Error('Không tạo được tài khoản. Tên đăng nhập có thể đã được sử dụng.');
  const { error: profileError } = await admin.from('profiles').insert({id:data.user.id,login_name:username,full_name:fullName,role:'manager',active:true});
  if (profileError) {
    const { error: cleanupError } = await admin.auth.admin.deleteUser(data.user.id);
    throw new Error(cleanupError ? 'Không tạo được hồ sơ và chưa thu hồi được định danh. Kiểm tra Supabase trước khi thử lại.' : 'Không tạo được hồ sơ quản lý. Tài khoản vừa tạo đã được thu hồi.');
  }
  console.log(`Đã tạo quản lý ${username}. Mở /login để đăng nhập. Mật khẩu không được lưu vào file/log.`);
} finally { rl.close(); }
