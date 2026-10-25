import Link from 'next/link';
import { requireActor } from '@/lib/auth/server';
export default async function AccessDenied() {
  await requireActor();
  return <main className="account-page"><section className="panel settings-panel"><div className="panel-heading"><div><h1>Không có quyền truy cập</h1><p>Tài khoản của bạn không được phép mở chức năng này.</p></div></div><Link href="/" className="button primary">Về công việc của tôi</Link></section></main>;
}
