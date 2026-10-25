'use client';
import Link, { useLinkStatus } from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Activity, Bike, Boxes, ChevronDown, LayoutDashboard, Menu, Settings, ShieldCheck, ShoppingBag, Truck, Users, Wallet, Wrench, X } from 'lucide-react';
import { canAccess, type Actor } from '@/lib/auth/permissions';
import { useShopName } from './shop-settings-provider';

const groups=[
  {label:'KHÔNG GIAN LÀM VIỆC',items:[{id:'dashboard',name:'Tổng quan',icon:LayoutDashboard},{id:'repairs',name:'Sửa chữa',icon:Wrench},{id:'sales',name:'Bán tại quầy',icon:ShoppingBag}]},
  {label:'QUẢN LÝ CỬA HÀNG',items:[{id:'parts',name:'Phụ tùng & kho',icon:Boxes},{id:'purchases',name:'Nhập hàng',icon:Truck},{id:'customers',name:'Khách hàng & xe',icon:Users},{id:'cashbook',name:'Sổ thu chi',icon:Wallet},{id:'reports',name:'Báo cáo',icon:Activity}]},
  {label:'HỆ THỐNG',items:[{id:'staff',name:'Nhân viên',icon:ShieldCheck},{id:'settings',name:'Cài đặt',icon:Settings}]},
];
export default function ShopSidebar({actor,storeName,repairCount,lowCount=0}:{actor:Actor;storeName?:string;repairCount?:number;lowCount?:number}) {
  const path=usePathname();const section=path.split('/')[1]||'dashboard';const router=useRouter();
  const [open,setOpen]=useState(false);const savedName=useShopName();
  useEffect(()=>setOpen(false),[path]);
  useEffect(()=>{const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[]);
  const name=storeName||savedName;
  return <><button type="button" className="icon-button shared-mobile-toggle" aria-label="Mở menu" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X size={21}/>:<Menu size={21}/>}</button>{open&&<div className="sidebar-scrim" onClick={()=>setOpen(false)}/>}<aside className={`sidebar ${open?'open':''}`}><Link href="/" className="brand"><span className="brand-icon"><Wrench size={25} strokeWidth={2.5}/></span><span>Moto<span className="brand-accent">Care</span><small>QUẢN LÝ CỬA HÀNG XE MÁY</small></span></Link><div className="store-switch"><span className="store-avatar"><Bike size={20}/></span><div><strong title={name}>{name}</strong><small>Chi nhánh chính</small></div><ChevronDown size={14}/></div><nav aria-label="Điều hướng cửa hàng">{groups.map(group=>{const items=group.items.filter(item=>canAccess(actor.role,item.id));return items.length?<div className="nav-group" key={group.label}><p>{group.label}</p>{items.map(item=>{const href=item.id==='dashboard'?'/':`/${item.id}`;return <Link href={href} key={item.id} prefetch={false} onMouseEnter={()=>router.prefetch(href)} onFocus={()=>router.prefetch(href)} aria-current={section===item.id?'page':undefined} className={`nav-item ${section===item.id?'active':''}`}><item.icon size={19}/><span>{item.name}</span>{item.id==='repairs'&&repairCount!==undefined&&<span className="nav-count">{repairCount}</span>}{item.id==='parts'&&lowCount>0&&<span className="nav-dot"/>}<PendingMark/></Link>;})}</div>:null;})}</nav><div className="sidebar-bottom"><div className="sidebar-foot"><span className="online-dot"/>Không gian làm việc<span>v0.1</span></div></div></aside></>;
}
function PendingMark(){const {pending}=useLinkStatus();return pending?<span className="nav-pending" role="status" aria-label="Đang mở trang"/>:null;}
