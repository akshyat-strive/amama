"use client"

import { apiRequest, createFetchStore } from "@/lib/api/fetch-store"
import type { Role } from "@/features/admin/lib/roles-repository"
import type { RolePermissions } from "@/features/admin/permissions"

export type { Role }

/** Fetch-backed replacement for the old `localStorage` role store — same
 *  exported function names/shapes, so every consuming view kept working
 *  unchanged. The 4 system roles are seeded server-side once (see the
 *  identity seed route), not here. */
const store = createFetchStore<Role[]>("/api/admin/roles", [])

function useRoles(): Role[] {
  return store.useStore()
}

async function createRole(name: string, permissions: RolePermissions): Promise<Role> {
  const role = await apiRequest<Role>("/api/admin/roles", {
    method: "POST",
    body: JSON.stringify({ name, permissions }),
  })
  await store.invalidate()
  return role
}

async function updateRole(id: string, patch: Partial<Pick<Role, "name" | "permissions">>): Promise<void> {
  await apiRequest(`/api/admin/roles/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
  await store.invalidate()
}

/** Same two server-side refusals as before (system role, still in use) —
 *  now enforced for real against every account, not just whatever the
 *  caller happened to pass in as `usersHoldingRole`. */
async function deleteRole(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await apiRequest(`/api/admin/roles/${id}`, { method: "DELETE" })
    await store.invalidate()
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Couldn't delete that role." }
  }
}

export { useRoles, createRole, updateRole, deleteRole }
