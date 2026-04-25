# AgentAlpha — 전체 기획서 v4.0

> Base 위 AA 에이전트 트레이딩 데이터를 인덱싱하고, 전략성 검증을 거쳐 마켓에 판매하며,
> 유저의 후속 거래까지 derived 신호로 추적해 원본 기여자에게 수익을 환원하는 온체인 데이터 경제.

---

## 1. Executive Summary

| 항목 | 내용 |
|------|------|
| 프로젝트명 | AgentAlpha |
| 버전 | v4.0 (해커톤 MVP 기준) |
| 한 줄 정의 | Base AA 에이전트 트레이딩 신호 마켓플레이스 + derived 신호 추적 시스템 |
| 핵심 차별점 | 전략성 점수 기반 신호 큐레이션 + 원본-파생 관계 추적 + 자동 수익 환원 |
| 스택 | Next.js 14, TypeScript, Tailwind, Alchemy, AgentKit, x402, Flock.io |
| 체인 | Base Sepolia (testnet) |

### 핵심 가치 제안

기존 카피트레이딩 플랫폼은 두 가지 한계가 있다.

첫째, **신호 품질 검증이 불투명**하다. 백테스트 조작과 허위 수익률 광고가 만연하다.
둘째, **데이터 생산자에게 보상이 없다**. 플랫폼이 데이터를 독점하고 수익을 가져간다.

AgentAlpha는 두 문제를 동시에 해결한다.

- **온체인 검증**: 모든 신호는 Base 온체인 트랜잭션 기반이라 조작 불가능하다.
- **전략성 큐레이션**: MEV 봇이나 단순 스왑 봇은 자동 필터링되고 진짜 트레이딩 전략을 가진 에이전트만 신호로 등록된다.
- **원본-파생 추적**: 유저가 신호를 사서 따라 거래한 행동도 인덱싱되어 마켓에 올라간다. 이때 원본 신호와의 관계가 저장되어 derived 신호 판매 시 원본 기여자에게 수익이 우선 배분된다.

---

## 2. 핵심 아키텍처 (4-Layer)

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1 — 인덱서                                         │
│                                                         │
│  Base 전체 트랜잭션                                        │
│       ↓ 주소별 DEX 상호작용 추출                            │
│       ↓ 최소 활동 기준 필터                                 │
│       ↓ 비전략성 주소 제거                                  │
│       ↓ 전략성 점수 계산 (4가지 지표)                        │
│       ↓ 트레이딩 지표 계산                                  │
│       ↓ 행동 유형 분류                                     │
│       ↓ Flock LLM 전략 태깅                               │
│  Signal DB 적재                                          │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 2 — 마켓플레이스                                   │
│                                                         │
│  source: external / user / derived 구분                  │
│  랭킹 (성과 + 안정성 + 전략성 점수)                          │
│  성향 필터, 상품 상세, 원본 여부 표시                         │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 3 — 유저                                          │
│                                                         │
│  설문 → 성향 분류 → 프로필 생성                             │
│  마켓 탐색 → 신호 선택 → x402 결제                          │
│  지갑/실행 모듈 연동 → DEX 스왑 → 성과                      │
└─────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 4 — 환원 및 재인덱싱                                │
│                                                         │
│  유저 후속 행동 재감지                                       │
│  ├── 원본 신호와 유사 → derived 태깅 → 원본 관계 저장          │
│  └── 비유사 → new candidate signal                        │
│                                                         │
│  신호 판매 시 source별 수익 배분                             │
│  ├── external → 플랫폼 수익                                │
│  ├── user original → 유저 80% / 플랫폼 20%                 │
│  └── derived → 원본 우선 배분 + 잔여분 분배                  │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Layer 1 — 인덱서 상세

### 3.1 데이터 소스
- **인프라**: Alchemy SDK (`alchemy_getAssetTransfers`)
- **fallback**: `lib/mock-data.ts` (해커톤 시연용)
- **체인**: Base Sepolia
- **수집 범위**: ERC-20 transfers + DEX 라우터 컨트랙트 상호작용

### 3.2 필터링 게이트

#### Gate 1: 최소 활동 기준
```typescript
interface MinActivityCriteria {
  totalTrades: number;        // ≥ 10건 (지난 30일)
  uniqueAssets: number;       // ≥ 2개 자산 페어
  totalVolumeUsdc: number;    // ≥ 500 USDC 누적 거래량
  activeDays: number;         // ≥ 5일 활동
}
```

이 기준 미달 주소는 신호 후보에서 제외. 일회성 테스트 거래나 dust 봇 제거.

#### Gate 2: 비전략성 주소 판별
다음 패턴 중 하나라도 해당하면 비전략성으로 분류해 제외한다.

- **MEV 봇 시그니처**: 같은 블록 내 sandwich 패턴, flashloan 사용
- **아비트라지 봇**: DEX 간 가격차 활용 거래만 반복
- **단순 스왑**: 매수만 또는 매도만 하는 일방향 거래
- **밋코인 펌프**: 신규 토큰 단기 진입 후 즉시 dump

판별은 휴리스틱 + 트랜잭션 패턴 분석. MVP에서는 단순화한 규칙으로 시작.

### 3.3 전략성 점수 (Strategy Score)

4가지 지표를 0-100으로 정규화 후 가중평균.

| 지표 | 정의 | 가중치 |
|------|------|------|
| **반복성** | 유사 거래 패턴 반복 빈도. 동일 자산/방향/사이즈 거래의 표준편차 | 30% |
| **회전율** | 평균 보유 기간의 일관성. 너무 짧으면 봇, 너무 일정하면 자동매매 | 20% |
| **자산집중도** | 거래 자산의 집중도. 너무 분산하면 무전략, 너무 집중하면 도박 | 25% |
| **손익일관성** | 수익/손실 분포의 변동성. 일관된 패턴이 전략적 행동의 증거 | 25% |

**임계값**: 종합 점수 ≥ 60점만 신호 후보로 등록.

### 3.4 트레이딩 지표 계산

```typescript
interface AgentMetrics {
  return30d: number;            // 30일 수익률 (%)
  sharpeRatio: number;          // 평균수익 / 표준편차
  maxDrawdown: number;          // 최대 낙폭 (%, 음수)
  winRate: number;              // 승률 (%)
  totalTrades: number;
  avgHoldingPeriodHours: number;
  totalVolumeUsdc: number;
}
```

### 3.5 행동 유형 분류

```typescript
type BehaviorType =
  | 'likely_systematic'   // 자동매매/봇 패턴 — 안정적, 반복적
  | 'likely_manual'       // 수동 트레이딩 — 비정형, 인간 패턴
  | 'unknown';            // 판별 불가
```

분류 근거: 거래 시간 분포(잠자는 시간 거래 여부), 가스비 패턴, 사이즈 일관성.

### 3.6 Flock LLM 전략 태깅

Flock LLM이 메트릭과 거래 패턴을 보고 다음을 자동 태깅한다.

- **트레이딩 스타일**: 공격형 / 중립형 / 보수형
- **전략 태그**: `["ETH 롱", "고빈도", "스윙", "DeFi 알트", "스테이블 차익"]` 등 자유 태그 1-3개

### 3.7 Signal DB 스키마

```typescript
interface IndexedSignal {
  id: string;
  sourceAgentAddress: string;
  source: 'external' | 'user' | 'derived';
  ownerAddress?: string;        // user / derived일 때
  parentSignalId?: string;      // derived일 때 원본 신호 ID
  isAA: boolean;
  metrics: AgentMetrics;
  strategyScore: number;        // 0-100
  behaviorType: BehaviorType;
  tradingStyle: 'aggressive' | 'neutral' | 'conservative';
  strategyTags: string[];
  pnlHistory: { date: string; value: number }[];
  registeredAt: number;
  totalSales: number;
  lastIndexedBlock: number;
}
```

---

## 4. Layer 2 — 마켓플레이스 상세

### 4.1 신호 노출 정책

#### 랭킹 점수 (Listing Score)

```
listing_score =
    0.40 × normalize(return30d)
  + 0.25 × normalize(sharpeRatio)
  + 0.20 × strategyScore / 100
  + 0.15 × normalize(-maxDrawdown)
```

높은 점수 = 상단 노출.

#### 필터
- 매매 성향: 전체 / 공격형 / 중립형 / 보수형
- 행동 유형: 전체 / systematic / manual
- 원본 여부: 전체 / external / user / derived
- 가격 범위: 슬라이더

#### 정렬
- 추천순 (listing_score)
- 수익률 높은순
- 안정성 (Sharpe) 높은순
- 가격 낮은순
- 최근 활동순

### 4.2 상품 상세 페이지

표시 정보:
- 원천 에이전트 주소 + Base Explorer 링크
- 원본/파생 여부 명시 (derived면 원본 신호 링크 표시)
- 30일 PnL 곡선
- 4대 지표 (수익률 / Sharpe / MDD / 승률)
- 전략성 점수 + 4개 세부 지표 breakdown
- 행동 유형 (systematic / manual)
- 최근 거래 5건 (자산 페어, 방향, 시간)
- 가격 + x402 구매 버튼

### 4.3 가격 결정

- **external 신호**: 자동 가격 책정 (전략성 점수 + 수익률 기반)
- **user/derived 신호**: 등록 시 자동 산정 가격 또는 유저가 조정 가능

기본 산식:
```
price = base_price × (1 + return_factor) × strategy_factor
base_price = 0.30 USDC
return_factor = clamp(return30d / 100, 0, 2)
strategy_factor = strategyScore / 50
```

가격 범위: 0.30 ~ 5.00 USDC.

---

## 5. Layer 3 — 유저 상세

### 5.1 온보딩 플로우

```
[Step 1/3] 리스크 성향
  안전 추구 / 균형 / 고수익 추구

[Step 2/3] 선호 자산
  대형 안정 (BTC/ETH) / DeFi 알트 / 자유

[Step 3/3] 투자 기간
  단기 (1일-1주) / 중기 (1-4주) / 장기 (1달+)

      ↓ Flock LLM 분류

  공격형 / 중립형 / 보수형

      ↓ 동의 단계

  "내 거래 데이터가 익명으로 인덱싱되어 마켓에서 판매될 수 있으며,
   판매 수익의 80%를 자동 수령합니다." (체크박스 필수)

      ↓ 프로필 생성

  유저 프로필 + 매매 성향 저장
```

### 5.2 신호 구매 및 실행

```
1. 마켓 탐색 (성향 매칭 추천 우선)
2. 신호 상세 확인
3. 'x402로 구매' 클릭
4. USDC 결제 요청
   - 유저 지갑이 충분 → 진행
   - 부족 → 충전 안내
5. 결제 트랜잭션 해시 반환
6. 신호 데이터 수신 (자산 페어, 방향, 진입가, 손절가, 목표가)
7. 실행 옵션 선택:
   - 자동 실행: AgentKit이 즉시 DEX 스왑
   - 수동 실행: 유저가 직접 지갑 사용
8. 스왑 완료 → 트랜잭션 해시 + 결과 표시
```

### 5.3 실행 모듈 연동

**자동 실행 (AgentKit)**
- AgentKit으로 발급된 유저 전용 지갑이 신호 따라 자동 스왑
- 슬리피지 한도, 최대 사이즈 등 안전장치 설정 가능

**수동 실행**
- 유저가 외부 지갑(MetaMask 등)으로 직접 실행
- AgentAlpha는 추적만 (지갑 주소를 통해 후속 행동 인덱싱)

---

## 6. Layer 4 — 환원 및 재인덱싱 상세

### 6.1 후속 온체인 행동 재감지

신호 구매 후 N시간(default: 24시간) 동안 유저 지갑의 트랜잭션을 모니터링한다.

```typescript
async function trackPostPurchaseBehavior(
  buyerAddress: string,
  signalId: string,
  windowHours: number = 24
) {
  const purchaseTime = await getPurchaseTimestamp(signalId, buyerAddress);
  const endTime = purchaseTime + windowHours * 3600;

  const txs = await alchemy.core.getAssetTransfers({
    fromAddress: buyerAddress,
    fromBlock: blockAtTime(purchaseTime),
    toBlock: blockAtTime(endTime),
    category: ['erc20'],
  });

  for (const tx of txs.transfers) {
    if (await isDexInteraction(tx.hash)) {
      await classifyDerivedBehavior(tx, signalId);
    }
  }
}
```

### 6.2 원본 유사도 판별

3가지 차원으로 비교한다.

```typescript
interface SimilarityCheck {
  // 1. 자산 페어 일치
  samePair: boolean;

  // 2. 방향 일치 (매수/매도)
  sameDirection: boolean;

  // 3. 시간 근접도 (구매 후 N시간 이내)
  timeProximityScore: number;  // 0-1
}

function isDerived(check: SimilarityCheck): boolean {
  return check.samePair
      && check.sameDirection
      && check.timeProximityScore > 0.5;
}
```

조건 충족 → derived 신호로 태깅, 원본 신호 ID와의 관계 저장.

### 6.3 derived 신호 처리

derived 신호가 마켓에 올라가도 원본 신호와의 관계는 영구 보존된다.

```typescript
interface DerivedRelation {
  derivedSignalId: string;
  parentSignalId: string;
  similarity: number;          // 0-1
  detectedAt: number;
  txHashes: string[];          // 증거 트랜잭션
}
```

### 6.4 derived 깊이 제한

derived 신호가 또 다른 derived를 낳는 무한 체인을 방지한다.

- **MAX_DERIVED_DEPTH**: 2 (root → derived → derived까지만)
- 3단계 이상 derived는 root 신호로 직접 매핑하여 정산
- 구현 시 `parent_signal_id`를 따라 root까지 거슬러 올라감

### 6.5 수익 배분 로직

```typescript
async function distributeRevenue(saleEvent: SaleEvent) {
  const signal = await getSignal(saleEvent.signalId);
  const price = saleEvent.priceUsdc;

  switch (signal.source) {
    case 'external':
      // 100% 플랫폼 수익
      await transferToPlatform(price);
      break;

    case 'user':
      // 80% 유저, 20% 플랫폼
      await transferTo(signal.ownerAddress!, price * 0.8);
      await transferToPlatform(price * 0.2);
      break;

    case 'derived':
      // 50% 원본 기여자, 30% 파생 기여자, 20% 플랫폼
      const root = await findRootSignal(signal.id);
      if (root.source === 'user') {
        await transferTo(root.ownerAddress!, price * 0.5);
      } else {
        await transferToPlatform(price * 0.5);
      }
      await transferTo(signal.ownerAddress!, price * 0.3);
      await transferToPlatform(price * 0.2);
      break;
  }
}
```

---

## 7. 데이터 모델 전체 정리

### 7.1 IndexedSignal (Signal DB의 모든 row)

```typescript
interface IndexedSignal {
  id: string;
  sourceAgentAddress: string;
  source: 'external' | 'user' | 'derived';
  ownerAddress?: string;
  parentSignalId?: string;
  isAA: boolean;
  metrics: AgentMetrics;
  strategyScore: number;
  strategyBreakdown: {
    repetition: number;
    turnover: number;
    concentration: number;
    consistency: number;
  };
  behaviorType: BehaviorType;
  tradingStyle: 'aggressive' | 'neutral' | 'conservative';
  strategyTags: string[];
  pnlHistory: { date: string; value: number }[];
  priceUsdc: number;
  registeredAt: number;
  totalSales: number;
  lastIndexedBlock: number;
}
```

### 7.2 UserProfile

```typescript
interface UserProfile {
  walletAddress: string;
  agentId: string;
  tradingStyle: 'aggressive' | 'neutral' | 'conservative';
  riskPreference: 'low' | 'medium' | 'high';
  assetPreference: 'large' | 'defi' | 'all';
  timeHorizon: 'short' | 'mid' | 'long';
  consentToIndexing: boolean;
  consentTimestamp: number;
  createdAt: number;
  mySignalIds: string[];
}
```

### 7.3 SaleEvent

```typescript
interface SaleEvent {
  id: string;
  signalId: string;
  buyerAddress: string;
  priceUsdc: number;
  txHash: string;
  timestamp: number;
  distribution: {
    toRoot?: { address: string; amount: number };
    toDerived?: { address: string; amount: number };
    toPlatform: number;
  };
}
```

### 7.4 DerivedRelation

```typescript
interface DerivedRelation {
  derivedSignalId: string;
  parentSignalId: string;
  rootSignalId: string;       // 최상위 root까지의 reference
  depth: number;              // 1 = 첫 번째 derived
  similarity: number;
  detectedAt: number;
  evidenceTxHashes: string[];
}
```

### 7.5 Transaction

```typescript
interface Transaction {
  hash: string;
  type:
    | 'signal_buy'
    | 'revenue_receive_owner'
    | 'revenue_receive_root'
    | 'revenue_receive_derived'
    | 'swap_in'
    | 'swap_out'
    | 'deposit'
    | 'withdraw';
  description: string;
  amountUsdc: number;
  timestamp: number;
  explorerUrl: string;
  relatedSignalId?: string;
}
```

---

## 8. API 엔드포인트

```
app/api/
├── classify-style/route.ts             POST  Flock LLM 성향 분류
├── consent/route.ts                    POST  인덱싱 동의 저장
├── agent/
│   ├── create/route.ts                 POST  AgentKit 지갑 발급
│   ├── swap/route.ts                   POST  DEX 스왑 실행
│   └── balance/route.ts                GET   USDC 잔액
├── indexer/
│   ├── agents/route.ts                 GET   인덱싱된 AA 목록
│   ├── agents/[address]/route.ts       GET   특정 에이전트 상세
│   ├── strategy-score/route.ts         POST  전략성 점수 재계산
│   └── sync/route.ts                   POST  수동 인덱싱 트리거
├── signals/
│   ├── route.ts                        GET   신호 목록 (필터/정렬)
│   ├── [id]/route.ts                   GET   신호 상세
│   ├── [id]/derivations/route.ts       GET   해당 신호의 파생 신호 목록
│   └── [id]/lineage/route.ts           GET   원본까지의 lineage 트리
├── payment/
│   └── signal/route.ts                 POST  x402 결제
├── tracking/
│   └── post-purchase/route.ts          POST  구매 후 행동 추적 시작
├── revenue/
│   ├── distribute/route.ts             POST  결제 후 수익 분배
│   └── earnings/route.ts               GET   수익 현황
└── transactions/route.ts               GET   트랜잭션 히스토리
```

---

## 9. 환경변수

```bash
# Flock.io
FLOCK_API_KEY=
FLOCK_API_BASE_URL=https://platform.flock.io/api/v1

# AgentKit
CDP_API_KEY_NAME=
CDP_API_KEY_PRIVATE_KEY=

# x402
X402_FACILITATOR_URL=https://x402.org/facilitator

# Alchemy
ALCHEMY_API_KEY=
ALCHEMY_BASE_SEPOLIA_URL=https://base-sepolia.g.alchemy.com/v2/

# Base
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_SEPOLIA_CHAIN_ID=84532
UNISWAP_V3_ROUTER=0x2626664c2603336E57B271c5C0b26F421741e481
AERODROME_ROUTER=0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43

# 플랫폼 지갑
PLATFORM_WALLET_PRIVATE_KEY=
PLATFORM_WALLET_ADDRESS=

# 수익 분배 비율
USER_REVENUE_SHARE=0.8
DERIVED_ROOT_SHARE=0.5
DERIVED_OWNER_SHARE=0.3
DERIVED_PLATFORM_SHARE=0.2

# 추적 윈도우
POST_PURCHASE_TRACKING_HOURS=24
SIMILARITY_THRESHOLD=0.5
MAX_DERIVED_DEPTH=2

# 인덱서 임계값
MIN_TOTAL_TRADES=10
MIN_UNIQUE_ASSETS=2
MIN_VOLUME_USDC=500
MIN_ACTIVE_DAYS=5
MIN_STRATEGY_SCORE=60
```

---

## 10. 화면 목록

| 라우트 | 화면 | 핵심 데이터 |
|--------|------|-----------|
| `/onboarding` | 설문 + 동의 | Flock LLM, 동의 체크 |
| `/dashboard` | 에이전트 대시보드 | 잔액, 내 신호 상태, 최근 거래 |
| `/market` | 마켓플레이스 | 신호 목록, 필터, 정렬 |
| `/market/[id]` | 신호 상세 | 메트릭, lineage, 구매 버튼 |
| `/earnings` | 수익 대시보드 | 트레이딩 PnL + 신호 판매 + derived 분배 |
| `/wallet` | 지갑/정산 | USDC 잔액, 트랜잭션, 분배 내역 |
| `/my-signals` | 내 신호 관리 | 등록된 내 신호 + derived 트리 |

---

## 11. Acceptance Criteria

| ID | 시나리오 | 기대 결과 |
|----|---------|---------|
| AC-01 | 마켓 진입 | 전략성 점수 60+ 신호만 노출 |
| AC-02 | 비전략성 주소 차단 | MEV 봇 / 단순 스왑 봇 인덱싱 제외 확인 |
| AC-03 | 신호 상세 | 4대 지표 + 전략성 점수 breakdown + lineage 표시 |
| AC-04 | x402 결제 | 트랜잭션 해시 + USDC 차감 확인 |
| AC-05 | 자동 실행 | AgentKit 스왑 트랜잭션 생성 + Explorer 링크 |
| AC-06 | derived 감지 | 24시간 내 유사 거래 → derived 태깅 + 원본 관계 저장 |
| AC-07 | 수익 분배 | source별 분배 비율대로 USDC 송금 확인 |
| AC-08 | 동의 미체크 | 인덱싱 동의 안 한 유저는 user 신호 등록 안 됨 |
| AC-09 | depth 제한 | derived의 derived는 root로 직접 매핑 |

---

## 12. 6시간 빌드 계획

해커톤 시간 제약을 고려한 우선순위.

### Phase 1 — Core (0:00 ~ 2:30)
- 프로젝트 셋업, 디자인 토큰
- 온보딩 설문 + Flock LLM 분류
- AgentKit 지갑 발급
- 마켓플레이스 목업 (mock data 12개)

### Phase 2 — Marketplace (2:30 ~ 4:00)
- 신호 상세 페이지 + lineage 표시
- x402 결제 플로우
- AgentKit 스왑 1건 시연

### Phase 3 — Differentiation (4:00 ~ 5:30)
- 전략성 점수 계산 (mock 기반)
- derived 신호 시뮬레이션 (1건)
- 수익 분배 트랜잭션 1건 시연

### Phase 4 — Polish (5:30 ~ 6:00)
- 발표 준비, 데모 시나리오 정리
- 폴백 플랜 점검

### 폴백 우선순위

실제 구현 못하면 mock으로 대체할 순서:

1. Alchemy 인덱싱 → mock data
2. 전략성 점수 → 사전 계산된 mock 점수
3. derived 감지 → 시연용 1건 하드코딩
4. x402 Sepolia 미지원 → USDC 전송 트랜잭션으로 시연

---

## 13. 핵심 차별점 요약

| 구분 | 기존 카피트레이딩 | AgentAlpha v4 |
|------|-----------------|--------------|
| 데이터 소스 | 플랫폼 자체 트레이더 | Base 온체인 전체 AA 에이전트 |
| 검증 방식 | 플랫폼 주장 (불투명) | 전략성 점수 + 온체인 검증 |
| 봇/MEV 필터링 | 없음 | 비전략성 주소 자동 제거 |
| 데이터 소유권 | 플랫폼 독점 | 유저 귀속 + 동의 기반 |
| 수익 환원 | 없음 | 원본 80% + derived 깊이별 분배 |
| 결제 방식 | 월정액 구독 | x402 단건 마이크로페이먼트 |
| 후속 추적 | 없음 | derived 신호 자동 감지 + 분배 |

---

_AgentAlpha 전체 기획서 v4.0 · Base Agent Hackathon #1 · 2025_