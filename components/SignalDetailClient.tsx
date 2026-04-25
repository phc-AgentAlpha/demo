'use client';

import Link from 'next/link';
import { useState } from 'react';
import { explorerAddressUrl } from '@/lib/chains';
import type { ExecutionEvent, PurchaseEvent, Signal, UserProfile, X402PaymentRequest } from '@/lib/types';
import { StatusChip } from './StatusChip';
import { useI18n } from './I18nProvider';
import { qualityLabelKey, statusLabelKey } from './i18n-format';

type EthereumProvider = {
  request<T = unknown>(args: { method: string; params?: unknown[] }): Promise<T>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Request failed: ${response.status}`);
  return payload;
}

async function connectWallet(messages: { noProvider: string; noAccount: string }) {
  if (!window.ethereum) throw new Error(messages.noProvider);
  const accounts = await window.ethereum.request<string[]>({ method: 'eth_requestAccounts' });
  const account = accounts[0];
  if (!account) throw new Error(messages.noAccount);
  const chainId = await window.ethereum.request<string>({ method: 'eth_chainId' });
  if (chainId !== '0x2105') {
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x2105' }] });
    } catch {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{ chainId: '0x2105', chainName: 'Base', nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: ['https://mainnet.base.org'], blockExplorerUrls: ['https://basescan.org'] }],
      });
    }
  }
  return account;
}

function storedProfile() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('userProfile') ?? window.localStorage.getItem('agentalpha_profile');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

export function SignalDetailClient({ signal }: { signal: Signal }) {
  const { t } = useI18n();
  const [walletAddress, setWalletAddress] = useState('');
  const [purchase, setPurchase] = useState<PurchaseEvent | null>(null);
  const [x402Payment, setX402Payment] = useState<X402PaymentRequest | null>(null);
  const [execution, setExecution] = useState<ExecutionEvent | null>(null);
  const [swapTxHash, setSwapTxHash] = useState('');
  const [status, setStatus] = useState<'idle' | 'awaiting_agent' | 'agent_paying' | 'confirming' | 'confirmed' | 'preparing_execution' | 'execution_ready' | 'execution_confirming' | 'execution_confirmed' | 'failed'>('idle');
  const [error, setError] = useState('');
  const [derived, setDerived] = useState<unknown>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const unlocked = purchase?.paymentStatus === 'confirmed';
  const statusKey = statusLabelKey(status);
  const executionStatusKey = statusLabelKey(execution?.verificationStatus ?? 'locked');

  async function handlePurchase() {
    setConfirmOpen(false);
    setError('');
    try {
      setStatus('agent_paying');
      const profile = storedProfile();
      const agentWalletAddress = profile?.agentWalletAddress;
      if (!agentWalletAddress) throw new Error('Agent wallet is missing. Complete onboarding first.');
      const intent = await postJson<{ purchase: PurchaseEvent; x402: X402PaymentRequest; unlocked: boolean }>('/api/payment/signal', { signalId: signal.id, agentWalletAddress });
      setPurchase(intent.purchase);
      setX402Payment(intent.x402);
      setStatus(intent.unlocked ? 'confirmed' : 'confirming');
      if (intent.unlocked) {
        void postJson('/api/tracking/post-purchase', { purchaseId: intent.purchase.id }).catch(() => undefined);
      }
    } catch (err) {
      setStatus('failed');
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function prepareExecution() {
    if (!purchase) return;
    setError('');
    try {
      setStatus('preparing_execution');
      const account = walletAddress || (await connectWallet({ noProvider: t('walletNoProvider'), noAccount: t('walletNoAccount') }));
      setWalletAddress(account);
      const prepared = await postJson<{ execution: ExecutionEvent }>('/api/execution/prepare', { purchaseId: purchase.id, signalId: signal.id, walletAddress: account });
      setExecution(prepared.execution);
      setStatus('execution_ready');
      if (prepared.execution.deeplinkUrl) window.open(prepared.execution.deeplinkUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setStatus('failed');
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function confirmExecution() {
    if (!execution) return;
    setError('');
    try {
      setStatus('execution_confirming');
      const result = await postJson<{ execution: ExecutionEvent; derivedRelation: unknown }>('/api/execution/confirm', { executionId: execution.id, swapTxHash });
      setExecution(result.execution);
      setDerived(result.derivedRelation);
      setStatus(result.execution.verificationStatus === 'confirmed' ? 'execution_confirmed' : 'execution_confirming');
    } catch (err) {
      setStatus('failed');
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="space-y-5">
      <Link href="/market" className="button-secondary px-4 py-2">← {t('detailBack')}</Link>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="card space-y-5">
        <div className="rounded-3xl bg-ink/80 p-5">
          <div className="text-sm text-slate-400">{t('detailProvider')}</div>
          <div className="mt-1 break-all font-mono text-accent">{signal.sourceWalletAddress}</div>
          <div className="mt-3 text-xs text-slate-500">{t('detailRegistered')}: {new Date(signal.registeredAt).toLocaleDateString()}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusChip label={t(qualityLabelKey(signal.qualityTier))} tone={signal.qualityTier === 'verified' ? 'success' : 'accent'} />
          {signal.nansenLabels.map((label) => <StatusChip key={label} label={label} tone="neutral" />)}
        </div>
        <h1 className="text-4xl font-black">{signal.signalPayload.pair} {signal.signalPayload.direction === 'buy' ? t('directionBuy') : t('directionSell')} {t('signalWord')}</h1>
        <p className="text-slate-300">{signal.signalPayload.entryRationale}</p>
        {signal.source === 'derived' ? (
          <div className="rounded-3xl border border-accent/30 bg-accent/10 p-4 text-sm text-accent">
            <div className="font-bold">{t('detailLineage')}</div>
            <div className="mt-1">{t('detailLineageDerived')} <span className="font-mono">{signal.rootSignalId ?? signal.parentSignalId}</span></div>
            {signal.rootSignalId ? <Link className="mt-2 inline-block underline" href={`/market/${signal.rootSignalId}`}>{t('detailOriginal')}</Link> : null}
          </div>
        ) : null}
        <h2 className="text-2xl font-black">{t('detailMetrics')}</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-ink/70 p-4"><div className="text-sm text-slate-400">{t('signalPrice')}</div><div className="text-2xl font-black">{signal.priceUsdc.toFixed(2)} USDC</div></div>
          <div className="rounded-2xl bg-ink/70 p-4"><div className="text-sm text-slate-400">{t('signalQuality')}</div><div className="text-2xl font-black">{signal.qualityScore}</div></div>
          <div className="rounded-2xl bg-ink/70 p-4"><div className="text-sm text-slate-400">{t('signalTrades')}</div><div className="text-2xl font-black">{signal.totalTrades30d}</div></div>
          <div className="rounded-2xl bg-ink/70 p-4"><div className="text-sm text-slate-400">{t('signalVolume')}</div><div className="text-2xl font-black">${Math.round(signal.totalVolumeUsd).toLocaleString()}</div></div>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border border-line bg-ink/70 p-5">
            <h2 className="text-2xl font-black">{t('detailPnlChart')}</h2>
            <div className="mt-4 flex h-32 items-end gap-2">
              {[0.35, 0.55, 0.48, 0.72, 0.66, 0.88, 0.8].map((height, index) => <div key={index} className="flex-1 rounded-t-xl bg-accent/70" style={{ height: `${height * 100}%` }} />)}
            </div>
          </div>
          <div className="rounded-3xl border border-line bg-ink/70 p-5">
            <h2 className="text-2xl font-black">{t('detailRecentTrades')}</h2>
            <div className="mt-4 space-y-2">
              {signal.recentTrades.slice(0, 5).map((trade) => <div key={trade.hash} className="flex items-center justify-between rounded-2xl bg-panel/70 p-3 text-sm"><span>{trade.pair}</span><StatusChip label={trade.direction === 'buy' ? t('directionBuy') : t('directionSell')} tone="accent" /><span className="text-slate-400">${trade.amountUsd}</span></div>)}
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-line bg-ink/70 p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-2xl font-black">{t('signalPayload')}</h2><StatusChip label={unlocked ? t('statusUnlocked') : t('statusLocked')} tone={unlocked ? 'success' : 'warning'} /></div>
          {unlocked ? (
            <dl className="grid gap-3 text-sm md:grid-cols-2">
              <div><dt className="text-slate-400">{t('signalInput')}</dt><dd className="font-bold">{signal.signalPayload.suggestedAmountUsdc} {signal.signalPayload.suggestedInputToken}</dd></div>
              <div><dt className="text-slate-400">{t('signalOutput')}</dt><dd className="font-bold">{signal.signalPayload.suggestedOutputToken}</dd></div>
              <div><dt className="text-slate-400">{t('signalStop')}</dt><dd className="font-bold">{signal.signalPayload.stopLoss ?? 'n/a'}</dd></div>
              <div><dt className="text-slate-400">{t('signalTakeProfit')}</dt><dd className="font-bold">{signal.signalPayload.takeProfit ?? 'n/a'}</dd></div>
            </dl>
          ) : (
            <p className="text-slate-400">{t('signalLockedHelp')}</p>
          )}
        </div>
      </section>

      <aside className="space-y-5">
        <section className="card space-y-3">
          {[t('detailTimelineSelected'), t('detailTimelinePayment'), t('detailTimelinePayload'), t('detailTimelineSwap'), t('detailTimelineDerived')].map((step, index) => {
            const done = index === 0 || (index <= 2 && unlocked) || (index === 3 && execution?.verificationStatus === 'confirmed') || (index === 4 && Boolean(derived));
            return <div key={step} className="flex items-center gap-3"><span className={done ? 'h-3 w-3 rounded-full bg-success' : 'h-3 w-3 rounded-full bg-slate-600'} /><span className={done ? 'text-slate-100' : 'text-slate-500'}>{step}</span></div>;
          })}
        </section>
        <section className="card space-y-4">
          <div className="flex items-center justify-between"><h2 className="text-2xl font-black">{t('signalLivePaymentTitle')}</h2><StatusChip label={statusKey ? t(statusKey) : status} tone={status.includes('confirmed') ? 'success' : status === 'failed' ? 'danger' : 'neutral'} /></div>
          <p className="text-sm text-slate-300">{t('signalLivePaymentHelp')}</p>
          <div className="rounded-2xl bg-ink/70 p-4"><div className="text-sm text-slate-400">{t('signalPrice')}</div><div className="text-3xl font-black text-white">{signal.priceUsdc.toFixed(2)} USDC</div><div className="mt-2 text-xs text-slate-500">{t('detailProtected')}</div></div>
          <button className="button w-full" disabled={status !== 'idle' && status !== 'failed'} onClick={() => setConfirmOpen(true)}>{status === 'awaiting_agent' ? t('signalConfirmWallet') : t('signalBuyButton')}</button>
          {x402Payment ? (
            <div className="space-y-2 rounded-2xl border border-accent/30 bg-accent/10 p-4 text-xs text-accent">
              <div className="font-bold">{t('signalAgentWallet')}</div>
              <code className="block break-all">{x402Payment.agentWalletAddress}</code>
              <a className="inline-block font-bold underline" target="_blank" rel="noreferrer" href={explorerAddressUrl(x402Payment.agentWalletAddress)}>
                {t('signalOpenAgentBasescan')} ↗
              </a>
              <div className="pt-2 font-bold">{t('signalX402Resource')}</div>
              <code className="block break-all">{x402Payment.resourceUrl}</code>
              <div className="text-slate-300">exact · {x402Payment.network} · {x402Payment.amountUsdc.toFixed(2)} USDC</div>
            </div>
          ) : null}
          {purchase?.paymentTxHash ? <TxProof label={t('signalPaymentTx')} hash={purchase.paymentTxHash} explorerUrl={purchase.explorerUrl} status={purchase.paymentStatus} /> : null}
        </section>

        <section className="card space-y-4">
          <div className="flex items-center justify-between"><h2 className="text-2xl font-black">{t('signalExecutionTitle')}</h2><StatusChip label={executionStatusKey ? t(executionStatusKey) : (execution?.verificationStatus ?? t('statusLocked'))} tone={execution?.verificationStatus === 'confirmed' ? 'success' : 'neutral'} /></div>
          <p className="text-sm text-slate-300">{t('signalExecutionHelp')}</p>
          {unlocked ? <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm text-accent"><div className="font-bold">{t('detailPancakeLabel')} · {t('detailSwapPlanner')}</div><div>{t('detailEstimatedAmount')}: 0.041 ETH · {t('detailManualOnly')}</div></div> : null}
          <button className="button w-full" disabled={!unlocked || status === 'preparing_execution'} onClick={prepareExecution}>{execution ? t('signalReopenExecution') : t('signalPrepareExecution')}</button>
          {execution?.deeplinkUrl ? <a className="button-secondary w-full" target="_blank" rel="noreferrer" href={execution.deeplinkUrl}>{t('signalOpenDeepLink')}</a> : null}
          <input className="input" value={swapTxHash} onChange={(event) => setSwapTxHash(event.target.value)} placeholder={t('signalSwapHashPlaceholder')} />
          <button className="button w-full" disabled={!execution || !swapTxHash || status === 'execution_confirming'} onClick={confirmExecution}>{t('signalVerifySwap')}</button>
          {execution?.swapTxHash ? <TxProof label={t('signalSwapTx')} hash={execution.swapTxHash} explorerUrl={execution.explorerUrl} status={execution.verificationStatus} /> : null}
          {derived ? <div className="rounded-2xl border border-success/30 bg-success/10 p-4 text-sm text-success">{t('signalDerivedCreated')}</div> : null}
        </section>

        {error ? <section className="card border-danger/40 text-danger"><h2 className="font-bold">{t('signalFlowError')}</h2><p className="mt-2 text-sm">{error}</p></section> : null}
      </aside>
      </div>
      {confirmOpen ? <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-5" onClick={() => setConfirmOpen(false)}><div className="mt-24 w-full max-w-sm rounded-3xl border border-line bg-panel p-6 shadow-glow" onClick={(event) => event.stopPropagation()}><h2 className="text-2xl font-black">{t('detailPurchaseConfirmTitle')}</h2><p className="mt-3 text-sm text-slate-300">{t('detailPurchaseConfirmBody')}</p><div className="mt-5 rounded-2xl bg-ink/70 p-4 text-2xl font-black">{signal.priceUsdc.toFixed(2)} USDC</div><div className="mt-5 flex gap-3"><button className="button-secondary flex-1" onClick={() => setConfirmOpen(false)}>{t('detailCancel')}</button><button className="button flex-1" onClick={handlePurchase}>{t('detailConfirm')}</button></div></div></div> : null}
    </div>
  );
}

function TxProof({ label, hash, explorerUrl, status }: { label: string; hash: string; explorerUrl?: string; status: string }) {
  const { t } = useI18n();
  const statusKey = statusLabelKey(status);
  return (
    <div className="rounded-2xl border border-line bg-ink/70 p-4 text-sm">
      <div className="flex items-center justify-between"><span className="text-slate-400">{label}</span><StatusChip label={statusKey ? t(statusKey) : status} tone={status === 'confirmed' ? 'success' : status === 'failed' ? 'danger' : 'warning'} /></div>
      <code className="mt-2 block break-all text-accent">{hash}</code>
      {explorerUrl ? <a className="mt-3 inline-block text-accent underline" target="_blank" rel="noreferrer" href={explorerUrl}>{t('signalOpenBasescan')}</a> : null}
    </div>
  );
}
