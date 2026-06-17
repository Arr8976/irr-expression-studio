import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { Redis } from "@upstash/redis";
import { withKeyLock, resetKeyLocksForTests } from "./storage-key-lock";

export type SessionCreditsRow = {
  dateKey: string;
  dailyLimit: number;
  used: number;
};

export type PaymentOrderRow = {
  orderId: string;
  sessionId: string;
  creditAccountKey: string;
  packageId: string;
  amount: number;
  credits: number;
  orderName: string;
  status: "pending" | "paid" | "failed";
  paymentKey?: string;
  createdAt: number;
};

export type CreditStorageBackend = "memory" | "sqlite" | "redis";

const memorySessions = new Map<string, SessionCreditsRow>();
const memoryOrders = new Map<string, PaymentOrderRow>();
const memoryQuota = new Map<string, number>();

export type QuotaScopeType = "ip" | "session";

let sqliteDb: DatabaseSync | null = null;
let redisClient: Redis | null | undefined;

export function closeCreditStorageForTests() {
  if (sqliteDb) {
    sqliteDb.close();
    sqliteDb = null;
  }
  redisClient = undefined;
}

export function resolveCreditStorageBackend(): CreditStorageBackend {
  if (process.env.CREDIT_STORE === "memory") return "memory";
  if (getRedisClient()) return "redis";
  return "sqlite";
}

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url =
    process.env.KV_REST_API_URL?.trim() ??
    process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token =
    process.env.KV_REST_API_TOKEN?.trim() ??
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    redisClient = null;
    return null;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

function getSqliteDb(): DatabaseSync {
  if (sqliteDb) return sqliteDb;

  const dbPath =
    process.env.CREDIT_DB_PATH?.trim() ??
    path.join(process.cwd(), "data", "credits.db");

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  sqliteDb = new DatabaseSync(dbPath);
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS session_credits (
      session_id TEXT PRIMARY KEY,
      date_key TEXT NOT NULL,
      daily_limit INTEGER NOT NULL DEFAULT 0,
      used INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_orders (
      order_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      credit_account_key TEXT,
      package_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      credits INTEGER NOT NULL,
      order_name TEXT NOT NULL,
      status TEXT NOT NULL,
      payment_key TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_payment_orders_session
      ON payment_orders(session_id);

    CREATE TABLE IF NOT EXISTS daily_quota (
      scope_type TEXT NOT NULL,
      scope_id TEXT NOT NULL,
      date_key TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (scope_type, scope_id, date_key)
    );
  `);

  try {
    sqliteDb.exec(
      `ALTER TABLE payment_orders ADD COLUMN credit_account_key TEXT`,
    );
  } catch {
    // column already exists
  }

  return sqliteDb;
}

function sessionKey(sessionId: string) {
  return `irr:credits:${sessionId}`;
}

function orderKey(orderId: string) {
  return `irr:order:${orderId}`;
}

function quotaMemoryKey(
  scopeType: QuotaScopeType,
  dateKey: string,
  scopeId: string,
) {
  return `${scopeType}:${dateKey}:${scopeId}`;
}

function quotaRedisKey(
  scopeType: QuotaScopeType,
  dateKey: string,
  scopeId: string,
) {
  return `irr:quota:${scopeType}:${dateKey}:${scopeId}`;
}

function creditUsedCounterKey(sessionId: string, dateKey: string) {
  return `irr:used:${sessionId}:${dateKey}`;
}

function mergeLockKey(userAccountKey: string, guestSessionId: string) {
  return `irr:merge-lock:${userAccountKey}:${guestSessionId}`;
}

const REDIS_CONSUME_CREDIT_LUA = `
local current = redis.call('INCR', KEYS[1])
local limit = tonumber(ARGV[1])
if current > limit then
  redis.call('DECR', KEYS[1])
  return 0
end
return 1
`;

const REDIS_CONSUME_QUOTA_LUA = `
local ipUsed = tonumber(redis.call('GET', KEYS[1]) or '0')
local sessionUsed = tonumber(redis.call('GET', KEYS[2]) or '0')
local limit = tonumber(ARGV[1])
if ipUsed >= limit or sessionUsed >= limit then
  return 0
end
redis.call('INCR', KEYS[1])
redis.call('INCR', KEYS[2])
return 1
`;

const REDIS_MERGE_LOCK_LUA = `
if redis.call('EXISTS', KEYS[1]) == 1 then
  return 0
end
redis.call('SET', KEYS[1], '1', 'EX', tonumber(ARGV[1]))
return 1
`;

export async function readSessionCredits(
  sessionId: string,
): Promise<SessionCreditsRow | null> {
  const backend = resolveCreditStorageBackend();

  if (backend === "memory") {
    return memorySessions.get(sessionId) ?? null;
  }

  if (backend === "redis") {
    const redis = getRedisClient();
    if (!redis) return null;
    const row =
      (await redis.get<SessionCreditsRow>(sessionKey(sessionId))) ?? null;
    if (!row) return null;
    const counterKey = creditUsedCounterKey(sessionId, row.dateKey);
    const counterUsed = await redis.get<number>(counterKey);
    if (typeof counterUsed === "number" && counterUsed > row.used) {
      return { ...row, used: counterUsed };
    }
    return row;
  }

  const db = getSqliteDb();
  const row = db
    .prepare(
      `SELECT date_key AS dateKey, daily_limit AS dailyLimit, used
       FROM session_credits WHERE session_id = ?`,
    )
    .get(sessionId) as SessionCreditsRow | undefined;

  return row ?? null;
}

export async function writeSessionCredits(
  sessionId: string,
  row: SessionCreditsRow,
): Promise<void> {
  const backend = resolveCreditStorageBackend();

  if (backend === "memory") {
    memorySessions.set(sessionId, row);
    return;
  }

  if (backend === "redis") {
    const redis = getRedisClient();
    if (!redis) return;
    await redis.set(sessionKey(sessionId), row);
    await redis.set(creditUsedCounterKey(sessionId, row.dateKey), row.used);
    return;
  }

  const db = getSqliteDb();
  db.prepare(
    `INSERT INTO session_credits (session_id, date_key, daily_limit, used, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(session_id) DO UPDATE SET
       date_key = excluded.date_key,
       daily_limit = excluded.daily_limit,
       used = excluded.used,
       updated_at = excluded.updated_at`,
  ).run(sessionId, row.dateKey, row.dailyLimit, row.used, Date.now());
}

export async function readPaymentOrder(
  orderId: string,
): Promise<PaymentOrderRow | null> {
  const backend = resolveCreditStorageBackend();

  if (backend === "memory") {
    return memoryOrders.get(orderId) ?? null;
  }

  if (backend === "redis") {
    const redis = getRedisClient();
    if (!redis) return null;
    return (await redis.get<PaymentOrderRow>(orderKey(orderId))) ?? null;
  }

  const db = getSqliteDb();
  const row = db
    .prepare(
      `SELECT order_id AS orderId, session_id AS sessionId,
              COALESCE(credit_account_key, session_id) AS creditAccountKey,
              package_id AS packageId,
              amount, credits, order_name AS orderName, status, payment_key AS paymentKey,
              created_at AS createdAt
       FROM payment_orders WHERE order_id = ?`,
    )
    .get(orderId) as PaymentOrderRow | undefined;

  return row ?? null;
}

export async function writePaymentOrder(order: PaymentOrderRow): Promise<void> {
  const backend = resolveCreditStorageBackend();

  if (backend === "memory") {
    memoryOrders.set(order.orderId, order);
    return;
  }

  if (backend === "redis") {
    const redis = getRedisClient();
    if (!redis) return;
    await redis.set(orderKey(order.orderId), order);
    return;
  }

  const db = getSqliteDb();
  db.prepare(
    `INSERT INTO payment_orders (
       order_id, session_id, credit_account_key, package_id, amount, credits, order_name, status, payment_key, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(order_id) DO UPDATE SET
       session_id = excluded.session_id,
       credit_account_key = excluded.credit_account_key,
       package_id = excluded.package_id,
       amount = excluded.amount,
       credits = excluded.credits,
       order_name = excluded.order_name,
       status = excluded.status,
       payment_key = excluded.payment_key,
       created_at = excluded.created_at`,
  ).run(
    order.orderId,
    order.sessionId,
    order.creditAccountKey,
    order.packageId,
    order.amount,
    order.credits,
    order.orderName,
    order.status,
    order.paymentKey ?? null,
    order.createdAt,
  );
}

export async function readQuotaUsed(input: {
  scopeType: QuotaScopeType;
  dateKey: string;
  scopeId: string;
}): Promise<number> {
  const backend = resolveCreditStorageBackend();
  const memKey = quotaMemoryKey(input.scopeType, input.dateKey, input.scopeId);

  if (backend === "memory") {
    return memoryQuota.get(memKey) ?? 0;
  }

  if (backend === "redis") {
    const redis = getRedisClient();
    if (!redis) return 0;
    const value = await redis.get<number>(
      quotaRedisKey(input.scopeType, input.dateKey, input.scopeId),
    );
    return typeof value === "number" ? value : 0;
  }

  const db = getSqliteDb();
  const row = db
    .prepare(
      `SELECT used FROM daily_quota
       WHERE scope_type = ? AND scope_id = ? AND date_key = ?`,
    )
    .get(input.scopeType, input.scopeId, input.dateKey) as
    | { used: number }
    | undefined;

  return row?.used ?? 0;
}

export async function incrementQuotaUsed(input: {
  scopeType: QuotaScopeType;
  dateKey: string;
  scopeId: string;
}): Promise<number> {
  const next = (await readQuotaUsed(input)) + 1;
  const backend = resolveCreditStorageBackend();
  const memKey = quotaMemoryKey(input.scopeType, input.dateKey, input.scopeId);

  if (backend === "memory") {
    memoryQuota.set(memKey, next);
    return next;
  }

  if (backend === "redis") {
    const redis = getRedisClient();
    if (!redis) return next;
    await redis.set(
      quotaRedisKey(input.scopeType, input.dateKey, input.scopeId),
      next,
    );
    return next;
  }

  const db = getSqliteDb();
  db.prepare(
    `INSERT INTO daily_quota (scope_type, scope_id, date_key, used, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(scope_type, scope_id, date_key) DO UPDATE SET
       used = excluded.used,
       updated_at = excluded.updated_at`,
  ).run(input.scopeType, input.scopeId, input.dateKey, next, Date.now());

  return next;
}

/** 크레딧 1회 차감 — used < dailyLimit 일 때만 원자적으로 증가 */
export async function tryAtomicConsumeCredit(input: {
  sessionId: string;
  dateKey: string;
  dailyLimit: number;
}): Promise<boolean> {
  if (input.dailyLimit < 1) return false;

  const backend = resolveCreditStorageBackend();

  if (backend === "memory") {
    return withKeyLock(`credit:${input.sessionId}`, () => {
      const row = memorySessions.get(input.sessionId);
      if (!row || row.dateKey !== input.dateKey) return false;
      if (row.used >= row.dailyLimit) return false;
      row.used += 1;
      memorySessions.set(input.sessionId, row);
      return true;
    });
  }

  if (backend === "redis") {
    const redis = getRedisClient();
    if (!redis) return false;
    const counterKey = creditUsedCounterKey(input.sessionId, input.dateKey);
    const result = await redis.eval(
      REDIS_CONSUME_CREDIT_LUA,
      [counterKey],
      [input.dailyLimit],
    );
    if (result === 1) {
      const row = await readSessionCredits(input.sessionId);
      if (row && row.dateKey === input.dateKey) {
        const used = Number(await redis.get(counterKey)) || row.used + 1;
        await writeSessionCredits(input.sessionId, { ...row, used });
      }
      return true;
    }
    return false;
  }

  const db = getSqliteDb();
  const result = db
    .prepare(
      `UPDATE session_credits
       SET used = used + 1, updated_at = ?
       WHERE session_id = ? AND date_key = ? AND used < daily_limit`,
    )
    .run(Date.now(), input.sessionId, input.dateKey);

  return result.changes > 0;
}

/** 무료 쿼터 1회 차감 — IP·세션 모두 한도 미만일 때만 원자적으로 증가 */
export async function tryAtomicConsumeFreeQuota(input: {
  ip: string;
  sessionId: string;
  dateKey: string;
  limit: number;
}): Promise<boolean> {
  if (input.limit < 1) return false;

  const backend = resolveCreditStorageBackend();

  if (backend === "memory") {
    return withKeyLock(
      `quota:${input.ip}:${input.sessionId}:${input.dateKey}`,
      () => {
        const ipKey = quotaMemoryKey("ip", input.dateKey, input.ip);
        const sessionKey = quotaMemoryKey("session", input.dateKey, input.sessionId);
        const ipUsed = memoryQuota.get(ipKey) ?? 0;
        const sessionUsed = memoryQuota.get(sessionKey) ?? 0;
        if (ipUsed >= input.limit || sessionUsed >= input.limit) return false;
        memoryQuota.set(ipKey, ipUsed + 1);
        memoryQuota.set(sessionKey, sessionUsed + 1);
        return true;
      },
    );
  }

  if (backend === "redis") {
    const redis = getRedisClient();
    if (!redis) return false;
    const ipKey = quotaRedisKey("ip", input.dateKey, input.ip);
    const sessionKey = quotaRedisKey("session", input.dateKey, input.sessionId);
    const result = await redis.eval(
      REDIS_CONSUME_QUOTA_LUA,
      [ipKey, sessionKey],
      [input.limit],
    );
    return result === 1;
  }

  const db = getSqliteDb();
  const consume = db.transaction(() => {
    const readUsed = db.prepare(
      `SELECT used FROM daily_quota
       WHERE scope_type = ? AND scope_id = ? AND date_key = ?`,
    );
    const ipRow = readUsed.get("ip", input.ip, input.dateKey) as
      | { used: number }
      | undefined;
    const sessionRow = readUsed.get("session", input.sessionId, input.dateKey) as
      | { used: number }
      | undefined;
    const ipUsed = ipRow?.used ?? 0;
    const sessionUsed = sessionRow?.used ?? 0;

    if (ipUsed >= input.limit || sessionUsed >= input.limit) {
      return false;
    }

    const upsert = db.prepare(
      `INSERT INTO daily_quota (scope_type, scope_id, date_key, used, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(scope_type, scope_id, date_key) DO UPDATE SET
         used = excluded.used,
         updated_at = excluded.updated_at`,
    );
    const now = Date.now();
    upsert.run("ip", input.ip, input.dateKey, ipUsed + 1, now);
    upsert.run("session", input.sessionId, input.dateKey, sessionUsed + 1, now);
    return true;
  });

  return consume();
}

export type PaymentClaimResult = "claimed" | "already_paid" | "not_found" | "not_pending";

/** pending 주문을 paid로 원자적으로 전환 (이중 지급 방지) */
export async function tryClaimPaymentOrder(input: {
  orderId: string;
  paymentKey: string;
}): Promise<PaymentClaimResult> {
  const backend = resolveCreditStorageBackend();

  if (backend === "memory") {
    return withKeyLock(`order:${input.orderId}`, () => {
      const order = memoryOrders.get(input.orderId);
      if (!order) return "not_found";
      if (order.status === "paid") return "already_paid";
      if (order.status !== "pending") return "not_pending";
      memoryOrders.set(input.orderId, {
        ...order,
        status: "paid",
        paymentKey: input.paymentKey,
      });
      return "claimed";
    });
  }

  if (backend === "redis") {
    const redis = getRedisClient();
    if (!redis) return "not_found";

    const fulfillLock = `irr:fulfill-lock:${input.orderId}`;
    const acquired = await redis.set(fulfillLock, input.paymentKey, {
      nx: true,
      ex: 86_400,
    });

    const order = await readPaymentOrder(input.orderId);
    if (!order) {
      if (acquired) await redis.del(fulfillLock);
      return "not_found";
    }
    if (order.status === "paid") return "already_paid";
    if (order.status !== "pending") {
      if (acquired) await redis.del(fulfillLock);
      return "not_pending";
    }
    if (!acquired) {
      return "not_pending";
    }

    await writePaymentOrder({
      ...order,
      status: "paid",
      paymentKey: input.paymentKey,
    });
    return "claimed";
  }

  const db = getSqliteDb();
  const result = db
    .prepare(
      `UPDATE payment_orders
       SET status = 'paid', payment_key = ?
       WHERE order_id = ? AND status = 'pending'`,
    )
    .run(input.paymentKey, input.orderId);

  if (result.changes > 0) return "claimed";

  const order = await readPaymentOrder(input.orderId);
  if (!order) return "not_found";
  if (order.status === "paid") return "already_paid";
  return "not_pending";
}

/** 게스트→유저 크레딧 병합 락 (TTL 초) */
export async function tryAcquireMergeLock(input: {
  userAccountKey: string;
  guestSessionId: string;
  ttlSeconds?: number;
}): Promise<boolean> {
  const lockKey = mergeLockKey(input.userAccountKey, input.guestSessionId);
  const ttl = input.ttlSeconds ?? 60;
  const backend = resolveCreditStorageBackend();

  if (backend === "memory") {
    return withKeyLock(`merge-lock:${lockKey}`, () => {
      if (memorySessions.has(lockKey)) return false;
      memorySessions.set(lockKey, {
        dateKey: "lock",
        dailyLimit: 1,
        used: 1,
      });
      return true;
    });
  }

  if (backend === "redis") {
    const redis = getRedisClient();
    if (!redis) return false;
    const redisLockKey = `irr:lock:${lockKey}`;
    const result = await redis.eval(
      REDIS_MERGE_LOCK_LUA,
      [redisLockKey],
      [ttl],
    );
    return result === 1;
  }

  const db = getSqliteDb();
  try {
    db.prepare(
      `INSERT INTO session_credits (session_id, date_key, daily_limit, used, updated_at)
       VALUES (?, 'lock', 1, 1, ?)`,
    ).run(lockKey, Date.now());
    return true;
  } catch {
    return false;
  }
}

export async function releaseMergeLock(input: {
  userAccountKey: string;
  guestSessionId: string;
}): Promise<void> {
  const lockKey = mergeLockKey(input.userAccountKey, input.guestSessionId);
  const backend = resolveCreditStorageBackend();

  if (backend === "memory") {
    memorySessions.delete(lockKey);
    return;
  }

  if (backend === "redis") {
    const redis = getRedisClient();
    if (!redis) return;
    await redis.del(`irr:lock:${lockKey}`);
    return;
  }

  const db = getSqliteDb();
  db.prepare(`DELETE FROM session_credits WHERE session_id = ?`).run(lockKey);
}

export async function resetCreditStorage() {
  memorySessions.clear();
  memoryOrders.clear();
  memoryQuota.clear();

  if (sqliteDb) {
    sqliteDb.exec(
      "DELETE FROM session_credits; DELETE FROM payment_orders; DELETE FROM daily_quota;",
    );
  }

  redisClient = undefined;
}

export async function resetCreditStorageForTests() {
  await resetCreditStorage();
  closeCreditStorageForTests();
  resetKeyLocksForTests();
}

export function getCreditStorageInfo() {
  const backend = resolveCreditStorageBackend();
  return {
    backend,
    path:
      backend === "sqlite"
        ? (process.env.CREDIT_DB_PATH?.trim() ??
          path.join(process.cwd(), "data", "credits.db"))
        : null,
  };
}
