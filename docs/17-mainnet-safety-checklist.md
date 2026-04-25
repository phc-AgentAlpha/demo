# 17. Mainnet Safety Checklist

Before live demo:

- [ ] `INDEXER_MODE=mock`
- [ ] `NEXT_PUBLIC_ENABLE_REAL_PAYMENTS=true`
- [ ] `NEXT_PUBLIC_ENABLE_REAL_SWAPS=true`
- [ ] `BASE_CHAIN_ID=8453`
- [ ] `PLATFORM_WALLET_ADDRESS` verified
- [ ] `DEMO_MAX_SIGNAL_PRICE_USDC <= 1.00`
- [ ] `DEMO_MAX_SWAP_USDC <= 1.00`
- [ ] `PANCAKESWAP_SLIPPAGE_BPS <= 100`
- [ ] user wallet has only demo-sized funds
- [ ] no private key exposed to browser
- [ ] no unlimited approval required
- [ ] payment tx verifier tested
- [ ] swap tx verifier tested
- [ ] explorer links work
- [ ] fallback language prepared if Nansen/Flock optional APIs fail

During demo:

- [ ] confirm every wallet modal amount and recipient
- [ ] wait for tx confirmation before saying complete
- [ ] copy tx hashes to `STATUS.md`
- [ ] do not increase caps live
