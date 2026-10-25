'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { DEFAULT_STORE, STORE_SETTINGS_KEY, restoreStoreSettings } from '@/lib/store-settings';
const ShopName=createContext(DEFAULT_STORE.name);
export const useShopName=()=>useContext(ShopName);
export default function ShopSettingsProvider({children}:{children:React.ReactNode}) {
  const [name,setName]=useState(DEFAULT_STORE.name);
  useEffect(()=>{
    const update=()=>{try{setName(restoreStoreSettings(localStorage.getItem(STORE_SETTINGS_KEY)).name);}catch{}};
    update();window.addEventListener('storage',update);window.addEventListener('shop-settings-updated',update);
    return()=>{window.removeEventListener('storage',update);window.removeEventListener('shop-settings-updated',update);};
  },[]);
  return <ShopName.Provider value={name}>{children}</ShopName.Provider>;
}
