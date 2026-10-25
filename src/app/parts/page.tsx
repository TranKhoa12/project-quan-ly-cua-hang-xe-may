import { requireActor } from '@/lib/auth/server';
import AccessShell from '@/components/access-shell';
import StaffWorkspace from '@/components/staff-workspace';
import { loadPartCatalog } from '@/features/parts/actions';
import { PartsManager } from '@/features/parts/parts-manager';
import { Suspense } from 'react';
import PageDataLoading from '@/components/page-data-loading';
export default async function PartsPage() {
  const actor=await requireActor();
  if(actor.role!=='manager')return <StaffWorkspace actor={actor} section="parts"/>;
  return <AccessShell actor={actor} section="parts" title="Phụ tùng & kho"><Suspense fallback={<PageDataLoading/>}><PartsData ownerId={actor.id}/></Suspense></AccessShell>;
}
async function PartsData({ownerId}:{ownerId:string}) {
  const catalog=await loadPartCatalog();
  return <PartsManager ownerId={ownerId} initialParts={catalog.parts} terms={catalog.terms} count={catalog.count} error={catalog.error}/>;
}
