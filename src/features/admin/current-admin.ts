"use client"

import * as React from "react"

import { hasPermission, type Permission } from "@/features/admin/permissions"
import type { Role } from "@/features/admin/role-store"
import { useRoles } from "@/features/admin/role-store"
import { useSession } from "@/features/admin/session-store"
import type { AdminUser } from "@/features/admin/user-store"
import { useUsers } from "@/features/admin/user-store"

export type CurrentAdmin = {
  user: AdminUser
  role: Role
  can: (permission: Permission) => boolean
}

/** `null` until a signed-in session resolves to a real user *and* that
 *  user's role still exists — the one hook every admin view reads
 *  identity/permissions from, replacing the old `useKamIdentity()`. */
function useCurrentAdmin(): CurrentAdmin | null {
  const session = useSession()
  const users = useUsers()
  const roles = useRoles()

  return React.useMemo(() => {
    if (!session) return null
    const user = users.find((entry) => entry.id === session.userId)
    if (!user) return null
    const role = roles.find((entry) => entry.id === user.roleId)
    if (!role) return null
    return { user, role, can: (permission: Permission) => hasPermission(role.permissions, permission) }
  }, [session, users, roles])
}

export { useCurrentAdmin }
