import { redirect } from 'next/navigation';
import { requireActor, sessionClient } from '@/lib/auth/server';
import AccessShell from '@/components/access-shell';
import { StaffManager, type StaffRow } from '@/components/staff-manager';
import { Suspense } from 'react';
import PageDataLoading from '@/components/page-data-loading';
export default async function StaffPage() {
  const actor = await requireActor();
  if (actor.role !== 'manager') redirect('/access-denied');
  return <AccessShell actor={actor} section="staff" title="Nhân viên & phân quyền"><Suspense fallback={<PageDataLoading/>}><StaffData self={actor.id}/></Suspense></AccessShell>;
}
async function StaffData({self}:{self:string}) {
  const client=await sessionClient();
  const {data,error}=await client.from('profiles').select('id,full_name,login_name,role,active').order('created_at');
  return error?<p role="alert" className="auth-error">Không tải được danh sách nhân viên.</p>:<StaffManager self={self} staff={(data||[]) as StaffRow[]}/>;
}
