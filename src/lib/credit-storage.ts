import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { Redis } from "@upstash/redis";

export type SessionCreditsRow = {
  dateKey: string;
  dailyLimit: number;
  used: number;
};

export type PaymentOrderRow = {
  orderId: string;
  sessionId: string;
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
    return (await redis.get<SessionCreditsRow>(sessionKey(sessionId))) ?? null;
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
      `SELECT order_id AS orderId, session_id AS sessionId, package_id AS packageId,
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
       order_id, session_id, package_id, amount, credits, order_name, status, payment_key, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(order_id) DO UPDATE SET
       session_id = excluded.session_id,
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
