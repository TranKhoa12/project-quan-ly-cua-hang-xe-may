import { requireActor } from '@/lib/auth/server';
import AccessShell from '@/components/access-shell';
import { loadPartCatalog } from '@/features/parts/actions';
import { PartsManager } from '@/features/parts/parts-manager';
import { Suspense } from 'react';
import PageDataLoading from '@/components/page-data-loading';
import { loadGarage } from '@/features/garage/actions';
import LiveWorkspace, { InventoryTools } from '@/features/garage/workspace';
export default async function PartsPage({searchParams}:{searchParams:Promise<{page?:string}>}) {
  const actor=await requireActor();
  const query=await searchParams;const page=Math.max(0,Math.min(100000,Number.parseInt(query.page||'0',10)||0));
  if(actor.role!=='manager'){const result=await loadGarage('parts');return <AccessShell actor={actor} section="parts" title="Phụ tùng & kho"><LiveWorkspace actor={actor} section="parts" {...result}/></AccessShell>;}
  return <AccessShell actor={actor} section="parts" title="Phụ tùng & kho"><Suspense fallback={<PageDataLoading/>}><PartsData ownerId={actor.id} page={page}/></Suspense></AccessShell>;
}
async function PartsData({ownerId,page}:{ownerId:string;page:number}) {
  const [catalog,inventory]=await Promise.all([loadPartCatalog(),loadGarage('parts',page)]);
  return <><PartsManager ownerId={ownerId} initialParts={catalog.parts} terms={catalog.terms} count={catalog.count} error={catalog.error}/>{inventory.data?<InventoryTools data={inventory.data}/>:<p role="alert">{inventory.error}</p>}</>;
}
