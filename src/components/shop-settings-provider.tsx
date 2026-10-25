'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_STORE } from '@/lib/store-settings';
import { readStoreSettings } from '@/features/garage/actions';
import { usePathname } from 'next/navigation';
const ShopName=createContext(DEFAULT_STORE.name);
export const useShopName=()=>useContext(ShopName);
export default function ShopSettingsProvider({children}:{children:React.ReactNode}) {
  const [name,setName]=useState(DEFAULT_STORE.name);
  const pathname=usePathname();
  const signedInPage=pathname!=='/login';
  useEffect(()=>{
    let alive=true;
    const update=()=>{void readStoreSettings().then(store=>{if(alive&&store)setName(store.name);}).catch(()=>{});};
    update();window.addEventListener('storage',update);window.addEventListener('shop-settings-updated',update);
    return()=>{alive=false;window.removeEventListener('storage',update);window.removeEventListener('shop-settings-updated',update);};
  },[signedInPage]);
  return <ShopName.Provider value={name}>{children}</ShopName.Provider>;
}
