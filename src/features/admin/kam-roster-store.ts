"use client"

import * as React from "react"

const STORAGE_KEY = "amama.admin.kamRoster"

export type KamRosterEntry = {
  id: string
  name: string
  email: string
  firstSeenAt: string
}

/*
 * Same external-store shape as every other localStorage-backed feature
 * store in this app (see `conversation-store.ts`, `listing-store.ts`).
 * There's no admin backend to hand out KAM accounts from, so the roster
 * grows itself: every KAM who's ever signed in (see `kam-identity.ts`)
 * lands here once, which is what lets Master Admin's team chat and
 * deal-assignment picker list "every KAM," not a hand-authored few.
 */
let snapshot: KamRosterEntry[] = []
let restored = false
const listeners = new Set<() => void>()
const emptyRoster: KamRosterEntry[] = []

function restoreOnce() {
  if (restored || typeof window === "undefined") return
  restored = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) snapshot = JSON.parse(raw)
  } catch {
    // Private mode or blocked storage — carry on with an empty roster.
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
  return emptyRoster
}

function write(next: KamRosterEntry[]) {
  snapshot = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Persistence is best-effort.
  }
  listeners.forEach((listener) => listener())
}

/** Every KAM who has ever signed in, oldest first. */
function useKamRoster(): KamRosterEntry[] {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** Called once per sign-in (see `signInKam`) — adds a KAM the first time
 *  their identity `id` is seen, or refreshes their display name/email in
 *  place on every later sign-in (a KAM might type their name differently
 *  next time) without disturbing `firstSeenAt`. */
function upsertKamRoster(identity: { id: string; name: string; email: string }) {
  restoreOnce()
  const existing = snapshot.find((entry) => entry.id === identity.id)
  if (!existing) {
    write([...snapshot, { ...identity, firstSeenAt: new Date().toISOString() }])
    return
  }
  write(
    snapshot.map((entry) =>
      entry.id === identity.id ? { ...entry, name: identity.name, email: identity.email } : entry
    )
  )
}

export { useKamRoster, upsertKamRoster }
