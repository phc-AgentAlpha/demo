import { getBaseNetworkProfile, tokenAddress, type BaseNetworkProfile } from './chains';

export function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`Invalid numeric env ${name}: ${raw}`);
  return value;
}

export function booleanEnv(name: string, fallback = false): boolean {
  const raw = process.env[name];
  if (raw == null || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

export function optionalAddressEnv(name: string): `0x${string}` | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) throw new Error(`Invalid address env ${name}`);
  return value as `0x${string}`;
}


function x402PaymentTokenEnv(profileUsdcAddress: `0x${string}`) {
  const token = optionalAddressEnv('X402_PAYMENT_TOKEN');
  if (!token) return profileUsdcAddress;
  if (token.toLowerCase() !== profileUsdcAddress.toLowerCase()) {
    throw new Error('X402_PAYMENT_TOKEN must match the selected Base profile USDC address for this demo. Leave it blank to use the profile default.');
  }
  return token;
}

function optionalX402NetworkEnv(name: string, fallback: 'eip155:8453' | 'eip155:84532') {
  const value = process.env[name]?.trim();
  if (!value) return fallback;
  if (value !== 'eip155:8453' && value !== 'eip155:84532') throw new Error(`${name} must be eip155:8453 or eip155:84532`);
  return value;
}


const DEFAULT_X402_TESTNET_FACILITATOR_URL = 'https://x402.org/facilitator';

function cleanUrl(value: string) {
  return value.replace(/\/+$/, '');
}

function optionalUrlEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? cleanUrl(value) : undefined;
}

function resolveX402FacilitatorUrl(profile: BaseNetworkProfile) {
  const generic = optionalUrlEnv('X402_FACILITATOR_URL');
  const sepolia = optionalUrlEnv('X402_SEPOLIA_FACILITATOR_URL');
  const mainnet = optionalUrlEnv('X402_MAINNET_FACILITATOR_URL');

  if (profile.key === 'base-sepolia') {
    return sepolia ?? generic ?? DEFAULT_X402_TESTNET_FACILITATOR_URL;
  }

  const selected = mainnet ?? generic;
  if (!selected) {
    throw new Error('Base mainnet x402 requires X402_MAINNET_FACILITATOR_URL or a production X402_FACILITATOR_URL. The default x402.org facilitator is testnet-only.');
  }
  if (selected === DEFAULT_X402_TESTNET_FACILITATOR_URL) {
    throw new Error('https://x402.org/facilitator is testnet-only and should only be used with Base Sepolia. Set X402_MAINNET_FACILITATOR_URL for Base mainnet.');
  }
  return selected;
}

export function getDemoCaps() {
  const maxSignalPriceUsdc = numberEnv('DEMO_MAX_SIGNAL_PRICE_USDC', 1);
  const maxSwapUsdc = numberEnv('DEMO_MAX_SWAP_USDC', 1);
  const slippageBps = numberEnv('PANCAKESWAP_SLIPPAGE_BPS', 100);

  if (maxSignalPriceUsdc <= 0 || maxSignalPriceUsdc > 1) {
    throw new Error('DEMO_MAX_SIGNAL_PRICE_USDC must be > 0 and <= 1.00 for demo safety');
  }
  if (maxSwapUsdc <= 0 || maxSwapUsdc > 1) {
    throw new Error('DEMO_MAX_SWAP_USDC must be > 0 and <= 1.00 for demo safety');
  }
  if (!Number.isInteger(slippageBps) || slippageBps < 1 || slippageBps > 100) {
    throw new Error('PANCAKESWAP_SLIPPAGE_BPS must be an integer between 1 and 100');
  }

  return { maxSignalPriceUsdc, maxSwapUsdc, slippageBps };
}

export function getFlockConfig() {
  return {
    apiKey: process.env.FLOCK_API_KEY ?? '',
    baseUrl: process.env.FLOCK_API_BASE_URL ?? 'https://platform.flock.io/api/v1',
    model: process.env.FLOCK_MODEL ?? 'gemini-3-flash',
    timeoutMs: numberEnv('FLOCK_CLASSIFY_TIMEOUT_MS', 8000),
    fallbackMode: process.env.FLOCK_FALLBACK_MODE ?? 'rule_based',
    requireLiveForDemo: booleanEnv('FLOCK_REQUIRE_LIVE_FOR_DEMO', false),
  };
}

export function getRuntimeConfig() {
  const indexerMode = process.env.INDEXER_MODE ?? 'mock';
  if (indexerMode !== 'mock') {
    throw new Error('INDEXER_MODE must remain mock. Live Alchemy/Base-wide indexing is out of scope.');
  }

  const baseNetworkProfile = getBaseNetworkProfile();
  const usdcAddress = tokenAddress('USDC', baseNetworkProfile);
  const x402Network = optionalX402NetworkEnv('X402_NETWORK', baseNetworkProfile.x402Network);
  if (x402Network !== baseNetworkProfile.x402Network) {
    throw new Error(`X402_NETWORK=${x402Network} conflicts with BASE_NETWORK=${baseNetworkProfile.key} (${baseNetworkProfile.x402Network}).`);
  }

  return {
    indexerMode,
    baseNetwork: baseNetworkProfile.key,
    baseNetworkProfile,
    baseChainId: baseNetworkProfile.chainId,
    baseChainIdHex: baseNetworkProfile.chainIdHex,
    baseRpcUrl: baseNetworkProfile.rpcUrl,
    baseExplorerUrl: baseNetworkProfile.explorerUrl,
    baseExplorerTxBaseUrl: baseNetworkProfile.explorerTxBaseUrl,
    baseExplorerAddressBaseUrl: baseNetworkProfile.explorerAddressBaseUrl,
    baseCdpApiNetwork: baseNetworkProfile.cdpApiNetwork,
    baseCdpRpcNetwork: baseNetworkProfile.cdpRpcNetwork,
    baseCdpSdkNetwork: baseNetworkProfile.cdpSdkNetwork,
    pancakeSwapChain: baseNetworkProfile.pancakeSwapChain,
    platformWalletAddress: optionalAddressEnv('PLATFORM_WALLET_ADDRESS'),
    usdcAddress,
    realPaymentsEnabled: booleanEnv('NEXT_PUBLIC_ENABLE_REAL_PAYMENTS', true),
    realSwapsEnabled: booleanEnv('NEXT_PUBLIC_ENABLE_REAL_SWAPS', true),
    x402FacilitatorUrl: resolveX402FacilitatorUrl(baseNetworkProfile),
    x402Network,
    x402PaymentToken: x402PaymentTokenEnv(usdcAddress),
    x402ReceiverAddress: optionalAddressEnv('X402_RECEIVER_ADDRESS'),
    x402ResourceBaseUrl: process.env.X402_RESOURCE_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''),
    cdp: {
      agentWalletMode: process.env.CDP_AGENT_WALLET_MODE === 'cdp' ? 'cdp' : 'mock',
      apiKeyId: process.env.CDP_API_KEY_ID ?? process.env.CDP_API_KEY_NAME ?? '',
      apiKeySecret: process.env.CDP_API_KEY_SECRET ?? process.env.CDP_API_KEY_PRIVATE_KEY ?? '',
      walletSecret: process.env.CDP_WALLET_SECRET ?? '',
      network: baseNetworkProfile.cdpSdkNetwork,
      apiNetwork: baseNetworkProfile.cdpApiNetwork,
      rpcNetwork: baseNetworkProfile.cdpRpcNetwork,
    },
    caps: getDemoCaps(),
    flock: getFlockConfig(),
  };
}

export function getClientSafeConfig() {
  const config = getRuntimeConfig();
  return {
    indexerMode: config.indexerMode,
    baseNetwork: config.baseNetwork,
    baseNetworkLabel: config.baseNetworkProfile.label,
    baseChainId: config.baseChainId,
    baseChainIdHex: config.baseChainIdHex,
    realPaymentsEnabled: config.realPaymentsEnabled,
    realSwapsEnabled: config.realSwapsEnabled,
    platformWalletConfigured: Boolean(config.platformWalletAddress),
    usdcAddress: config.usdcAddress,
    x402Network: config.x402Network,
    caps: config.caps,
    flockMode: config.flock.apiKey ? 'flock-first' : 'fallback-ready',
  };
}
