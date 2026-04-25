# 09. API Spec — Hybrid Live

## Market / mock indexer

- `GET /api/signals`
- `GET /api/signals/:id`
- `GET /api/discoveries`
- `GET /api/signals/:id/lineage`

These read from mock indexed snapshot.

## User / onboarding

- `POST /api/classify-style`
  - Input: `riskPreference`, `assetPreference`, `timeHorizon`
  - Calls Flock first when available.
  - Fallback: deterministic `rule_based` classifier.
  - Output: `tradingStyle`, `classificationSource`, `classificationReason`, `recommendedSignalFilters`.
- `POST /api/consent`
- `POST /api/profile`
- `GET /api/profile`

## Payment live

- `POST /api/payment/signal`
- `GET /api/payment/:purchaseId`
- `POST /api/payment/verify`

## Execution live

- `POST /api/execution/prepare`
- `POST /api/execution/confirm`
- `GET /api/execution/:executionId`

## Derived / revenue

- `POST /api/tracking/post-purchase`
- `GET /api/signals/:id/derivations`
- `GET /api/revenue/earnings`
- `POST /api/revenue/distribute`
- `GET /api/transactions`

## No live indexer endpoints

Do not implement:

- `/api/indexer/sync`
- `/api/indexer/agents`
- `/api/indexer/raw`
- Alchemy webhook handlers

If routes are needed for UI compatibility, they must return static mock-indexer metadata and clearly avoid live Alchemy calls.
