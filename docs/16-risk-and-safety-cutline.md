# 16. Risk and Safety Cutline

## Mainnet risks

- User signs unintended token approval.
- Swap amount too high.
- Slippage too high.
- Payment sent to wrong wallet.
- Fake tx hash accidentally treated as real.
- Revenue split sends wrong amount/address.

## Mitigations

- Enforce demo caps in server code.
- Require chain id 8453.
- Require wallet confirmation.
- Use exact platform wallet env.
- Use Base tx verifier before UI success state.
- Keep payment/swap amounts tiny.
- For approvals, prefer exact allowance when possible.

## Cutline

If real payment integration fails:
- Use real Base USDC transfer fallback.
- Do not use fake tx hash.

If PancakeSwap AI plugin fails:
- Use deep link/manual wallet swap path.
- Still verify real swap tx.

If revenue transfer is risky:
- Show calculated split and run one tiny proof transfer only if safe.
