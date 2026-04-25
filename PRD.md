# AgentAlpha v6 — Current Hybrid Live Demo PRD

_Last updated: 2026-04-25_

## 1. Product Definition

AgentAlpha v6 is a Base trading-signal marketplace demo where **only the market indexer is mocked**. Users onboard an agent, receive an agent wallet, subscribe to trading signals through x402, execute wallet-confirmed PancakeSwap swaps, and verify all payment/swap evidence against real Base transaction hashes.

### One-line pitch

Subscribe to curated Base trader signals, let an agent coordinate x402 payment and execution handoff, and prove every wallet/payment/swap result on-chain.

### Current demo positioning

| Area | Current state |
|---|---|
| Indexer | Deterministic mock indexer only via `lib/mock-indexer-data.ts` and `lib/indexer/mock-indexer.ts` |
| Payments | Live-required x402 exact-payment flow; no fake hashes for demo payment success |
| Execution | PancakeSwap AI/deep-link handoff; user wallet confirms swap; app verifies real Base tx hash |
| Wallet | CDP agent wallet path for x402 payer; deterministic local wallet only for non-demo dev fallback |
| Balances | Agent wallet ETH/USDC balances read from selected Base RPC |
| Onboarding | Flock-first risk/style classifier with deterministic fallback and persisted `classificationSource` |
| UI | Korean/English terminal-style UI with responsive shell, dashboard controller, wallet proof ledger |
| Network | Profiled Base Mainnet / Base Sepolia via environment variables |

## 2. Hard Scope Boundary

### In scope

1. Deterministic market/discovery data that behaves like an indexed Base signal marketplace.
2. Flock-first onboarding and persisted trading style.
3. Agent wallet issuance and wallet activity visibility through Basescan.
4. Read-only live balance reads from Base RPC.
5. Agent Run Controller that loops through signal scan → Flock-style signal evaluation log → x402 payment → PancakeSwap handoff log.
6. x402 payment adapter that creates/verifies exact-payment requirements and rejects fixture hashes.
7. PancakeSwap execution adapter that prepares a user-confirmed swap flow and verifies real swap hashes.
8. Local demo ledger for purchases, executions, derived relations, revenue split math, and run timeline.
9. Manual-live verification checklist for flows that cannot be fully wallet-automated in CI.

### Explicit non-goals

- No Base-wide live indexer.
- No Alchemy polling/webhook ingestion.
- No unlimited token approval creation.
- No server-side storage of user private keys.
- No automatic swap submission without wallet confirmation.
- No fake payment or swap success hashes in demo mode.
- No production trading bot guarantees, custody product, or high-value automation.

## 3. Target User Scenario

```text
Landing
  ↓
Onboarding survey + budget settings
  ↓
Flock LLM classification, fallback if unavailable
  ↓
Data-use consent
  ↓
Agent wallet issued
  ↓
Dashboard idle state
  ↓
User clicks “Start agent”
  ↓
Agent loop:
  - scan mock market by tradingStyle and budget
  - record Flock/signal evaluation log
  - initiate x402 USDC payment from agent wallet
  - connect payment success to PancakeSwap handoff
  - record timeline event
  - repeat on configured interval
  ↓
User watches live dashboard logs
  ↓
User stops agent; in-flight tx stage completes safely
  ↓
Wallet/proof/revenue/derived results are reviewed
```

## 4. Architecture

```text
Client UI
  - Landing / Onboarding / Market / Signal Detail / Dashboard / Wallet / Earnings / My Signals
  - Korean/English i18n toggle
  - Responsive desktop nav + mobile bottom tabs

App Router APIs
  - /api/classify-style
  - /api/profile
  - /api/agent/create
  - /api/agent/balance
  - /api/agent/run/start|status|stop
  - /api/payment/signal|verify|latest|[purchaseId]
  - /api/execution/prepare|confirm|[executionId]
  - /api/revenue/*
  - /api/signals/*

Adapters / Domain Libraries
  - lib/indexer/mock-indexer.ts
  - lib/payment/x402-payment.ts
  - lib/execution/pancakeswap-ai.ts
  - lib/tx/verify-base-tx.ts
  - lib/wallet/balance.ts
  - lib/revenue/distribute.ts
  - lib/agent/run-state-machine.ts
  - lib/ledger/store.ts

External / Live Boundaries
  - Flock.io classification when `FLOCK_API_KEY` exists
  - Coinbase CDP agent wallet when `CDP_AGENT_WALLET_MODE=cdp`
  - Base RPC for tx verification and wallet balances
  - x402 facilitator by network profile
  - PancakeSwap user-confirmed swap handoff
```

## 5. Data Model Summary

### UserProfile

Persists onboarding outcome:

- `riskPreference`, `assetPreference`, `timeHorizon`
- `tradingStyle`: `aggressive | neutral | conservative`
- `classificationSource`: `flock | fallback`
- `agentBudget`: max signal, daily max, max swap
- `consentToIndexing`
- `agentId`, `agentWalletAddress`, `agentWalletProvider`

### Agent wallet provider

Current accepted providers:

- `cdp-server-account`: preferred live x402 payer path.
- `deterministic-dev`: non-demo local fallback; cannot pass live x402 payment.
- `cdp-smart-account`: recognized for migration/history but intentionally rejected for current x402 exact EIP-3009 execution until verifier support is proven.

### Local ledger

`lib/ledger/store.ts` stores local demo state under `.data/ledger.json`:

- profiles
- agent issuances
- purchases
- executions
- derived relations
- revenue events
- agent runs and event timeline

`.data/` is ignored and must not be pushed.

## 6. Core Feature Requirements

### 6.1 Onboarding

- User answers risk, asset, horizon questions.
- User configures budget rails before classification.
- `POST /api/classify-style` calls Flock first when `FLOCK_API_KEY` exists.
- If Flock fails or is missing, deterministic fallback returns a valid trading style and `classificationSource=fallback`.
- User must consent before profile persistence allows later user/derived tracking.
- App issues an agent wallet after style setup; user does not manually type a payment wallet for the agent path.

### 6.2 Market and Discoveries

- `/market` shows at least 6 verified and 6 discovered deterministic signals.
- Verified cards include Nansen-style labels from fixtures.
- Discovered cards emphasize cheaper early signals.
- Filters support quality tier, style, search, sort, grid/table display.
- Trading style profile influences recommendation/signal matching.

### 6.3 Agent Wallet and Balance

- Agent wallet address can be copied.
- User can open agent wallet on the correct Basescan network.
- Deposit button prepares a real wallet-signed Base USDC transfer to the agent wallet.
- Withdraw remains policy-gated and must not create fake txs.
- ETH and USDC balances are read from Base RPC using:
  - `eth_getBalance`
  - ERC-20 `balanceOf` via `eth_call`
- If RPC balance read fails, UI shows loading/error/unavailable state, not a fake fallback.

### 6.4 Agent Run Controller

- Dashboard exposes start/stop controls.
- Run state machine records a timeline of scan, match, evaluation, payment, handoff, blocked, failed, and stop events.
- Stop requests do not imply cancelling in-flight external wallet actions.
- Scan interval is environment-controlled and defaults to a safe cadence.

### 6.5 Payment

- `/api/payment/signal` requires a persisted onboarding profile and issued agent wallet.
- Live payment path requires CDP server-account agent wallet proof.
- x402 exact-payment requirements must match the selected Base profile:
  - Base Mainnet: `eip155:8453`, USDC mainnet token, domain `USD Coin` v2.
  - Base Sepolia: `eip155:84532`, USDC Sepolia token, domain `USDC` v2.
- Payment success requires a real settlement hash verified by adapter/RPC/facilitator boundary.
- Signal detail can resume a confirmed purchase through `purchaseId` deep links or latest-purchase lookup.
- Fixture hashes are rejected outside test-only guarded paths.

### 6.6 Swap Execution

- Payment confirmation connects to PancakeSwap preparation UI.
- App prepares a PancakeSwap AI/deep-link/plugin handoff but does not auto-submit swaps.
- User wallet must confirm swap.
- User provides real Base swap tx hash for verification.
- `lib/tx/verify-base-tx.ts` verifies tx hash shape, chain, status, confirmations, and expected transfer evidence where applicable.

### 6.7 Derived and Revenue

- Confirmed post-purchase swap can create a derived relation when pair/direction/time evidence matches.
- Derived depth maps back to root source to avoid unbounded lineage.
- Revenue split math is deterministic.
- Transfer proof is optional/manual-live; no fake split transfer hash is created.

## 7. Environment and Network Profiles

### Required defaults

```env
INDEXER_MODE=mock
BASE_NETWORK=base-sepolia # or base-mainnet
NEXT_PUBLIC_BASE_NETWORK=base-sepolia
DEMO_MAX_SIGNAL_PRICE_USDC=1
DEMO_MAX_SWAP_USDC=1
PANCAKESWAP_SLIPPAGE_BPS=100
```

### Base Sepolia profile

- `BASE_SEPOLIA_RPC_URL=https://sepolia.base.org`
- `X402_SEPOLIA_FACILITATOR_URL=https://x402.org/facilitator`
- x402 network: `eip155:84532`
- USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`

### Base Mainnet profile

- `BASE_MAINNET_RPC_URL=https://mainnet.base.org`
- Requires production `X402_MAINNET_FACILITATOR_URL` or production `X402_FACILITATOR_URL`.
- Default `https://x402.org/facilitator` is treated as testnet-only and must not be used for mainnet.
- x402 network: `eip155:8453`
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

## 8. Safety Requirements

- Enforce max signal price and max swap caps server-side.
- Reject unsupported or cross-network env values.
- Reject malformed or fixture tx hashes.
- Never show a payment/swap hash as confirmed without verification.
- Do not store private keys client-side or server-side.
- Do not auto-submit swap txs.
- Do not create unlimited approvals.
- Keep indexer mock deterministic.
- Keep local ledger/docs/dogfood artifacts out of pushed code unless explicitly requested.

## 9. Acceptance Criteria

| ID | Criteria | Current verification mode |
|---|---|---|
| AC-01 | `/market` shows verified 6 + discovered 6+ | automated/e2e |
| AC-02 | quality tier/search/style/sort filters work | automated/e2e |
| AC-03 | verified cards show Nansen-style label chips | automated/UI |
| AC-04 | signal payment does not return fake tx hash | adapter tests + manual-live |
| AC-05 | payment tx confirmed state links to explorer | adapter/API + manual-live |
| AC-06 | confirmed payment unlocks payload | integration/manual-live |
| AC-07 | PancakeSwap flow produces user-confirmed swap tx | manual-live |
| AC-08 | swap tx hash is verified and linked | verifier tests + manual-live |
| AC-09 | post-purchase swap is recorded in ledger | automated |
| AC-10 | matching follow-up creates derived relation | automated |
| AC-11 | revenue split math and optional proof are shown | automated + manual proof |
| AC-12 | missing consent blocks user/derived registration | automated/e2e |
| AC-13 | derived depth maps to root | automated |
| AC-14 | `/discoveries` shows discovered-only page | automated/e2e |
| AC-15 | payment/swap/slippage caps are enforced | automated |
| AC-16 | Flock-first classification with explicit fallback | automated + live-key manual |
| AC-17 | persisted style affects recommendations and agent run | automated/e2e |
| AC-18 | agent wallet balance reads real Base RPC state | automated RPC contract + manual-live |
| AC-19 | dashboard agent run can start/stop and show timeline | automated/e2e |
| AC-20 | Korean/English UI toggle works across shell/pages | UI/manual smoke |

## 10. Current Known Manual-Live Checks

Before demoing real funds on Base Sepolia or Mainnet:

1. Set `BASE_NETWORK` and `NEXT_PUBLIC_BASE_NETWORK` to the target profile.
2. Configure CDP credentials and `CDP_AGENT_WALLET_MODE=cdp`.
3. Complete onboarding and verify a CDP server-account agent wallet is issued.
4. Open Basescan from dashboard/wallet and confirm the wallet address matches.
5. Fund the agent wallet with a small USDC amount under demo caps.
6. Confirm `/api/agent/balance` and UI show the real on-chain USDC/ETH balances.
7. Run x402 signal purchase and verify the real settlement hash.
8. Open PancakeSwap handoff, confirm swap in user wallet, paste real swap hash.
9. Verify swap explorer link, ledger update, derived relation, and revenue view.

## 11. Current Implementation Map

| Concern | File(s) |
|---|---|
| Mock indexer data | `lib/mock-indexer-data.ts`, `lib/indexer/mock-indexer.ts` |
| Flock classifier | `app/api/classify-style/route.ts`, `lib/onboarding/flock-classifier.ts` |
| Profile persistence | `app/api/profile/route.ts`, `lib/ledger/store.ts`, `lib/profile-migration.ts` |
| Agent wallet | `app/api/agent/create/route.ts`, `lib/agent/demo-agent.ts` |
| Live balances | `app/api/agent/balance/route.ts`, `lib/wallet/balance.ts` |
| Agent loop | `app/api/agent/run/*`, `lib/agent/run-state-machine.ts` |
| x402 payment | `app/api/payment/*`, `lib/payment/x402-payment.ts` |
| PancakeSwap handoff | `app/api/execution/*`, `lib/execution/pancakeswap-ai.ts` |
| Tx verification | `lib/tx/verify-base-tx.ts` |
| Wallet controls | `components/AgentWalletControls.tsx`, `components/WalletClient.tsx` |
| Dashboard controller | `components/DashboardClient.tsx` |
| Market/signals UI | `components/MarketClient.tsx`, `components/SignalCard.tsx`, `components/SignalDetailClient.tsx` |
| i18n | `lib/i18n.ts`, `components/I18nProvider.tsx` |
| Design shell | `components/shell/*`, `components/ui/*`, `app/globals.css`, `tailwind.config.ts` |

## 12. Success Definition

The demo is successful when:

1. Market and discovery screens are polished and deterministic.
2. Onboarding produces a persisted trading style and agent budget.
3. Agent wallet is issued and visible on Basescan.
4. Wallet balance numbers come from Base RPC, not mock fixtures.
5. Payment and swap success states require real verifiable hashes.
6. Agent Run Controller records a coherent timeline from scan to handoff.
7. Korean and English UI are both usable.
8. `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm test:e2e` pass.
