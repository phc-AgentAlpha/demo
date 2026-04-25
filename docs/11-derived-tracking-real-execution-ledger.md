# 11. Derived Tracking With Real Execution Ledger

Because the live indexer is out of scope, derived tracking uses the real swap tx returned by the execution flow.

## Flow

1. User buys signal.
2. User executes swap.
3. App verifies swap tx on Base.
4. App records swap tx in local `ExecutionEvent` ledger.
5. Similarity engine compares execution event with purchased signal.
6. If same pair + same direction + time proximity > threshold, create derived relation.

## Similarity

```ts
similarity = weightedAverage({
  samePair: 0.4,
  sameDirection: 0.4,
  timeProximity: 0.2
})
```

Derived if:

```ts
samePair && sameDirection && timeProximityScore > SIMILARITY_THRESHOLD
```

## This is not a fake indexer

The follow-up event is real because it is based on a real swap tx. What is mocked is only the broad background scanner that would have discovered it automatically in production.
