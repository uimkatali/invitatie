import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { connection } from 'next/server';
import { Fraunces, Inter } from 'next/font/google';

const display = Fraunces({ subsets: ['latin', 'latin-ext'], variable: '--font-display', display: 'swap' });
const body = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  title: 'Dateurile noastre',
  description: 'Invitatii, amintiri si idei, doar pentru noi doi.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#ffc8dd',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Randare dinamica pe fiecare request: necesar pentru nonce-ul CSP.
  await connection();
  return (
    <html lang="ro" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
