# AgentAlpha — 전체 기획서 v6.0

> v5 대비 변경: Smart Money 한정 → **Base 전체 DEX 트레이딩 인덱싱 + Nansen 품질 필터링**.
> 데이터 풀이 넓어지고, Nansen 라벨이 큐레이션 도구가 됨.

---

## 1. Executive Summary

| 항목 | 내용 |
|------|------|
| 프로젝트명 | AgentAlpha |
| 버전 | v6.0 (해커톤 MVP) |
| 한 줄 정의 | Base 전체 DEX 트레이딩 인덱싱 + Nansen 품질 필터링 + derived 신호 추적 마켓 |
| 핵심 차별점 | 자체 인덱싱으로 풍부한 데이터 풀 + Nansen으로 품질 검증 + 원본-파생 추적 |
| 스택 | Next.js 14, TypeScript, Tailwind |
| 외부 인프라 | **Nansen API** (라벨/검증) + **PancakeSwap AI** (DEX 실행) + **Alchemy** (인덱싱) |
| 결제 | x402 Protocol |
| LLM | Flock.io |
| 체인 | Base Mainnet |

### v5 → v6 핵심 변화

v5는 Nansen Smart Money 5,000개 지갑만 인덱싱했음. 이 방식의 한계:
- 데이터 풀이 Nansen 큐레이션에 100% 의존
- 신규/언더그라운드 트레이더는 영원히 마켓에 없음
- 차별화 포인트가 약함 ("Nansen 데이터 보여주는 사이트")

v6에서는 **자체 인덱서로 Base 전체 DEX 트랜잭션을 수집**하고, 그중 일정 활동량을 충족한 지갑을 후보군으로 만든 뒤, **Nansen으로 라벨링/품질 점수 부여**해서 마켓에 노출함.

```
v5 흐름: Nansen Smart Money 목록 → 마켓
v6 흐름: Base 전체 DEX 거래 → 활동량 필터 → Nansen 라벨 보강 → 마켓
```

이렇게 되면:
- **데이터 풀이 압도적으로 넓어짐**: Smart Money 외 모든 활성 트레이더 포함
- **Nansen은 검증 도구로 활용**: 라벨 있음 = 검증된 지갑 / 라벨 없음 = 신규 발굴
- **차별화 분명해짐**: 우리만의 인덱싱 + 외부 검증 보강

---

## 2. 5-Layer 아키텍처

```
Layer 0 — Raw 인덱싱 (Alchemy)
  Base 전체 트랜잭션 → DEX 라우터 상호작용만 추출
  주소별로 거래 그룹화
       ↓
Layer 1 — 1차 필터 + 검증 (자체 + Nansen)
  Gate 1: 최소 활동 기준 (volume / 빈도 / 자산 다양성)
  Gate 2: Nansen 라벨 조회 → 품질 점수 부여
       ├── Nansen 라벨 있음: 검증된 지갑 (Smart Money / Whale 등)
       └── Nansen 라벨 없음: 신규 후보 (자체 메트릭만으로 평가)
       ↓
Layer 2 — 마켓플레이스
  source: indexed (검증) / indexed (신규) / user / derived
  랭킹: Nansen 라벨 + 자체 PnL + 활동 빈도
       ↓
Layer 3 — 유저 (Onboarding + 실행)
  설문 → Flock LLM 분류 → 프로필
  마켓 탐색 → 신호 선택 → x402 결제
       ↓
  PancakeSwap AI swap-planner
       ↓
Layer 4 — 환원 및 재인덱싱
  Layer 0이 유저 후속 거래 자동 감지
  유사 → derived 태깅 / 비유사 → 신규 후보
  source별 수익 분배
```

v5와의 차이는 **Layer 0**이 새로 생긴 것. Layer 1이 "Nansen에서 받기" → "Nansen으로 검증하기"로 바뀜.

---

## 3. Layer 0 — Raw 인덱싱 (Alchemy)

### 3.1 데이터 수집 범위

| 수집 대상 | 도구 | 빈도 |
|---------|------|------|
| Base 전체 ERC-20 transfers | Alchemy `getAssetTransfers` | 5분 폴링 또는 webhook |
| DEX 라우터 컨트랙트 상호작용 | Alchemy logs filtering | 실시간 |
| 주소별 거래 누적 | 자체 DB | upsert |

### 3.2 DEX 라우터 화이트리스트 (Base Mainnet)

```typescript
const DEX_ROUTERS = [
  '0x2626664c2603336E57B271c5C0b26F421741e481', // Uniswap V3 SwapRouter02
  '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43', // Aerodrome Router
  '0x8c7d3063579bdb0b9e1d9e4c5e0f1f4f5e5e5e5e', // PancakeSwap V3 (Base)
  // 필요시 추가
]
```

### 3.3 인덱싱 파이프라인

```typescript
// lib/indexer.ts

async function indexRecentTrades(fromBlock: number, toBlock: number) {
  // 1. Alchemy에서 DEX 라우터 대상 ERC-20 transfers 가져오기
  const transfers = await alchemy.core.getAssetTransfers({
    fromBlock: hex(fromBlock),
    toBlock: hex(toBlock),
    category: ['erc20'],
    contractAddresses: DEX_ROUTERS,
  });

  // 2. 주소별 그룹화
  const byWallet = groupTradesByWallet(transfers);

  for (const [address, trades] of Object.entries(byWallet)) {
    await upsertWalletActivity(address, trades);
  }
}
```

`ALCHEMY_API_KEY` 없으면 mock-data.ts의 mockTrades 반환.

---

## 4. Layer 1 — 1차 필터 + Nansen 검증

### 4.1 Gate 1: 최소 활동 기준

```typescript
interface MinActivityCriteria {
  totalTrades30d: number;       // ≥ 5
  uniqueAssets: number;         // ≥ 2
  totalVolumeUsd: number;       // ≥ 1,000
  activeDays30d: number;        // ≥ 3
}
```

이 기준 미달 지갑은 후보에서 제외 (dust 봇, 일회성 거래자 제거).

### 4.2 Gate 2: Nansen 라벨 조회

후보로 살아남은 지갑에 대해 Nansen Profiler로 라벨 + PnL 조회.

```typescript
// lib/nansen.ts

async function enrichWithNansen(walletAddress: string) {
  // 라벨 조회 (100 credits — common labels만 사용)
  const labelsRes = await nansen.profiler.labels({
    address: walletAddress,
  });

  // PnL summary (1 credit)
  const pnlRes = await nansen.profiler.pnlSummary({
    address: walletAddress,
    chain: 'base',
  });

  return {
    labels: labelsRes.labels || [],
    pnl30d: pnlRes.pnl_30d,
    winRate: pnlRes.win_rate,
    realizedUsd: pnlRes.realized_usd,
  };
}
```

### 4.3 품질 점수 계산

Nansen 라벨 유무에 따라 다른 산식 적용.

```typescript
function calculateQualityScore(
  walletData: WalletActivity,
  nansenData: NansenEnrichment | null
): { score: number; tier: QualityTier; signals: string[] } {

  // Nansen 라벨이 있으면 → '검증' 트랙
  if (nansenData?.labels.length) {
    const score = calculateVerifiedScore(nansenData);
    return {
      score,
      tier: 'verified',
      signals: nansenData.labels,  // ['Smart Money', 'Top PnL Trader']
    };
  }

  // Nansen 라벨이 없으면 → '신규 후보' 트랙
  const selfScore = calculateSelfScore(walletData);
  return {
    score: selfScore,
    tier: 'discovered',
    signals: ['Newly Discovered'],  // 자체 발굴
  };
}

// 검증 트랙: Nansen 데이터에 가중치
function calculateVerifiedScore(nansen: NansenEnrichment): number {
  const labelBonus = nansen.labels.includes('Smart Money') ? 30 :
                     nansen.labels.includes('Whale') ? 20 :
                     nansen.labels.includes('Top PnL Trader') ? 25 : 10;

  return clamp(
    50 +                                   // 기본 50점 (Nansen 라벨 있음)
    labelBonus +                           // 라벨별 보너스
    Math.min(20, nansen.pnl30d / 5),       // PnL 기여 (max 20)
    50, 100
  );
}

// 신규 후보 트랙: 자체 활동 메트릭만으로
function calculateSelfScore(activity: WalletActivity): number {
  const volumeScore = Math.min(20, activity.totalVolumeUsd / 10000);  // 0-20
  const consistencyScore = activity.activeDays30d / 30 * 25;          // 0-25
  const diversityScore = Math.min(20, activity.uniqueAssets * 4);     // 0-20
  const recentScore = activity.daysSinceLastTrade < 7 ? 15 : 5;       // 5 or 15

  return clamp(volumeScore + consistencyScore + diversityScore + recentScore, 0, 80);
  // 검증되지 않았으니 max 80점으로 제한
}
```

### 4.4 마켓 진입 임계값

```typescript
const QUALITY_THRESHOLDS = {
  verified: 60,      // Nansen 라벨 있는 지갑은 60점 이상
  discovered: 50,    // 신규 후보는 50점 이상
}
```

이 기준 통과 지갑만 Signal로 등록.

### 4.5 Credit 비용 최적화

Nansen Profiler labels는 100 credits로 가장 비쌈. 무한정 호출할 수 없음.

전략:
- **Gate 1 통과한 지갑만 Nansen 호출** (1차 필터로 호출 횟수 제어)
- **결과 캐싱**: 24시간 캐시 → 같은 지갑 재호출 방지
- **선택적 호출**: PnL이 임계값 이상인 지갑만 라벨 조회 (PnL=1 credit으로 사전 필터)

```typescript
async function enrichOnlyIfPromising(address: string) {
  // 먼저 PnL만 조회 (싸다)
  const pnl = await nansen.profiler.pnlSummary({ address, chain: 'base' });

  if (pnl.pnl_30d < 5 && pnl.win_rate < 50) {
    return null;  // 라벨 조회 생략
  }

  // 유망한 지갑만 라벨 조회
  return await nansen.profiler.labels({ address });
}
```

---

## 5. Signal 데이터 모델 (Updated)

```typescript
interface Signal {
  id: string;
  sourceWalletAddress: string;
  source: 'indexed' | 'user' | 'derived';
  ownerAddress?: string;            // user / derived일 때
  parentSignalId?: string;
  rootSignalId?: string;
  derivedDepth: number;

  // 품질 정보
  qualityTier: 'verified' | 'discovered';
  qualityScore: number;             // 0-100

  // Nansen 데이터 (verified일 때)
  nansenLabels: string[];           // ['Smart Money', 'Top PnL Trader']
  nansenPnl30d: number | null;
  nansenWinRate: number | null;

  // 자체 인덱싱 데이터 (모든 신호)
  totalTrades30d: number;
  totalVolumeUsd: number;
  uniqueAssets: number;
  activeDays30d: number;
  daysSinceLastTrade: number;

  // 행동 정보 (Flock LLM)
  tradingStyle: 'aggressive' | 'neutral' | 'conservative';
  strategyTags: string[];
  tradingPairs: string[];
  recentTrades: RawTrade[];

  // 마켓 정보
  priceUsdc: number;
  listingScore: number;
  registeredAt: number;
  lastActiveAt: number;
  totalSales: number;
}
```

---

## 6. 마켓플레이스 노출 정책

### 6.1 카테고리별 분리 노출

마켓 상단을 두 개 섹션으로 분리.

```
┌─────────────────────────────────────────┐
│  [검증된 트레이더] (verified)              │
│   Nansen 라벨 보유 / 신뢰도 높음           │
│   기본 가격대 높음 (예: 1.0~3.0 USDC)     │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  [신규 발굴] (discovered)                 │
│   자체 인덱싱 / 검증 전이지만 활동량 우수    │
│   저렴한 가격 (예: 0.3~0.8 USDC)          │
│   "Early Discovery" 배지                  │
└─────────────────────────────────────────┘
```

이 구조의 장점:
- 검증된 트레이더는 안전한 선택지
- 신규 발굴은 저렴하지만 잠재 고수익 → 데이터 발굴 게임화
- 유저가 신규 발굴자를 사고 그게 대박 나면 → 우리 마켓의 고유 가치 증명

### 6.2 가격 책정

```typescript
function calculatePrice(signal: Signal): number {
  const basePrice = signal.qualityTier === 'verified' ? 1.00 : 0.30;
  const scoreFactor = signal.qualityScore / 50;
  const pnlFactor = (signal.nansenPnl30d ?? 0) > 0
    ? Math.min(2.0, 1 + signal.nansenPnl30d / 100)
    : 1.0;

  return clamp(basePrice * scoreFactor * pnlFactor, 0.30, 5.00);
}
```

### 6.3 필터

```typescript
interface SignalFilters {
  qualityTier?: 'verified' | 'discovered' | 'all';
  tradingStyle?: 'aggressive' | 'neutral' | 'conservative';
  nansenLabels?: string[];           // 'Smart Money', 'Whale' 등
  minQualityScore?: number;
  priceRange?: [number, number];
  source?: 'indexed' | 'user' | 'derived';
}
```

---

## 7. Layer 4 — 환원 및 재인덱싱

### 7.1 후속 행동 추적 (자체 인덱서 활용)

v5는 Nansen profiler로 추적했지만, v6는 **이미 Layer 0이 전체 거래를 인덱싱**하므로 자체 데이터만으로 추적 가능.

```typescript
async function trackPostPurchaseBehavior(
  buyerAddress: string,
  signalId: string,
  purchaseTimestamp: number,
  windowHours = 24
) {
  // 자체 DB에서 유저 거래 조회
  const trades = await db.trades.findMany({
    where: {
      walletAddress: buyerAddress,
      timestamp: {
        gte: purchaseTimestamp,
        lte: purchaseTimestamp + windowHours * 3600,
      },
    },
  });

  const originalSignal = await getSignal(signalId);

  for (const tx of trades) {
    const similarity = checkSimilarity(tx, originalSignal, purchaseTimestamp);
    if (isDerived(similarity)) {
      await createDerivedSignal({
        sourceWalletAddress: buyerAddress,
        parentSignalId: signalId,
        rootSignalId: originalSignal.rootSignalId || signalId,
        depth: (originalSignal.derivedDepth || 0) + 1,
        evidenceTxHash: tx.hash,
      });
    }
  }
}
```

Nansen API 호출 없이 자체 DB만 쓰므로 비용 0.

### 7.2 수익 분배

```
indexed (verified) 신호 판매: 플랫폼 100%
indexed (discovered) 신호 판매: 플랫폼 100%
user 신호 판매: 유저 80% + 플랫폼 20%
derived 신호 판매:
  - root가 user면: 원본 유저 50%
  - root가 indexed면: 플랫폼 50%
  - 파생자 30%
  - 플랫폼 20%
```

---

## 8. 환경변수

```bash
# Alchemy (Layer 0)
ALCHEMY_API_KEY=
ALCHEMY_BASE_URL=https://base-mainnet.g.alchemy.com/v2/

# Nansen API (Layer 1 검증)
NANSEN_API_KEY=
NANSEN_API_BASE_URL=https://api.nansen.ai/api/v1

# PancakeSwap AI (Layer 3 실행)
PANCAKESWAP_AI_MODE=plugin
PANCAKESWAP_CHAIN_ID=8453
PANCAKESWAP_SLIPPAGE_BPS=100

# Flock.io LLM
FLOCK_API_KEY=
FLOCK_API_BASE_URL=https://platform.flock.io/api/v1
FLOCK_MODEL=gemini-3-flash

# x402
X402_FACILITATOR_URL=https://x402.org/facilitator

# Base
BASE_RPC_URL=https://mainnet.base.org
BASE_CHAIN_ID=8453
BASE_EXPLORER=https://basescan.org

# DEX 라우터
UNISWAP_V3_ROUTER=0x2626664c2603336E57B271c5C0b26F421741e481
AERODROME_ROUTER=0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43

# 플랫폼 지갑
PLATFORM_WALLET_ADDRESS=
PLATFORM_WALLET_PRIVATE_KEY=

# 수익 분배
USER_REVENUE_SHARE=0.8
DERIVED_ROOT_SHARE=0.5
DERIVED_OWNER_SHARE=0.3
DERIVED_PLATFORM_SHARE=0.2

# 활동 임계값
MIN_TOTAL_TRADES=5
MIN_UNIQUE_ASSETS=2
MIN_VOLUME_USD=1000
MIN_ACTIVE_DAYS=3

# 품질 임계값
MIN_VERIFIED_SCORE=60
MIN_DISCOVERED_SCORE=50

# 추적
POST_PURCHASE_TRACKING_HOURS=24
SIMILARITY_THRESHOLD=0.5
MAX_DERIVED_DEPTH=2

# Nansen 캐시
NANSEN_CACHE_HOURS=24

# 개발
NEXT_PUBLIC_USE_MOCK=true
```

---

## 9. 화면 변경사항 (v5 대비)

### 마켓플레이스
- 두 개 섹션으로 분리: **검증된 트레이더 / 신규 발굴**
- 각 카드에 `qualityTier` 배지
- Nansen 라벨이 있으면 보라색 라벨 칩 (Smart Money / Whale 등)
- 신규 발굴은 "Early Discovery" 골드 배지

### 신호 상세
- verified: Nansen 라벨 + PnL summary + 자체 활동 데이터 둘 다 표시
- discovered: 자체 활동 데이터만 강조 (활동량/일관성/다양성)

### 신규 페이지: `/discoveries`
- 신규 발굴 트레이더만 모은 페이지
- "이 트레이더가 검증되기 전에 발견하세요" 컨셉
- 정렬: 최근 등록순 / 자체 점수 높은순

---

## 10. 6시간 빌드 계획 (Updated)

| Phase | 시간 | 작업 |
|-------|------|------|
| 0 | 0:00–0:30 | 셋업, 디자인 토큰, 타입 정의, mock 데이터 (verified 6 + discovered 6) |
| 1 | 0:30–1:30 | 공통 컴포넌트 + 온보딩 + Flock LLM 분류 |
| 2 | 1:30–3:00 | Layer 0 (Alchemy) + Layer 1 (Nansen 검증) + 마켓 화면 |
| 3 | 3:00–4:00 | 신호 상세 + x402 결제 플로우 |
| 4 | 4:00–4:45 | PancakeSwap AI 통합 + deep link 시연 |
| 5 | 4:45–5:30 | derived 추적 + 수익 분배 1건 시연 |
| 6 | 5:30–6:00 | /discoveries 페이지 + 발표 자료 |

### 폴백 우선순위

1. Alchemy 인덱싱 미완 → mockSignals 12개 (verified 6 + discovered 6)
2. Nansen API 미연동 → 모든 mock signal을 'discovered' 처리, 일부만 verified로 하드코딩
3. PancakeSwap AI 자동 실행 미동작 → deep link 모드만
4. derived 자동 추적 미동작 → 사전 시드된 mock derived 1개

---

## 11. 핵심 차별점 (v5 → v6)

| 항목 | v5 | v6 |
|------|-----|------|
| 데이터 풀 | Nansen Smart Money 5천 지갑 한정 | Base 전체 활성 트레이더 |
| Nansen 역할 | 데이터 소스 | 검증/라벨링 도구 |
| 신규 발굴 | 불가능 | 가능 ('discovered' 트랙) |
| 가격 차별화 | 없음 | verified vs discovered |
| 데이터 소유권 | Nansen에 의존 | 자체 인덱싱 |
| 차별화 강도 | 약함 (Nansen 데이터 가공) | 강함 (자체 마켓 + Nansen 보강) |

---

## 12. Acceptance Criteria

| ID | 시나리오 | 기대 결과 |
|----|---------|---------|
| AC-01 | 마켓 진입 | verified + discovered 신호 각각 6개 이상 표시 |
| AC-02 | qualityTier 필터 | 탭 전환으로 verified만 / discovered만 필터링 |
| AC-03 | Nansen 라벨 | verified 신호에 Nansen 라벨 칩 표시 |
| AC-04 | 신호 구매 | x402 결제 트랜잭션 해시 반환 |
| AC-05 | DEX 실행 | PancakeSwap AI deep link 또는 자동 실행 트랜잭션 확인 |
| AC-06 | 후속 추적 | 자체 DB에서 24h 내 유저 거래 감지 (Nansen 호출 없이) |
| AC-07 | derived 등록 | 유사 거래 → derived 태깅 + 원본 관계 저장 |
| AC-08 | 수익 분배 | source별 비율대로 USDC 분배 트랜잭션 확인 |
| AC-09 | 동의 미체크 | 인덱싱 동의 안 한 유저는 user 신호 등록 안 됨 |
| AC-10 | depth 제한 | derived의 derived는 root로 직접 매핑 |
| AC-11 | /discoveries | 신규 발굴 페이지 단독 노출 |

---

_AgentAlpha v6.0 · 자체 인덱싱 + Nansen 검증 보강 · Base Agent Hackathon #1 · 2025_
