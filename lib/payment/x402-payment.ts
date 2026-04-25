import { BASE_CHAIN_ID_HEX, BASE_TOKENS, explorerTxUrl } from '../chains';
import { getRuntimeConfig } from '../env';
import { usdcUnits, verifyBaseTx } from '../tx/verify-base-tx';
import type { PurchaseEvent, TransferRequest } from '../types';

export interface CreatePaymentInput {
  signalId: string;
  buyerAddress: string;
  priceUsdc: number;
}

export interface PaymentIntent extends PurchaseEvent {
  transferRequest: TransferRequest;
  warning?: string;
}

export function assertWalletAddress(address: string): asserts address is `0x${string}` {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error('A valid wallet address is required.');
}

function encodeErc20Transfer(to: `0x${string}`, amount: bigint): `0x${string}` {
  const selector = 'a9059cbb';
  const addressPart = to.toLowerCase().replace(/^0x/, '').padStart(64, '0');
  const amountPart = amount.toString(16).padStart(64, '0');
  return `0x${selector}${addressPart}${amountPart}`;
}

export function buildUsdcTransferRequest(args: { buyerAddress: string; amountUsdc: number; receiverAddress?: `0x${string}` }): TransferRequest {
  assertWalletAddress(args.buyerAddress);
  const config = getRuntimeConfig();
  const receiverAddress = args.receiverAddress ?? config.platformWalletAddress;
  if (!receiverAddress) throw new Error('PLATFORM_WALLET_ADDRESS must be configured before live payment.');
  const units = usdcUnits(args.amountUsdc);
  return {
    chainId: BASE_CHAIN_ID_HEX,
    from: args.buyerAddress as `0x${string}`,
    to: config.usdcAddress,
    value: '0x0',
    data: encodeErc20Transfer(receiverAddress, units),
    tokenAddress: config.usdcAddress,
    tokenSymbol: 'USDC',
    amountUnits: units.toString(),
    amountUsdc: args.amountUsdc,
    receiverAddress,
  };
}

export function createPaymentIntent(input: CreatePaymentInput): PaymentIntent {
  assertWalletAddress(input.buyerAddress);
  const config = getRuntimeConfig();
  if (!config.realPaymentsEnabled) throw new Error('Real payments are disabled by NEXT_PUBLIC_ENABLE_REAL_PAYMENTS.');
  if (input.priceUsdc > config.caps.maxSignalPriceUsdc) {
    throw new Error(`Signal price ${input.priceUsdc} USDC exceeds demo cap ${config.caps.maxSignalPriceUsdc} USDC.`);
  }

  const transferRequest = buildUsdcTransferRequest({ buyerAddress: input.buyerAddress, amountUsdc: input.priceUsdc });
  return {
    id: `pur_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    signalId: input.signalId,
    buyerAddress: input.buyerAddress,
    priceUsdc: input.priceUsdc,
    paymentMode: 'real_usdc_transfer',
    paymentStatus: 'awaiting_wallet',
    timestamp: Date.now(),
    transferRequest,
    warning: config.x402FacilitatorUrl
      ? 'x402 facilitator env is present, but this MVP uses the real Base USDC transfer fallback adapter until facilitator submission is wired. This still requires a real wallet transaction.'
      : 'x402 not configured; using real Base USDC transfer fallback. This still requires a real wallet transaction.',
  };
}

export async function verifyPaymentTransfer(purchase: PurchaseEvent, txHash: string) {
  const config = getRuntimeConfig();
  const receiverAddress = config.platformWalletAddress ?? config.x402ReceiverAddress;
  if (!receiverAddress) throw new Error('Payment receiver address is not configured.');
  const verified = await verifyBaseTx(txHash, {
    expectedTokenTransfer: {
      tokenAddress: config.usdcAddress ?? BASE_TOKENS.USDC.address,
      from: purchase.buyerAddress,
      to: receiverAddress,
      minAmountUnits: usdcUnits(purchase.priceUsdc),
    },
  });
  return {
    ...purchase,
    paymentTxHash: txHash,
    paymentStatus: verified.status,
    explorerUrl: explorerTxUrl(txHash),
    confirmedAt: verified.status === 'confirmed' ? Date.now() : purchase.confirmedAt,
  } satisfies PurchaseEvent;
}
