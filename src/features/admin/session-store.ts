"use client"

import * as React from "react"

import { findUserByEmail } from "@/features/admin/user-store"

export type Session = { userId: string; at: string }

const STORAGE_KEY = "amama.admin.session"

/*
 * Replaces the old `kam-identity.ts` self-declared identity — signing in
 * now means a real (if entirely local/fake) credential check against
 * `user-store.ts`, not just typing whatever name you want.
 */
let snapshot: Session | null = null
let restored = false
const listeners = new Set<() => void>()

function restoreOnce() {
  if (restored || typeof window === "undefined") return
  restored = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) snapshot = JSON.parse(raw)
  } catch {
    // Private mode or blocked storage — carry on signed out.
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
  return null
}

function write(next: Session | null) {
  snapshot = next
  try {
    if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Persistence is best-effort.
  }
  listeners.forEach((listener) => listener())
}

function useSession(): Session | null {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

function signIn(email: string, password: string): { ok: true } | { ok: false; error: string } {
  const user = findUserByEmail(email)
  if (!user || user.password !== password) {
    return { ok: false, error: "That email and password don't match any account." }
  }
  write({ userId: user.id, at: new Date().toISOString() })
  return { ok: true }
}

function signOut() {
  write(null)
}

export { useSession, signIn, signOut }
