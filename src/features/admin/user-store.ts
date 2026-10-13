"use client"

import { createAccount, getSession, removeAccount, renameAccount } from "@/features/auth/local-auth"
import { DEMO_PASSWORD, SEED_STAFF, type AdminUser } from "@/features/admin/staff-seed"
import { createPersistentStore } from "@/features/local-db/persistent-store"

export type { AdminUser }

/** The staff roster, in this browser. Sign-ins live in `local-auth`;
 *  this holds who they are in the org — role, title, manager. */
const store = createPersistentStore<AdminUser[]>("amama.admin.staff", () => SEED_STAFF, [])

function useUsers(): AdminUser[] {
  return store.use()
}

const useUsersLoaded = store.useLoaded

function getUsers() {
  return store.get()
}

async function createUser(input: {
  name: string
  email: string
  password: string
  roleId: string
  reportsTo?: string | null
  title?: string
}): Promise<{ ok: true; user: AdminUser } | { ok: false; error: string }> {
  const email = input.email.trim().toLowerCase()
  const result = createAccount({ kind: "admin", email, password: input.password, name: input.name })
  if (!result.ok) return { ok: false, error: result.error }
  const user: AdminUser = {
    id: email,
    email,
    name: input.name.trim(),
    roleId: input.roleId,
    reportsTo: input.reportsTo ?? null,
    title: input.title?.trim() || "",
    createdAt: new Date().toISOString(),
    createdBy: getSession()?.accountId ?? null,
  }
  store.set((users) => [...users, user])
  return { ok: true, user }
}

async function updateUser(id: string, patch: Partial<Pick<AdminUser, "roleId" | "reportsTo" | "title" | "name">>): Promise<void> {
  store.set((users) => users.map((user) => (user.id === id ? { ...user, ...patch } : user)))
  if (patch.name) renameAccount(id, patch.name)
}

async function deleteUser(id: string): Promise<void> {
  store.set((users) => users.filter((user) => user.id !== id).map((user) => (user.reportsTo === id ? { ...user, reportsTo: null } : user)))
  removeAccount(id)
}

export { useUsers, useUsersLoaded, getUsers, createUser, updateUser, deleteUser, DEMO_PASSWORD }
