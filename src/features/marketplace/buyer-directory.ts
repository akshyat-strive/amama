"use client"

import * as React from "react"

import type { BuyerLead } from "@/features/marketplace/buyer-leads"

const STORAGE_KEY = "amama.buyerDirectory"

type Store = Record<string, BuyerLead>

/*
 * Real buyers publish their own current identity + sourcing crops here (see
 * `DashboardShell`'s sync effect) so a seller's Buyers page can match on
 * what someone is *actually* sourcing right now, not just the crop tied to
 * whatever listing they once messaged about. Same localStorage-backed
 * external-store shape as `listing-store.ts` — shared across every tab and
 * account in this browser, which is the whole point: a buyer's edit made in
 * one tab needs to be visible on a seller's Buyers page in another.
 */
let snapshot: Store = {}
let restored = false
const listeners = new Set<() => void>()

function restoreOnce() {
  if (restored || typeof window === "undefined") return
  restored = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) snapshot = JSON.parse(raw)
  } catch {
    // Private mode or blocked storage — carry on with an empty directory.
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

function getServerSnapshot(): Store {
  return {}
}

function write(next: Store) {
  snapshot = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Persistence is best-effort.
  }
  listeners.forEach((listener) => listener())
}

/** Every real buyer who has ever published a profile — same shape as
 *  `BuyerLead`, so a seller's Buyers page (and a buyer's own lead-detail
 *  page) can treat one of these exactly like a roster entry. */
function useBuyerProfiles(): BuyerLead[] {
  const store = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return React.useMemo(() => Object.values(store), [store])
}

/** Publishes one buyer's current identity + sourcing crops, keyed by their
 *  id — called from `DashboardShell` whenever a signed-in buyer's draft has
 *  a real email, so their latest edit (e.g. via "Edit product list") is
 *  what every seller sees, not whatever they were sourcing when some other
 *  conversation first started. */
function upsertBuyerProfile(profile: BuyerLead) {
  restoreOnce()
  write({ ...snapshot, [profile.id]: profile })
}

export { useBuyerProfiles, upsertBuyerProfile }
