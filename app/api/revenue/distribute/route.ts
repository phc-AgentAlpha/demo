import { getSignalById } from '@/lib/indexer/mock-indexer';
import { getRuntimeConfig } from '@/lib/env';
import { jsonError, jsonOk } from '@/lib/http';
import { saveRevenueEvent } from '@/lib/ledger/store';
import { buildRevenueDistribution } from '@/lib/revenue/distribute';
import { usdcUnits, verifyBaseTx } from '@/lib/tx/verify-base-tx';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { saleEventId: string; signalId: string; priceUsdc: number; transferProofs?: Array<{ role: string; txHash: string }> };
    const signal = getSignalById(body.signalId);
    if (!signal) return jsonError('Signal not found', 404);
    const event = buildRevenueDistribution({ saleEventId: body.saleEventId, signal, priceUsdc: body.priceUsdc, rootSource: signal.rootSignalId ? 'indexed' : undefined });
    const config = getRuntimeConfig();
    const platformWallet = config.platformWalletAddress;
    for (const proof of body.transferProofs ?? []) {
      const distribution = event.distributions.find((item) => item.role === proof.role);
      if (distribution) {
        if (!platformWallet) throw new Error('PLATFORM_WALLET_ADDRESS is required to verify revenue transfer proof.');
        if (!/^0x[a-fA-F0-9]{40}$/.test(distribution.address) || /^0x0{40}$/i.test(distribution.address)) {
          throw new Error(`Cannot verify ${distribution.role} transfer proof without a real recipient address.`);
        }
        const verified = await verifyBaseTx(proof.txHash, {
          expectedFrom: platformWallet,
          expectedTokenTransfer: {
            tokenAddress: config.usdcAddress,
            from: platformWallet,
            to: distribution.address,
            minAmountUnits: usdcUnits(distribution.amountUsdc),
          },
        });
        distribution.txHash = proof.txHash;
        distribution.status = verified.status === 'pending' ? 'submitted' : verified.status;
      }
    }
    saveRevenueEvent(event);
    return jsonOk({ revenueEvent: event });
  } catch (error) {
    return jsonError(error, 400);
  }
}
