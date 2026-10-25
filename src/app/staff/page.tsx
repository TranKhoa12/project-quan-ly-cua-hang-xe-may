import { redirect } from 'next/navigation';
import { requireActor, sessionClient } from '@/lib/auth/server';
import AccessShell from '@/components/access-shell';
import { StaffManager, type StaffRow } from '@/components/staff-manager';
export default async function StaffPage() {
  const actor = await requireActor();
  if (actor.role !== 'manager') redirect('/access-denied');
  const client = await sessionClient();
  const { data, error } = await client.from('profiles').select('id,full_name,login_name,role,active').order('created_at');
  return <AccessShell actor={actor} section="staff" title="Nhân viên & phân quyền">{error?<p role="alert" className="auth-error">Không tải được danh sách nhân viên.</p>:<StaffManager self={actor.id} staff={(data||[]) as StaffRow[]}/>}</AccessShell>;
}
