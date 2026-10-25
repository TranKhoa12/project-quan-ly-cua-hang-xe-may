import AccessShell from '@/components/access-shell';
import LiveWorkspace from '@/features/garage/workspace';
import { loadGarage } from '@/features/garage/actions';
import { Suspense } from 'react';
import PageDataLoading from '@/components/page-data-loading';
import { requireActor } from '@/lib/auth/server';
import { canAccess } from '@/lib/auth/permissions';
import { redirect, notFound } from 'next/navigation';

const titles:Record<string,string>={dashboard:'Tổng quan cửa hàng',purchases:'Nhập hàng',sales:'Bán tại quầy',customers:'Khách hàng & xe',repairs:'Quản lý sửa chữa',cashbook:'Sổ thu chi',reports:'Báo cáo kinh doanh',settings:'Cài đặt cửa hàng'};
export default async function Page({params,searchParams}:{params:Promise<{slug?:string[]}>;searchParams:Promise<{page?:string;from?:string;to?:string}>}) {
  const actor = await requireActor();
  const { slug = [] } = await params;
  if (slug.length > 1) notFound();
  const section = slug[0] || 'dashboard';
  if (!canAccess(actor.role, section)) redirect('/access-denied');
  const query=await searchParams;
  const page=Math.max(0,Math.min(100000,Number.parseInt(query.page||'0',10)||0));
  return <AccessShell actor={actor} section={section} title={titles[section]||'Cửa hàng'}><Suspense fallback={<PageDataLoading/>}><Data actor={actor} section={section} page={page} from={query.from} to={query.to}/></Suspense></AccessShell>;
}
async function Data({actor,section,page,from,to}:{actor:import('@/lib/auth/permissions').Actor;section:string;page:number;from?:string;to?:string}){const result=await loadGarage(section,page,from,to);return <LiveWorkspace actor={actor} section={section} {...result}/>;}
