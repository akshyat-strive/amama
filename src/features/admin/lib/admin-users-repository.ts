import { eq } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { appUsers, neonAuthUser } from "@/features/identity/lib/schema"
import { adminProfiles } from "@/features/admin/lib/schema"

type AdminUser = {
  id: string
  name: string
  email: string
  roleId: string
  createdAt: string
  createdBy: string | null
}

const columns = {
  id: appUsers.id,
  name: adminProfiles.name,
  email: neonAuthUser.email,
  roleId: adminProfiles.roleId,
  createdAt: adminProfiles.createdAt,
  createdBy: adminProfiles.createdBy,
}

function toAdminUser(row: {
  id: string
  name: string
  email: string
  roleId: string
  createdAt: Date
  createdBy: string | null
}): AdminUser {
  return { ...row, createdAt: row.createdAt.toISOString() }
}

/** Port of `user-store.ts`, minus password handling — Managed Better Auth
 *  owns credentials now (see `admin-user-service.ts`), this repository is
 *  purely the `admin_profiles` row a Better Auth account gets once it's
 *  registered as staff. */
interface AdminUsersRepository {
  list(): Promise<AdminUser[]>
  findById(id: string): Promise<AdminUser | null>
  findByEmail(email: string): Promise<AdminUser | null>
  create(input: { id: string; name: string; roleId: string; createdBy: string | null }): Promise<AdminUser>
  updateRole(id: string, roleId: string): Promise<void>
  delete(id: string): Promise<void>
}

function baseQuery() {
  return db
    .select(columns)
    .from(adminProfiles)
    .innerJoin(appUsers, eq(appUsers.id, adminProfiles.userId))
    .innerJoin(neonAuthUser, eq(neonAuthUser.id, appUsers.id))
}

const drizzleAdminUsersRepository: AdminUsersRepository = {
  async list() {
    const rows = await baseQuery()
    return rows.map(toAdminUser)
  },

  async findById(id) {
    const [row] = await baseQuery().where(eq(appUsers.id, id)).limit(1)
    return row ? toAdminUser(row) : null
  },

  async findByEmail(email) {
    const [row] = await baseQuery()
      .where(eq(neonAuthUser.email, email.trim().toLowerCase()))
      .limit(1)
    return row ? toAdminUser(row) : null
  },

  async create({ id, name, roleId, createdBy }) {
    await db.insert(appUsers).values({ id, kind: "admin" }).onConflictDoNothing()
    await db.insert(adminProfiles).values({ userId: id, name, roleId, createdBy })
    const created = await this.findById(id)
    if (!created) throw new Error("Failed to read back the admin user just created.")
    return created
  },

  async updateRole(id, roleId) {
    await db.update(adminProfiles).set({ roleId }).where(eq(adminProfiles.userId, id))
  },

  async delete(id) {
    await db.delete(adminProfiles).where(eq(adminProfiles.userId, id))
    await db.delete(appUsers).where(eq(appUsers.id, id))
  },
}

export type { AdminUser, AdminUsersRepository }
export { drizzleAdminUsersRepository }
