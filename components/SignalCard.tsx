'use client';

import Link from 'next/link';
import { cn } from '@/lib/cn';
import { formatPercent, formatCount, relativeTime, deltaClass } from '@/lib/format';
import { useI18n } from './I18nProvider';
import type { SignalCardData } from '@/lib/signal-types';
import { Sparkline } from '@/components/ui/Sparkline';
import { Mono } from '@/components/ui/Mono';
import { Pill } from '@/components/ui/Pill';
import { QualityTierBadge, NansenLabelChip, EarlyDiscoveryBadge } from '@/components/ui/QualityBadges';

export function SignalCard({
  data,
  href,
  onBuy,
  className,
}: {
  data: SignalCardData;
  href?: string;
  onBuy?: (id: string) => void;
  className?: string;
}) {
  const { language, t } = useI18n();
  const isVerified = data.tier === 'verified';
  const isDiscovered = data.tier === 'discovered';

  return (
    <article
      className={cn(
        'group relative rounded-xl border border-hairline bg-surface shadow-card',
        'transition-all duration-200',
        'hover:border-hairline-strong hover:bg-surface-2/40',
        isDiscovered && 'before:absolute before:left-0 before:top-3 before:bottom-3 before:w-[2px] before:rounded-r before:bg-gold/60',
        className
      )}
    >
      {/* Header strip */}
      <div className="flex items-center justify-between gap-2 px-4 pt-3.5 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <QualityTierBadge tier={data.tier} language={language} />
          <Pill tone="default" className="font-mono">{data.pair}</Pill>
          <Pill tone={data.direction === 'BUY' ? 'pos' : 'neg'} className="font-mono tabular">
            {data.direction === 'BUY' ? t('directionBuy') : t('directionSell')}
          </Pill>
        </div>
        <span className="text-[0.7rem] font-mono text-fg-faint shrink-0 tabular">
          {relativeTime(data.lastTradeAt, Date.now(), language)}
        </span>
      </div>

      {/* Trader row */}
      <div className="flex items-center justify-between gap-3 px-4 pb-3">
        <Mono value={data.trader} kind="address" className="text-[0.8125rem]" />
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {isVerified && data.labels?.slice(0, 2).map((label) => (
            <NansenLabelChip key={label} label={label} />
          ))}
          {isDiscovered && data.earlyDiscoveryDays != null && (
            <EarlyDiscoveryBadge language={language} />
          )}
        </div>
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-3 hairline-x mx-4 border-t border-b border-hairline">
        <Metric label={t('signalPnl')} value={formatPercent(data.pnl30d)} tone={data.pnl30d >= 0 ? 'pos' : 'neg'} />
        <Metric
          label={t('signalQuality')}
          value={data.qualityScore.toFixed(0)}
          suffix={<span className="text-fg-faint text-[0.7rem]">/100</span>}
        />
        <Metric label={t('signalTrades')} value={formatCount(data.trades, language)} />
      </div>

      {/* Sparkline + meta */}
      <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
        <div className="text-[0.7rem] font-mono text-fg-faint tabular flex items-center gap-3">
          <span>{data.activeDays}<span className="text-fg-disabled">d</span></span>
          <span className="text-fg-disabled">·</span>
          <span>{data.assetCount} {t('signalAssets').toLowerCase()}</span>
        </div>
        <Sparkline data={data.sparkline} width={104} height={26} tone={data.pnl30d >= 0 ? 'pos' : 'neg'} />
      </div>

      {/* Footer: price + CTA */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-hairline">
        <div className="min-w-0">
          <div className="stat-label mb-0.5">{t('signalPrice')}</div>
          <div className="flex items-baseline gap-1.5">
            <span className={cn(
              'font-mono tabular text-[1.125rem] font-semibold leading-none',
              isDiscovered ? 'text-gold' : 'text-fg'
            )}>
              {data.price.toFixed(2)}
            </span>
            <span className="text-[0.7rem] font-mono text-fg-faint">USDC</span>
            {data.originalPrice && data.originalPrice > data.price ? (
              <span className="text-[0.7rem] font-mono text-fg-disabled line-through ml-1">
                {data.originalPrice.toFixed(2)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {href ? (
            <Link
              href={href}
              className="inline-flex items-center justify-center h-8 rounded-md border border-hairline-strong bg-transparent px-3 text-[0.8125rem] font-medium text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors"
            >
              {t('marketViewDetails')}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => onBuy?.(data.id)}
            disabled={data.aboveCap}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 h-8 rounded-md px-3.5 text-[0.8125rem] font-semibold transition-colors',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              isDiscovered
                ? 'bg-gold text-bg hover:bg-gold/90'
                : 'bg-cyan text-bg hover:bg-cyan/90'
            )}
            title={data.aboveCap ? t('signalAboveCap') : undefined}
          >
            {t('marketBuyShort')}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>

      {data.aboveCap ? (
        <div className="px-4 py-2 border-t border-hairline text-[0.7rem] text-fg-faint bg-surface-2/40">
          {t('signalAboveCap')}
        </div>
      ) : null}
    </article>
  );
}

function Metric({
  label, value, suffix, tone,
}: {
  label: string;
  value: string;
  suffix?: React.ReactNode;
  tone?: 'pos' | 'neg' | 'mute';
}) {
  return (
    <div className="px-3 py-2.5">
      <div className="stat-label">{label}</div>
      <div className={cn(
        'mt-0.5 font-mono tabular text-[0.95rem] font-medium leading-tight flex items-baseline gap-1',
        tone === 'pos' && 'text-pos',
        tone === 'neg' && 'text-neg',
      )}>
        <span>{value}</span>
        {suffix}
      </div>
    </div>
  );
}

/* Compact table row variant */
export function SignalRow({
  data,
  onBuy,
  href,
}: {
  data: SignalCardData;
  onBuy?: (id: string) => void;
  href?: string;
}) {
  const { language, t } = useI18n();
  const isVerified = data.tier === 'verified';

  return (
    <div
      className="grid items-center gap-3 px-4 h-14 border-t border-hairline text-small transition-colors hover:bg-surface-2/60"
      style={{ gridTemplateColumns: '180px 220px 1fr 90px 70px 70px 110px 130px' }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <QualityTierBadge tier={data.tier} language={language} size="sm" />
        <span className="font-mono text-[0.8125rem] text-fg-muted truncate">{data.pair}</span>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <Mono value={data.trader} kind="address" copyable={false} className="text-[0.8125rem]" />
        {isVerified && data.labels?.[0] ? <NansenLabelChip label={data.labels[0]} /> : null}
        {!isVerified && data.earlyDiscoveryDays != null ? <EarlyDiscoveryBadge language={language} /> : null}
      </div>
      <Sparkline data={data.sparkline} width={140} height={22} tone={data.pnl30d >= 0 ? 'pos' : 'neg'} />
      <span className={cn('font-mono tabular text-right', deltaClass(data.pnl30d))}>{formatPercent(data.pnl30d)}</span>
      <span className="font-mono tabular text-right text-fg-muted">{data.qualityScore.toFixed(0)}</span>
      <span className="font-mono tabular text-right text-fg-muted">{formatCount(data.trades, language)}</span>
      <span className="font-mono tabular text-right text-fg">
        {data.price.toFixed(2)}
        <span className="text-fg-faint text-[0.7rem] ml-1">USDC</span>
      </span>
      <div className="flex items-center justify-end gap-1.5">
        {href ? (
          <Link href={href} className="inline-flex items-center h-7 px-2 rounded text-[0.75rem] text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors">
            {t('marketViewDetails')}
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => onBuy?.(data.id)}
          disabled={data.aboveCap}
          className={cn(
            'inline-flex items-center justify-center h-7 rounded px-2.5 text-[0.75rem] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
            !isVerified ? 'bg-gold text-bg hover:bg-gold/90' : 'bg-cyan text-bg hover:bg-cyan/90'
          )}
        >
          {t('marketBuyShort')}
        </button>
      </div>
    </div>
  );
}

export function SignalRowHeader() {
  const { t } = useI18n();
  return (
    <div
      className="grid items-center gap-3 px-4 h-9 text-micro uppercase tracking-[0.08em] text-fg-faint"
      style={{ gridTemplateColumns: '180px 220px 1fr 90px 70px 70px 110px 130px' }}
    >
      <span>{t('marketStyle')} · {t('signalDemoTarget')}</span>
      <span>{t('detailProvider')}</span>
      <span>30D</span>
      <span className="text-right">PnL</span>
      <span className="text-right">{t('signalQuality')}</span>
      <span className="text-right">{t('signalTrades')}</span>
      <span className="text-right">{t('signalPrice')}</span>
      <span className="text-right" />
    </div>
  );
}
