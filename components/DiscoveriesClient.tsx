'use client';

import type { Signal } from '@/lib/types';
import { SignalCard } from './SignalCard';
import { StatusChip } from './StatusChip';
import { useI18n } from './I18nProvider';

export function DiscoveriesClient({ discoveries }: { discoveries: Signal[] }) {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex flex-wrap gap-2"><StatusChip label={t('discoveriesBadgeOnly')} tone="accent" /><StatusChip label={t('discoveriesBadgeSnapshot')} tone="warning" /></div>
        <h1 className="mt-4 text-4xl font-black">{t('discoveriesTitle')}</h1>
        <p className="mt-2 max-w-3xl text-slate-300">{t('discoveriesSubtitle')}</p>
      </section>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {discoveries.map((signal) => <SignalCard key={signal.id} signal={signal} />)}
      </div>
    </div>
  );
}
