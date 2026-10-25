import type { Metadata } from 'next';
import ShopSettingsProvider from '@/components/shop-settings-provider';
import './fonts.css';
import './globals.css';
import './auth.css';
import './catalog.css';
import './sidebar.css';
import './garage.css';

export const metadata: Metadata = { title: 'MotoCare — Quản lý cửa hàng', description: 'Quản lý sửa chữa, phụ tùng và vận hành cửa hàng xe máy.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body><ShopSettingsProvider>{children}</ShopSettingsProvider></body></html>;
}
