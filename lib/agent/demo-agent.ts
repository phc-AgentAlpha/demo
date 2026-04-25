import { getRuntimeConfig } from '../env';
import { mockDashboard } from '../mock-data';
import type { AgentWalletProvider, UserProfile } from '../types';

export interface DemoAgentProfile {
  agentId: string;
  walletAddress: string;
  status: 'active' | 'idle' | 'running';
  usdcBalance: number;
  walletProvider: AgentWalletProvider;
}

function normalizedSeed(seed: string) {
  return seed.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12).padEnd(6, '0');
}

export function createDemoAgent(seed = 'alex'): DemoAgentProfile {
  const suffix = normalizedSeed(seed).slice(0, 6);
  const seedHex = Buffer.from(suffix).toString('hex').padEnd(38, '0').slice(0, 38);
  return {
    agentId: `agent_${suffix}_001`,
    walletAddress: `0xaa${seedHex}`,
    status: 'active',
    usdcBalance: mockDashboard.usdcBalance,
    walletProvider: 'deterministic-dev',
  };
}

export async function createAgentWallet(seed = 'alex'): Promise<DemoAgentProfile> {
  const config = getRuntimeConfig();
  if (config.cdp.agentWalletMode !== 'cdp') return createDemoAgent(seed);
  if (!config.cdp.apiKeyId || !config.cdp.apiKeySecret || !config.cdp.walletSecret) {
    throw new Error('CDP agent wallet mode requires CDP_API_KEY_ID, CDP_API_KEY_SECRET, and CDP_WALLET_SECRET.');
  }

  const { CdpClient } = await import('@coinbase/cdp-sdk');
  const cdp = new CdpClient({
    apiKeyId: config.cdp.apiKeyId,
    apiKeySecret: config.cdp.apiKeySecret,
    walletSecret: config.cdp.walletSecret,
  });
  const suffix = normalizedSeed(seed);
  const owner = await cdp.evm.getOrCreateAccount({ name: `agentalpha-${suffix}-owner` });
  const smartAccount = await cdp.evm.getOrCreateSmartAccount({ name: `agentalpha-${suffix}-aa`, owner, enableSpendPermissions: false });

  return {
    agentId: `cdp_${suffix}_${smartAccount.address.slice(2, 8).toLowerCase()}`,
    walletAddress: smartAccount.address,
    status: 'active',
    usdcBalance: mockDashboard.usdcBalance,
    walletProvider: 'cdp-smart-account',
  };
}

export function getDemoAgentBalance(agentId: string) {
  return {
    agentId,
    usdcBalance: mockDashboard.usdcBalance,
    updatedAt: Date.now(),
  };
}

export async function getCdpAgentPaymentSigner(profile: UserProfile) {
  const config = getRuntimeConfig();
  if (profile.agentWalletProvider !== 'cdp-smart-account') throw new Error('A CDP smart-account agent wallet is required for live x402 payment.');
  if (!config.cdp.apiKeyId || !config.cdp.apiKeySecret || !config.cdp.walletSecret) {
    throw new Error('CDP credentials are required to sign live x402 payments from the agent wallet.');
  }
  const { CdpClient } = await import('@coinbase/cdp-sdk');
  const cdp = new CdpClient({
    apiKeyId: config.cdp.apiKeyId,
    apiKeySecret: config.cdp.apiKeySecret,
    walletSecret: config.cdp.walletSecret,
  });
  const suffix = normalizedSeed(profile.tradingStyle);
  const owner = await cdp.evm.getOrCreateAccount({ name: `agentalpha-${suffix}-owner` });
  const smartAccount = await cdp.evm.getOrCreateSmartAccount({ name: `agentalpha-${suffix}-aa`, owner, enableSpendPermissions: false });
  if (smartAccount.address.toLowerCase() !== profile.agentWalletAddress?.toLowerCase()) {
    throw new Error('CDP smart account does not match the persisted agent wallet.');
  }
  const baseAccount = await smartAccount.useNetwork(config.cdp.network);
  return {
    address: baseAccount.address,
    signTypedData: baseAccount.signTypedData,
  };
}
