import { getRedisClient, isRedisEnabled } from './redis.js';

const CACHE_PREFIX = process.env.REDIS_KEY_PREFIX?.trim() || 'cb-mm:';
const DEFAULT_TTL_SEC = Number(process.env.REDIS_CACHE_TTL_SEC ?? 86_400);

type MemoryEntry = { value: string; expiresAt: number };
const memoryStore = new Map<string, MemoryEntry>();

function fullKey(key: string): string {
  return `${CACHE_PREFIX}${key}`;
}

export async function cacheGet(key: string): Promise<string | null> {
  const redisKey = fullKey(key);
  if (isRedisEnabled()) {
    try {
      return await getRedisClient().get(redisKey);
    } catch {
      /* fall through */
    }
  }
  const entry = memoryStore.get(redisKey);
  if (!entry || entry.expiresAt <= Date.now()) {
    memoryStore.delete(redisKey);
    return null;
  }
  return entry.value;
}

export async function cacheSet(key: string, value: string, ttlSec = DEFAULT_TTL_SEC): Promise<void> {
  const redisKey = fullKey(key);
  if (isRedisEnabled()) {
    try {
      await getRedisClient().set(redisKey, value, 'EX', ttlSec);
      return;
    } catch {
      /* fall through */
    }
  }
  memoryStore.set(redisKey, { value, expiresAt: Date.now() + ttlSec * 1000 });
}
