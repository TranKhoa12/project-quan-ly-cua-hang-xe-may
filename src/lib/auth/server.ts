import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'node:crypto';
import { isRole, type Actor } from './permissions';
import { hasAuthCookie } from './cookie-presence';

export const sessionClient = cache(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Chưa cấu hình Supabase.');
  const jar = await cookies();
  return createServerClient(url, key, {
    cookieOptions: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' },
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        try { values.forEach(({ name, value, options }) => jar.set(name, value, options)); }
        catch { /* Server Components cannot write cookies; Proxy refreshes them. */ }
      },
    },
  });
});

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Chưa cấu hình quản trị tài khoản phía server.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const currentActor = cache(async (): Promise<Actor | null> => {
  const jar = await cookies();
  if (!hasAuthCookie(jar.getAll().map(cookie => cookie.name), process.env.NEXT_PUBLIC_SUPABASE_URL)) return null;
  const client = await sessionClient();
  const { data: verified, error } = await client.auth.getClaims();
  if (error || !verified?.claims?.sub) return null;
  const { data: profile, error: profileError } = await client.rpc('current_staff_actor');
  if (profileError || !profile || profile.id !== verified.claims.sub || !profile.active || !isRole(profile.role) || !profile.login_name) return null;
  return { id: profile.id, fullName: profile.full_name, username: profile.login_name, role: profile.role };
});

export async function requireActor() {
  const actor = await currentActor();
  if (!actor) redirect('/login');
  return actor;
}
export async function requireManager() {
  const actor = await requireActor();
  if (actor.role !== 'manager') throw new Error('Bạn không có quyền quản lý tài khoản.');
  return actor;
}

export async function consumeAuthAttempt(bucket: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Chưa cấu hình đăng nhập phía server.');
  const hash = createHmac('sha256', secret).update(bucket).digest('hex');
  const { data, error } = await adminClient().rpc('consume_auth_attempt', { p_bucket: hash });
  if (error) throw new Error('Không thể kiểm tra giới hạn đăng nhập. Vui lòng thử lại sau.');
  if (!data) throw new Error('Đã vượt số lần thử. Vui lòng chờ 15 phút rồi thử lại.');
}
