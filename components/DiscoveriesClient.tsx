'use client';

import { useMemo } from 'react';
import type { Signal } from '@/lib/types';
import { signalToCardData } from '@/lib/signal-adapter';
import { SignalCard } from './SignalCard';
import { Pill } from '@/components/ui/Pill';
import { useI18n } from './I18nProvider';

export function DiscoveriesClient({ discoveries }: { discoveries: Signal[] }) {
  const { t } = useI18n();
  const cards = useMemo(() => discoveries.map(signalToCardData), [discoveries]);

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Pill tone="gold">{t('discoveriesBadgeOnly')}</Pill>
          <Pill tone="default">{t('discoveriesBadgeSnapshot')}</Pill>
        </div>
        <h1 className="text-display-md text-fg">{t('discoveriesTitle')}</h1>
        <p className="mt-2 max-w-3xl text-body text-fg-muted">{t('discoveriesSubtitle')}</p>
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <SignalCard key={card.id} data={card} href={`/market/${card.id}`} />
        ))}
      </div>
    </div>
  );
}
