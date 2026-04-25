'use client';

import type { DemoLedger } from '@/lib/ledger/store';
import { AgentWalletControls } from './AgentWalletControls';
import { StatusChip } from './StatusChip';
import { useI18n } from './I18nProvider';
import { statusLabelKey } from './i18n-format';

export function WalletClient({ ledger }: { ledger: DemoLedger }) {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <section className="card">
        <div className="flex flex-wrap gap-2"><StatusChip label={t('walletLedgerBadge')} tone="accent" /><StatusChip label={t('walletRealHashBadge')} tone="success" /></div>
        <h1 className="mt-4 text-4xl font-black">{t('walletTitle')}</h1>
        <p className="mt-2 text-slate-300">{t('walletSubtitle')}</p>
      </section>
      <AgentWalletControls />
      <section className="card">
        <h2 className="text-2xl font-black">{t('walletPurchases')}</h2>
        <LedgerTable rows={ledger.purchases.map((row) => ({ id: row.id, label: row.signalId, hash: row.paymentTxHash, status: row.paymentStatus, explorer: row.explorerUrl }))} />
      </section>
      <section className="card">
        <h2 className="text-2xl font-black">{t('walletExecutions')}</h2>
        <LedgerTable rows={ledger.executions.map((row) => ({ id: row.id, label: row.signalId, hash: row.swapTxHash, status: row.verificationStatus, explorer: row.explorerUrl }))} />
      </section>
    </div>
  );
}

function LedgerTable({ rows }: { rows: Array<{ id: string; label: string; hash?: string; status: string; explorer?: string }> }) {
  const { t } = useI18n();
  if (rows.length === 0) return <p className="mt-4 text-sm text-slate-400">{t('walletNoEntries')}</p>;
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-slate-400"><tr><th className="py-2">{t('walletTableId')}</th><th>{t('walletTableSignal')}</th><th>{t('walletTableStatus')}</th><th>{t('walletTableHash')}</th></tr></thead>
        <tbody>
          {rows.map((row) => {
            const statusKey = statusLabelKey(row.status);
            return <tr key={row.id} className="border-t border-line"><td className="py-3 font-mono text-xs">{row.id}</td><td>{row.label}</td><td>{statusKey ? t(statusKey) : row.status}</td><td className="max-w-sm break-all text-accent">{row.explorer ? <a href={row.explorer} target="_blank" rel="noreferrer">{row.hash}</a> : row.hash ?? t('statusPending')}</td></tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}
