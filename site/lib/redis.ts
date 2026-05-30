// lib/redis.ts — Redis клиент для кэширования поиска
import Redis from 'ioredis';

declare global { var __redis: Redis | undefined; }

function createRedis() {
  const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
    enableReadyCheck: false,
  });
  client.on('error', (e) => console.warn('[Redis]', e.message));
  return client;
}

export const redis =
  process.env.NODE_ENV === 'production'
    ? createRedis()
    : (global.__redis ??= createRedis());

const TTL = parseInt(process.env.SEARCH_CACHE_TTL || '300');

export async function cacheGet<T>(key: string): Promise<T | null> {
  try { const r = await redis.get(key); return r ? JSON.parse(r) : null; }
  catch { return null; }
}

export async function cacheSet(key: string, val: unknown, ttl = TTL) {
  try { await redis.set(key, JSON.stringify(val), 'EX', ttl); } catch {}
}
