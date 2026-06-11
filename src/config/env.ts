import { config } from 'dotenv';
import { z } from 'zod';

config();

const schema = z.object({
  SIMULATION_MODE: z.string().default('true').transform((v) => v.toLowerCase() === 'true'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  COINBASE_API_KEY: z.string().default(''),
  COINBASE_API_SECRET: z.string().default(''),
  PRODUCT_ID: z.string().default('BTC-USD'),
  SPREAD_BPS: z.coerce.number().min(1).default(8),
  ORDER_SIZE: z.coerce.number().positive().default(0.001),
  QUOTE_REFRESH_MS: z.coerce.number().min(200).default(1500),
  TARGET_BASE_INVENTORY: z.coerce.number().default(0),
  MAX_BASE_INVENTORY: z.coerce.number().positive().default(0.01),
  SKEW_BPS_PER_UNIT: z.coerce.number().min(0).default(50),
  MAX_DAILY_LOSS_USD: z.coerce.number().positive().default(200),
  CIRCUIT_BREAKER_COOLDOWN_MS: z.coerce.number().min(1000).default(300_000),
});

export type Settings = z.infer<typeof schema>;
export const settings = schema.parse(process.env);
