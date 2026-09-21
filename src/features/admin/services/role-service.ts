import { ApiError } from "@/lib/api/errors"
import {
  drizzleRolesRepository,
  type Role,
  type RolesRepository,
} from "@/features/admin/lib/roles-repository"
import type { RolePermissions } from "@/features/admin/permissions"

async function listRoles(repo: RolesRepository = drizzleRolesRepository): Promise<Role[]> {
  return repo.list()
}

async function createRole(
  name: string,
  permissions: RolePermissions,
  repo: RolesRepository = drizzleRolesRepository
): Promise<Role> {
  return repo.create(name, permissions)
}

async function updateRole(
  id: string,
  patch: Partial<Pick<Role, "name" | "permissions">>,
  repo: RolesRepository = drizzleRolesRepository
): Promise<void> {
  const role = await repo.findById(id)
  if (!role) throw new ApiError(404, "That role doesn't exist.")
  if (role.isSystem && patch.name) throw new ApiError(400, "System roles can't be renamed.")
  await repo.update(id, patch)
}

/** Same two refusals `role-store.ts` always enforced: a system role is
 *  load-bearing (nav/permission defaults assume it exists), and a role
 *  still held by someone can't vanish out from under them. */
async function deleteRole(id: string, repo: RolesRepository = drizzleRolesRepository): Promise<void> {
  const role = await repo.findById(id)
  if (!role) throw new ApiError(404, "That role doesn't exist.")
  if (role.isSystem) throw new ApiError(400, "System roles can't be deleted.")
  const usersHolding = await repo.countUsersWithRole(id)
  if (usersHolding > 0) throw new ApiError(400, "Reassign everyone with this role before deleting it.")
  await repo.delete(id)
}

export { listRoles, createRole, updateRole, deleteRole }
