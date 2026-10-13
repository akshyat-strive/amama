"use client"

import type { RolePermissions } from "@/features/admin/permissions"
import { SEED_ROLES, type Role } from "@/features/admin/staff-seed"
import { getUsers } from "@/features/admin/user-store"
import { createPersistentStore, localId } from "@/features/local-db/persistent-store"

export type { Role }

/** Roles in this browser — the seeded org's roles plus any created in
 *  Team. The built-in ones can be edited but not deleted. */
const store = createPersistentStore<Role[]>("amama.admin.roles", () => SEED_ROLES, [])

function useRoles(): Role[] {
  return store.use()
}

function getRoles() {
  return store.get()
}

async function createRole(name: string, permissions: RolePermissions, placement: Pick<Role, "level" | "domain"> = { level: "member", domain: "saleops" }): Promise<Role> {
  const role: Role = { id: localId("role"), name: name.trim(), permissions, isSystem: false, createdAt: new Date().toISOString(), ...placement }
  store.set((roles) => [...roles, role])
  return role
}

async function updateRole(id: string, patch: Partial<Pick<Role, "name" | "permissions" | "level" | "domain">>): Promise<void> {
  store.set((roles) => roles.map((role) => (role.id === id ? { ...role, ...patch } : role)))
}

async function deleteRole(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const role = store.get().find((entry) => entry.id === id)
  if (!role) return { ok: true }
  if (role.isSystem) return { ok: false, error: "Built-in roles can't be deleted." }
  if (getUsers().some((user) => user.roleId === id)) return { ok: false, error: "Someone still holds this role — move them first." }
  store.set((roles) => roles.filter((entry) => entry.id !== id))
  return { ok: true }
}

export { useRoles, getRoles, createRole, updateRole, deleteRole }
