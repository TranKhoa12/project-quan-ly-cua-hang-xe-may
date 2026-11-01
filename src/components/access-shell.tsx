import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { roleLabels, type Actor } from '@/lib/auth/permissions';
import { logoutAction } from '@/app/auth-actions';
import ShopSidebar from './shop-sidebar';

export default function AccessShell({actor,section,title,children}:{actor:Actor;section:string;title:string;children:React.ReactNode}) {
  return <div className="app-shell compact-shell"><ShopSidebar actor={actor}/><div className="main-shell"><header className="topbar"><h1>{title}</h1><div className="topbar-actions"><Link href="/account" className="profile"><span className="avatar">{actor.fullName.split(' ').map(n=>n[0]).slice(-2).join('')}</span><span><strong>{actor.fullName}</strong><small>{roleLabels[actor.role]}</small></span></Link><form action={logoutAction}><button className="icon-button" aria-label="Đăng xuất"><LogOut size={19}/></button></form></div></header><main>{children}</main></div></div>;
}
