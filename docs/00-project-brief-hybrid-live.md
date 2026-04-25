# 00. Project Brief — Hybrid Live Demo

AgentAlpha v6 demo는 Base 전체 DEX 인덱싱을 직접 구축하지 않는다. 대신 v6의 결과물처럼 보이는 indexed snapshot을 mock으로 사용한다.

하지만 사용자가 실제로 체감하는 핵심 단계는 live다.

- 신호 구매: 실제 결제 tx 필요.
- DEX 실행: 실제 PancakeSwap/Base swap tx 필요.
- 수익 분배: 실제 USDC transfer proof 또는 payment split proof 필요.

데모의 설득력은 “모든 데이터가 live”가 아니라 “데이터 discovery는 mock이어도 money flow와 trade flow는 real”이라는 점에서 나온다.
