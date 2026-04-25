import type { AgentBudget, QualityTierFilter, RecommendedSignalFilters, TradingStyle, UserProfile } from './types';

export interface DemoBudgetCaps {
  maxSignalPriceUsdc: number;
  maxSwapUsdc: number;
  slippageBps?: number;
}

export const DEFAULT_DEMO_BUDGET_CAPS: DemoBudgetCaps = {
  maxSignalPriceUsdc: 1,
  maxSwapUsdc: 1,
  slippageBps: 100,
};

export const DEFAULT_DAILY_AGENT_BUDGET_USDC = 5;

function roundedUsdc(value: number) {
  return Number(value.toFixed(2));
}

function finiteNumber(value: unknown, fallback: number) {
  const next = Number(value ?? fallback);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function positiveCap(value: unknown, fallback: number) {
  const next = finiteNumber(value, fallback);
  return next > 0 ? next : fallback;
}

function safeCaps(caps: DemoBudgetCaps = DEFAULT_DEMO_BUDGET_CAPS): Required<DemoBudgetCaps> {
  return {
    maxSignalPriceUsdc: positiveCap(caps.maxSignalPriceUsdc, DEFAULT_DEMO_BUDGET_CAPS.maxSignalPriceUsdc),
    maxSwapUsdc: positiveCap(caps.maxSwapUsdc, DEFAULT_DEMO_BUDGET_CAPS.maxSwapUsdc),
    slippageBps: positiveCap(caps.slippageBps, DEFAULT_DEMO_BUDGET_CAPS.slippageBps ?? 100),
  };
}

export function coerceAgentBudget(input: {
  agentBudget?: Partial<AgentBudget> | null;
  recommendedMaxPriceUsdc?: number;
  caps?: DemoBudgetCaps;
  dailyCap?: number;
}, options: { enforce?: boolean } = {}): AgentBudget {
  const caps = safeCaps(input.caps);
  const dailyCap = positiveCap(input.dailyCap, DEFAULT_DAILY_AGENT_BUDGET_USDC);
  const recommendedMax = finiteNumber(input.recommendedMaxPriceUsdc, caps.maxSignalPriceUsdc);
  const requestedMaxSignal = roundedUsdc(finiteNumber(input.agentBudget?.maxSignalPriceUsdc, Math.min(recommendedMax, caps.maxSignalPriceUsdc)));
  const requestedDailyMax = roundedUsdc(finiteNumber(input.agentBudget?.dailyMaxUsdc, Math.min(dailyCap, Math.max(requestedMaxSignal * 3, requestedMaxSignal))));
  const requestedMaxSwap = roundedUsdc(finiteNumber(input.agentBudget?.maxSwapUsdc, Math.min(caps.maxSwapUsdc, requestedMaxSignal)));

  if (options.enforce) {
    if (requestedMaxSignal <= 0 || requestedMaxSignal > caps.maxSignalPriceUsdc) {
      throw new Error(`Agent signal budget must be > 0 and <= ${caps.maxSignalPriceUsdc.toFixed(2)} USDC.`);
    }
    if (requestedMaxSwap <= 0 || requestedMaxSwap > caps.maxSwapUsdc) {
      throw new Error(`Agent swap budget must be > 0 and <= ${caps.maxSwapUsdc.toFixed(2)} USDC.`);
    }
    if (requestedDailyMax < requestedMaxSignal) {
      throw new Error('Daily agent budget must be greater than or equal to the per-signal budget.');
    }
    if (requestedDailyMax > dailyCap) {
      throw new Error(`Daily agent budget must be <= ${dailyCap.toFixed(2)} USDC for demo safety.`);
    }
    return {
      maxSignalPriceUsdc: requestedMaxSignal,
      dailyMaxUsdc: requestedDailyMax,
      maxSwapUsdc: requestedMaxSwap,
    };
  }

  const maxSignalPriceUsdc = roundedUsdc(clamp(requestedMaxSignal, 0.01, caps.maxSignalPriceUsdc));
  const dailyMaxUsdc = roundedUsdc(clamp(Math.max(requestedDailyMax, maxSignalPriceUsdc), maxSignalPriceUsdc, dailyCap));
  const maxSwapUsdc = roundedUsdc(clamp(requestedMaxSwap, 0.01, Math.min(caps.maxSwapUsdc, maxSignalPriceUsdc)));

  return { maxSignalPriceUsdc, dailyMaxUsdc, maxSwapUsdc };
}

function isTradingStyle(value: unknown): value is TradingStyle {
  return value === 'aggressive' || value === 'neutral' || value === 'conservative';
}

function isQualityTierFilter(value: unknown): value is QualityTierFilter {
  return value === 'verified' || value === 'discovered' || value === 'all';
}

function defaultQualityTier(style: TradingStyle): QualityTierFilter {
  if (style === 'aggressive') return 'discovered';
  if (style === 'conservative') return 'verified';
  return 'all';
}

export function migrateUserProfile(profile: UserProfile, options: {
  caps?: DemoBudgetCaps;
  dailyCap?: number;
} = {}): UserProfile {
  const legacy = profile as UserProfile & {
    agentBudget?: Partial<AgentBudget> | null;
    recommendedSignalFilters?: Partial<RecommendedSignalFilters> | null;
  };
  const tradingStyle = isTradingStyle(legacy.tradingStyle) ? legacy.tradingStyle : 'neutral';
  const filters: RecommendedSignalFilters = {
    tradingStyle: isTradingStyle(legacy.recommendedSignalFilters?.tradingStyle) ? legacy.recommendedSignalFilters.tradingStyle : tradingStyle,
    qualityTier: isQualityTierFilter(legacy.recommendedSignalFilters?.qualityTier) ? legacy.recommendedSignalFilters.qualityTier : defaultQualityTier(tradingStyle),
    maxPriceUsdc: roundedUsdc(finiteNumber(legacy.recommendedSignalFilters?.maxPriceUsdc, options.caps?.maxSignalPriceUsdc ?? DEFAULT_DEMO_BUDGET_CAPS.maxSignalPriceUsdc)),
  };
  const agentBudget = coerceAgentBudget({
    agentBudget: legacy.agentBudget,
    recommendedMaxPriceUsdc: filters.maxPriceUsdc,
    caps: options.caps,
    dailyCap: options.dailyCap,
  });

  return {
    ...profile,
    tradingStyle,
    recommendedSignalFilters: {
      ...filters,
      maxPriceUsdc: Math.min(filters.maxPriceUsdc, agentBudget.maxSignalPriceUsdc),
    },
    agentBudget,
  };
}
