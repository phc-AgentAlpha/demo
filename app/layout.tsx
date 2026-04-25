import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgentAlpha v6 Hybrid Live Demo',
  description: 'Mock indexer, live Base payment and swap proof rails.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
