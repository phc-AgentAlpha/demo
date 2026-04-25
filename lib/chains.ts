export type BaseNetwork = 'base-mainnet' | 'base-sepolia';
export type BaseX402Network = 'eip155:8453' | 'eip155:84532';
export type BaseCdpApiNetwork = 'base-mainnet' | 'base-sepolia';
export type BaseCdpRpcNetwork = 'base' | 'base-sepolia';
export type BaseCdpSdkNetwork = 'base' | 'base-sepolia';
export type BaseTokenSymbol = 'USDC' | 'WETH' | 'AERO';
export type BaseAddress = `0x${string}`;

type EnvMap = Record<string, string | undefined>;

export interface BaseTokenInfo {
  symbol: BaseTokenSymbol;
  decimals: number;
  address?: BaseAddress;
}

export interface BaseNetworkProfile {
  key: BaseNetwork;
  label: string;
  chainId: 8453 | 84532;
  chainIdHex: '0x2105' | '0x14a34';
  rpcUrl: string;
  explorerUrl: string;
  explorerTxBaseUrl: string;
  explorerAddressBaseUrl: string;
  x402Network: BaseX402Network;
  cdpApiNetwork: BaseCdpApiNetwork;
  cdpRpcNetwork: BaseCdpRpcNetwork;
  cdpSdkNetwork: BaseCdpSdkNetwork;
  pancakeSwapChain: string;
  tokens: Record<BaseTokenSymbol, BaseTokenInfo>;
}

const MAINNET_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const;
const SEPOLIA_USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as const;
const BASE_WETH = '0x4200000000000000000000000000000000000006' as const;
const MAINNET_AERO = '0x940181a94A35A4569E4529A3CDfB74e38FD98631' as const;

export const BASE_NETWORK_PROFILES: Record<BaseNetwork, BaseNetworkProfile> = {
  'base-mainnet': {
    key: 'base-mainnet',
    label: 'Base Mainnet',
    chainId: 8453,
    chainIdHex: '0x2105',
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    explorerTxBaseUrl: 'https://basescan.org/tx',
    explorerAddressBaseUrl: 'https://basescan.org/address',
    x402Network: 'eip155:8453',
    cdpApiNetwork: 'base-mainnet',
    cdpRpcNetwork: 'base',
    cdpSdkNetwork: 'base',
    pancakeSwapChain: 'base',
    tokens: {
      USDC: { symbol: 'USDC', decimals: 6, address: MAINNET_USDC },
      WETH: { symbol: 'WETH', decimals: 18, address: BASE_WETH },
      AERO: { symbol: 'AERO', decimals: 18, address: MAINNET_AERO },
    },
  },
  'base-sepolia': {
    key: 'base-sepolia',
    label: 'Base Sepolia',
    chainId: 84532,
    chainIdHex: '0x14a34',
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
    explorerTxBaseUrl: 'https://sepolia.basescan.org/tx',
    explorerAddressBaseUrl: 'https://sepolia.basescan.org/address',
    x402Network: 'eip155:84532',
    cdpApiNetwork: 'base-sepolia',
    cdpRpcNetwork: 'base-sepolia',
    cdpSdkNetwork: 'base-sepolia',
    pancakeSwapChain: 'base-sepolia',
    tokens: {
      USDC: { symbol: 'USDC', decimals: 6, address: SEPOLIA_USDC },
      WETH: { symbol: 'WETH', decimals: 18, address: BASE_WETH },
      AERO: { symbol: 'AERO', decimals: 18 },
    },
  },
};


const PUBLIC_BASE_ENV: EnvMap = {
  NEXT_PUBLIC_BASE_NETWORK: process.env.NEXT_PUBLIC_BASE_NETWORK,
  NEXT_PUBLIC_BASE_CHAIN_ID: process.env.NEXT_PUBLIC_BASE_CHAIN_ID,
  NEXT_PUBLIC_BASE_RPC_URL: process.env.NEXT_PUBLIC_BASE_RPC_URL,
  NEXT_PUBLIC_BASE_MAINNET_RPC_URL: process.env.NEXT_PUBLIC_BASE_MAINNET_RPC_URL,
  NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL,
  NEXT_PUBLIC_BASE_USDC_ADDRESS: process.env.NEXT_PUBLIC_BASE_USDC_ADDRESS,
  NEXT_PUBLIC_BASE_MAINNET_USDC_ADDRESS: process.env.NEXT_PUBLIC_BASE_MAINNET_USDC_ADDRESS,
  NEXT_PUBLIC_BASE_SEPOLIA_USDC_ADDRESS: process.env.NEXT_PUBLIC_BASE_SEPOLIA_USDC_ADDRESS,
  NEXT_PUBLIC_BASE_AERO_ADDRESS: process.env.NEXT_PUBLIC_BASE_AERO_ADDRESS,
  NEXT_PUBLIC_BASE_SEPOLIA_AERO_ADDRESS: process.env.NEXT_PUBLIC_BASE_SEPOLIA_AERO_ADDRESS,
  NEXT_PUBLIC_BASE_EXPLORER_BASE_URL: process.env.NEXT_PUBLIC_BASE_EXPLORER_BASE_URL,
  NEXT_PUBLIC_BASE_EXPLORER_TX_BASE_URL: process.env.NEXT_PUBLIC_BASE_EXPLORER_TX_BASE_URL,
  NEXT_PUBLIC_BASE_EXPLORER_ADDRESS_BASE_URL: process.env.NEXT_PUBLIC_BASE_EXPLORER_ADDRESS_BASE_URL,
  NEXT_PUBLIC_PANCAKESWAP_CHAIN: process.env.NEXT_PUBLIC_PANCAKESWAP_CHAIN,
};

function defaultBaseEnv(): EnvMap {
  return typeof window === 'undefined' ? process.env : PUBLIC_BASE_ENV;
}

const NETWORK_ALIASES: Record<string, BaseNetwork> = {
  base: 'base-mainnet',
  mainnet: 'base-mainnet',
  'base-mainnet': 'base-mainnet',
  'base_mainnet': 'base-mainnet',
  '8453': 'base-mainnet',
  sepolia: 'base-sepolia',
  testnet: 'base-sepolia',
  'base-sepolia': 'base-sepolia',
  'base_sepolia': 'base-sepolia',
  '84532': 'base-sepolia',
};

function envValue(env: EnvMap, names: string[]) {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function cleanBaseUrl(value: string) {
  return value.replace(/\/+$/, '');
}

function assertAddressEnv(name: string, value: string): BaseAddress {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) throw new Error(`Invalid address env ${name}`);
  return value as BaseAddress;
}

function ensureNoCrossNetworkDefault(name: string, value: string, network: BaseNetwork, otherDefault?: string) {
  if (otherDefault && value.toLowerCase() === otherDefault.toLowerCase()) {
    throw new Error(`${name} points to the ${network === 'base-mainnet' ? 'Base Sepolia' : 'Base Mainnet'} default while BASE_NETWORK=${network}. Remove the stale override or use the matching network value.`);
  }
}

function resolveActiveOverride(env: EnvMap, names: string[], network: BaseNetwork, otherDefault?: string) {
  for (const name of names) {
    const value = env[name]?.trim();
    if (!value) continue;
    ensureNoCrossNetworkDefault(name, value, network, otherDefault);
    return { name, value };
  }
  return undefined;
}

export function resolveBaseNetwork(value?: string): BaseNetwork {
  const normalized = (value ?? 'base-mainnet').trim().toLowerCase();
  const network = NETWORK_ALIASES[normalized];
  if (!network) throw new Error(`Unsupported BASE_NETWORK: ${value}. Use base-mainnet or base-sepolia.`);
  return network;
}

function configuredBaseNetworkValue(env: EnvMap) {
  const serverValue = env.BASE_NETWORK?.trim();
  const publicValue = env.NEXT_PUBLIC_BASE_NETWORK?.trim();
  if (serverValue && publicValue && resolveBaseNetwork(serverValue) !== resolveBaseNetwork(publicValue)) {
    throw new Error(`BASE_NETWORK (${serverValue}) and NEXT_PUBLIC_BASE_NETWORK (${publicValue}) must match.`);
  }
  return publicValue || serverValue;
}

export function configuredBaseNetwork(env: EnvMap = defaultBaseEnv()): BaseNetwork {
  return resolveBaseNetwork(configuredBaseNetworkValue(env));
}

function validateChainIdEnv(profile: BaseNetworkProfile, env: EnvMap) {
  const raw = envValue(env, ['NEXT_PUBLIC_BASE_CHAIN_ID', 'BASE_CHAIN_ID']);
  if (!raw) return;
  const value = Number(raw);
  if (!Number.isInteger(value)) throw new Error(`Invalid BASE_CHAIN_ID: ${raw}`);
  if (value !== profile.chainId) {
    throw new Error(`BASE_CHAIN_ID=${value} conflicts with BASE_NETWORK=${profile.key} (${profile.chainId}). Remove the stale chain id override or set the matching value.`);
  }
}

function tokenOverride(symbol: BaseTokenSymbol, network: BaseNetwork, env: EnvMap) {
  const prefix = network === 'base-mainnet' ? 'BASE_MAINNET' : 'BASE_SEPOLIA';
  const networkSpecific = envValue(env, [`NEXT_PUBLIC_${prefix}_${symbol}_ADDRESS`, `${prefix}_${symbol}_ADDRESS`]);
  if (networkSpecific) return assertAddressEnv(`${prefix}_${symbol}_ADDRESS`, networkSpecific);

  const otherDefault = symbol === 'USDC'
    ? BASE_NETWORK_PROFILES[network === 'base-mainnet' ? 'base-sepolia' : 'base-mainnet'].tokens.USDC.address
    : undefined;
  const active = resolveActiveOverride(env, [`NEXT_PUBLIC_BASE_${symbol}_ADDRESS`, `BASE_${symbol}_ADDRESS`], network, otherDefault);
  return active ? assertAddressEnv(active.name, active.value) : undefined;
}

export function getBaseNetworkProfile(networkInput?: BaseNetwork | string, env: EnvMap = defaultBaseEnv()): BaseNetworkProfile {
  const network = resolveBaseNetwork(networkInput ?? configuredBaseNetworkValue(env));
  const defaults = BASE_NETWORK_PROFILES[network];
  validateChainIdEnv(defaults, env);

  const rpcOtherDefault = BASE_NETWORK_PROFILES[network === 'base-mainnet' ? 'base-sepolia' : 'base-mainnet'].rpcUrl;
  const activeRpc = resolveActiveOverride(env, ['NEXT_PUBLIC_BASE_RPC_URL', 'BASE_RPC_URL'], network, rpcOtherDefault)?.value;
  const networkRpc = network === 'base-mainnet'
    ? envValue(env, ['NEXT_PUBLIC_BASE_MAINNET_RPC_URL', 'BASE_MAINNET_RPC_URL'])
    : envValue(env, ['NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL', 'BASE_SEPOLIA_RPC_URL']);
  const rpcUrl = activeRpc ?? networkRpc ?? defaults.rpcUrl;

  const explorerUrl = cleanBaseUrl(envValue(env, ['NEXT_PUBLIC_BASE_EXPLORER_BASE_URL']) ?? defaults.explorerUrl);
  const explorerTxBaseUrl = cleanBaseUrl(envValue(env, ['NEXT_PUBLIC_BASE_EXPLORER_TX_BASE_URL']) ?? `${explorerUrl}/tx`);
  const explorerAddressBaseUrl = cleanBaseUrl(envValue(env, ['NEXT_PUBLIC_BASE_EXPLORER_ADDRESS_BASE_URL']) ?? `${explorerUrl}/address`);
  const pancakeSwapChain = envValue(env, ['NEXT_PUBLIC_PANCAKESWAP_CHAIN', 'PANCAKESWAP_CHAIN']) ?? defaults.pancakeSwapChain;

  const tokens: Record<BaseTokenSymbol, BaseTokenInfo> = {
    USDC: { ...defaults.tokens.USDC, address: tokenOverride('USDC', network, env) ?? defaults.tokens.USDC.address },
    WETH: { ...defaults.tokens.WETH, address: tokenOverride('WETH', network, env) ?? defaults.tokens.WETH.address },
    AERO: { ...defaults.tokens.AERO, address: tokenOverride('AERO', network, env) ?? defaults.tokens.AERO.address },
  };

  return {
    ...defaults,
    rpcUrl,
    explorerUrl,
    explorerTxBaseUrl,
    explorerAddressBaseUrl,
    pancakeSwapChain,
    tokens,
  };
}

export function getPublicBaseNetworkProfile(): BaseNetworkProfile {
  return getBaseNetworkProfile(undefined, PUBLIC_BASE_ENV);
}

export function baseWalletChainParams(profile: BaseNetworkProfile = getBaseNetworkProfile()) {
  return {
    chainId: profile.chainIdHex,
    chainName: profile.label,
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: [profile.rpcUrl],
    blockExplorerUrls: [profile.explorerUrl],
  } as const;
}

export function explorerTxUrl(txHash: string, profile: BaseNetworkProfile = getBaseNetworkProfile()) {
  return `${profile.explorerTxBaseUrl}/${txHash}`;
}

export function explorerAddressUrl(address: string, profile: BaseNetworkProfile = getBaseNetworkProfile()) {
  return `${profile.explorerAddressBaseUrl}/${address}`;
}

export function tokenAddress(symbol: string, profile: BaseNetworkProfile = getBaseNetworkProfile()): BaseAddress {
  const normalized = symbol.toUpperCase() === 'ETH' ? 'WETH' : symbol.toUpperCase();
  const token = profile.tokens[normalized as BaseTokenSymbol];
  if (!token?.address) {
    throw new Error(`Unsupported Base demo token ${symbol} on ${profile.key}. Configure NEXT_PUBLIC_BASE_${normalized}_ADDRESS or BASE_${normalized}_ADDRESS for this network.`);
  }
  return token.address;
}

const activeProfile = getBaseNetworkProfile(undefined, defaultBaseEnv());

export const BASE_NETWORK = activeProfile.key;
export const BASE_CHAIN_ID = activeProfile.chainId;
export const BASE_CHAIN_ID_HEX = activeProfile.chainIdHex;
export const BASE_RPC_DEFAULT = activeProfile.rpcUrl;
export const BASE_EXPLORER_TX = activeProfile.explorerTxBaseUrl;
export const BASE_EXPLORER_ADDRESS = activeProfile.explorerAddressBaseUrl;
export const BASE_X402_NETWORK = activeProfile.x402Network;
export const BASE_CDP_API_NETWORK = activeProfile.cdpApiNetwork;
export const BASE_CDP_RPC_NETWORK = activeProfile.cdpRpcNetwork;
export const BASE_CDP_SDK_NETWORK = activeProfile.cdpSdkNetwork;
export const PANCAKESWAP_CHAIN = activeProfile.pancakeSwapChain;
export const BASE_TOKENS = activeProfile.tokens;
