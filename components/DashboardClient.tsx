'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { explorerAddressUrl } from '@/lib/chains';
import { mockDashboard } from '@/lib/mock-data';
import type { UserProfile } from '@/lib/types';
import { StatusChip } from './StatusChip';
import { useI18n } from './I18nProvider';
import { styleLabelKey } from './i18n-format';

interface AgentState {
  agentId: string;
  walletAddress: string;
  status: 'active' | 'idle' | 'running';
  usdcBalance: number;
}

function shorten(address: string, size = 6) {
  if (address.length <= size * 2) return address;
  return `${address.slice(0, size + 2)}…${address.slice(-size)}`;
}

export function DashboardClient() {
  const { t } = useI18n();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [agent, setAgent] = useState<AgentState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = window.localStorage.getItem('userProfile') ?? window.localStorage.getItem('agentalpha_profile');
    if (!raw) {
      setLoading(false);
      return;
    }
    const parsed = JSON.parse(raw) as UserProfile;
    setProfile(parsed);
    const existingAgent = parsed.agentId && parsed.agentWalletAddress ? { agentId: parsed.agentId, walletAddress: parsed.agentWalletAddress, status: 'active' as const, usdcBalance: mockDashboard.usdcBalance } : null;
    if (existingAgent) {
      setAgent(existingAgent);
      setLoading(false);
      return;
    }
    fetch('/api/agent/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seed: parsed.tradingStyle }) })
      .then((response) => response.json())
      .then(async (payload: { agent: AgentState }) => {
        const balanceResponse = await fetch(`/api/agent/balance?agentId=${encodeURIComponent(payload.agent.agentId)}`);
        const balancePayload = (await balanceResponse.json()) as { balance?: { usdcBalance: number } };
        const nextAgent = { ...payload.agent, usdcBalance: balancePayload.balance?.usdcBalance ?? payload.agent.usdcBalance };
        setAgent(nextAgent);
        const next = { ...parsed, agentId: payload.agent.agentId, agentWalletAddress: payload.agent.walletAddress };
        window.localStorage.setItem('userProfile', JSON.stringify(next));
        window.localStorage.setItem('agentalpha_profile', JSON.stringify(next));
      })
      .finally(() => setLoading(false));
  }, []);

  if (!loading && !profile) {
    return (
      <section className="card text-center">
        <h1 className="text-3xl font-black">{t('dashboardNoProfile')}</h1>
        <button className="button mt-5" onClick={() => router.push('/onboarding')}>{t('dashboardGoOnboarding')}</button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card bg-ink/90">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <StatusChip label={agent ? t('dashboardAgentReady') : t('dashboardIssuing')} tone={agent ? 'success' : 'warning'} />
              {profile ? <StatusChip label={t(styleLabelKey(profile.tradingStyle))} tone="accent" /> : null}
            </div>
            <h1 className="mt-4 text-4xl font-black">{t('dashboardTitle')}</h1>
            <p className="mt-2 max-w-3xl text-slate-300">{t('dashboardSubtitle')}</p>
          </div>
          {agent ? (
            <a
              className="rounded-2xl border border-line px-4 py-2 text-right transition hover:border-accent/60 hover:bg-accent/10"
              href={explorerAddressUrl(agent.walletAddress)}
              target="_blank"
              rel="noreferrer"
              aria-label={`${t('dashboardOpenAgentBasescan')}: ${agent.walletAddress}`}
            >
              <div className="text-xs text-slate-500">{t('dashboardAgentWallet')}</div>
              <div className="font-mono text-sm text-accent">{shorten(agent.walletAddress)}</div>
              <div className="mt-1 text-xs text-accent underline">{t('dashboardOpenAgentBasescan')} ↗</div>
            </a>
          ) : null}
        </div>
      </section>

      <section className="card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black">Agent #{agent?.agentId.split('_').pop() ?? '001'}</h2>
            <p className="text-sm text-slate-400">{agent?.agentId ?? 'agent_pending'}</p>
          </div>
          <div className="flex items-center gap-2"><span className="h-3 w-3 animate-pulse rounded-full bg-success" /><span className="text-sm text-success">active</span></div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric label={t('dashboardUsdcBalance')} value={`${(agent?.usdcBalance ?? mockDashboard.usdcBalance).toFixed(2)} USDC`} />
        <Metric label={t('dashboardTradingPnl')} value={`+${mockDashboard.tradingPnl}%`} tone="success" />
        <Metric label={t('dashboardPurchaseCount')} value={String(mockDashboard.purchaseCount)} />
        <Metric label={t('dashboardSignalRevenue')} value={`${(mockDashboard.signalRevenueDirect + mockDashboard.signalRevenueDerived).toFixed(2)} USDC`} tone="accent" />
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_0.65fr]">
        <div className="card">
          <h2 className="text-2xl font-black">{t('dashboardRecentTrading')}</h2>
          <div className="mt-4 space-y-3">
            {mockDashboard.recentTrades.map((trade) => (
              <div key={`${trade.asset}-${trade.date}`} className="flex items-center justify-between rounded-2xl bg-ink/60 p-4">
                <div><div className="font-bold">{trade.asset}</div><div className="text-xs text-slate-500">{trade.date}</div></div>
                <StatusChip label={trade.direction === 'buy' ? t('directionBuy') : t('directionSell')} tone="accent" />
                <div className={trade.pnl >= 0 ? 'font-bold text-success' : 'font-bold text-danger'}>{trade.pnl >= 0 ? '+' : ''}{trade.pnl}%</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card flex flex-col justify-between gap-5">
          <div>
            <h2 className="text-2xl font-black">{t('landingDemoPath')}</h2>
            <p className="mt-2 text-sm text-slate-300">{t('landingStep2')} → {t('landingStep3')}</p>
          </div>
          <div className="grid gap-3">
            <Link href="/market" className="button">{t('dashboardExploreSignals')}</Link>
            <button className="button-secondary" type="button">{t('dashboardAgentSettings')}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'success' | 'accent' }) {
  const color = tone === 'success' ? 'text-success' : tone === 'accent' ? 'text-accent' : 'text-white';
  return <div className="card"><div className="text-sm text-slate-400">{label}</div><div className={`mt-2 text-3xl font-black ${color}`}>{value}</div></div>;
}
