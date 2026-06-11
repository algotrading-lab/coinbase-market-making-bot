export interface Logger {
  info(m: string, meta?: Record<string, unknown>): void;
  warn(m: string, meta?: Record<string, unknown>): void;
  error(m: string, meta?: Record<string, unknown>): void;
  debug(m: string, meta?: Record<string, unknown>): void;
}

export function createLogger(level = 'info'): Logger {
  const ranks: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };
  const min = ranks[level] ?? 1;
  const emit = (rank: string, m: string, meta?: Record<string, unknown>) => {
    if ((ranks[rank] ?? 1) < min) return;
    const line = meta ? `${m} ${JSON.stringify(meta)}` : m;
    console[rank === 'error' ? 'error' : rank === 'warn' ? 'warn' : 'log'](`[mm/${rank}] ${line}`);
  };
  return {
    debug: (m, meta) => emit('debug', m, meta),
    info: (m, meta) => emit('info', m, meta),
    warn: (m, meta) => emit('warn', m, meta),
    error: (m, meta) => emit('error', m, meta),
  };
}
