import Redis from "ioredis";

const redisConfig = {
  host:            process.env.REDIS_HOST || "redis",
  port:            parseInt(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 100, 3000),
  enableOfflineQueue: false,
  lazyConnect: true,
};

// Upstash requires password + TLS
if (process.env.REDIS_PASSWORD) {
  redisConfig.password = process.env.REDIS_PASSWORD;
  redisConfig.tls = {};
}

const redis = new Redis(redisConfig);

redis.on("connect",   () => console.log("✅ Redis connected"));
redis.on("error",     (err) => console.error("⚠️  Redis error (non-fatal):", err.message));
redis.on("reconnecting", () => console.log("🔄 Redis reconnecting…"));

// Graceful connect — errors are caught so a cold-start Redis outage doesn't kill the process
redis.connect().catch(() => {});

export default redis;
