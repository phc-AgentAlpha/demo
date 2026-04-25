import { describe, expect, it } from 'vitest';
import { createDemoAgent, getDemoAgentBalance } from '@/lib/agent/demo-agent';
import { mockStats } from '@/lib/mock-data';
import { materializeMyDerivedSignals, summarizeEarnings } from '@/lib/scenario-flow';
import { buildRevenueDistribution } from '@/lib/revenue/distribute';
import { mockExistingDerivedSignal, mockUserSignal } from '@/lib/mock-indexer-data';

describe('USER_SCENARIO flow helpers', () => {
  it('keeps landing scenario stats deterministic', () => {
    expect(mockStats).toMatchObject({
      totalIndexed: 1247,
      todaySignals: 8342,
      verifiedCount: 6,
      discoveredCount: 6,
    });
  });

  it('issues a deterministic demo agent and balance envelope without private keys', () => {
    const agent = createDemoAgent('aggressive');
    expect(agent.agentId).toBe('agent_aggres_001');
    expect(agent.walletAddress).toMatch(/^0x/);
    expect(getDemoAgentBalance(agent.agentId).usdcBalance).toBe(agent.usdcBalance);
    expect(agent).not.toHaveProperty('privateKey');
  });

  it('materializes my-signals cards only from confirmed derived ledger relations', () => {
    const detectedAt = Date.UTC(2026, 3, 25, 4);
    const signals = materializeMyDerivedSignals([
      {
        derivedSignalId: 'derived_exec_001',
        parentSignalId: 'sig_discovered_001',
        rootSignalId: 'sig_discovered_001',
        depth: 1,
        similarity: 1,
        evidenceTxHashes: [`0x${'e'.repeat(64)}`],
        detectedAt,
      },
    ], '0x2222222222222222222222222222222222222222');

    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({
      id: 'derived_exec_001',
      source: 'derived',
      rootSignalId: 'sig_discovered_001',
      derivedDepth: 1,
      sourceWalletAddress: '0x2222222222222222222222222222222222222222',
    });
    expect(signals[0].recentTrades[0].hash).toBe(`0x${'e'.repeat(64)}`);
  });

  it('summarizes earnings hero totals from period seed plus ledger distributions', () => {
    const events = [
      buildRevenueDistribution({ saleEventId: 'demo_user_sale', signal: mockUserSignal, priceUsdc: 1, userOwnerAddress: mockUserSignal.ownerAddress }),
      buildRevenueDistribution({ saleEventId: 'demo_derived_sale', signal: mockExistingDerivedSignal, priceUsdc: 1, rootSource: 'indexed', derivedOwnerAddress: mockExistingDerivedSignal.ownerAddress }),
    ];
    const summary = summarizeEarnings('30d', events);
    expect(summary.tradingPnl).toBe(12.4);
    expect(summary.signalRevenue).toBeGreaterThan(1.42);
    expect(summary.derivedRevenue).toBeGreaterThan(0.68);
    expect(summary.total).toBeCloseTo(summary.tradingPnl + summary.signalRevenue + summary.derivedRevenue);
  });
});
