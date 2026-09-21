import { pgSchema, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

/**
 * Managed Better Auth owns this schema (`neon_auth.user`, `.session`, …) —
 * declared here, unmanaged by our own migrations, purely so the rest of
 * this file can query/foreign-key against it. Only the columns this app
 * actually reads are listed; Better Auth's own migrations own the real
 * table shape. Any `drizzle-kit generate` diff against this table (an
 * added column, the initial `CREATE TABLE`) must be deleted from the
 * generated SQL by hand before running `migrate` — this table is never
 * ours to create or alter.
 */
const neonAuthSchema = pgSchema("neon_auth")
const neonAuthUser = neonAuthSchema.table("user", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name").notNull(),
})

export type AppUserKind = "buyer" | "seller" | "admin"

/**
 * The one row every signed-in person has, regardless of kind — what turns
 * a bare Better Auth user into someone this app actually knows how to
 * route and authorize. `admin_profiles`/`buyer_profiles`/`seller_profiles`
 * (in `admin`/`verification`) hold the kind-specific data; this table is
 * just the fork in the road.
 */
const appUsers = pgTable("app_users", {
  id: uuid("id")
    .primaryKey()
    .references(() => neonAuthUser.id, { onDelete: "cascade" }),
  kind: text("kind").$type<AppUserKind>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

export { neonAuthUser, appUsers }
