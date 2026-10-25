'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { sessionClient, requireActor, consumeAuthAttempt } from '@/lib/auth/server';
import { internalEmail, normalizeUsername, validatePassword } from '@/lib/auth/permissions';

export type AuthResult = { error?: string; success?: string };
export async function loginAction(_state: AuthResult, form: FormData): Promise<AuthResult> {
  try {
    const username = normalizeUsername(form.get('username'));
    const password = String(form.get('password') || '');
    if (!password || password.length > 128) return { error: 'Tên đăng nhập hoặc mật khẩu không đúng.' };
    const h = await headers();
    const ip = h.get('x-vercel-forwarded-for') || h.get('x-real-ip') || 'local';
    await Promise.all([consumeAuthAttempt(`login-user:${username}`),consumeAuthAttempt(`login-ip:${ip}`)]);
    const client = await sessionClient();
    const { error } = await client.auth.signInWithPassword({ email: internalEmail(username), password });
    if (error) return { error: 'Tên đăng nhập hoặc mật khẩu không đúng.' };
    // signInWithPassword already verifies credentials; the RPC checks live role/session.
    const { data: profile } = await client.rpc('current_staff_actor');
    if (!profile?.active || profile.login_name !== username || !['manager','sales','technician'].includes(profile.role)) {
      await client.auth.signOut({ scope: 'local' });
      return { error: 'Tài khoản chưa được cấp quyền hoặc đã ngừng hoạt động. Liên hệ quản lý cửa hàng.' };
    }
  } catch (error) { return { error: error instanceof Error ? error.message : 'Không thể đăng nhập. Vui lòng thử lại.' }; }
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function logoutAction() {
  const client = await sessionClient();
  await client.auth.signOut({ scope: 'local' });
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function changePasswordAction(_state: AuthResult, form: FormData): Promise<AuthResult> {
  const actor = await requireActor();
  try {
    await consumeAuthAttempt(`password:${actor.id}`);
    const next = validatePassword(form.get('newPassword'));
    if (next !== form.get('confirmPassword')) return { error: 'Mật khẩu xác nhận chưa khớp.' };
    const client = await sessionClient();
    const { error: verifyError } = await client.auth.signInWithPassword({ email: internalEmail(actor.username), password: String(form.get('currentPassword') || '') });
    if (verifyError) return { error: 'Mật khẩu hiện tại không đúng.' };
    const { error } = await client.auth.updateUser({ password: next });
    if (error) return { error: 'Chưa đổi được mật khẩu. Hãy kiểm tra yêu cầu mật khẩu và thử lại.' };
    return { success: 'Đã đổi mật khẩu thành công.' };
  } catch (error) { return { error: error instanceof Error ? error.message : 'Không thể đổi mật khẩu.' }; }
}
