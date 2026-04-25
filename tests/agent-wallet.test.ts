import { describe, expect, it } from 'vitest';
import { buildAgentUsdcDepositTx, encodeErc20Transfer, parseUsdcAmountToUnits } from '@/lib/wallet/agent-wallet';
import { BASE_TOKENS } from '@/lib/chains';

describe('agent wallet funding helpers', () => {
  const from = '0x2222222222222222222222222222222222222222';
  const agent = '0x1111111111111111111111111111111111111111';

  it('parses USDC amounts with 6 decimals and enforces the demo cap', () => {
    expect(parseUsdcAmountToUnits('0.25')).toBe(250000n);
    expect(parseUsdcAmountToUnits('1')).toBe(1000000n);
    expect(() => parseUsdcAmountToUnits('1.000001')).toThrow(/demo cap/);
    expect(() => parseUsdcAmountToUnits('0.0000001')).toThrow(/up to 6 decimals/);
    expect(() => parseUsdcAmountToUnits('0')).toThrow(/greater than 0/);
  });

  it('encodes an ERC20 transfer to the agent wallet', () => {
    expect(encodeErc20Transfer(agent, 250000n)).toBe(
      '0xa9059cbb0000000000000000000000001111111111111111111111111111111111111111000000000000000000000000000000000000000000000000000000000003d090',
    );
  });

  it('builds a wallet_sendTransaction payload for Base USDC deposit', () => {
    expect(buildAgentUsdcDepositTx({ from, to: agent, amountUsdc: '0.5' })).toEqual({
      from,
      to: BASE_TOKENS.USDC.address,
      value: '0x0',
      data: '0xa9059cbb0000000000000000000000001111111111111111111111111111111111111111000000000000000000000000000000000000000000000000000000000007a120',
    });
  });
});
