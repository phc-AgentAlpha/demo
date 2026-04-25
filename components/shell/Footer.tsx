'use client';

import Link from 'next/link';
import { useI18n } from '@/components/I18nProvider';
import { Pill } from '@/components/ui/Pill';
import { BrandMark } from './Brand';

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-hairline bg-bg/60 mt-16 mb-14 lg:mb-0">
      <div className="mx-auto max-w-[1440px] px-4 lg:px-6 py-10">
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-8">
          <div className="col-span-2 lg:col-span-5">
            <div className="flex items-center gap-2.5 mb-3">
              <BrandMark size={22} className="text-fg" />
              <span className="text-[0.95rem] font-semibold tracking-tight text-fg">AgentAlpha</span>
              <span className="font-mono text-[0.7rem] text-fg-faint">v6</span>
            </div>
            <p className="text-small text-fg-muted max-w-md">
              {t('marketSubtitle' as any)}
            </p>
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <Pill tone="info" icon={<DotIcon />}>{t('footerBuiltOn' as any)}</Pill>
              <Pill tone="default">{t('footerPoweredBy' as any)}</Pill>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="text-micro uppercase tracking-[0.08em] text-fg-faint mb-3">{t('footerProduct' as any)}</div>
            <ul className="space-y-2">
              <FooterLink href="/market">{t('navMarket' as any)}</FooterLink>
              <FooterLink href="/discoveries">{t('navDiscoveries' as any)}</FooterLink>
              <FooterLink href="/dashboard">{t('navDashboard' as any)}</FooterLink>
              <FooterLink href="/onboarding">{t('navOnboarding' as any)}</FooterLink>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <div className="text-micro uppercase tracking-[0.08em] text-fg-faint mb-3">{t('footerResources' as any)}</div>
            <ul className="space-y-2">
              <FooterLink href="#docs">{t('footerDocs' as any)}</FooterLink>
              <FooterLink href="#github">{t('footerGithub' as any)}</FooterLink>
              <FooterLink href="#status">{t('footerStatus' as any)}</FooterLink>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <div className="text-micro uppercase tracking-[0.08em] text-fg-faint mb-3">{t('footerLegal' as any)}</div>
            <ul className="space-y-2">
              <FooterLink href="#terms">{t('footerTerms' as any)}</FooterLink>
              <FooterLink href="#privacy">{t('footerPrivacy' as any)}</FooterLink>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-hairline flex items-center justify-between text-[0.75rem] text-fg-faint">
          <div className="font-mono">© {new Date().getFullYear()} AgentAlpha · all hashes verified on-chain</div>
          <div className="hidden md:flex items-center gap-2 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-pos animate-pulse" />
            <span>indexer · live</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-small text-fg-muted hover:text-fg transition-colors">
        {children}
      </Link>
    </li>
  );
}

function DotIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" className="h-full w-full"><circle cx="12" cy="12" r="6" /></svg>;
}
