export const BASE_CHAIN_ID = 8453;
export const BASE_CHAIN_ID_HEX = '0x2105' as const;
export const BASE_RPC_DEFAULT = 'https://mainnet.base.org';
export const BASE_EXPLORER_TX = 'https://basescan.org/tx';
export const BASE_EXPLORER_ADDRESS = 'https://basescan.org/address';

export const BASE_TOKENS = {
  USDC: {
    symbol: 'USDC',
    decimals: 6,
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const,
  },
  WETH: {
    symbol: 'WETH',
    decimals: 18,
    address: '0x4200000000000000000000000000000000000006' as const,
  },
  AERO: {
    symbol: 'AERO',
    decimals: 18,
    address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631' as const,
  },
} as const;

export function explorerTxUrl(txHash: string) {
  return `${BASE_EXPLORER_TX}/${txHash}`;
}

export function explorerAddressUrl(address: string) {
  return `${BASE_EXPLORER_ADDRESS}/${address}`;
}

export function tokenAddress(symbol: string): `0x${string}` {
  const normalized = symbol.toUpperCase();
  if (normalized === 'ETH') return BASE_TOKENS.WETH.address;
  if (normalized in BASE_TOKENS) return BASE_TOKENS[normalized as keyof typeof BASE_TOKENS].address;
  throw new Error(`Unsupported Base demo token: ${symbol}`);
}
