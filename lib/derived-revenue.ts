import type { SignalSource } from './types';

export interface RevenueSplit {
  platform?: number;
  userOwner?: number;
  rootOwner?: number;
  derivedOwner?: number;
}

export function timeProximityScore(purchaseTs: number, tradeTs: number, windowHours = 24): number {
  const diff = Math.max(0, tradeTs - purchaseTs);
  const windowMs = windowHours * 3_600_000;
  if (diff > windowMs) return 0;
  return Number((1 - diff / windowMs).toFixed(6));
}

export function isDerivedMatch(args: {
  signalPair: string;
  tradePair: string;
  signalDirection: 'buy' | 'sell';
  tradeDirection: 'buy' | 'sell';
  purchaseTs: number;
  tradeTs: number;
  threshold?: number;
}) {
  const samePair = args.signalPair.toUpperCase() === args.tradePair.toUpperCase();
  const sameDirection = args.signalDirection === args.tradeDirection;
  const proximity = timeProximityScore(args.purchaseTs, args.tradeTs);
  const similarity = Number(((samePair ? 0.4 : 0) + (sameDirection ? 0.4 : 0) + proximity * 0.2).toFixed(6));
  const threshold = args.threshold ?? 0.5;
  return { samePair, sameDirection, proximity, similarity, derived: samePair && sameDirection && proximity > threshold };
}

export function normalizeDerivedDepth(parent: { id: string; source: SignalSource; parentSignalId?: string; rootSignalId?: string; derivedDepth: number }) {
  if (parent.source !== 'derived') {
    return { parentSignalId: parent.id, rootSignalId: parent.rootSignalId ?? parent.id, depth: 1 };
  }

  return {
    parentSignalId: parent.rootSignalId ?? parent.parentSignalId ?? parent.id,
    rootSignalId: parent.rootSignalId ?? parent.parentSignalId ?? parent.id,
    depth: 1,
  };
}

export function splitRevenue(source: SignalSource, price: number, rootSource?: Extract<SignalSource, 'indexed' | 'user'>): RevenueSplit {
  const rounded = (value: number) => Number(value.toFixed(6));
  if (source === 'indexed') return { platform: rounded(price) };
  if (source === 'user') return { userOwner: rounded(price * 0.8), platform: rounded(price * 0.2) };
  if (rootSource === 'user') {
    return { rootOwner: rounded(price * 0.5), derivedOwner: rounded(price * 0.3), platform: rounded(price * 0.2) };
  }
  return { rootOwner: 0, derivedOwner: rounded(price * 0.3), platform: rounded(price * 0.7) };
}
