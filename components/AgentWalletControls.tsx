'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { baseWalletChainParams, explorerAddressUrl, explorerTxUrl, getPublicBaseNetworkProfile } from '@/lib/chains';
import type { UserProfile } from '@/lib/types';
import { buildAgentUsdcDepositTx, MAX_AGENT_DEPOSIT_USDC } from '@/lib/wallet/agent-wallet';
import { useI18n } from './I18nProvider';
import { StatusChip } from './StatusChip';

type EthereumProvider = {
  request<T = unknown>(args: { method: string; params?: unknown[] }): Promise<T>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

interface AgentWalletControlsProps {
  agentWalletAddress?: string;
  initialBalanceUsdc?: number;
  compact?: boolean;
  onBalanceRefresh?: (balance: AgentWalletBalancePayload) => void;
}

interface AgentWalletBalancePayload {
  usdcBalance: number;
  ethBalance: number;
  updatedAt: number;
}

function shorten(address: string, size = 6) {
  if (address.length <= size * 2) return address;
  return `${address.slice(0, size + 2)}…${address.slice(-size)}`;
}

function readStoredAgentWallet() {
  if (typeof window === 'undefined') return '';
  const raw = window.localStorage.getItem('userProfile') ?? window.localStorage.getItem('agentalpha_profile');
  if (!raw) return '';
  try {
    const profile = JSON.parse(raw) as UserProfile;
    return profile.agentWalletAddress ?? '';
  } catch {
    return '';
  }
}

async function connectBaseWallet(messages: { noProvider: string; noAccount: string }) {
  if (!window.ethereum) throw new Error(messages.noProvider);
  const accounts = await window.ethereum.request<string[]>({ method: 'eth_requestAccounts' });
  const account = accounts[0];
  if (!account) throw new Error(messages.noAccount);
  const chainParams = baseWalletChainParams(getPublicBaseNetworkProfile());
  const chainId = await window.ethereum.request<string>({ method: 'eth_chainId' });
  if (chainId !== chainParams.chainId) {
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainParams.chainId }] });
    } catch {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [chainParams],
      });
    }
  }
  return account;
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

export function AgentWalletControls({ agentWalletAddress, initialBalanceUsdc, compact = false, onBalanceRefresh }: AgentWalletControlsProps) {
  const { t } = useI18n();
  const [storedAddress, setStoredAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amountUsdc, setAmountUsdc] = useState('0.5');
  const [liveBalance, setLiveBalance] = useState<AgentWalletBalancePayload | null>(null);
  const [balanceStatus, setBalanceStatus] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const [balanceError, setBalanceError] = useState('');
  const [depositStatus, setDepositStatus] = useState<'idle' | 'pending' | 'confirmed' | 'failed'>('idle');
  const [depositTxHash, setDepositTxHash] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!agentWalletAddress) setStoredAddress(readStoredAgentWallet());
  }, [agentWalletAddress]);

  const walletAddress = agentWalletAddress ?? storedAddress;
  const publicBaseProfile = useMemo(() => getPublicBaseNetworkProfile(), []);
  const explorerUrl = useMemo(() => (walletAddress ? explorerAddressUrl(walletAddress, publicBaseProfile) : ''), [publicBaseProfile, walletAddress]);
  const displayedUsdcBalance = liveBalance?.usdcBalance ?? initialBalanceUsdc;

  const refreshBalance = useCallback(async () => {
    if (!walletAddress) return;
    setBalanceStatus('loading');
    setBalanceError('');
    try {
      const response = await fetch(`/api/agent/balance?agentWalletAddress=${encodeURIComponent(walletAddress)}`);
      const payload = (await response.json()) as { balance?: AgentWalletBalancePayload; error?: string };
      if (!response.ok || !payload.balance) throw new Error(payload.error ?? `Balance refresh failed: ${response.status}`);
      setLiveBalance(payload.balance);
      onBalanceRefresh?.(payload.balance);
      setBalanceStatus('ready');
    } catch (err) {
      setBalanceStatus('failed');
      setBalanceError(err instanceof Error ? err.message : String(err));
    }
  }, [onBalanceRefresh, walletAddress]);

  useEffect(() => {
    void refreshBalance();
  }, [refreshBalance]);

  async function handleCopy() {
    if (!walletAddress) return;
    await copyText(walletAddress);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function handleDeposit() {
    if (!walletAddress) return;
    setError('');
    setDepositStatus('pending');
    setDepositTxHash('');
    try {
      const account = await connectBaseWallet({ noProvider: t('walletNoProvider'), noAccount: t('walletNoAccount') });
      const tx = buildAgentUsdcDepositTx({ from: account, to: walletAddress, amountUsdc, maxUsdc: MAX_AGENT_DEPOSIT_USDC });
      const txHash = await window.ethereum!.request<string>({ method: 'wallet_sendTransaction', params: [tx] });
      setDepositTxHash(txHash);
      setDepositStatus('confirmed');
      window.setTimeout(() => void refreshBalance(), 4000);
    } catch (err) {
      setDepositStatus('failed');
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (!walletAddress) {
    return (
      <section className={compact ? 'rounded-3xl border border-line bg-ink/50 p-4' : 'card'}>
        <div className="flex flex-wrap gap-2"><StatusChip label={t('agentWalletMissingBadge')} tone="warning" /></div>
        <h2 className="mt-3 text-2xl font-black">{t('agentWalletTitle')}</h2>
        <p className="mt-2 text-sm text-slate-400">{t('agentWalletNoProfile')}</p>
      </section>
    );
  }

  return (
    <section className={compact ? 'rounded-3xl border border-line bg-ink/50 p-4' : 'card'}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <StatusChip label={t('agentWalletReadyBadge')} tone="success" />
            {typeof displayedUsdcBalance === 'number' ? <StatusChip label={`${displayedUsdcBalance.toFixed(2)} USDC`} tone="accent" /> : <StatusChip label={t(balanceStatus === 'loading' ? 'agentWalletBalanceLoading' : 'agentWalletBalanceUnavailable')} tone="warning" />}
            {liveBalance ? <StatusChip label={`${liveBalance.ethBalance.toFixed(5)} ETH`} tone="neutral" /> : null}
          </div>
          <h2 className="mt-3 text-2xl font-black">{t('agentWalletTitle')}</h2>
          <p className="mt-1 text-sm text-slate-400">{t('agentWalletSubtitle')}</p>
          <p className="mt-2 text-xs text-slate-500">
            {liveBalance ? `${t('agentWalletBalanceLive')} · ${new Date(liveBalance.updatedAt).toLocaleTimeString()}` : balanceStatus === 'loading' ? t('agentWalletBalanceLoading') : null}
          </p>
          {balanceError ? <p className="mt-2 text-xs text-danger">{balanceError}</p> : null}
          <code className="mt-3 block break-all rounded-2xl bg-panel/70 p-3 text-xs text-accent">{walletAddress}</code>
        </div>
        <div className="grid shrink-0 gap-2 sm:grid-cols-2 lg:min-w-72">
          <button className="button-secondary" type="button" onClick={handleCopy}>{copied ? t('agentWalletCopied') : t('agentWalletCopy')}</button>
          <a className="button-secondary text-center" href={explorerUrl} target="_blank" rel="noreferrer">{t('agentWalletOpenBasescan')}</a>
          <button className="button-secondary" type="button" disabled={balanceStatus === 'loading'} onClick={() => void refreshBalance()}>{balanceStatus === 'loading' ? t('agentWalletBalanceLoading') : t('agentWalletRefresh')}</button>
          <button className="button" type="button" onClick={() => { setDepositOpen((value) => !value); setWithdrawOpen(false); }}>{t('agentWalletDeposit')}</button>
          <button className="button-secondary" type="button" onClick={() => { setWithdrawOpen((value) => !value); setDepositOpen(false); }}>{t('agentWalletWithdraw')}</button>
        </div>
      </div>

      {depositOpen ? (
        <div className="mt-5 rounded-3xl border border-accent/30 bg-accent/10 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <label className="flex-1 text-sm font-bold text-accent">
              {t('agentWalletAmountLabel')}
              <input className="input mt-2" inputMode="decimal" value={amountUsdc} onChange={(event) => setAmountUsdc(event.target.value)} />
            </label>
            <button className="button md:min-w-44" type="button" disabled={depositStatus === 'pending'} onClick={handleDeposit}>
              {depositStatus === 'pending' ? t('agentWalletDepositPending') : t('agentWalletDepositSubmit')}
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-300">{t('agentWalletDepositHelp')} {MAX_AGENT_DEPOSIT_USDC.toFixed(2)} USDC.</p>
          {depositStatus === 'confirmed' && depositTxHash ? (
            <div className="mt-3 rounded-2xl border border-success/30 bg-success/10 p-3 text-sm text-success">
              <div className="font-bold">{t('agentWalletDepositConfirmed')}</div>
              <a className="mt-1 block break-all underline" href={explorerTxUrl(depositTxHash, publicBaseProfile)} target="_blank" rel="noreferrer">{shorten(depositTxHash, 10)}</a>
            </div>
          ) : null}
          {error ? <div className="mt-3 rounded-2xl border border-danger/40 bg-danger/10 p-3 text-sm text-danger">{error}</div> : null}
        </div>
      ) : null}

      {withdrawOpen ? (
        <div className="mt-5 rounded-3xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          <div className="font-bold">{t('agentWalletWithdraw')}</div>
          <p className="mt-2 text-slate-300">{t('agentWalletWithdrawUnavailable')}</p>
        </div>
      ) : null}
    </section>
  );
}
