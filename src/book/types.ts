export type Bbo = { bid: number; ask: number; bidSize: number; askSize: number; ts: number };

export type QuotePlan = {
  bidPrice: number;
  askPrice: number;
  size: number;
  skewBps: number;
};
