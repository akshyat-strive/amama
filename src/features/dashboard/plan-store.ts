"use client"

import * as React from "react"

export type PlanTier = "free" | "pro" | "gold"

const DEFAULT_TIER: PlanTier = "free"

/*
 * Same keyed-external-store shape as `sidebar-open-store.ts` — one
 * persisted value per localStorage key, read through
 * `useSyncExternalStore` so the hydration pass never disagrees with what's
 * actually stored. Keyed by role (`amama.plan.buyer` / `amama.plan.seller`)
 * rather than a single fixed key, since a buyer and a seller signed in on
 * the same device each have their own plan.
 */
type PlanState = Record<string, PlanTier>

let snapshot: PlanState = {}
const restoredKeys = new Set<string>()
const listeners = new Set<() => void>()

function isPlanTier(value: string): value is PlanTier {
  return value === "free" || value === "pro" || value === "gold"
}

function restoreOnce(key: string) {
  if (restoredKeys.has(key) || typeof window === "undefined") return
  restoredKeys.add(key)
  try {
    const raw = window.localStorage.getItem(key)
    if (raw && isPlanTier(raw)) snapshot = { ...snapshot, [key]: raw }
  } catch {
    // Private mode or blocked storage — keep the default (free).
  }
}

function write(key: string, value: PlanTier) {
  snapshot = { ...snapshot, [key]: value }
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Persistence is best-effort.
  }
  listeners.forEach((listener) => listener())
}

function getServerSnapshot(): PlanTier {
  return DEFAULT_TIER
}

/** `"free"` until a persisted "pro"/"gold" for this key says otherwise. */
function usePlan(key: string): [PlanTier, (tier: PlanTier) => void] {
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
    return snapshot[key] ?? DEFAULT_TIER
  }, [key])

  const tier = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const setTier = React.useCallback((value: PlanTier) => write(key, value), [key])

  return [tier, setTier]
}

export { usePlan }
