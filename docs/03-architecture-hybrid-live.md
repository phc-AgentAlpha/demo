# 03. Hybrid Live Architecture

```text
Layer 0 — Mock Indexed Snapshot
  lib/mock-indexer-data.ts
  verified 6 + discovered 6 + excluded candidates
       ↓
Layer 1 — Quality/Label Presentation
  precomputed Nansen-like labels in snapshot
  optional Nansen live refresh adapter
       ↓
Layer 2 — Marketplace
  filters, listing score, price, detail, discoveries
       ↓
Layer 3 — User + Flock Onboarding + Real Payment + Real Execution
  onboarding survey → Flock style classification → profile/consent → wallet connect → x402/USDC payment → unlock
  PancakeSwap AI/deep-link/plugin → real Base swap tx
       ↓
Layer 4 — Local Event Ledger + Derived/Revenue
  payment tx + swap tx persisted
  similarity check → derived relation
  revenue split → real transfer proof
```

## Adapter boundaries

| Adapter | Mock? | Notes |
|---|---:|---|
| `MockIndexerAdapter` | yes | only source of market candidates |
| `NansenAdapter` | optional | live refresh only; not required for boot |
| `FlockOnboardingAdapter` | no live preferred, fallback allowed | classifies risk survey into tradingStyle |
| `PaymentAdapter` | no | must create/verify real tx |
| `PancakeExecutionAdapter` | no | must deep link/plugin real tx |
| `TxVerifier` | no | Base RPC/explorer verification |
| `DerivedLedger` | local | records real tx metadata; not Base-wide indexing |

## Data flow

1. App loads market candidates from `MockIndexerAdapter`.
2. User purchases signal through `PaymentAdapter`.
3. User completes onboarding; `FlockOnboardingAdapter` classifies risk/style and persists profile.
4. App verifies payment tx via `TxVerifier`.
4. Signal payload unlocks.
5. User executes trade through PancakeSwap AI flow.
6. App verifies swap tx.
7. App stores tx as post-purchase event.
8. Similarity engine creates derived relation if criteria match.
9. Revenue module creates distribution proof.
