import { getRuntimeConfig } from '../env';
import { splitRevenue } from '../derived-revenue';
import type { RevenueDistributionEvent, Signal, SignalSource } from '../types';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function buildRevenueDistribution(args: {
  saleEventId: string;
  signal: Signal;
  priceUsdc: number;
  rootSource?: Extract<SignalSource, 'indexed' | 'user'>;
  rootOwnerAddress?: string;
  derivedOwnerAddress?: string;
  userOwnerAddress?: string;
}): RevenueDistributionEvent {
  const platformAddress = getRuntimeConfig().platformWalletAddress ?? ZERO_ADDRESS;
  const split = splitRevenue(args.signal.source, args.priceUsdc, args.rootSource);
  const distributions: RevenueDistributionEvent['distributions'] = [];
  const platform = split.platform ?? 0;
  const userOwner = split.userOwner ?? 0;
  const rootOwner = split.rootOwner ?? 0;
  const derivedOwner = split.derivedOwner ?? 0;

  if (platform > 0) {
    distributions.push({ role: 'platform', address: platformAddress, amountUsdc: platform, status: 'calculated', reason: 'Platform fee / indexed root share' });
  }
  if (userOwner > 0) {
    distributions.push({ role: 'userOwner', address: args.userOwnerAddress ?? args.signal.ownerAddress ?? ZERO_ADDRESS, amountUsdc: userOwner, status: 'calculated', reason: 'User signal owner share' });
  }
  if (rootOwner > 0) {
    distributions.push({ role: 'rootOwner', address: args.rootOwnerAddress ?? ZERO_ADDRESS, amountUsdc: rootOwner, status: 'calculated', reason: 'Root signal owner share' });
  }
  if (derivedOwner > 0) {
    distributions.push({ role: 'derivedOwner', address: args.derivedOwnerAddress ?? args.signal.ownerAddress ?? ZERO_ADDRESS, amountUsdc: derivedOwner, status: 'calculated', reason: 'Derived signal owner share' });
  }

  return {
    id: `rev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    saleEventId: args.saleEventId,
    signalId: args.signal.id,
    source: args.signal.source,
    distributions,
    createdAt: Date.now(),
  };
}
