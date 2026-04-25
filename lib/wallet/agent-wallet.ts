import { tokenAddress } from '@/lib/chains';

export const MAX_AGENT_DEPOSIT_USDC = 1;
export const USDC_DECIMALS = 6;

export interface AgentDepositTxInput {
  from: string;
  to: string;
  amountUsdc: string;
  tokenAddress?: `0x${string}`;
  maxUsdc?: number;
}

export interface WalletSendTransactionParams {
  from: `0x${string}`;
  to: `0x${string}`;
  value: '0x0';
  data: `0x${string}`;
}

export function assertBaseAddress(address: string): asserts address is `0x${string}` {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error('Invalid Base address.');
}

export function parseUsdcAmountToUnits(amountUsdc: string, maxUsdc = MAX_AGENT_DEPOSIT_USDC): bigint {
  const trimmed = amountUsdc.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(trimmed)) throw new Error('USDC amount must have up to 6 decimals.');

  const [whole, fraction = ''] = trimmed.split('.');
  const units = BigInt(whole) * 10n ** BigInt(USDC_DECIMALS) + BigInt(fraction.padEnd(USDC_DECIMALS, '0'));
  const maxUnits = BigInt(Math.round(maxUsdc * 10 ** USDC_DECIMALS));
  if (units <= 0n) throw new Error('USDC amount must be greater than 0.');
  if (units > maxUnits) throw new Error(`Agent deposit exceeds demo cap of ${maxUsdc} USDC.`);
  return units;
}

export function encodeErc20Transfer(to: string, amountUnits: bigint): `0x${string}` {
  assertBaseAddress(to);
  if (amountUnits <= 0n) throw new Error('Transfer amount must be greater than 0.');
  const selector = 'a9059cbb';
  const encodedTo = to.slice(2).toLowerCase().padStart(64, '0');
  const encodedAmount = amountUnits.toString(16).padStart(64, '0');
  return `0x${selector}${encodedTo}${encodedAmount}`;
}

export function buildAgentUsdcDepositTx(input: AgentDepositTxInput): WalletSendTransactionParams {
  const usdcTokenAddress = input.tokenAddress ?? tokenAddress('USDC');
  assertBaseAddress(input.from);
  assertBaseAddress(input.to);
  assertBaseAddress(usdcTokenAddress);

  const amountUnits = parseUsdcAmountToUnits(input.amountUsdc, input.maxUsdc);
  return {
    from: input.from,
    to: usdcTokenAddress,
    value: '0x0',
    data: encodeErc20Transfer(input.to, amountUnits),
  };
}
