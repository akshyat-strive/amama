/**
 * The fixed catalog of things a permission can actually unlock in this app.
 * Deliberately NOT user-definable — a role's `permissions` list can only
 * ever reference one of these ids, because each one corresponds to a real
 * gate somewhere in the code. Roles themselves (which permissions bundle
 * together under what name) ARE runtime-editable — see `role-store.ts`.
 */
export type Permission =
  | "onboarding.review"
  | "listings.moderate"
  | "deals.work"
  | "deals.viewAll"
  | "deals.assign"
  | "overview.view"
  | "announcements.post"
  | "users.manage"
  | "roles.manage"

export const PERMISSION_CATALOG: { id: Permission; label: string; description: string }[] = [
  { id: "overview.view", label: "View overview", description: "See cross-team stats on the admin home page." },
  { id: "onboarding.review", label: "Review onboarding", description: "Approve or send back buyer/seller applications." },
  { id: "listings.moderate", label: "Moderate listings", description: "Verify or flag marketplace listings." },
  { id: "deals.work", label: "Work assigned deals", description: "Drive a deal's own stage forward once it's assigned to you." },
  { id: "deals.viewAll", label: "View every deal", description: "See every deal across every team member, not just your own." },
  { id: "deals.assign", label: "Assign deals", description: "Assign or reassign which team member owns a deal." },
  { id: "announcements.post", label: "Post announcements", description: "Broadcast to every signed-in admin, instead of only reading them." },
  { id: "users.manage", label: "Manage users", description: "Create accounts and change who holds which role." },
  { id: "roles.manage", label: "Manage roles", description: "Create roles and edit which permissions they carry." },
]

/** `["*"]` is the wildcard sentinel — "every permission," same shape the
 *  client's own reference backend uses (`canView: ['*']` for its admin
 *  role) rather than a separate boolean flag to keep in sync. */
export type RolePermissions = Permission[] | ["*"]

export function hasPermission(perms: RolePermissions, perm: Permission): boolean {
  return isFullAccess(perms) || (perms as Permission[]).includes(perm)
}

/** Whether a role's permission list is the `["*"]` wildcard — every
 *  permission, not just a long explicit list of them. */
export function isFullAccess(perms: RolePermissions): boolean {
  return (perms as string[]).includes("*")
}
