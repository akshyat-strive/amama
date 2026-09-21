"use client"

import { hasPermission, type Permission } from "@/features/admin/permissions"
import type { Role } from "@/features/admin/lib/roles-repository"
import type { AdminUser } from "@/features/admin/lib/admin-users-repository"
import { createFetchStore } from "@/lib/api/fetch-store"

export type CurrentAdmin = {
  user: AdminUser
  role: Role
  can: (permission: Permission) => boolean
}

type MeResponse = { kind: "admin"; user: AdminUser; role: Role } | { kind: "buyer" | "seller" } | null

const meStore = createFetchStore<MeResponse>("/api/identity/me", null)

/** `undefined` while the session check is still in flight, `null` once
 *  it's resolved to "no admin session," or the real thing — a consumer
 *  that redirects on "no admin" (see `AdminShell`) must treat only `null`
 *  as that signal, not `undefined`, or it fires during every fresh page
 *  load's network round-trip rather than waiting for an actual answer.
 *  Call `invalidateCurrentAdmin()` right after sign-in/sign-out, since the
 *  underlying fetch is cached across client-side navigations and won't
 *  otherwise notice the session changed. */
function useCurrentAdmin(): CurrentAdmin | null | undefined {
  const me = meStore.useStore()
  const loaded = meStore.useIsLoaded()
  if (!loaded) return undefined
  if (!me || me.kind !== "admin") return null
  return { user: me.user, role: me.role, can: (permission) => hasPermission(me.role.permissions, permission) }
}

function invalidateCurrentAdmin() {
  return meStore.invalidate()
}

export { useCurrentAdmin, invalidateCurrentAdmin }
