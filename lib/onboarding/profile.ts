import type { ClassifyStyleRequest, ClassifyStyleResponse, UserProfile } from '../types';

export function buildUserProfile(input: ClassifyStyleRequest & { consentToIndexing: boolean; classification: ClassifyStyleResponse }): UserProfile {
  if (!input.consentToIndexing) {
    throw new Error('Consent is required before registering user or derived signals.');
  }
  const walletAddress = input.walletAddress?.trim() || 'wallet_not_connected';
  return {
    walletAddress,
    riskPreference: input.riskPreference,
    assetPreference: input.assetPreference,
    timeHorizon: input.timeHorizon,
    tradingStyle: input.classification.tradingStyle,
    classificationSource: input.classification.classificationSource,
    classificationReason: input.classification.classificationReason,
    recommendedSignalFilters: input.classification.recommendedSignalFilters,
    consentToIndexing: true,
    consentTimestamp: Date.now(),
    createdAt: Date.now(),
  };
}
