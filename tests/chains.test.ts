import { describe, expect, it } from 'vitest';
import { explorerAddressUrl, explorerTxUrl } from '@/lib/chains';

describe('Base explorer helpers', () => {
  it('builds BaseScan transaction and address URLs', () => {
    const hash = `0x${'a'.repeat(64)}`;
    const address = '0x1111111111111111111111111111111111111111';

    expect(explorerTxUrl(hash)).toBe(`https://basescan.org/tx/${hash}`);
    expect(explorerAddressUrl(address)).toBe(`https://basescan.org/address/${address}`);
  });
});
