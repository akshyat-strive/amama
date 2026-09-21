import { count, eq } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { adminProfiles, roles } from "@/features/admin/lib/schema"
import type { RolePermissions } from "@/features/admin/permissions"

type Role = {
  id: string
  name: string
  permissions: RolePermissions
  isSystem: boolean
  createdAt: string
}

function toRole(row: typeof roles.$inferSelect): Role {
  return { ...row, createdAt: row.createdAt.toISOString() }
}

/** Straight port of `role-store.ts`'s mutator set — narrow to just what
 *  the role aggregate needs (ISP), so `AdminUsersRepository` doesn't have
 *  to know roles exist at all beyond a bare `roleId` string. */
interface RolesRepository {
  list(): Promise<Role[]>
  findById(id: string): Promise<Role | null>
  create(name: string, permissions: RolePermissions): Promise<Role>
  update(id: string, patch: Partial<Pick<Role, "name" | "permissions">>): Promise<void>
  delete(id: string): Promise<void>
  countUsersWithRole(id: string): Promise<number>
}

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const drizzleRolesRepository: RolesRepository = {
  async list() {
    const rows = await db.select().from(roles)
    return rows.map(toRole)
  },

  async findById(id) {
    const [row] = await db.select().from(roles).where(eq(roles.id, id)).limit(1)
    return row ? toRole(row) : null
  },

  async create(name, permissions) {
    const [row] = await db
      .insert(roles)
      .values({ id: generateId("role"), name, permissions, isSystem: false })
      .returning()
    return toRole(row)
  },

  async update(id, patch) {
    await db.update(roles).set(patch).where(eq(roles.id, id))
  },

  async delete(id) {
    await db.delete(roles).where(eq(roles.id, id))
  },

  async countUsersWithRole(id) {
    const [row] = await db
      .select({ value: count() })
      .from(adminProfiles)
      .where(eq(adminProfiles.roleId, id))
    return row?.value ?? 0
  },
}

export type { Role, RolesRepository }
export { drizzleRolesRepository }
