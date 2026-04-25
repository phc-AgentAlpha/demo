import { tokenAddress } from '../chains';
import { getRuntimeConfig } from '../env';
import { verifyBaseTx } from '../tx/verify-base-tx';
import type { ExecutionEvent, TradeSignalPayload } from '../types';

export interface PrepareExecutionInput {
  purchaseId: string;
  signalId: string;
  walletAddress: string;
  payload: TradeSignalPayload;
}

export interface PreparedExecution extends ExecutionEvent {
  maxAmountUsdc: number;
  instructions: string[];
}

export function buildPancakeSwapDeepLink(payload: TradeSignalPayload, amountUsdc: number, slippageBps: number) {
  const inputCurrency = tokenAddress(payload.suggestedInputToken);
  const outputCurrency = tokenAddress(payload.suggestedOutputToken);
  const params = new URLSearchParams({
    chain: 'base',
    inputCurrency,
    outputCurrency,
    exactAmount: amountUsdc.toString(),
    exactField: 'input',
    slippage: (slippageBps / 100).toString(),
  });
  return `https://pancakeswap.finance/swap?${params.toString()}`;
}

export function preparePancakeExecution(input: PrepareExecutionInput): PreparedExecution {
  const config = getRuntimeConfig();
  if (!config.realSwapsEnabled) throw new Error('Real swaps are disabled by NEXT_PUBLIC_ENABLE_REAL_SWAPS.');
  if (!/^0x[a-fA-F0-9]{40}$/.test(input.walletAddress)) throw new Error('A valid wallet address is required.');
  const amount = Math.min(input.payload.suggestedAmountUsdc, config.caps.maxSwapUsdc);
  if (amount <= 0 || amount > config.caps.maxSwapUsdc) throw new Error('Execution amount violates demo swap cap.');
  const deeplinkUrl = buildPancakeSwapDeepLink(input.payload, amount, config.caps.slippageBps);
  const inputTokenAddress = tokenAddress(input.payload.suggestedInputToken);
  const outputTokenAddress = tokenAddress(input.payload.suggestedOutputToken);

  return {
    id: `exec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    purchaseId: input.purchaseId,
    signalId: input.signalId,
    walletAddress: input.walletAddress,
    pair: input.payload.pair,
    direction: input.payload.direction,
    inputTokenAddress,
    outputTokenAddress,
    amountUsdc: amount,
    timestamp: Date.now(),
    verificationStatus: 'awaiting_wallet',
    mode: 'pancakeswap_deeplink',
    deeplinkUrl,
    slippageBps: config.caps.slippageBps,
    maxAmountUsdc: amount,
    instructions: [
      'Open the PancakeSwap link and verify Base network, token pair, amount, and slippage.',
      'Confirm the swap in your wallet. The app never signs or auto-submits for you.',
      'Paste the real Base swap tx hash back into AgentAlpha for verification.',
    ],
  };
}

export async function confirmPancakeExecution(execution: ExecutionEvent, swapTxHash: string): Promise<ExecutionEvent> {
  const minInputEvidence = BigInt(Math.floor(execution.amountUsdc * 1_000_000 * 0.9));
  const verified = await verifyBaseTx(swapTxHash, {
    expectedFrom: execution.walletAddress,
    expectedTokenTransfers: [
      {
        tokenAddress: execution.inputTokenAddress,
        from: execution.walletAddress,
        minAmountUnits: minInputEvidence,
      },
      {
        tokenAddress: execution.outputTokenAddress,
        to: execution.walletAddress,
        minAmountUnits: 1n,
      },
    ],
  });
  return {
    ...execution,
    swapTxHash,
    verificationStatus: verified.status,
    explorerUrl: verified.explorerUrl,
  };
}
