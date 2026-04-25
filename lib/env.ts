import { BASE_CHAIN_ID, BASE_RPC_DEFAULT, BASE_TOKENS } from './chains';

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

  return {
    indexerMode,
    baseChainId: numberEnv('BASE_CHAIN_ID', BASE_CHAIN_ID),
    baseRpcUrl: process.env.BASE_RPC_URL ?? BASE_RPC_DEFAULT,
    platformWalletAddress: optionalAddressEnv('PLATFORM_WALLET_ADDRESS'),
    usdcAddress: (process.env.BASE_USDC_ADDRESS as `0x${string}` | undefined) ?? BASE_TOKENS.USDC.address,
    realPaymentsEnabled: booleanEnv('NEXT_PUBLIC_ENABLE_REAL_PAYMENTS', true),
    realSwapsEnabled: booleanEnv('NEXT_PUBLIC_ENABLE_REAL_SWAPS', true),
    x402FacilitatorUrl: process.env.X402_FACILITATOR_URL ?? '',
    x402PaymentToken: process.env.X402_PAYMENT_TOKEN ?? BASE_TOKENS.USDC.address,
    x402ReceiverAddress: optionalAddressEnv('X402_RECEIVER_ADDRESS'),
    x402ResourceBaseUrl: process.env.X402_RESOURCE_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''),
    cdp: {
      agentWalletMode: process.env.CDP_AGENT_WALLET_MODE === 'cdp' ? 'cdp' : 'mock',
      apiKeyId: process.env.CDP_API_KEY_ID ?? process.env.CDP_API_KEY_NAME ?? '',
      apiKeySecret: process.env.CDP_API_KEY_SECRET ?? process.env.CDP_API_KEY_PRIVATE_KEY ?? '',
      walletSecret: process.env.CDP_WALLET_SECRET ?? '',
    },
    caps: getDemoCaps(),
    flock: getFlockConfig(),
  };
}

export function getClientSafeConfig() {
  const config = getRuntimeConfig();
  return {
    indexerMode: config.indexerMode,
    baseChainId: config.baseChainId,
    realPaymentsEnabled: config.realPaymentsEnabled,
    realSwapsEnabled: config.realSwapsEnabled,
    platformWalletConfigured: Boolean(config.platformWalletAddress),
    usdcAddress: config.usdcAddress,
    caps: config.caps,
    flockMode: config.flock.apiKey ? 'flock-first' : 'fallback-ready',
  };
}
