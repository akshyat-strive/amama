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
 * Four roles out of the box, deliberately not just the old two — Master
 * Admin holds every permission (the same `"*"` wildcard the client's own
 * reference backend uses for its admin role), KAM keeps today's real
 * capabilities, Master KAM is a KAM who can also hand work out, and
 * Compliance can review onboarding and moderate listings but can't touch
 * deals, users, or roles at all. Nothing else in this app forces exactly
 * two roles to exist — this is what makes that visible.
 */
const SEED_ROLES: Role[] = [
  { id: "master-admin", name: "Master Admin", permissions: ["*"], createdAt: "2026-08-01T09:00:00.000Z", isSystem: true },
  {
    id: "master-kam",
    name: "Master KAM",
    /** Everything a KAM can do, plus the two things that make them the
     *  desk lead: seeing every agreed deal rather than only their own,
     *  and allocating them to the KAMs who'll work them. */
    permissions: ["onboarding.review", "listings.moderate", "deals.work", "deals.viewAll", "deals.assign"],
    createdAt: "2026-08-01T09:00:00.000Z",
    isSystem: true,
  },
  {
    id: "kam",
    name: "KAM",
    /** `deals.viewAll` is what lets a KAM see the unassigned pool and pick
     *  work up themselves — assignment still needs `deals.assign`, which
     *  they don't have, so they can claim but not allocate. */
    permissions: ["onboarding.review", "listings.moderate", "deals.work", "deals.viewAll"],
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

/**
 * A browser that seeded roles before "Master KAM" existed has a
 * `localStorage` snapshot frozen at the old two/three-role shape —
 * `restoreOnce` only writes `SEED_ROLES` when the key is empty, so a new
 * role added to that constant later never reaches an existing browser on
 * its own. This backfills just the missing system role into an already-
 * seeded list, preserving every role a real admin has since added or
 * edited, rather than overwriting their data wholesale.
 */
function backfillSeedRoles(roles: Role[]): Role[] {
  if (roles.some((role) => role.id === "master-kam")) return roles
  const masterKam = SEED_ROLES.find((role) => role.id === "master-kam")
  if (!masterKam) return roles
  // Insert right after Master Admin, matching where a fresh seed puts it.
  const adminIndex = roles.findIndex((role) => role.id === "master-admin")
  const next = [...roles]
  next.splice(adminIndex === -1 ? 0 : adminIndex + 1, 0, masterKam)
  return next
}

function restoreOnce() {
  if (restored || typeof window === "undefined") return
  restored = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const restoredRoles = backfillSeedRoles(JSON.parse(raw) as Role[])
      snapshot = restoredRoles
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(restoredRoles))
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
