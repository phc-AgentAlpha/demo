import type { ChainStatus, QualityTier, QualityTierFilter, TradingStyle } from '@/lib/types';
import type { TranslationKey } from '@/lib/i18n';

export function qualityLabelKey(value: QualityTier | QualityTierFilter): TranslationKey {
  if (value === 'verified') return 'qualityVerified';
  if (value === 'discovered') return 'qualityDiscovered';
  return 'qualityAll';
}

export function styleLabelKey(value: TradingStyle | 'all'): TranslationKey {
  if (value === 'aggressive') return 'styleAggressive';
  if (value === 'neutral') return 'styleNeutral';
  if (value === 'conservative') return 'styleConservative';
  return 'styleAll';
}

export function statusLabelKey(value: ChainStatus | string): TranslationKey | null {
  const map: Record<string, TranslationKey> = {
    idle: 'statusIdle',
    classifying: 'statusClassifying',
    saving: 'statusSaving',
    saved: 'statusSaved',
    error: 'statusError',
    locked: 'statusLocked',
    unlocked: 'statusUnlocked',
    confirmed: 'statusConfirmed',
    pending: 'statusPending',
    failed: 'statusFailed',
    awaiting_wallet: 'statusAwaitingWallet',
    connecting: 'statusConnecting',
    submitted: 'statusSubmitted',
    confirming: 'statusConfirming',
    preparing_execution: 'statusPreparingExecution',
    execution_ready: 'statusExecutionReady',
    execution_confirming: 'statusExecutionConfirming',
    execution_confirmed: 'statusExecutionConfirmed',
    calculated: 'statusCalculated',
  };
  return map[value] ?? null;
}
