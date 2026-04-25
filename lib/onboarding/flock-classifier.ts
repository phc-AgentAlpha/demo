import { getFlockConfig } from '../env';
import type { ClassifyStyleRequest, ClassifyStyleResponse, QualityTierFilter, TradingStyle } from '../types';

function fallbackFor(input: ClassifyStyleRequest): Omit<ClassifyStyleResponse, 'classificationSource'> {
  const isAggressive = input.riskPreference === 'high' && input.assetPreference === 'defi' && input.timeHorizon === 'short';
  const isConservative = input.riskPreference === 'low' && input.assetPreference === 'large' && input.timeHorizon === 'long';

  if (isAggressive) {
    return {
      tradingStyle: 'aggressive',
      classificationReason: 'High risk appetite, DeFi preference, and short horizon point to an aggressive discovery-oriented profile.',
      recommendedSignalFilters: { tradingStyle: 'aggressive', qualityTier: 'discovered', maxPriceUsdc: 1 },
    };
  }

  if (isConservative) {
    return {
      tradingStyle: 'conservative',
      classificationReason: 'Low risk appetite, large-cap preference, and long horizon point to a conservative verified-signal profile.',
      recommendedSignalFilters: { tradingStyle: 'conservative', qualityTier: 'verified', maxPriceUsdc: 1 },
    };
  }

  return {
    tradingStyle: 'neutral',
    classificationReason: 'The selected preferences balance risk, asset scope, and holding period, so the market can show both verified and discovery signals.',
    recommendedSignalFilters: { tradingStyle: 'neutral', qualityTier: 'all', maxPriceUsdc: 1 },
  };
}

export function fallbackClassifyStyle(input: ClassifyStyleRequest): ClassifyStyleResponse {
  return { ...fallbackFor(input), classificationSource: 'fallback' };
}

function validateTradingStyle(value: unknown): TradingStyle {
  if (value === 'aggressive' || value === 'neutral' || value === 'conservative') return value;
  throw new Error('Flock returned invalid tradingStyle');
}

function validateQualityTier(value: unknown): QualityTierFilter {
  if (value === 'verified' || value === 'discovered' || value === 'all') return value;
  throw new Error('Flock returned invalid qualityTier');
}

function extractJson(content: string) {
  const trimmed = content.trim();
  if (trimmed.startsWith('{')) return JSON.parse(trimmed) as Record<string, unknown>;
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Flock response did not contain JSON');
  return JSON.parse(match[0]) as Record<string, unknown>;
}

function normalizeFlockPayload(payload: Record<string, unknown>): ClassifyStyleResponse {
  const tradingStyle = validateTradingStyle(payload.tradingStyle);
  const filters = (payload.recommendedSignalFilters ?? {}) as Record<string, unknown>;
  const qualityTier = validateQualityTier(filters.qualityTier);
  const maxPriceUsdc = Number(filters.maxPriceUsdc ?? 1);
  if (!Number.isFinite(maxPriceUsdc) || maxPriceUsdc <= 0) throw new Error('Flock returned invalid maxPriceUsdc');

  return {
    tradingStyle,
    classificationSource: 'flock',
    classificationReason: String(payload.classificationReason ?? 'Flock classified this profile from the onboarding survey.'),
    recommendedSignalFilters: {
      tradingStyle,
      qualityTier,
      maxPriceUsdc: Math.min(maxPriceUsdc, 1),
    },
  };
}

export async function classifyStyleWithFlock(input: ClassifyStyleRequest, fetchImpl: typeof fetch = fetch): Promise<ClassifyStyleResponse> {
  const config = getFlockConfig();
  if (!config.apiKey) return fallbackClassifyStyle(input);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const prompt = `Classify the user for a tiny Base mainnet trading-signal demo. Return JSON only.\n\nRisk preference: ${input.riskPreference}\nAsset preference: ${input.assetPreference}\nTime horizon: ${input.timeHorizon}\nDemo max signal price: 1 USDC\nAllowed tradingStyle: aggressive, neutral, conservative\nAllowed qualityTier: verified, discovered, all`;

    const response = await fetchImpl(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: 'You classify trading-risk onboarding surveys. Respond with strict JSON and no markdown.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) throw new Error(`Flock HTTP ${response.status}`);
    const raw = (await response.json()) as Record<string, unknown>;
    const content =
      typeof raw.content === 'string'
        ? raw.content
        : typeof raw.output === 'string'
          ? raw.output
          : typeof (raw.choices as Array<{ message?: { content?: string } }> | undefined)?.[0]?.message?.content === 'string'
            ? (raw.choices as Array<{ message: { content: string } }>)[0].message.content
            : JSON.stringify(raw);

    return normalizeFlockPayload(extractJson(content));
  } catch (error) {
    if (config.requireLiveForDemo) throw error;
    const fallback = fallbackClassifyStyle(input);
    return {
      ...fallback,
      classificationReason: `${fallback.classificationReason} Flock was unavailable, so deterministic fallback was used.`,
    };
  } finally {
    clearTimeout(timeout);
  }
}
