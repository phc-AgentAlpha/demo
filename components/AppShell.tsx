'use client';

import Link from 'next/link';
import { I18nProvider, useI18n } from './I18nProvider';

const nav = [
  ['navDashboard', '/dashboard'],
  ['navMarket', '/market'],
  ['navDiscoveries', '/discoveries'],
  ['navOnboarding', '/onboarding'],
  ['navWallet', '/wallet'],
  ['navEarnings', '/earnings'],
  ['navMySignals', '/my-signals'],
] as const;

function Header() {
  const { language, toggleLanguage, t } = useI18n();
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-ink/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent font-black text-ink">Aα</div>
          <div>
            <div className="font-black tracking-tight">AgentAlpha v6</div>
            <div className="text-xs text-slate-400">{t('appTagline')}</div>
          </div>
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
          <nav className="flex flex-wrap gap-2">
            {nav.map(([labelKey, href]) => (
              <Link key={href} href={href} className="rounded-full border border-white/10 px-3 py-2 hover:border-accent hover:text-accent">
                {t(labelKey)}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={toggleLanguage}
            className="rounded-full border border-accent/40 bg-accent/10 px-3 py-2 font-bold text-accent hover:bg-accent hover:text-ink"
            aria-label={t('languageLabel')}
          >
            {language.toUpperCase()} · {t('languageToggle')}
          </button>
        </div>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <Header />
      <main className="mx-auto max-w-7xl px-5 py-8">{children}</main>
    </I18nProvider>
  );
}
