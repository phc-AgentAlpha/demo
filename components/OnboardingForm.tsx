'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { explorerAddressUrl, getPublicBaseNetworkProfile } from '@/lib/chains';
import type { AssetPreference, ClassifyStyleResponse, RiskPreference, TimeHorizon, UserProfile } from '@/lib/types';
import { StatusChip } from './StatusChip';
import { useI18n } from './I18nProvider';
import { statusLabelKey } from './i18n-format';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? `Request failed: ${response.status}`);
  return payload;
}

const riskOptions = [
  ['low', 'prefLow'],
  ['medium', 'prefMedium'],
  ['high', 'prefHigh'],
] as const;
const assetOptions = [
  ['large', 'prefLarge'],
  ['defi', 'prefDefi'],
  ['all', 'prefAny'],
] as const;
const horizonOptions = [
  ['short', 'prefShort'],
  ['mid', 'prefMid'],
  ['long', 'prefLong'],
] as const;

interface AgentIssueResponse {
  agent: {
    agentId: string;
    walletAddress: string;
  };
}

export function OnboardingForm() {
  const { t } = useI18n();
  const publicBaseProfile = useMemo(() => getPublicBaseNetworkProfile(), []);
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [riskPreference, setRiskPreference] = useState<RiskPreference>('medium');
  const [assetPreference, setAssetPreference] = useState<AssetPreference>('all');
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>('mid');
  const [consent, setConsent] = useState(false);
  const [classification, setClassification] = useState<ClassifyStyleResponse | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<'idle' | 'classifying' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  async function classify() {
    setStatus('classifying');
    setError('');
    try {
      const result = await postJson<ClassifyStyleResponse>('/api/classify-style', { riskPreference, assetPreference, timeHorizon });
      setClassification(result);
      setStep(4);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function saveProfile() {
    if (!classification) return;
    setStatus('saving');
    setError('');
    try {
      const issued = await postJson<AgentIssueResponse>('/api/agent/create', { seed: classification.tradingStyle });
      const result = await postJson<{ profile: UserProfile }>('/api/profile', { riskPreference, assetPreference, timeHorizon, classification, consentToIndexing: consent, agentId: issued.agent.agentId, agentWalletAddress: issued.agent.walletAddress });
      const nextProfile = result.profile;
      window.localStorage.setItem('agentalpha_profile', JSON.stringify(nextProfile));
      window.localStorage.setItem('userProfile', JSON.stringify(nextProfile));
      setProfile(nextProfile);
      setStatus('saved');
      setTimeout(() => router.push('/dashboard'), 350);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const statusKey = statusLabelKey(status);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="card">
        <div className="flex flex-wrap gap-2">
          <StatusChip label={`${t('onboardingStep')} ${step}/4`} tone="accent" />
          <StatusChip label={statusKey ? t(statusKey) : status} tone={status === 'error' ? 'danger' : status === 'saved' ? 'success' : 'neutral'} />
        </div>
        <h1 className="mt-4 text-4xl font-black">{t('onboardingTitle')}</h1>
        <p className="mt-2 text-slate-300">{t('onboardingSubtitle')}</p>
        <div className="mt-6 h-1 w-full rounded-full bg-white/10"><div className="h-1 rounded-full bg-accent transition-all" style={{ width: `${Math.min(step, 3) * 33.333}%` }} /></div>
      </div>

      {status === 'classifying' ? (
        <section className="card flex min-h-64 flex-col items-center justify-center text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <h2 className="text-2xl font-black">{t('onboardingCallingFlock')}</h2>
        </section>
      ) : null}

      {step === 1 && status !== 'classifying' ? (
        <section className="card space-y-4">
          <h2 className="text-2xl font-black">{t('onboardingRisk')}</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {riskOptions.map(([value, key]) => <button key={value} className={riskPreference === value ? 'button' : 'button-secondary'} onClick={() => setRiskPreference(value)}>{t(key)}</button>)}
          </div>
          <button className="button" onClick={() => setStep(2)}>{t('onboardingNext')}</button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="card space-y-4">
          <h2 className="text-2xl font-black">{t('onboardingAsset')}</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {assetOptions.map(([value, key]) => <button key={value} className={assetPreference === value ? 'button' : 'button-secondary'} onClick={() => setAssetPreference(value)}>{t(key)}</button>)}
          </div>
          <div className="flex gap-3"><button className="button-secondary" onClick={() => setStep(1)}>{t('onboardingBack')}</button><button className="button" onClick={() => setStep(3)}>{t('onboardingNext')}</button></div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="card space-y-4">
          <h2 className="text-2xl font-black">{t('onboardingHorizon')}</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {horizonOptions.map(([value, key]) => <button key={value} className={timeHorizon === value ? 'button' : 'button-secondary'} onClick={() => setTimeHorizon(value)}>{t(key)}</button>)}
          </div>
          <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm text-accent">{t('onboardingAgentWalletAuto')}</div>
          <div className="flex gap-3"><button className="button-secondary" onClick={() => setStep(2)}>{t('onboardingBack')}</button><button className="button" disabled={status === 'classifying'} onClick={classify}>{status === 'classifying' ? t('onboardingCallingFlock') : t('onboardingClassify')}</button></div>
        </section>
      ) : null}

      {step === 4 && classification ? (
        <section className="card space-y-4">
          <div className="flex flex-wrap gap-2"><StatusChip label={classification.tradingStyle} tone="accent" /><StatusChip label={classification.classificationSource} tone={classification.classificationSource === 'flock' ? 'success' : 'warning'} /></div>
          <h2 className="text-2xl font-black">{t('onboardingResult')}</h2>
          <p className="text-slate-300">{classification.classificationReason}</p>
          <div className="rounded-2xl bg-ink/70 p-4 text-sm text-slate-300">{t('onboardingRecommendedFilter')}: {classification.recommendedSignalFilters.qualityTier} · {t('onboardingMax')} {classification.recommendedSignalFilters.maxPriceUsdc.toFixed(2)} USDC</div>
          <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm text-accent">{t('onboardingAgentWalletAuto')}</div>
          <label className="flex items-start gap-3 rounded-2xl border border-line p-4 text-sm text-slate-300">
            <input type="checkbox" className="mt-1" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            {t('onboardingConsent')}
          </label>
          <button className="button" disabled={!consent || status === 'saving'} onClick={saveProfile}>{status === 'saving' ? t('onboardingSaving') : t('onboardingPersist')}</button>
          {profile ? (
            <div className="rounded-2xl border border-success/30 bg-success/10 p-4 text-sm text-success">
              <div>{t('onboardingSaved')}</div>
              {profile.agentWalletAddress ? (
                <a
                  className="mt-2 inline-block font-bold underline"
                  href={explorerAddressUrl(profile.agentWalletAddress, publicBaseProfile)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('dashboardOpenAgentBasescan')} ↗
                </a>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {error ? <div className="card border-danger/40 text-danger">{error}</div> : null}
    </div>
  );
}
