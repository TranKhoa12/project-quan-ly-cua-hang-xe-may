'use server';

import { revalidatePath } from 'next/cache';
import { adminClient, requireManager, sessionClient, consumeAuthAttempt } from '@/lib/auth/server';
import { normalizeUsername, internalEmail, validatePassword, isRole } from '@/lib/auth/permissions';
import type { AuthResult } from './auth-actions';

export async function createStaffAction(_state: AuthResult, form: FormData): Promise<AuthResult> {
  const actor = await requireManager();
  try {
    await consumeAuthAttempt(`staff-create:${actor.id}`);
    const username = normalizeUsername(form.get('username'));
    const password = validatePassword(form.get('password'));
    const fullName = String(form.get('fullName') || '').trim();
    const role = form.get('role');
    if (!isRole(role) || !fullName || fullName.length > 100) return { error: 'Tên nhân viên hoặc vai trò không hợp lệ.' };
    const admin = adminClient();
    const { data, error } = await admin.auth.admin.createUser({ email: internalEmail(username), password, email_confirm: true });
    if (error || !data.user) return { error: 'Không tạo được tài khoản. Tên đăng nhập có thể đã được sử dụng.' };
    const client = await sessionClient();
    const { error: profileError } = await client.rpc('register_staff_profile', { p_id: data.user.id, p_login_name: username, p_full_name: fullName, p_role: role });
    if (profileError) {
      const { error: cleanupError } = await admin.auth.admin.deleteUser(data.user.id);
      return { error: cleanupError ? 'Chưa cấp được quyền và chưa thu hồi được định danh vừa tạo. Cần kiểm tra Supabase trước khi thử lại.' : 'Chưa cấp được quyền. Tài khoản vừa tạo đã được thu hồi; vui lòng thử lại.' };
    }
    revalidatePath('/staff');
    return { success: `Đã tạo tài khoản ${username}. Bàn giao mật khẩu riêng cho nhân viên.` };
  } catch (error) { return { error: error instanceof Error ? error.message : 'Không thể tạo tài khoản.' }; }
}

export async function updateStaffAction(_state: AuthResult, form: FormData): Promise<AuthResult> {
  await requireManager();
  const role = form.get('role');
  const id = String(form.get('id') || '');
  if (!isRole(role) || !/^[a-f0-9-]{36}$/.test(id)) return { error: 'Thông tin quyền không hợp lệ.' };
  const client = await sessionClient();
  const { error } = await client.rpc('update_staff_access', { p_id: id, p_role: role, p_active: form.get('active') === 'on' });
  if (error) return { error: 'Không thể đổi quyền. Bạn không thể tự tắt/hạ quyền hoặc vô hiệu hóa quản lý cuối cùng.' };
  revalidatePath('/staff');
  return { success: 'Đã cập nhật quyền và trạng thái tài khoản.' };
}

export async function resetStaffPasswordAction(_state: AuthResult, form: FormData): Promise<AuthResult> {
  const actor = await requireManager();
  try {
    await consumeAuthAttempt(`staff-reset:${actor.id}`);
    const id = String(form.get('id') || '');
    const password = validatePassword(form.get('password'));
    if (id === actor.id) return { error: 'Hãy dùng Đổi mật khẩu trong tài khoản của bạn.' };
    const client = await sessionClient();
    const { data: target } = await client.from('profiles').select('id').eq('id',id).single();
    if (!target) return { error: 'Không tìm thấy nhân viên.' };
    const { error } = await adminClient().auth.admin.updateUserById(id, { password });
    if (error) return { error: 'Không thể đặt lại mật khẩu.' };
    // Passwords are intentionally excluded from audit details.
    const { error: auditError } = await adminClient().from('audit_logs').insert({ actor_id: actor.id, action: 'staff.password_reset', entity_id: id });
    if (auditError) return { error: 'Mật khẩu đã được đổi nhưng chưa ghi được nhật ký. Cần kiểm tra nhật ký quản trị.' };
    return { success: 'Đã đặt lại mật khẩu. Bàn giao mật khẩu riêng cho nhân viên.' };
  } catch (error) { return { error: error instanceof Error ? error.message : 'Không thể đặt lại mật khẩu.' }; }
}
