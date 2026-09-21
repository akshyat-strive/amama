import { eq } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { appUsers, neonAuthUser, type AppUserKind } from "@/features/identity/lib/schema"

type AuthUser = { id: string; email: string; name: string }
type AppUser = { id: string; kind: AppUserKind; email: string; name: string }

/**
 * The one thing every feature needs and none of them should reimplement:
 * "who is this Better Auth user to our app." Kept narrow on purpose (ISP)
 * — this is the only repository every other feature's service is allowed
 * to depend on directly; profile/role detail stays behind each owning
 * feature's own repository.
 */
interface AppUsersRepository {
  findById(id: string): Promise<AppUser | null>
  findByEmail(email: string): Promise<AppUser | null>
  /** Bootstraps the app-side row right after a Better Auth sign-up. A
   *  no-op if the row already exists — signup can't be replayed to change
   *  someone's kind after the fact. */
  ensure(authUser: AuthUser, kind: AppUserKind): Promise<AppUser>
}

const drizzleAppUsersRepository: AppUsersRepository = {
  async findById(id) {
    const [row] = await db
      .select({ id: appUsers.id, kind: appUsers.kind, email: neonAuthUser.email, name: neonAuthUser.name })
      .from(appUsers)
      .innerJoin(neonAuthUser, eq(neonAuthUser.id, appUsers.id))
      .where(eq(appUsers.id, id))
      .limit(1)
    return row ?? null
  },

  async findByEmail(email) {
    const [row] = await db
      .select({ id: appUsers.id, kind: appUsers.kind, email: neonAuthUser.email, name: neonAuthUser.name })
      .from(appUsers)
      .innerJoin(neonAuthUser, eq(neonAuthUser.id, appUsers.id))
      .where(eq(neonAuthUser.email, email.trim().toLowerCase()))
      .limit(1)
    return row ?? null
  },

  async ensure(authUser, kind) {
    const existing = await this.findById(authUser.id)
    if (existing) return existing
    await db.insert(appUsers).values({ id: authUser.id, kind }).onConflictDoNothing()
    return { id: authUser.id, kind, email: authUser.email, name: authUser.name }
  },
}

export type { AppUser, AppUsersRepository, AuthUser }
export { drizzleAppUsersRepository }
