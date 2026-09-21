import { ApiError } from "@/lib/api/errors"
import { requireAppUserOfKind } from "@/features/identity/services/identity-service"
import { drizzleAdminUsersRepository, type AdminUser } from "@/features/admin/lib/admin-users-repository"
import { drizzleRolesRepository, type Role } from "@/features/admin/lib/roles-repository"
import { hasPermission, type Permission } from "@/features/admin/permissions"

/** The one place that turns "a signed-in admin-kind Better Auth user"
 *  into "this app's own RBAC identity" — every admin route composes this
 *  rather than re-joining `admin_profiles`/`roles` itself. */
async function currentAdmin(): Promise<{ user: AdminUser; role: Role }> {
  const appUser = await requireAppUserOfKind("admin")
  const user = await drizzleAdminUsersRepository.findById(appUser.id)
  if (!user) throw new ApiError(403, "Your admin account isn't finished setting up yet.")
  const role = await drizzleRolesRepository.findById(user.roleId)
  if (!role) throw new ApiError(500, "Your role no longer exists — ask another admin to reassign you.")
  return { user, role }
}

/** A single permission, or an OR of several — same semantics as
 *  `visibleAdminNav`'s array form, for the routes where more than one
 *  role legitimately needs through (reading the user list to populate an
 *  assign dropdown is a lower bar than managing accounts outright, so it
 *  accepts either `users.manage` or `deals.assign`, while actually
 *  creating/editing a user still requires `users.manage` alone). */
async function requirePermission(
  permission: Permission | Permission[]
): Promise<{ user: AdminUser; role: Role }> {
  const admin = await currentAdmin()
  const permitted = Array.isArray(permission)
    ? permission.some((entry) => hasPermission(admin.role.permissions, entry))
    : hasPermission(admin.role.permissions, permission)
  if (!permitted) {
    throw new ApiError(403, "You don't have permission to do that.")
  }
  return admin
}

export { currentAdmin, requirePermission }
