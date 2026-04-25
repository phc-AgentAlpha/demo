'use client';

import { I18nProvider } from './I18nProvider';
import { Navbar, MobileTabBar } from './shell/Navbar';
import { Footer } from './shell/Footer';

function ShellInner({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-bg text-fg">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-[1440px] px-4 lg:px-6 pt-6 pb-20 lg:pb-12">
        {children}
      </main>
      <Footer />
      <MobileTabBar />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <ShellInner>{children}</ShellInner>
    </I18nProvider>
  );
}
