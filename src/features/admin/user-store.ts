"use client"

import { apiRequest, createFetchStore } from "@/lib/api/fetch-store"
import type { AdminUser } from "@/features/admin/lib/admin-users-repository"

export type { AdminUser }

/** Every seeded/created demo account still uses this same password —
 *  purely a UI convenience constant now (the real credential lives in
 *  Managed Better Auth), same as before. */
const DEMO_PASSWORD = "User@123"

const store = createFetchStore<AdminUser[]>("/api/admin/users", [])

function useUsers(): AdminUser[] {
  return store.useStore()
}

/** Whether the roster's own fetch has resolved — a Home-page widget reads
 *  this to show a loading skeleton instead of briefly flashing "nobody's
 *  signed in yet" before the real names arrive. */
function useUsersLoaded(): boolean {
  return store.useIsLoaded()
}

async function createUser(input: {
  name: string
  email: string
  password: string
  roleId: string
}): Promise<{ ok: true; user: AdminUser } | { ok: false; error: string }> {
  try {
    const user = await apiRequest<AdminUser>("/api/admin/users", { method: "POST", body: JSON.stringify(input) })
    await store.invalidate()
    return { ok: true, user }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Couldn't create that account." }
  }
}

async function updateUser(id: string, patch: { roleId: string }): Promise<void> {
  await apiRequest(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(patch) })
  await store.invalidate()
}

async function deleteUser(id: string): Promise<void> {
  await apiRequest(`/api/admin/users/${id}`, { method: "DELETE" })
  await store.invalidate()
}

export { useUsers, useUsersLoaded, createUser, updateUser, deleteUser, DEMO_PASSWORD }
