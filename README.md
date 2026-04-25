# AgentAlpha v6 Hybrid Live Demo

AgentAlpha is a hackathon MVP for an autonomous trading-signal marketplace on Base. The demo intentionally mocks only the indexer while keeping payment and swap proof paths connected to real Base transaction verification.

## What is live vs mocked

- **Mocked:** Base-wide indexing and trader discovery. Market data comes from deterministic fixtures in `lib/mock-indexer-data.ts` through the mock indexer adapter.
- **Live-required:** x402 signal payments, transaction hash verification, wallet activity links, and PancakeSwap swap proof. The app must not mark payment or swap success from fixture hashes.

## Core user flow

1. Complete onboarding survey.
2. Set agent spending limits.
3. Run Flock-first trading-style classification, with deterministic fallback when Flock is unavailable.
4. Persist consent and issue an Agent/AA wallet.
5. Fund the agent wallet on Base or Base Sepolia.
6. Start the dashboard Agent Run Controller.
7. The agent scans mock market signals, matches the saved profile, executes x402 payment, and hands off to PancakeSwap.
8. The user confirms the swap in a wallet and pastes the real swap transaction hash for verification.

## Important safety rules

- Do not build a live Base-wide indexer for this demo.
- Do not return fake payment or swap hashes.
- Do not store user private keys.
- Do not auto-submit swaps without wallet confirmation.
- Keep spending caps enforced with environment variables.
- Use Base Sepolia for safer live testing unless a production mainnet facilitator and funded wallets are configured.

## Environment setup

```bash
cp .env.example .env
pnpm install
pnpm dev
```

For Base Sepolia testing, set:

```env
BASE_NETWORK=base-sepolia
NEXT_PUBLIC_BASE_NETWORK=base-sepolia
X402_NETWORK=eip155:84532
X402_SEPOLIA_FACILITATOR_URL=https://x402.org/facilitator
```

Mainnet x402 requires a production facilitator via `X402_MAINNET_FACILITATOR_URL` or a production `X402_FACILITATOR_URL`; the default `https://x402.org/facilitator` is testnet-only.

## Useful commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

## Key paths

- `components/OnboardingForm.tsx` — survey, budget, Flock classification, consent, agent wallet issuance.
- `components/DashboardClient.tsx` — Agent Run Controller and event timeline.
- `lib/agent/run-state-machine.ts` — agent loop state machine.
- `lib/payment/x402-payment.ts` — x402 payment intent, settlement, and verification boundary.
- `lib/execution/pancakeswap-ai.ts` — PancakeSwap deep-link execution handoff and swap proof verification.
- `lib/ledger/store.ts` — local demo event ledger.
