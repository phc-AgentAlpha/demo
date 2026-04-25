import { getDemoCaps, numberEnv } from '../env';
import { getMarketSignals } from '../indexer/mock-indexer';
import { latestAgentRun, readLedger, saveAgentRun, savePurchase } from '../ledger/store';
import { createAgentX402PaymentIntent, executeAgentX402Payment } from '../payment/x402-payment';
import { migrateUserProfile } from '../profile-migration';
import type { AgentRunEvent, AgentRunEventSeverity, AgentRunState, AgentRunStatus, Signal, UserProfile } from '../types';
import { getCdpAgentPaymentSigner } from './demo-agent';

const MAX_RUN_EVENTS = 80;

function now() {
  return Date.now();
}

function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function agentScanIntervalMs() {
  const value = numberEnv('AGENT_SCAN_INTERVAL_MS', 300_000);
  if (!Number.isInteger(value) || value < 30_000 || value > 3_600_000) {
    throw new Error('AGENT_SCAN_INTERVAL_MS must be an integer between 30000 and 3600000.');
  }
  return value;
}

function requireAgentProfile(profile: UserProfile) {
  if (!profile.agentId || !profile.agentWalletAddress) throw new Error('An issued agent wallet is required before starting the agent loop.');
  if (!profile.consentToIndexing) throw new Error('Onboarding consent is required before agent run logging.');
}

function runtimeProfile(profile: UserProfile) {
  return migrateUserProfile(profile, {
    caps: getDemoCaps(),
    dailyCap: numberEnv('DEMO_MAX_DAILY_AGENT_BUDGET_USDC', 5),
  });
}

export function createIdleAgentRun(profile: UserProfile): AgentRunState {
  profile = runtimeProfile(profile);
  requireAgentProfile(profile);
  return {
    agentId: profile.agentId!,
    agentWalletAddress: profile.agentWalletAddress!,
    status: 'idle',
    updatedAt: now(),
    scanIntervalMs: agentScanIntervalMs(),
    cycleCount: 0,
    events: [],
  };
}

function runEvent(input: {
  state: AgentRunState;
  type: AgentRunEvent['type'];
  severity: AgentRunEventSeverity;
  message: string;
  status?: AgentRunStatus;
  signal?: Signal;
  purchaseId?: string;
  executionId?: string;
  txHash?: string;
  explorerUrl?: string;
  href?: string;
  metadata?: AgentRunEvent['metadata'];
}): AgentRunEvent {
  return {
    id: id('evt'),
    agentId: input.state.agentId,
    timestamp: now(),
    type: input.type,
    status: input.status ?? input.state.status,
    severity: input.severity,
    message: input.message,
    signalId: input.signal?.id,
    purchaseId: input.purchaseId,
    executionId: input.executionId,
    txHash: input.txHash,
    explorerUrl: input.explorerUrl,
    href: input.href ?? (input.signal ? `/market/${input.signal.id}` : undefined),
    metadata: input.metadata,
  };
}

function pushEvent(state: AgentRunState, event: AgentRunEvent): AgentRunState {
  return {
    ...state,
    status: event.status,
    updatedAt: event.timestamp,
    events: [event, ...state.events].slice(0, MAX_RUN_EVENTS),
  };
}

function withEvent(state: AgentRunState, event: Omit<Parameters<typeof runEvent>[0], 'state'>): AgentRunState {
  return pushEvent(state, runEvent({ state, ...event }));
}

function activeDailySpendUsdc(profile: UserProfile) {
  const agentWallet = profile.agentWalletAddress?.toLowerCase();
  if (!agentWallet) return 0;
  const windowStart = now() - 86_400_000;
  return readLedger().purchases
    .filter((purchase) => purchase.agentWalletAddress?.toLowerCase() === agentWallet || purchase.buyerAddress.toLowerCase() === agentWallet)
    .filter((purchase) => purchase.timestamp >= windowStart)
    .filter((purchase) => purchase.paymentStatus !== 'failed')
    .reduce((sum, purchase) => sum + purchase.priceUsdc, 0);
}

function recommendedSignals(profile: UserProfile) {
  const caps = getDemoCaps();
  const maxPriceUsdc = Math.min(
    profile.agentBudget.maxSignalPriceUsdc,
    profile.recommendedSignalFilters.maxPriceUsdc,
    caps.maxSignalPriceUsdc,
  );
  return getMarketSignals({
    qualityTier: profile.recommendedSignalFilters.qualityTier,
    tradingStyle: profile.recommendedSignalFilters.tradingStyle,
    maxPriceUsdc,
  });
}

function chooseSignal(profile: UserProfile) {
  const signals = recommendedSignals(profile);
  return signals.find((signal) => signal.isDemoPurchaseTarget) ?? signals[0];
}

function scheduleNextScan(state: AgentRunState): AgentRunState {
  const nextScanAt = now() + state.scanIntervalMs;
  return withEvent({ ...state, nextScanAt, status: 'running' }, {
    type: 'wait_scheduled',
    severity: 'info',
    status: 'running',
    message: `다음 스캔 예약: ${Math.round(state.scanIntervalMs / 1000)}초 후`,
    metadata: { nextScanAt },
  });
}

export async function startAgentRun(profile: UserProfile): Promise<AgentRunState> {
  profile = runtimeProfile(profile);
  requireAgentProfile(profile);
  const existing = latestAgentRun({ agentId: profile.agentId, agentWalletAddress: profile.agentWalletAddress });
  let state: AgentRunState = existing ?? createIdleAgentRun(profile);

  if (state.status === 'running') {
    state = withEvent(state, {
      type: 'run_info',
      severity: 'info',
      status: 'running',
      message: '에이전트 루프가 이미 실행 중입니다.',
    });
    saveAgentRun(state);
    return state;
  }

  const startedAt = now();
  state = withEvent({ ...state, status: 'running', startedAt, stoppedAt: undefined, lastError: undefined, scanIntervalMs: agentScanIntervalMs() }, {
    type: 'run_started',
    severity: 'success',
    status: 'running',
    message: '에이전트 루프 시작: 성향 매칭 → x402 결제 → PancakeSwap 준비 순서로 1회 사이클을 실행합니다.',
    metadata: { startedAt },
  });
  saveAgentRun(state);
  return runAgentCycle(profile, state);
}

export async function runAgentCycle(profile: UserProfile, currentState?: AgentRunState): Promise<AgentRunState> {
  profile = runtimeProfile(profile);
  requireAgentProfile(profile);
  let state = currentState ?? latestAgentRun({ agentId: profile.agentId, agentWalletAddress: profile.agentWalletAddress }) ?? createIdleAgentRun(profile);
  if (state.status !== 'running') state = { ...state, status: 'running' };

  state = withEvent(state, {
    type: 'scan_started',
    severity: 'info',
    status: 'running',
    message: `마켓 탐색 시작: ${profile.tradingStyle} 성향, ${profile.recommendedSignalFilters.qualityTier} 등급, 신호당 ${profile.agentBudget.maxSignalPriceUsdc.toFixed(2)} USDC 이하`,
  });

  const signal = chooseSignal(profile);
  if (!signal) {
    state = withEvent(state, {
      type: 'signal_skipped',
      severity: 'warning',
      status: 'running',
      message: '현재 예산/성향 조건에 맞는 신호가 없어 다음 주기까지 대기합니다.',
    });
    state = scheduleNextScan({ ...state, cycleCount: state.cycleCount + 1 });
    saveAgentRun(state);
    return state;
  }

  state = withEvent({ ...state, currentSignalId: signal.id }, {
    type: 'signal_matched',
    severity: 'success',
    status: 'running',
    message: `성향 매칭 신호 발견: ${signal.id} · ${signal.signalPayload.pair} · ${signal.priceUsdc.toFixed(2)} USDC`,
    signal,
    metadata: { priceUsdc: signal.priceUsdc, tradingStyle: signal.tradingStyle, qualityScore: signal.qualityScore },
  });

  const projectedSpend = activeDailySpendUsdc(profile) + signal.priceUsdc;
  if (projectedSpend > profile.agentBudget.dailyMaxUsdc) {
    state = withEvent({ ...state, status: 'blocked', lastError: 'daily_budget_exceeded' }, {
      type: 'budget_blocked',
      severity: 'warning',
      status: 'blocked',
      message: `일일 예산 초과 방지: 예상 ${projectedSpend.toFixed(2)} USDC / 한도 ${profile.agentBudget.dailyMaxUsdc.toFixed(2)} USDC`,
      signal,
      metadata: { projectedSpendUsdc: projectedSpend, dailyMaxUsdc: profile.agentBudget.dailyMaxUsdc },
    });
    saveAgentRun(state);
    return state;
  }

  try {
    state = withEvent(state, {
      type: 'payment_started',
      severity: 'info',
      status: 'running',
      message: `x402 결제 실행 시작: ${signal.id} · ${signal.priceUsdc.toFixed(2)} USDC`,
      signal,
    });
    const intent = createAgentX402PaymentIntent({ signalId: signal.id, agentWalletAddress: profile.agentWalletAddress!, priceUsdc: signal.priceUsdc });
    const { x402, ...purchase } = intent;
    savePurchase(purchase);
    state = { ...state, currentPurchaseId: purchase.id };

    const signer = process.env.AGENTALPHA_MOCK_X402_SETTLEMENT === 'true' ? undefined : await getCdpAgentPaymentSigner(profile);
    const executed = await executeAgentX402Payment({ profile, purchase, x402, signer });
    savePurchase(executed.purchase);

    if (executed.purchase.paymentStatus === 'confirmed' && executed.purchase.paymentTxHash) {
      state = withEvent({ ...state, currentPurchaseId: executed.purchase.id }, {
        type: 'payment_confirmed',
        severity: 'success',
        status: 'running',
        message: `x402 결제 확정: ${executed.purchase.paymentTxHash}`,
        signal,
        purchaseId: executed.purchase.id,
        txHash: executed.purchase.paymentTxHash,
        explorerUrl: executed.purchase.explorerUrl,
        href: `/market/${signal.id}`,
      });
      state = withEvent(state, {
        type: 'swap_ready',
        severity: 'info',
        status: 'running',
        message: '결제 성공. PancakeSwap 단계가 준비되었습니다. 지갑 확인 후 실제 swap tx를 검증해야 완료됩니다.',
        signal,
        purchaseId: executed.purchase.id,
        href: `/market/${signal.id}`,
      });
      state = scheduleNextScan({ ...state, cycleCount: state.cycleCount + 1, lastError: undefined });
    } else {
      state = withEvent({ ...state, currentPurchaseId: executed.purchase.id }, {
        type: 'payment_failed',
        severity: 'warning',
        status: 'blocked',
        message: `x402 settlement가 아직 confirmed 상태가 아닙니다: ${executed.purchase.paymentStatus}`,
        signal,
        purchaseId: executed.purchase.id,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    state = withEvent({ ...state, status: 'blocked', lastError: message }, {
      type: 'payment_failed',
      severity: 'error',
      status: 'blocked',
      message: `x402 결제 실패/차단: ${message}`,
      signal,
    });
  }

  saveAgentRun(state);
  return state;
}

export function stopAgentRun(profile: UserProfile): AgentRunState {
  profile = runtimeProfile(profile);
  requireAgentProfile(profile);
  let state = latestAgentRun({ agentId: profile.agentId, agentWalletAddress: profile.agentWalletAddress }) ?? createIdleAgentRun(profile);
  state = withEvent({ ...state, status: 'stopping' }, {
    type: 'stop_requested',
    severity: 'warning',
    status: 'stopping',
    message: '에이전트 종료 요청 수신. 진행 중인 tx는 중단하지 않고 완료/실패 상태를 보존합니다.',
  });
  const stoppedAt = now();
  state = withEvent({ ...state, status: 'stopped', stoppedAt, nextScanAt: undefined }, {
    type: 'run_stopped',
    severity: 'success',
    status: 'stopped',
    message: '에이전트 루프가 중단되었습니다.',
    metadata: { stoppedAt },
  });
  saveAgentRun(state);
  return state;
}

export function getAgentRun(profile: UserProfile): AgentRunState {
  profile = runtimeProfile(profile);
  requireAgentProfile(profile);
  return latestAgentRun({ agentId: profile.agentId, agentWalletAddress: profile.agentWalletAddress }) ?? createIdleAgentRun(profile);
}
