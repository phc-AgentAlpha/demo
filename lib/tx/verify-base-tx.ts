import { BASE_CHAIN_ID, BASE_RPC_DEFAULT, BASE_TOKENS, explorerTxUrl } from '../chains';
import { getRuntimeConfig } from '../env';

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export interface RpcLog {
  address: string;
  topics: string[];
  data: string;
}

export interface RpcReceipt {
  transactionHash: string;
  blockNumber: string | null;
  status: string | null;
  from: string;
  to: string | null;
  logs: RpcLog[];
}

export interface VerifiedTx {
  txHash: string;
  chainId: 8453;
  status: 'confirmed' | 'pending' | 'failed';
  explorerUrl: string;
  receipt?: RpcReceipt;
  confirmations?: number;
}

export interface VerifyBaseTxOptions {
  rpcUrl?: string;
  requiredConfirmations?: number;
  expectedFrom?: string;
  expectedTo?: string;
  expectedTokenTransfer?: {
    tokenAddress: string;
    from?: string;
    to?: string;
    minAmountUnits: bigint;
  };
  expectedTokenTransfers?: Array<{
    tokenAddress: string;
    from?: string;
    to?: string;
    minAmountUnits: bigint;
  }>;
  expectedOneOfTokenTransfers?: Array<{
    tokenAddress: string;
    from?: string;
    to?: string;
    minAmountUnits: bigint;
  }>;
}

export function isRealTxHash(txHash: string): txHash is `0x${string}` {
  return /^0x[a-fA-F0-9]{64}$/.test(txHash);
}

export function assertRealTxHash(txHash: string): asserts txHash is `0x${string}` {
  if (!isRealTxHash(txHash)) {
    throw new Error('Invalid or fixture transaction hash. Demo requires a real 0x-prefixed 32-byte tx hash.');
  }
}

function isTestVerifierAllowed() {
  return process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';
}

async function rpc<T>(method: string, params: unknown[], rpcUrl: string): Promise<T> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`Base RPC HTTP ${response.status}`);
  const payload = (await response.json()) as { result?: T; error?: { message?: string } };
  if (payload.error) throw new Error(payload.error.message ?? 'Base RPC error');
  return payload.result as T;
}

function topicAddress(topic: string) {
  return `0x${topic.slice(-40)}`.toLowerCase();
}

export function findErc20Transfer(receipt: RpcReceipt, args: { tokenAddress: string; from?: string; to?: string; minAmountUnits: bigint }) {
  if (!args.from && !args.to) throw new Error('ERC-20 transfer verification requires from or to address');
  const token = args.tokenAddress.toLowerCase();
  const to = args.to?.toLowerCase();
  const from = args.from?.toLowerCase();
  return receipt.logs.find((log) => {
    if (log.address.toLowerCase() !== token) return false;
    if (log.topics[0]?.toLowerCase() !== TRANSFER_TOPIC) return false;
    if (!log.topics[1] || !log.topics[2]) return false;
    if (from && topicAddress(log.topics[1]) !== from) return false;
    if (to && topicAddress(log.topics[2]) !== to) return false;
    const amount = BigInt(log.data);
    return amount >= args.minAmountUnits;
  });
}

export async function verifyBaseTx(txHash: string, options: VerifyBaseTxOptions = {}): Promise<VerifiedTx> {
  assertRealTxHash(txHash);

  if (process.env.AGENTALPHA_MOCK_TX_VERIFIER === 'true') {
    if (!isTestVerifierAllowed()) throw new Error('AGENTALPHA_MOCK_TX_VERIFIER is only allowed in test mode');
    return { txHash, chainId: BASE_CHAIN_ID, status: 'confirmed', explorerUrl: explorerTxUrl(txHash), confirmations: 1 };
  }

  const config = getRuntimeConfig();
  const rpcUrl = options.rpcUrl ?? config.baseRpcUrl ?? BASE_RPC_DEFAULT;
  const requiredConfirmations = options.requiredConfirmations ?? 1;
  const chainIdHex = await rpc<string>('eth_chainId', [], rpcUrl);
  if (Number.parseInt(chainIdHex, 16) !== BASE_CHAIN_ID) throw new Error(`Expected Base chain ${BASE_CHAIN_ID}, got ${chainIdHex}`);

  const receipt = await rpc<RpcReceipt | null>('eth_getTransactionReceipt', [txHash], rpcUrl);
  if (!receipt) return { txHash, chainId: BASE_CHAIN_ID, status: 'pending', explorerUrl: explorerTxUrl(txHash), confirmations: 0 };

  if (receipt.status !== '0x1') return { txHash, chainId: BASE_CHAIN_ID, status: 'failed', explorerUrl: explorerTxUrl(txHash), receipt, confirmations: 0 };

  const latest = await rpc<string>('eth_blockNumber', [], rpcUrl);
  const confirmations = receipt.blockNumber ? Number.parseInt(latest, 16) - Number.parseInt(receipt.blockNumber, 16) + 1 : 0;

  if (options.expectedFrom && receipt.from.toLowerCase() !== options.expectedFrom.toLowerCase()) {
    throw new Error('Confirmed tx was not submitted by the expected wallet');
  }

  if (options.expectedTo && receipt.to?.toLowerCase() !== options.expectedTo.toLowerCase()) {
    throw new Error('Confirmed tx did not target the expected contract/address');
  }

  if (options.expectedTokenTransfer) {
    const transfer = findErc20Transfer(receipt, options.expectedTokenTransfer);
    if (!transfer) throw new Error('Confirmed tx did not include the expected Base USDC transfer');
  }

  if (options.expectedTokenTransfers?.length) {
    const missing = options.expectedTokenTransfers.find((expected) => !findErc20Transfer(receipt, expected));
    if (missing) {
      const token = `${missing.tokenAddress.slice(0, 8)}…${missing.tokenAddress.slice(-6)}`;
      throw new Error(`Confirmed tx did not include required swap token-transfer evidence for ${token}`);
    }
  }

  if (options.expectedOneOfTokenTransfers?.length) {
    const transfer = options.expectedOneOfTokenTransfers.some((expected) => findErc20Transfer(receipt, expected));
    if (!transfer) throw new Error('Confirmed tx did not include any expected token-transfer evidence');
  }

  return {
    txHash,
    chainId: BASE_CHAIN_ID,
    status: confirmations >= requiredConfirmations ? 'confirmed' : 'pending',
    explorerUrl: explorerTxUrl(txHash),
    receipt,
    confirmations,
  };
}

export function usdcUnits(amountUsdc: number): bigint {
  if (!Number.isFinite(amountUsdc) || amountUsdc <= 0) throw new Error('Invalid USDC amount');
  return BigInt(Math.round(amountUsdc * 10 ** BASE_TOKENS.USDC.decimals));
}
