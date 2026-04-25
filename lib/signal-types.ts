export type QualityTierDisplay = 'verified' | 'discovered';
export type TradingStyleDisplay = 'aggressive' | 'neutral' | 'conservative';
export type DirectionDisplay = 'BUY' | 'SELL';

export interface SignalCardData {
  id: string;
  trader: string;
  pair: string;
  direction: DirectionDisplay;
  tier: QualityTierDisplay;
  style: TradingStyleDisplay;
  price: number;
  originalPrice?: number;
  pnl30d: number;
  qualityScore: number;
  trades: number;
  activeDays: number;
  assetCount: number;
  lastTradeAt: number;
  sparkline: number[];
  labels?: string[];
  earlyDiscoveryDays?: number;
  thesis?: string;
  aboveCap?: boolean;
}
