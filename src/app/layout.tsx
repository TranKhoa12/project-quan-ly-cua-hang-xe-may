import type { Metadata } from 'next';
import './fonts.css';
import './globals.css';
import './auth.css';

export const metadata: Metadata = { title: 'MotoCare — Quản lý cửa hàng', description: 'Quản lý sửa chữa, phụ tùng và vận hành cửa hàng xe máy.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
