'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { useI18n } from '@/components/I18nProvider';
import { Pill, StatusDot } from '@/components/ui/Pill';
import { BrandLockup } from './Brand';

const PRIMARY_NAV = [
  { href: '/market', key: 'navMarket' },
  { href: '/discoveries', key: 'navDiscoveries' },
  { href: '/dashboard', key: 'navDashboard' },
  { href: '/wallet', key: 'navWallet' },
  { href: '/earnings', key: 'navEarnings' },
  { href: '/my-signals', key: 'navMySignals' },
] as const;

export function Navbar() {
  const { language, setLanguage, t } = useI18n();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-hairline backdrop-blur bg-bg/80 supports-[backdrop-filter]:bg-bg/60">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-4 lg:px-6">
        <Link href="/" className="shrink-0">
          <BrandLockup />
        </Link>

        {/* Primary nav — desktop */}
        <nav className="hidden lg:flex items-center gap-0.5 ml-4 desktop-only">
          {PRIMARY_NAV.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'inline-flex items-center h-8 px-3 rounded-md text-small font-medium transition-colors',
                  active
                    ? 'text-fg bg-surface-2 border border-hairline-strong'
                    : 'text-fg-muted hover:text-fg hover:bg-surface-2/60 border border-transparent'
                )}
              >
                {t(item.key as any)}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {/* Search */}
          <button
            type="button"
            className="hidden md:inline-flex items-center gap-2 h-9 w-56 rounded-md border border-hairline-strong bg-surface-2 px-3 text-small text-fg-faint hover:text-fg-muted transition-colors"
          >
            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <span className="flex-1 text-left truncate">{t('navSearch' as any)}</span>
            <span className="kbd">⌘K</span>
          </button>

          {/* Network indicator */}
          <Pill tone="info" className="hidden sm:inline-flex" icon={<DotIcon />}>
            {t('navNetworkBase' as any)}
          </Pill>

          {/* Language toggle */}
          <div className="hidden sm:inline-flex items-center rounded-md border border-hairline-strong bg-surface-2 p-0.5 text-[0.75rem] font-medium">
            {(['en', 'ko'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={cn(
                  'inline-flex items-center justify-center h-7 w-8 rounded transition-colors',
                  language === lang ? 'bg-surface-3 text-fg' : 'text-fg-faint hover:text-fg'
                )}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

/* Mobile bottom tab bar */
const MOBILE_TABS = [
  { href: '/market', key: 'navMarket', icon: <IcMarket /> },
  { href: '/discoveries', key: 'navDiscoveries', icon: <IcRadar /> },
  { href: '/dashboard', key: 'navDashboard', icon: <IcDashboard /> },
  { href: '/wallet', key: 'navWallet', icon: <IcWallet /> },
  { href: '/my-signals', key: 'navMySignals', icon: <IcUser /> },
] as const;

export function MobileTabBar() {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-hairline bg-bg/95 backdrop-blur">
      <ul className="grid grid-cols-5 h-14 px-1">
        {MOBILE_TABS.map((tab) => {
          const active = pathname === tab.href || pathname?.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 h-full text-[0.625rem] uppercase tracking-wider transition-colors',
                  active ? 'text-cyan' : 'text-fg-faint hover:text-fg-muted'
                )}
              >
                <span className="h-4 w-4">{tab.icon}</span>
                <span className="truncate max-w-[60px]">{t(tab.key as any)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function DotIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full"><circle cx="12" cy="12" r="6" /></svg>;
}

function IcMarket() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full"><path d="M3 3v18h18"/><path d="M7 16l4-6 4 4 5-7"/></svg>;
}
function IcRadar() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><path d="M12 12L20 7"/></svg>;
}
function IcDashboard() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/></svg>;
}
function IcWallet() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full"><rect x="2" y="6" width="20" height="14" rx="2"/><path d="M22 12h-4a2 2 0 1 0 0 4h4"/></svg>;
}
function IcUser() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
}
