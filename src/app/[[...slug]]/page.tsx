import Workspace from '@/components/workspace';
import StaffWorkspace from '@/components/staff-workspace';
import { requireActor } from '@/lib/auth/server';
import { canAccess } from '@/lib/auth/permissions';
import { redirect, notFound } from 'next/navigation';

export default async function Page({params}:{params:Promise<{slug?:string[]}>}) {
  const actor = await requireActor();
  const { slug = [] } = await params;
  if (slug.length > 1) notFound();
  const section = slug[0] || 'dashboard';
  if (!canAccess(actor.role, section)) redirect('/access-denied');
  if (actor.role !== 'manager') return <StaffWorkspace actor={actor} section={section}/>;
  return <Workspace actor={actor}/>;
}
