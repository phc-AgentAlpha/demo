import { getBaseNetworkProfile, type BaseNetworkProfile } from '@/lib/chains';

export interface WalletBalance {
  address: `0x${string}`;
  network: BaseNetworkProfile['key'];
  chainId: BaseNetworkProfile['chainId'];
  ethBalance: number;
  ethBalanceWei: string;
  usdcBalance: number;
  usdcBalanceUnits: string;
  usdcTokenAddress: `0x${string}`;
  updatedAt: number;
  source: 'base-rpc';
}

export interface FetchWalletBalanceInput {
  address: string;
  profile?: BaseNetworkProfile;
  rpcUrl?: string;
}

interface JsonRpcPayload<T> {
  result?: T;
  error?: { message?: string };
}

const ERC20_BALANCE_OF_SELECTOR = '70a08231';
const WEI_DECIMALS = 18;

export function assertWalletAddress(address: string): asserts address is `0x${string}` {
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error('Invalid Base wallet address.');
}

async function baseRpc<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`Base RPC HTTP ${response.status}`);
  const payload = (await response.json()) as JsonRpcPayload<T>;
  if (payload.error) throw new Error(payload.error.message ?? 'Base RPC error');
  if (!('result' in payload)) throw new Error(`Base RPC ${method} returned no result`);
  return payload.result as T;
}

function encodeBalanceOf(address: `0x${string}`): `0x${string}` {
  return `0x${ERC20_BALANCE_OF_SELECTOR}${address.slice(2).toLowerCase().padStart(64, '0')}`;
}

function unitsToNumber(units: bigint, decimals: number) {
  const divisor = 10 ** decimals;
  return Number(units) / divisor;
}

function hexUnits(value: string | null | undefined) {
  if (!value || value === '0x') return 0n;
  return BigInt(value);
}

export async function fetchBaseWalletBalance(input: FetchWalletBalanceInput): Promise<WalletBalance> {
  assertWalletAddress(input.address);
  const profile = input.profile ?? getBaseNetworkProfile();
  const rpcUrl = input.rpcUrl ?? profile.rpcUrl;
  const usdc = profile.tokens.USDC;
  if (!usdc.address) throw new Error(`USDC address is not configured for ${profile.key}.`);

  const chainIdHex = await baseRpc<string>(rpcUrl, 'eth_chainId', []);
  if (Number.parseInt(chainIdHex, 16) !== profile.chainId) {
    throw new Error(`Expected Base chain ${profile.chainId}, got ${chainIdHex}`);
  }

  const [ethHex, usdcHex] = await Promise.all([
    baseRpc<string>(rpcUrl, 'eth_getBalance', [input.address, 'latest']),
    baseRpc<string>(rpcUrl, 'eth_call', [{ to: usdc.address, data: encodeBalanceOf(input.address) }, 'latest']),
  ]);
  const ethBalanceWei = hexUnits(ethHex);
  const usdcBalanceUnits = hexUnits(usdcHex);

  return {
    address: input.address,
    network: profile.key,
    chainId: profile.chainId,
    ethBalance: unitsToNumber(ethBalanceWei, WEI_DECIMALS),
    ethBalanceWei: ethBalanceWei.toString(),
    usdcBalance: unitsToNumber(usdcBalanceUnits, usdc.decimals),
    usdcBalanceUnits: usdcBalanceUnits.toString(),
    usdcTokenAddress: usdc.address,
    updatedAt: Date.now(),
    source: 'base-rpc',
  };
}
