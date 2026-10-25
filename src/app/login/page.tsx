import { redirect } from 'next/navigation';
import { currentActor } from '@/lib/auth/server';
import { LoginForm } from '@/components/auth-forms';
export default async function LoginPage() {
  if (await currentActor()) redirect('/');
  return <LoginForm/>;
}
