# 01. Scope and Non-goals

## In scope

- `verified` / `discovered` market from mock indexed snapshot.
- `/market`, `/market/[id]`, `/discoveries`, `/onboarding`, `/wallet`, `/earnings`, `/my-signals`.
- Real wallet connection.
- Real payment transaction.
- Signal unlock after confirmed payment.
- PancakeSwap AI/deep-link/plugin execution.
- Real swap transaction verification.
- Derived relation generated from real swap tx receipt + local event ledger.
- Revenue split calculation and real transfer proof path.

## Out of scope

- Alchemy indexer.
- Base-wide ERC-20 transfer scan.
- DEX router log parser.
- Production-grade Nansen credit optimization.
- Fully automated unattended trading.
- Large-value mainnet transactions.

## Cutline

If time is insufficient, reduce UI surface, not payment/swap reality.

Allowed cuts:
- Fewer charts.
- Simpler dashboard.
- Nansen live refresh omitted.
- Revenue transfer proof manual step.

Not allowed cuts:
- Fake payment hash.
- Fake swap hash.
- Fake explorer link.
- Pretending an unconfirmed tx is confirmed.
