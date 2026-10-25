import { requireActor } from '@/lib/auth/server';
import AccessShell from '@/components/access-shell';
import StaffWorkspace from '@/components/staff-workspace';
import { loadPartCatalog } from '@/features/parts/actions';
import { PartsManager } from '@/features/parts/parts-manager';
export default async function PartsPage() {
  const actor=await requireActor();
  if(actor.role!=='manager')return <StaffWorkspace actor={actor} section="parts"/>;
  const catalog=await loadPartCatalog();
  return <AccessShell actor={actor} section="parts" title="Phụ tùng & kho"><PartsManager ownerId={actor.id} initialParts={catalog.parts} terms={catalog.terms} count={catalog.count} error={catalog.error}/></AccessShell>;
}
