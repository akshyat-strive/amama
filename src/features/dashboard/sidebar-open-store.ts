"use client"

import * as React from "react"

/*
 * A tiny persisted boolean per localStorage key, same external-store shape
 * as every other feature store in this app (see `conversation-store.ts`,
 * `kam-roster-store.ts`). Both `DashboardShell` and `AdminShell` need one —
 * dashboard has a single fixed key, admin has one per role — so this is a
 * multi-key store (keyed by the storage key itself) rather than two copies
 * of the same plumbing.
 *
 * This exists specifically to avoid reading `localStorage` inside a
 * `useState` lazy initializer: that runs during the client's
 * hydration-matching render too, so whenever the persisted value is
 * "closed" it disagrees with the server's render (which has no
 * localStorage to read and always assumes open) — a genuine hydration
 * mismatch, not just a flash of the wrong state. `useSyncExternalStore`
 * is the primitive React ships precisely for this: it renders the
 * server-matching default on the hydration pass, then corrects itself
 * right after.
 */
type SidebarOpenState = Record<string, boolean>

let snapshot: SidebarOpenState = {}
const restoredKeys = new Set<string>()
const listeners = new Set<() => void>()

function restoreOnce(key: string) {
  if (restoredKeys.has(key) || typeof window === "undefined") return
  restoredKeys.add(key)
  try {
    const raw = window.localStorage.getItem(key)
    if (raw !== null) snapshot = { ...snapshot, [key]: raw !== "0" }
  } catch {
    // Private mode or blocked storage — keep the default (open).
  }
}

function write(key: string, value: boolean) {
  snapshot = { ...snapshot, [key]: value }
  try {
    window.localStorage.setItem(key, value ? "1" : "0")
  } catch {
    // Persistence is best-effort.
  }
  listeners.forEach((listener) => listener())
}

function getServerSnapshot() {
  return true
}

/** `true` (open) until a persisted "0" for this key says otherwise. */
function useSidebarOpen(key: string): [boolean, (value: boolean | ((open: boolean) => boolean)) => void] {
  const subscribe = React.useCallback(
    (listener: () => void) => {
      restoreOnce(key)
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    [key]
  )
  const getSnapshot = React.useCallback(() => {
    restoreOnce(key)
    return snapshot[key] ?? true
  }, [key])

  const open = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const setOpen = React.useCallback(
    (value: boolean | ((open: boolean) => boolean)) => {
      const current = snapshot[key] ?? true
      write(key, typeof value === "function" ? value(current) : value)
    },
    [key]
  )

  return [open, setOpen]
}

export { useSidebarOpen }
