import { settings } from './config/env.js';
import { createLogger } from './config/logger.js';
import { closeRedisClient, isRedisEnabled, pingRedis } from './cache/redis.js';
import { cacheGet, cacheSet } from './cache/store.js';
import { streamBbo, syntheticBboStream } from './book/level2.js';
import { buildQuotes } from './engine/quoter.js';
import { shouldHalt, tripBreaker, todayKey, type MmRiskState } from './risk/circuit.js';

const log = createLogger(settings.LOG_LEVEL);

let state: MmRiskState = {
  day: todayKey(),
  realizedPnlUsd: 0,
  haltedUntil: 0,
  baseInventory: settings.TARGET_BASE_INVENTORY,
};

let lastQuoteAt = 0;
let stopStream: (() => void) | null = null;

async function loadState(): Promise<void> {
  const raw = await cacheGet('mm-state');
  if (!raw) return;
  try {
    state = { ...state, ...(JSON.parse(raw) as MmRiskState) };
  } catch {
    log.warn('ignored corrupt mm-state cache');
  }
}

async function saveState(): Promise<void> {
  await cacheSet('mm-state', JSON.stringify(state), 86_400);
}

function onBbo(bbo: { bid: number; ask: number }) {
  const now = Date.now();
  if (now - lastQuoteAt < settings.QUOTE_REFRESH_MS) return;
  lastQuoteAt = now;

  if (state.day !== todayKey()) {
    state = { ...state, day: todayKey(), realizedPnlUsd: 0 };
  }

  if (shouldHalt(state, settings.MAX_DAILY_LOSS_USD, now)) {
    log.warn('circuit breaker active — quoting paused');
    return;
  }

  if (Math.abs(state.baseInventory) > settings.MAX_BASE_INVENTORY) {
    log.warn('inventory cap exceeded', { base: state.baseInventory });
    state = tripBreaker(state, settings.CIRCUIT_BREAKER_COOLDOWN_MS, now);
    void saveState();
    return;
  }

  const plan = buildQuotes(
    { ...bbo, bidSize: 0, askSize: 0, ts: now },
    state.baseInventory,
    settings,
  );

  void cacheSet('last-quote', JSON.stringify({ plan, bbo, ts: now }), 300);

  if (settings.SIMULATION_MODE) {
    log.info('[sim] quote refresh', {
      bid: plan.bidPrice,
      ask: plan.askPrice,
      size: plan.size,
      skewBps: plan.skewBps.toFixed(1),
      bbo,
    });
    return;
  }

  log.warn('Live order placement not wired — use SIMULATION_MODE or extend index.ts');
}

async function bootstrap() {
  if (isRedisEnabled()) {
    const ok = await pingRedis();
    log[ok ? 'info' : 'warn'](ok ? 'Redis cache connected' : 'Redis unreachable — using in-memory cache');
  } else {
    log.info('Redis cache disabled — using in-memory cache');
  }

  await loadState();

  log.info('Market making bot started', {
    simulation: settings.SIMULATION_MODE,
    product: settings.PRODUCT_ID,
    spreadBps: settings.SPREAD_BPS,
  });

  stopStream =
    settings.SIMULATION_MODE
      ? syntheticBboStream(log, onBbo)
      : streamBbo(settings.PRODUCT_ID, log, onBbo);

  const stop = () => {
    stopStream?.();
    void saveState()
      .catch(() => undefined)
      .then(() => closeRedisClient())
      .catch(() => undefined)
      .finally(() => {
        log.info('stopped');
        process.exit(0);
      });
  };

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

bootstrap().catch((err) => {
  log.error('Fatal', { err: String(err) });
  void closeRedisClient().finally(() => process.exit(1));
});
