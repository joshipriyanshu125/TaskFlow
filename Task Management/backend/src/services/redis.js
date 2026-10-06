import Redis from "ioredis";
import { config } from "../config.js";

class CacheService {
  constructor() {
    this.memoryCache = new Map();
    this.isRedisReady = false;

    try {
      this.redis = new Redis(config.redisUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // Don't crash on reconnect loops if Redis server is down
        lazyConnect: true
      });

      this.redis.connect()
        .then(() => {
          this.isRedisReady = true;
          console.log("Connected to Redis cache layer");
        })
        .catch(() => {
          this.isRedisReady = false;
          console.log("Redis not detected. Falling back to in-memory caching.");
        });

      this.redis.on("error", () => {
        this.isRedisReady = false;
      });
    } catch {
      this.isRedisReady = false;
    }
  }

  async get(key) {
    if (this.isRedisReady) {
      try {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
      } catch {
        // fallback
      }
    }
    const item = this.memoryCache.get(key);
    if (!item) return null;
    if (item.expiry && Date.now() > item.expiry) {
      this.memoryCache.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key, value, ttlSeconds = 300) {
    if (this.isRedisReady) {
      try {
        await this.redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
        return;
      } catch {
        // fallback
      }
    }
    this.memoryCache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000
    });
  }

  async del(key) {
    if (this.isRedisReady) {
      try {
        await this.redis.del(key);
      } catch {
        // fallback
      }
    }
    this.memoryCache.delete(key);
  }
}

export const cache = new CacheService();
