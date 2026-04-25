# 12. Revenue Distribution

## Rules

```text
indexed verified/discovered sale: platform 100%
user signal sale: owner 80%, platform 20%
derived sale:
  if root is user: root owner 50%
  if root is indexed: platform receives root 50%
  derived owner 30%
  platform 20%
```

## Demo implementation

At minimum:

- Calculate split deterministically.
- Render recipient, amount, and reason.
- For real USDC transfer proof, use platform wallet to send split or record x402 payment split proof.

## Important

If real split transfer is not feasible during live demo, do not fake it. Mark distribution as `calculated` and require manual transfer verification. However AC-11 only passes when at least one real transfer proof is shown.

## Transaction model

```ts
interface RevenueDistributionEvent {
  id: string;
  saleEventId: string;
  signalId: string;
  source: 'indexed' | 'user' | 'derived';
  distributions: Array<{
    role: 'platform' | 'rootOwner' | 'derivedOwner' | 'userOwner';
    address: string;
    amountUsdc: number;
    txHash?: string;
    status: 'calculated' | 'submitted' | 'confirmed' | 'failed';
  }>;
}
```
