"use client"

import { useSession, useSessionLoaded } from "@/features/auth/local-auth"
import { hasPermission, type Permission } from "@/features/admin/permissions"
import { useRoles, type Role } from "@/features/admin/role-store"
import { useUsers, type AdminUser } from "@/features/admin/user-store"

export type CurrentAdmin = {
  user: AdminUser
  role: Role
  can: (permission: Permission) => boolean
}

/** `undefined` until storage has been read, `null` once it's clear there
 *  is no staff session, or the signed-in staff member — a consumer that
 *  redirects on "no admin" (see `AdminShell`) must treat only `null` as
 *  that signal, or it fires during the server render of every page. */
function useCurrentAdmin(): CurrentAdmin | null | undefined {
  const session = useSession()
  const loaded = useSessionLoaded()
  const users = useUsers()
  const roles = useRoles()
  if (!loaded) return undefined
  if (!session || session.kind !== "admin") return null
  const user = users.find((entry) => entry.id === session.accountId)
  const role = user ? roles.find((entry) => entry.id === user.roleId) : undefined
  if (!user || !role) return null
  return { user, role, can: (permission) => hasPermission(role.permissions, permission) }
}

/** Kept for callers written against the old network-backed hook — the
 *  session store already notifies every reader on change. */
function invalidateCurrentAdmin() {
  return Promise.resolve()
}

export { useCurrentAdmin, invalidateCurrentAdmin }
