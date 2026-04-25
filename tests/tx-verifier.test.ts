import { describe, expect, it, vi } from 'vitest';
import { findErc20Transfer, verifyBaseTx, type RpcReceipt } from '@/lib/tx/verify-base-tx';

const token = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const outputToken = '0x4200000000000000000000000000000000000006';
const from = '0x2222222222222222222222222222222222222222';
const to = '0x3333333333333333333333333333333333333333';
const router = '0x4444444444444444444444444444444444444444';
const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

function topic(address: string) {
  return `0x${address.replace(/^0x/, '').padStart(64, '0')}`;
}

function amount(value: bigint) {
  return `0x${value.toString(16).padStart(64, '0')}`;
}

const receipt: RpcReceipt = {
  transactionHash: `0x${'d'.repeat(64)}`,
  blockNumber: '0x10',
  status: '0x1',
  from,
  to: '0x4444444444444444444444444444444444444444',
  logs: [
    {
      address: token,
      topics: [transferTopic, topic(from), topic(to)],
      data: amount(300000n),
    },
  ],
};

describe('Base tx transfer evidence helpers', () => {
  it('finds ERC-20 transfer evidence by from/to/min amount', () => {
    expect(findErc20Transfer(receipt, { tokenAddress: token, from, to, minAmountUnits: 300000n })).toBeTruthy();
    expect(findErc20Transfer(receipt, { tokenAddress: token, from, minAmountUnits: 300000n })).toBeTruthy();
    expect(findErc20Transfer(receipt, { tokenAddress: token, to, minAmountUnits: 300000n })).toBeTruthy();
  });

  it('rejects wrong recipient or insufficient amount evidence', () => {
    expect(findErc20Transfer(receipt, { tokenAddress: token, to: '0x5555555555555555555555555555555555555555', minAmountUnits: 1n })).toBeUndefined();
    expect(findErc20Transfer(receipt, { tokenAddress: token, to, minAmountUnits: 300001n })).toBeUndefined();
  });

  it('requires all configured swap token-transfer evidence', async () => {
    const previousMock = process.env.AGENTALPHA_MOCK_TX_VERIFIER;
    process.env.AGENTALPHA_MOCK_TX_VERIFIER = '';
    const swapReceipt: RpcReceipt = {
      ...receipt,
      transactionHash: `0x${'f'.repeat(64)}`,
      to: router,
      logs: [
        { address: token, topics: [transferTopic, topic(from), topic(router)], data: amount(900000n) },
        { address: outputToken, topics: [transferTopic, topic(router), topic(from)], data: amount(1n) },
      ],
    };
    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const method = JSON.parse(String(init?.body)).method as string;
      const result = method === 'eth_chainId' ? '0x2105' : method === 'eth_getTransactionReceipt' ? swapReceipt : '0x20';
      return new Response(JSON.stringify({ result }), { status: 200 });
    }) as unknown as typeof fetch;
    const originalFetch = global.fetch;
    global.fetch = fetchMock;

    await expect(verifyBaseTx(swapReceipt.transactionHash, {
      expectedFrom: from,
      expectedTokenTransfers: [
        { tokenAddress: token, from, minAmountUnits: 900000n },
        { tokenAddress: outputToken, to: from, minAmountUnits: 1n },
      ],
    })).resolves.toMatchObject({ status: 'confirmed' });

    await expect(verifyBaseTx(swapReceipt.transactionHash, {
      expectedFrom: from,
      expectedTokenTransfers: [
        { tokenAddress: token, from, minAmountUnits: 900000n },
        { tokenAddress: outputToken, to: '0x5555555555555555555555555555555555555555', minAmountUnits: 1n },
      ],
    })).rejects.toThrow(/required swap token-transfer evidence/);

    global.fetch = originalFetch;
    process.env.AGENTALPHA_MOCK_TX_VERIFIER = previousMock;
  });
});
