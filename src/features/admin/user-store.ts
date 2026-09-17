"use client"

import * as React from "react"

export type AdminUser = {
  id: string
  name: string
  email: string
  /** Plaintext, on purpose — this is a client-side prototype with no real
   *  backend anywhere; every store here is `localStorage`. Never do this
   *  against a real account system. The whole point of the `/creds` page
   *  is to read this value back out for a demo login shortcut. */
  password: string
  roleId: string
  createdAt: string
  /** `null` for the seeded accounts; the creating user's id otherwise. */
  createdBy: string | null
}

const STORAGE_KEY = "amama.admin.users"
const DEMO_PASSWORD = "User@123"

/**
 * Four accounts across all three seeded roles (see `role-store.ts`) —
 * Priya and Arjun's names are deliberately real KAM names already baked
 * into `listing-store.ts`'s seed listings' `moderatedBy` field, so "By
 * team member" stats are non-zero the moment anyone signs in, not just
 * after they personally click something.
 */
const SEED_USERS: AdminUser[] = [
  {
    id: "admin@amama.com",
    name: "Master Admin",
    email: "admin@amama.com",
    password: DEMO_PASSWORD,
    roleId: "master-admin",
    createdAt: "2026-08-01T09:00:00.000Z",
    createdBy: null,
  },
  {
    id: "priya@amama.com",
    name: "Priya Nair",
    email: "priya@amama.com",
    password: DEMO_PASSWORD,
    roleId: "kam",
    createdAt: "2026-08-01T09:05:00.000Z",
    createdBy: null,
  },
  {
    id: "arjun@amama.com",
    name: "Arjun Mehta",
    email: "arjun@amama.com",
    password: DEMO_PASSWORD,
    roleId: "kam",
    createdAt: "2026-08-01T09:06:00.000Z",
    createdBy: null,
  },
  {
    id: "leela@amama.com",
    name: "Leela Krishnan",
    email: "leela@amama.com",
    password: DEMO_PASSWORD,
    roleId: "compliance",
    createdAt: "2026-08-01T09:07:00.000Z",
    createdBy: null,
  },
]

let snapshot: AdminUser[] = []
let restored = false
const listeners = new Set<() => void>()
const emptyUsers: AdminUser[] = []

function restoreOnce() {
  if (restored || typeof window === "undefined") return
  restored = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      snapshot = JSON.parse(raw) as AdminUser[]
    } else {
      snapshot = SEED_USERS
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    }
  } catch {
    snapshot = SEED_USERS
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
  return emptyUsers
}

function write(next: AdminUser[]) {
  snapshot = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Persistence is best-effort.
  }
  listeners.forEach((listener) => listener())
}

function useUsers(): AdminUser[] {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

function findUserByEmail(email: string): AdminUser | null {
  restoreOnce()
  return snapshot.find((user) => user.id === email.trim().toLowerCase()) ?? null
}

function createUser(
  input: { name: string; email: string; password: string; roleId: string },
  createdBy: string
): { ok: true; user: AdminUser } | { ok: false; error: string } {
  restoreOnce()
  const id = input.email.trim().toLowerCase()
  if (!id) return { ok: false, error: "An email is required." }
  if (snapshot.some((user) => user.id === id)) return { ok: false, error: "That email is already in use." }
  const user: AdminUser = {
    id,
    name: input.name.trim() || "New team member",
    email: input.email.trim(),
    password: input.password.trim() || DEMO_PASSWORD,
    roleId: input.roleId,
    createdAt: new Date().toISOString(),
    createdBy,
  }
  write([...snapshot, user])
  return { ok: true, user }
}

function updateUser(id: string, patch: Partial<Pick<AdminUser, "name" | "roleId" | "password">>) {
  restoreOnce()
  write(snapshot.map((user) => (user.id === id ? { ...user, ...patch } : user)))
}

function deleteUser(id: string) {
  restoreOnce()
  write(snapshot.filter((user) => user.id !== id))
}

export { useUsers, findUserByEmail, createUser, updateUser, deleteUser, DEMO_PASSWORD }
