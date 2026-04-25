import { describe, expect, it } from 'vitest';
import { explorerAddressUrl, explorerTxUrl, getBaseNetworkProfile, resolveBaseNetwork, tokenAddress } from '@/lib/chains';

describe('Base network profiles', () => {
  it('builds Base mainnet transaction and address URLs by default', () => {
    const hash = `0x${'a'.repeat(64)}`;
    const address = '0x1111111111111111111111111111111111111111';

    expect(explorerTxUrl(hash)).toBe(`https://basescan.org/tx/${hash}`);
    expect(explorerAddressUrl(address)).toBe(`https://basescan.org/address/${address}`);
  });

  it('resolves mainnet and sepolia aliases', () => {
    expect(resolveBaseNetwork('base')).toBe('base-mainnet');
    expect(resolveBaseNetwork('8453')).toBe('base-mainnet');
    expect(resolveBaseNetwork('sepolia')).toBe('base-sepolia');
    expect(resolveBaseNetwork('84532')).toBe('base-sepolia');
  });

  it('exposes a Base Sepolia profile from official chain/x402/CDP identifiers', () => {
    const profile = getBaseNetworkProfile('base-sepolia', {});

    expect(profile).toMatchObject({
      key: 'base-sepolia',
      chainId: 84532,
      chainIdHex: '0x14a34',
      rpcUrl: 'https://sepolia.base.org',
      x402Network: 'eip155:84532',
      cdpApiNetwork: 'base-sepolia',
      cdpRpcNetwork: 'base-sepolia',
      cdpSdkNetwork: 'base-sepolia',
    });
    expect(profile.tokens.USDC.address).toBe('0x036CbD53842c5426634e7929541eC2318f3dCF7e');
    expect(explorerTxUrl(`0x${'b'.repeat(64)}`, profile)).toContain('https://sepolia.basescan.org/tx/');
  });

  it('rejects stale active RPC/USDC overrides from the other Base network', () => {
    expect(() => getBaseNetworkProfile('base-sepolia', { BASE_RPC_URL: 'https://mainnet.base.org' })).toThrow(/stale override/);
    expect(() => getBaseNetworkProfile('base-sepolia', { BASE_USDC_ADDRESS: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' })).toThrow(/stale override/);
  });

  it('allows network-specific token overrides for testnet-only assets', () => {
    const profile = getBaseNetworkProfile('base-sepolia', { BASE_SEPOLIA_AERO_ADDRESS: '0x5555555555555555555555555555555555555555' });

    expect(tokenAddress('AERO', profile)).toBe('0x5555555555555555555555555555555555555555');
    expect(() => tokenAddress('AERO', getBaseNetworkProfile('base-sepolia', {}))).toThrow(/Unsupported Base demo token/);
  });

  it('rejects mismatched public/server network env values', () => {
    expect(() => getBaseNetworkProfile(undefined, { BASE_NETWORK: 'base-mainnet', NEXT_PUBLIC_BASE_NETWORK: 'base-sepolia' })).toThrow(/must match/);
  });
});
