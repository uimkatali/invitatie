import type { ReactNode } from 'react';
import { JetBrains_Mono } from 'next/font/google';
import AdminShell from './AdminShell';
import './admin.css';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
});

export const metadata = {
  title: 'Panou admin',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className={jetbrainsMono.variable}>
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
