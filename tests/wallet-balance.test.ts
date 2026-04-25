import { afterEach, describe, expect, it, vi } from 'vitest';
import { BASE_NETWORK_PROFILES } from '@/lib/chains';
import { fetchBaseWalletBalance } from '@/lib/wallet/balance';

const wallet = '0x2222222222222222222222222222222222222222';

function hex(value: bigint) {
  return `0x${value.toString(16)}`;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Base wallet balance reader', () => {
  it('reads native ETH and USDC balances from Base RPC', async () => {
    const requests: Array<{ method: string; params: unknown[] }> = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { method: string; params: unknown[] };
      requests.push({ method: body.method, params: body.params });
      const result = body.method === 'eth_chainId'
        ? '0x2105'
        : body.method === 'eth_getBalance'
          ? hex(123_000_000_000_000_000n)
          : body.method === 'eth_call'
            ? hex(4_567_890n)
            : '0x0';
      return Response.json({ jsonrpc: '2.0', id: 1, result });
    }));

    const balance = await fetchBaseWalletBalance({
      address: wallet,
      profile: BASE_NETWORK_PROFILES['base-mainnet'],
      rpcUrl: 'https://rpc.test',
    });

    expect(balance).toMatchObject({
      address: wallet,
      network: 'base-mainnet',
      chainId: 8453,
      ethBalance: 0.123,
      ethBalanceWei: '123000000000000000',
      usdcBalance: 4.56789,
      usdcBalanceUnits: '4567890',
      source: 'base-rpc',
    });
    expect(requests.map((request) => request.method)).toEqual(['eth_chainId', 'eth_getBalance', 'eth_call']);
    expect(requests[2].params).toEqual([
      {
        to: BASE_NETWORK_PROFILES['base-mainnet'].tokens.USDC.address,
        data: `0x70a08231${wallet.slice(2).padStart(64, '0')}`,
      },
      'latest',
    ]);
  });

  it('rejects wrong-network RPC responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ jsonrpc: '2.0', id: 1, result: '0x14a34' })));

    await expect(fetchBaseWalletBalance({
      address: wallet,
      profile: BASE_NETWORK_PROFILES['base-mainnet'],
      rpcUrl: 'https://rpc.test',
    })).rejects.toThrow(/Expected Base chain 8453/);
  });
});
