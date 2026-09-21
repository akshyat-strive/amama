import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"

import * as schema from "@/lib/db/schema"

/**
 * One pooled connection for the whole server process. Next.js dev reloads
 * this module on every edit, so the pool is cached on `globalThis` —
 * without that, each reload would open a fresh pool against Neon's pooler
 * and leak connections until the dev server restarts.
 */
declare global {
  var __dbPool: Pool | undefined
}

const pool = globalThis.__dbPool ?? new Pool({ connectionString: process.env.DATABASE_URL })

if (process.env.NODE_ENV !== "production") globalThis.__dbPool = pool

const db = drizzle(pool, { schema })

export { db }
