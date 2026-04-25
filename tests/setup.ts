import { beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.VITEST = 'true';
process.env.INDEXER_MODE = 'mock';
process.env.DEMO_MAX_SIGNAL_PRICE_USDC = '1';
process.env.DEMO_MAX_SWAP_USDC = '1';
process.env.PANCAKESWAP_SLIPPAGE_BPS = '100';
process.env.PLATFORM_WALLET_ADDRESS = '0x1111111111111111111111111111111111111111';
process.env.NEXT_PUBLIC_ENABLE_REAL_PAYMENTS = 'true';
process.env.NEXT_PUBLIC_ENABLE_REAL_SWAPS = 'true';
process.env.AGENTALPHA_MOCK_TX_VERIFIER = 'true';

beforeEach(() => {
  const file = path.join(os.tmpdir(), `agentalpha-ledger-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  process.env.AGENTALPHA_LEDGER_PATH = file;
  fs.mkdirSync(path.dirname(file), { recursive: true });
});
