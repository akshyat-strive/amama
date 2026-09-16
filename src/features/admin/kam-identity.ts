"use client"

import * as React from "react"

import { upsertKamRoster } from "@/features/admin/kam-roster-store"

const STORAGE_KEY = "amama.admin.kamIdentity"

export type KamIdentity = {
  id: string
  name: string
  email: string
}

/*
 * A KAM's own identity, self-declared at sign-in — there's no admin
 * backend to issue accounts from, so this follows the exact same
 * self-declared-identity shape `buyerIdentity`/`sellerIdentity` already
 * use for traders (see `src/features/marketplace/identity.ts`): a stable
 * id derived from the email they typed, kept only for this browser.
 */
let snapshot: KamIdentity | null = null
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

function write(next: KamIdentity | null) {
  snapshot = next
  try {
    if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Persistence is best-effort.
  }
  listeners.forEach((listener) => listener())
}

/** `null` until a KAM has signed in this browser. */
function useKamIdentity(): KamIdentity | null {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** Called from the KAM login form. Registers the identity into the roster
 *  in the same step, so every sign-in is also how Master Admin's KAM list
 *  grows — there's nowhere else a KAM roster could come from. */
function signInKam(name: string, email: string): KamIdentity {
  const identity: KamIdentity = {
    id: email.trim().toLowerCase() || "kam",
    name: name.trim() || "KAM",
    email: email.trim(),
  }
  write(identity)
  upsertKamRoster(identity)
  return identity
}

/** Called from the KAM settings page. Leaves the roster entry in place
 *  (another KAM shouldn't vanish from history just because they signed
 *  out) — only this browser's own session identity is cleared. */
function signOutKam() {
  write(null)
}

export { useKamIdentity, signInKam, signOutKam }
