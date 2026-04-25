# AgentAlpha v6.0 — Hybrid Live Demo PRD

_Last updated: 2026-04-25_

## 1. One-line definition

AgentAlpha v6 is a Base trading-signal marketplace demo where only the indexer is mocked. Onboarding, agent wallet issuance, x402 payment coordination, Base RPC balance reads, PancakeSwap swap proof, and transaction verification are implemented as live-facing flows.

## 2. Scope

### Mocked

| Area | Current handling |
|---|---|
| Base-wide indexer | Deterministic mock data from `lib/mock-indexer-data.ts` |
| Alchemy polling/webhook | Out of scope; not implemented |
| Candidate wallet aggregation | Deterministic fixture metrics |
| Nansen enrichment | Nansen-style fixture labels/scores for demo market cards |

### Live-facing / real proof required

| Area | Requirement |
|---|---|
| Flock classification | Call Flock first when `FLOCK_API_KEY` exists; otherwise deterministic fallback with `classificationSource=fallback` |
| Agent wallet | Issue CDP agent wallet when configured; deterministic fallback only for local non-demo dev |
| Balances | Read ETH/USDC from selected Base RPC; no fake balance fallback |
| Payment | x402 exact-payment flow; no fake payment hashes in demo mode |
| Swap execution | PancakeSwap AI/deep-link handoff; user wallet confirmation required |
| Tx verification | Verify real Base tx hash/status/chain/transfer evidence where applicable |
| Ledger | Store local proof events, derived relations, run timeline, and revenue math |

## 3. Current product flow

1. User enters landing page.
2. User completes onboarding survey and budget settings.
3. App classifies trading style with Flock-first, fallback-explicit behavior.
4. User consents to local demo tracking.
5. App issues an agent wallet.
6. Dashboard shows idle agent state, Basescan link, live RPC balances, and run controls.
7. User starts the agent.
8. Agent run loop logs scan → signal match → evaluation → x402 payment → PancakeSwap handoff.
9. Payment success unlocks signal payload and connects to execution UI; purchase detail can be resumed by purchase id/latest lookup.
10. User confirms swap in wallet and submits real swap tx hash.
11. App verifies tx, records ledger evidence, creates derived relation when matching, and updates wallet/revenue views.

## 4. Network behavior

- `BASE_NETWORK=base-sepolia` switches server and client to Base Sepolia.
- `BASE_NETWORK=base-mainnet` switches to Base Mainnet.
- Mainnet x402 requires a production facilitator; `https://x402.org/facilitator` is treated as testnet-only.
- USDC token and EIP-3009 domain are selected by network profile.

## 5. Safety constraints

- Keep `INDEXER_MODE=mock`.
- Do not build live Base-wide indexing.
- Do not integrate Alchemy polling/webhook.
- Do not return fake payment or swap hashes.
- Do not store user private keys.
- Do not auto-submit swaps.
- Do not create unlimited token approvals.
- Enforce demo caps: `DEMO_MAX_SIGNAL_PRICE_USDC`, `DEMO_MAX_SWAP_USDC`, `PANCAKESWAP_SLIPPAGE_BPS`.
- Show fixture labels only in non-demo/test paths; demo payment/swap success must use real hashes.

## 6. Acceptance criteria

| ID | Scenario | Expected result |
|---|---|---|
| AC-01 | Market entry | verified 6 + discovered 6+ signals displayed |
| AC-02 | Filters | quality tier/style/search/sort filters work |
| AC-03 | Labels | verified cards show Nansen-style chips |
| AC-04 | Payment | no fake payment hash accepted as success |
| AC-05 | Payment verification | confirmed payment links to explorer proof |
| AC-06 | Unlock | confirmed payment unlocks payload |
| AC-07 | Swap | PancakeSwap handoff requires user wallet confirmation |
| AC-08 | Swap verification | real swap tx hash is verified and linked |
| AC-09 | Ledger | post-purchase execution is recorded |
| AC-10 | Derived | matching follow-up creates derived relation |
| AC-11 | Revenue | split math/proof UI is shown without fake transfer proof |
| AC-12 | Consent | no user/derived registration without consent |
| AC-13 | Depth | derived depth maps back to root |
| AC-14 | Discoveries | `/discoveries` shows discovered-only view |
| AC-15 | Caps | payment/swap/slippage caps enforced |
| AC-16 | Flock | Flock-first classification or explicit fallback persists |
| AC-17 | Recommendations | trading style influences recommendations/agent matching |
| AC-18 | Balance | wallet balance numbers come from Base RPC |
| AC-19 | Agent loop | start/stop/timeline states work |
| AC-20 | i18n/UI | Korean/English responsive UI works |

## 7. Verification commands

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

Manual-live checks remain required for funded x402 settlement and user-confirmed PancakeSwap swap on the selected Base network.
