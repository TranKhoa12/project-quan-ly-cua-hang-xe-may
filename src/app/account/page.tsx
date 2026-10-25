import Link from 'next/link';
import { requireActor } from '@/lib/auth/server';
import { roleLabels } from '@/lib/auth/permissions';
import { PasswordForm } from '@/components/auth-forms';
import { logoutAction } from '@/app/auth-actions';
export default async function AccountPage() {
  const actor = await requireActor();
  return <main className="account-page"><Link href="/" className="text-link">← Về cửa hàng</Link><section className="panel settings-panel spaced"><div className="panel-heading"><div><h1>Tài khoản của tôi</h1><p>{actor.fullName} · {actor.username} · {roleLabels[actor.role]}</p></div></div><PasswordForm/><form action={logoutAction} className="spaced"><button className="button danger">Đăng xuất</button></form></section></main>;
}
