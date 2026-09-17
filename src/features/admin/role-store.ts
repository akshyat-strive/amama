"use client"

import * as React from "react"

import type { RolePermissions } from "@/features/admin/permissions"

export type Role = {
  id: string
  name: string
  permissions: RolePermissions
  createdAt: string
  /** A seeded role — its name and id are load-bearing (matched by id
   *  elsewhere, e.g. `master-admin`'s topbar icon), so it can't be
   *  deleted, though its permission list can still be edited. */
  isSystem: boolean
}

const STORAGE_KEY = "amama.admin.roles"

/**
 * Three roles out of the box, deliberately not just the old two — Master
 * Admin holds every permission (the same `"*"` wildcard the client's own
 * reference backend uses for its admin role), KAM keeps today's real
 * capabilities, and Compliance is new: it can review onboarding and
 * moderate listings but can't touch deals, users, or roles at all. Nothing
 * else in this app forces exactly two roles to exist — this is what makes
 * that visible.
 */
const SEED_ROLES: Role[] = [
  { id: "master-admin", name: "Master Admin", permissions: ["*"], createdAt: "2026-08-01T09:00:00.000Z", isSystem: true },
  {
    id: "kam",
    name: "KAM",
    permissions: ["onboarding.review", "listings.moderate", "deals.work"],
    createdAt: "2026-08-01T09:00:00.000Z",
    isSystem: true,
  },
  {
    id: "compliance",
    name: "Compliance",
    permissions: ["onboarding.review", "listings.moderate"],
    createdAt: "2026-08-01T09:00:00.000Z",
    isSystem: true,
  },
]

let snapshot: Role[] = []
let restored = false
const listeners = new Set<() => void>()
const emptyRoles: Role[] = []

function restoreOnce() {
  if (restored || typeof window === "undefined") return
  restored = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      snapshot = JSON.parse(raw) as Role[]
    } else {
      snapshot = SEED_ROLES
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    }
  } catch {
    snapshot = SEED_ROLES
  }
}

function subscribe(listener: () => void) {
  restoreOnce()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  restoreOnce()
  return snapshot
}

function getServerSnapshot() {
  return emptyRoles
}

function write(next: Role[]) {
  snapshot = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Persistence is best-effort.
  }
  listeners.forEach((listener) => listener())
}

function useRoles(): Role[] {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

function createRole(name: string, permissions: RolePermissions): Role {
  restoreOnce()
  const role: Role = {
    id: `role-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    permissions,
    createdAt: new Date().toISOString(),
    isSystem: false,
  }
  write([...snapshot, role])
  return role
}

function updateRole(id: string, patch: Partial<Pick<Role, "name" | "permissions">>) {
  restoreOnce()
  write(snapshot.map((role) => (role.id === id ? { ...role, ...patch } : role)))
}

/** Refuses on a seeded role, or one still held by at least one user —
 *  `usersHoldingRole` is supplied by the caller rather than imported from
 *  `user-store.ts` directly, so these two stores don't have to know about
 *  each other's shape. */
function deleteRole(id: string, usersHoldingRole: (roleId: string) => boolean): { ok: true } | { ok: false; error: string } {
  restoreOnce()
  const role = snapshot.find((entry) => entry.id === id)
  if (!role) return { ok: false, error: "That role no longer exists." }
  if (role.isSystem) return { ok: false, error: "This role is built in and can't be deleted." }
  if (usersHoldingRole(id)) return { ok: false, error: "Reassign everyone off this role first." }
  write(snapshot.filter((entry) => entry.id !== id))
  return { ok: true }
}

export { useRoles, createRole, updateRole, deleteRole }
