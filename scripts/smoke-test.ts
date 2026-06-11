import { buildQuotes } from '../src/engine/quoter.js';

const s = {
  SPREAD_BPS: 8,
  ORDER_SIZE: 0.001,
  TARGET_BASE_INVENTORY: 0,
  SKEW_BPS_PER_UNIT: 50,
};

const bbo = { bid: 60000, ask: 60010, bidSize: 1, askSize: 1, ts: Date.now() };
const q = buildQuotes(bbo, 0.005, s);
if (q.bidPrice >= q.askPrice) throw new Error('bid must be below ask');
if (q.skewBps <= 0) throw new Error('positive inventory should skew quotes');
console.log('smoke-test: quote engine OK');
