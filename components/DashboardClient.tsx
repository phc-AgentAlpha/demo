'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { explorerAddressUrl, getPublicBaseNetworkProfile } from '@/lib/chains';
import { mockDashboard } from '@/lib/mock-data';
import { migrateUserProfile } from '@/lib/profile-migration';
import type { AgentRunEvent, AgentRunState, UserProfile } from '@/lib/types';
import { AgentWalletControls } from './AgentWalletControls';
import { StatusChip } from './StatusChip';
import { useI18n } from './I18nProvider';
import { statusLabelKey, styleLabelKey } from './i18n-format';

interface AgentState {
  agentId: string;
  walletAddress: string;
  status: 'active' | 'idle' | 'running';
  usdcBalance: number;
  ethBalance?: number;
  balanceUpdatedAt?: number;
}

interface AgentBalancePayload {
  usdcBalance: number;
  ethBalance: number;
  updatedAt: number;
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Request failed: ${response.status}`);
  return payload;
}

function shorten(address: string, size = 6) {
  if (address.length <= size * 2) return address;
  return `${address.slice(0, size + 2)}…${address.slice(-size)}`;
}

function formatTime(value?: number) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function eventTone(event: AgentRunEvent): 'neutral' | 'success' | 'warning' | 'danger' {
  if (event.severity === 'success') return 'success';
  if (event.severity === 'warning') return 'warning';
  if (event.severity === 'error') return 'danger';
  return 'neutral';
}

export function DashboardClient() {
  const { t } = useI18n();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [agent, setAgent] = useState<AgentState | null>(null);
  const [run, setRun] = useState<AgentRunState | null>(null);
  const [loading, setLoading] = useState(true);
  const [runBusy, setRunBusy] = useState(false);
  const [runError, setRunError] = useState('');
  const publicBaseProfile = useMemo(() => getPublicBaseNetworkProfile(), []);

  const refreshRun = useCallback(async (walletAddress?: string) => {
    const address = walletAddress ?? agent?.walletAddress;
    if (!address) return;
    const payload = await jsonRequest<{ run: AgentRunState | null }>(`/api/agent/run/status?agentWalletAddress=${encodeURIComponent(address)}`);
    setRun(payload.run);
  }, [agent?.walletAddress]);

  const refreshAgentBalance = useCallback(async (walletAddress: string, agentId?: string) => {
    const params = new URLSearchParams({ agentWalletAddress: walletAddress });
    if (agentId) params.set('agentId', agentId);
    const payload = await jsonRequest<{ balance: AgentBalancePayload }>(`/api/agent/balance?${params.toString()}`);
    setAgent((current) => {
      if (!current || current.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) return current;
      return {
        ...current,
        usdcBalance: payload.balance.usdcBalance,
        ethBalance: payload.balance.ethBalance,
        balanceUpdatedAt: payload.balance.updatedAt,
      };
    });
    return payload.balance;
  }, []);

  const handleAgentBalanceRefresh = useCallback((balance: AgentBalancePayload) => {
    setAgent((current) => current ? {
      ...current,
      usdcBalance: balance.usdcBalance,
      ethBalance: balance.ethBalance,
      balanceUpdatedAt: balance.updatedAt,
    } : current);
  }, []);

  useEffect(() => {
    const raw = window.localStorage.getItem('userProfile') ?? window.localStorage.getItem('agentalpha_profile');
    if (!raw) {
      setLoading(false);
      return;
    }
    const parsed = migrateUserProfile(JSON.parse(raw) as UserProfile);
    window.localStorage.setItem('userProfile', JSON.stringify(parsed));
    window.localStorage.setItem('agentalpha_profile', JSON.stringify(parsed));
    setProfile(parsed);
    const existingAgent = parsed.agentId && parsed.agentWalletAddress ? { agentId: parsed.agentId, walletAddress: parsed.agentWalletAddress, status: 'active' as const, usdcBalance: 0 } : null;
    if (existingAgent) {
      setAgent(existingAgent);
      void refreshRun(existingAgent.walletAddress).catch(() => undefined);
      void refreshAgentBalance(existingAgent.walletAddress, existingAgent.agentId).catch(() => undefined);
      setLoading(false);
      return;
    }
    fetch('/api/agent/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seed: parsed.tradingStyle }) })
      .then((response) => response.json())
      .then(async (payload: { agent: AgentState }) => {
        const nextAgent = { ...payload.agent, usdcBalance: 0 };
        setAgent(nextAgent);
        const next = { ...parsed, agentId: payload.agent.agentId, agentWalletAddress: payload.agent.walletAddress };
        window.localStorage.setItem('userProfile', JSON.stringify(next));
        window.localStorage.setItem('agentalpha_profile', JSON.stringify(next));
        void refreshRun(payload.agent.walletAddress).catch(() => undefined);
        void refreshAgentBalance(payload.agent.walletAddress, payload.agent.agentId).catch(() => undefined);
      })
      .finally(() => setLoading(false));
  }, [refreshAgentBalance, refreshRun]);

  useEffect(() => {
    if (!agent?.walletAddress) return;
    const interval = window.setInterval(() => {
      void refreshRun(agent.walletAddress).catch(() => undefined);
    }, run?.status === 'running' ? 5_000 : 15_000);
    return () => window.clearInterval(interval);
  }, [agent?.walletAddress, refreshRun, run?.status]);

  async function startRun() {
    if (!agent?.walletAddress) return;
    setRunBusy(true);
    setRunError('');
    try {
      const payload = await jsonRequest<{ run: AgentRunState }>('/api/agent/run/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentWalletAddress: agent.walletAddress }),
      });
      setRun(payload.run);
    } catch (error) {
      setRunError(error instanceof Error ? error.message : String(error));
    } finally {
      setRunBusy(false);
    }
  }

  async function stopRun() {
    if (!agent?.walletAddress) return;
    setRunBusy(true);
    setRunError('');
    try {
      const payload = await jsonRequest<{ run: AgentRunState }>('/api/agent/run/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentWalletAddress: agent.walletAddress }),
      });
      setRun(payload.run);
    } catch (error) {
      setRunError(error instanceof Error ? error.message : String(error));
    } finally {
      setRunBusy(false);
    }
  }

  if (!loading && !profile) {
    return (
      <section className="card text-center">
        <h1 className="text-3xl font-black">{t('dashboardNoProfile')}</h1>
        <button className="button mt-5" onClick={() => router.push('/onboarding')}>{t('dashboardGoOnboarding')}</button>
      </section>
    );
  }

  const runStatusKey = statusLabelKey(run?.status ?? 'idle');
  const isRunning = run?.status === 'running';
  const canStop = run?.status === 'running' || run?.status === 'blocked';

  return (
    <div className="space-y-6">
      <section className="card bg-ink/90">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <StatusChip label={agent ? t('dashboardAgentReady') : t('dashboardIssuing')} tone={agent ? 'success' : 'warning'} />
              {profile ? <StatusChip label={t(styleLabelKey(profile.tradingStyle))} tone="accent" /> : null}
              {run ? <StatusChip label={runStatusKey ? t(runStatusKey) : run.status} tone={isRunning ? 'success' : run.status === 'blocked' || run.status === 'failed' ? 'danger' : 'neutral'} /> : null}
            </div>
            <h1 className="mt-4 text-4xl font-black">{t('dashboardTitle')}</h1>
            <p className="mt-2 max-w-3xl text-slate-300">{t('dashboardSubtitle')}</p>
          </div>
          {agent ? (
            <a
              className="rounded-2xl border border-line px-4 py-2 text-right transition hover:border-accent/60 hover:bg-accent/10"
              href={explorerAddressUrl(agent.walletAddress, publicBaseProfile)}
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
          <div className="flex items-center gap-2"><span className={isRunning ? 'h-3 w-3 animate-pulse rounded-full bg-success' : 'h-3 w-3 rounded-full bg-slate-600'} /><span className={isRunning ? 'text-sm text-success' : 'text-sm text-slate-400'}>{run?.status ?? 'idle'}</span></div>
        </div>
        {agent ? <div className="mt-5"><AgentWalletControls agentWalletAddress={agent.walletAddress} initialBalanceUsdc={agent.usdcBalance} onBalanceRefresh={handleAgentBalanceRefresh} compact /></div> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <Metric label={t('dashboardUsdcBalance')} value={`${(agent?.usdcBalance ?? 0).toFixed(2)} USDC`} />
        <Metric label={t('dashboardTradingPnl')} value={`+${mockDashboard.tradingPnl}%`} tone="success" />
        <Metric label={t('dashboardPurchaseCount')} value={String(mockDashboard.purchaseCount)} />
        <Metric label={t('dashboardSignalRevenue')} value={`${(mockDashboard.signalRevenueDirect + mockDashboard.signalRevenueDerived).toFixed(2)} USDC`} tone="accent" />
      </section>

      {profile ? (
        <section className="grid gap-5 lg:grid-cols-[0.7fr_1fr]">
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black">{t('dashboardBudgetTitle')}</h2>
                <p className="mt-1 text-sm text-slate-400">{t('dashboardBudgetSubtitle')}</p>
              </div>
              <StatusChip label={t(styleLabelKey(profile.tradingStyle))} tone="accent" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MiniStat label={t('dashboardBudgetSignal')} value={`${profile.agentBudget.maxSignalPriceUsdc.toFixed(2)} USDC`} />
              <MiniStat label={t('dashboardBudgetDaily')} value={`${profile.agentBudget.dailyMaxUsdc.toFixed(2)} USDC`} />
            </div>
            <Link href="/market" className="button-secondary w-full text-center">{t('dashboardExploreSignals')}</Link>
          </div>

          <div className="card space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-black">{t('dashboardRunTitle')}</h2>
                <p className="mt-1 text-sm text-slate-300">{t('dashboardRunSubtitle')}</p>
              </div>
              <StatusChip label={runStatusKey ? t(runStatusKey) : (run?.status ?? t('statusIdle'))} tone={isRunning ? 'success' : run?.status === 'blocked' || run?.status === 'failed' ? 'danger' : 'neutral'} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <MiniStat label={t('dashboardRunCycle')} value={String(run?.cycleCount ?? 0)} />
              <MiniStat label={t('dashboardNextScan')} value={formatTime(run?.nextScanAt)} />
              <MiniStat label={t('dashboardRunInterval')} value={`${Math.round((run?.scanIntervalMs ?? 300_000) / 1000)}s`} />
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="button" type="button" disabled={!agent || runBusy || isRunning} onClick={startRun}>{runBusy && !isRunning ? t('dashboardRunBusy') : t('dashboardAgentRun')}</button>
              <button className="button-secondary" type="button" disabled={!agent || runBusy || !canStop} onClick={stopRun}>{t('dashboardAgentStop')}</button>
              {run?.currentSignalId ? <Link className="button-secondary" href={`/market/${run.currentSignalId}`}>{t('dashboardRunOpenSignal')}</Link> : null}
            </div>
            {runError || run?.lastError ? <div className="rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">{runError || run?.lastError}</div> : null}
            <div>
              <h3 className="font-bold">{t('dashboardRunLogs')}</h3>
              <div className="mt-3 max-h-96 space-y-3 overflow-auto pr-1">
                {run?.events.length ? run.events.map((event) => <RunEventRow key={event.id} event={event} />) : <div className="rounded-2xl bg-ink/70 p-4 text-sm text-slate-400">{t('dashboardRunNoLogs')}</div>}
              </div>
            </div>
          </div>
        </section>
      ) : null}

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
            <button className="button-secondary" type="button" onClick={() => void refreshRun(agent?.walletAddress)}>{t('dashboardAgentSettings')}</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function RunEventRow({ event }: { event: AgentRunEvent }) {
  return (
    <div className="rounded-2xl border border-line bg-ink/70 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusChip label={event.type.replace(/_/g, ' ')} tone={eventTone(event)} />
        <span className="text-xs text-slate-500">{formatTime(event.timestamp)}</span>
      </div>
      <p className="mt-2 text-slate-200">{event.message}</p>
      {event.txHash ? <code className="mt-2 block break-all text-accent">{event.txHash}</code> : null}
      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        {event.href ? <Link className="text-accent underline" href={event.href}>signal ↗</Link> : null}
        {event.explorerUrl ? <a className="text-accent underline" href={event.explorerUrl} target="_blank" rel="noreferrer">Basescan ↗</a> : null}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-ink/70 p-4"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 font-bold text-white">{value}</div></div>;
}

function Metric({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'success' | 'accent' }) {
  const color = tone === 'success' ? 'text-pos' : tone === 'accent' ? 'text-cyan' : 'text-fg';
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className={`mt-2 font-mono tabular text-h1 font-semibold leading-tight ${color}`}>{value}</div>
    </div>
  );
}
