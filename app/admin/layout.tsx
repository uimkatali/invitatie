import type { ReactNode } from 'react';
import AdminShell from './AdminShell';
import './admin.css';

export const metadata = {
  title: 'Panou admin',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
