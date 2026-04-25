import { mockDashboard } from '../mock-data';

export interface DemoAgentProfile {
  agentId: string;
  walletAddress: string;
  status: 'active' | 'idle' | 'running';
  usdcBalance: number;
}

export function createDemoAgent(seed = 'alex'): DemoAgentProfile {
  const suffix = seed.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6).padEnd(6, '0');
  const seedHex = Buffer.from(suffix).toString('hex').padEnd(38, '0').slice(0, 38);
  return {
    agentId: `agent_${suffix}_001`,
    walletAddress: `0xaa${seedHex}`,
    status: 'active',
    usdcBalance: mockDashboard.usdcBalance,
  };
}

export function getDemoAgentBalance(agentId: string) {
  return {
    agentId,
    usdcBalance: mockDashboard.usdcBalance,
    updatedAt: Date.now(),
  };
}
