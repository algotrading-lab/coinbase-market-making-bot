import type { Settings } from '../config/env.js';
import type { Bbo, QuotePlan } from '../book/types.js';

export function buildQuotes(bbo: Bbo, baseInventory: number, s: Settings): QuotePlan {
  const mid = (bbo.bid + bbo.ask) / 2;
  const halfSpread = (s.SPREAD_BPS / 10_000) * mid;

  const invDelta = baseInventory - s.TARGET_BASE_INVENTORY;
  const skewBps = invDelta * s.SKEW_BPS_PER_UNIT;
  const skewPx = mid * (skewBps / 10_000);

  // Long inventory → lower bid & ask to encourage sells
  const bidPrice = mid - halfSpread - skewPx;
  const askPrice = mid + halfSpread - skewPx;

  return {
    bidPrice: round(bidPrice),
    askPrice: round(askPrice),
    size: s.ORDER_SIZE,
    skewBps,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
