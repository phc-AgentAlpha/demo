import { getDemoCaps, numberEnv } from '../env';
import { coerceAgentBudget } from '../profile-migration';
import type { AgentBudget, ClassifyStyleRequest, ClassifyStyleResponse, UserProfile } from '../types';

export function normalizeAgentBudget(input: { agentBudget?: Partial<AgentBudget>; classification?: ClassifyStyleResponse }): AgentBudget {
  const caps = getDemoCaps();
  const dailyCap = numberEnv('DEMO_MAX_DAILY_AGENT_BUDGET_USDC', 5);
  if (!Number.isFinite(dailyCap) || dailyCap <= 0 || dailyCap > 25) {
    throw new Error('DEMO_MAX_DAILY_AGENT_BUDGET_USDC must be > 0 and <= 25 for demo safety');
  }
  return coerceAgentBudget({
    agentBudget: input.agentBudget,
    recommendedMaxPriceUsdc: input.classification?.recommendedSignalFilters.maxPriceUsdc,
    caps,
    dailyCap,
  }, { enforce: true });
}

export function buildUserProfile(input: ClassifyStyleRequest & { consentToIndexing: boolean; classification: ClassifyStyleResponse }): UserProfile {
  if (!input.consentToIndexing) {
    throw new Error('Consent is required before registering user or derived signals.');
  }
  const walletAddress = input.walletAddress?.trim() || 'wallet_not_connected';
  const agentBudget = normalizeAgentBudget({ agentBudget: input.agentBudget, classification: input.classification });
  return {
    walletAddress,
    riskPreference: input.riskPreference,
    assetPreference: input.assetPreference,
    timeHorizon: input.timeHorizon,
    tradingStyle: input.classification.tradingStyle,
    classificationSource: input.classification.classificationSource,
    classificationReason: input.classification.classificationReason,
    recommendedSignalFilters: {
      ...input.classification.recommendedSignalFilters,
      maxPriceUsdc: Math.min(input.classification.recommendedSignalFilters.maxPriceUsdc, agentBudget.maxSignalPriceUsdc),
    },
    agentBudget,
    consentToIndexing: true,
    consentTimestamp: Date.now(),
    createdAt: Date.now(),
  };
}
