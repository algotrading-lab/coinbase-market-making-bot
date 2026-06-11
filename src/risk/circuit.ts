export type MmRiskState = {
  day: string;
  realizedPnlUsd: number;
  haltedUntil: number;
  baseInventory: number;
};

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function shouldHalt(state: MmRiskState, maxLossUsd: number, now = Date.now()): boolean {
  if (now < state.haltedUntil) return true;
  return state.realizedPnlUsd <= -maxLossUsd;
}

export function tripBreaker(state: MmRiskState, cooldownMs: number, now = Date.now()): MmRiskState {
  return { ...state, haltedUntil: now + cooldownMs };
}

export function updateInventory(state: MmRiskState, baseInventory: number): MmRiskState {
  return { ...state, baseInventory };
}
