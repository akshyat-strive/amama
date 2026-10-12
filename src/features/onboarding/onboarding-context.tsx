"use client"

import * as React from "react"

import { DEMO_BUYER_PREFERENCES } from "@/features/auth/demo-accounts"
import {
  emptyBuyer,
  emptyDraft,
  emptySeller,
  type BuyerDraft,
  type BuyerPreferences,
  type OnboardingDraft,
  type SellerDraft,
} from "@/features/onboarding/types"

const STORAGE_KEY = "amama.onboarding.draft"

/*
 * Buying preferences (grades, order size per product) have no column on the
 * server profile yet, so they are kept per email in this browser and
 * merged back in whenever that buyer's draft is loaded — signing out and in
 * again does not lose them.
 */
const PREFERENCES_KEY = (email: string) => `amama.buyer.preferences.${email.trim().toLowerCase()}`

const hasPreferences = (preferences: BuyerPreferences) =>
  preferences.products.length > 0 || preferences.grades.length > 0 || preferences.orderSize !== ""

/** Drafts saved before preferences were reshaped carried a per-product
 *  map; anything not in the current shape starts empty. */
function normalisePreferences(value: unknown): BuyerPreferences {
  const raw = (value ?? {}) as Partial<BuyerPreferences>
  return {
    products: Array.isArray(raw.products) ? raw.products : [],
    grades: Array.isArray(raw.grades) ? raw.grades : [],
    orderSize: typeof raw.orderSize === "string" ? raw.orderSize : "",
  }
}

function savePreferences(buyer: BuyerDraft) {
  if (!buyer.email || !hasPreferences(buyer.preferences)) return
  try {
    window.localStorage.setItem(PREFERENCES_KEY(buyer.email), JSON.stringify(buyer.preferences))
  } catch {
    // Best-effort.
  }
}

function withSavedPreferences(buyer: BuyerDraft): BuyerDraft {
  const current = normalisePreferences(buyer.preferences)
  if (!buyer.email || hasPreferences(current)) return { ...buyer, preferences: current }
  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY(buyer.email))
    if (raw) return { ...buyer, preferences: normalisePreferences(JSON.parse(raw)) }
  } catch {
    // Fall through to the demo defaults.
  }
  const demo = DEMO_BUYER_PREFERENCES[buyer.email.trim().toLowerCase()]
  return { ...buyer, preferences: demo ?? current }
}

/**
 * A patch, or a function of the current value. The functional form matters for
 * multi-select toggles: two taps inside one frame both read the same render's
 * array otherwise, and the second silently discards the first.
 */
type Updater<T> = Partial<T> | ((previous: T) => Partial<T>)

function applyUpdater<T>(previous: T, updater: Updater<T>): T {
  const patch =
    typeof updater === "function"
      ? (updater as (value: T) => Partial<T>)(previous)
      : updater
  return { ...previous, ...patch }
}

/*
 * The in-progress signup lives in a small external store rather than component
 * state, read through `useSyncExternalStore`.
 *
 * Why not `useState` + an effect: the draft is restored from `sessionStorage`,
 * which does not exist during SSR. Seeding state in an effect means a second
 * cascading render on every mount, and React now flags it. `getServerSnapshot`
 * is the supported seam — the server and the hydration pass both see an empty
 * draft, then React re-renders once against real storage.
 *
 * It is a draft, not a record: nothing here is authoritative until submission,
 * and `sessionStorage` keeps it scoped to the tab so a shared device does not
 * leak one person's half-finished signup into the next.
 */
let snapshot: OnboardingDraft = emptyDraft
let restored = false
const listeners = new Set<() => void>()

function restoreOnce() {
  if (restored || typeof window === "undefined") return
  restored = true
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const stored = JSON.parse(raw)
      // A one-level spread would let a draft saved before a field existed
      // (e.g. `entityType`, added after some users already had a draft in
      // sessionStorage) silently replace the whole `buyer`/`seller` object
      // and drop the default for that field entirely. Merge one level
      // deeper so an old draft picks up new fields' defaults instead of
      // shipping `undefined` into code that assumes they're always set.
      snapshot = {
        ...emptyDraft,
        ...stored,
        buyer: { ...emptyBuyer, ...stored.buyer, preferences: normalisePreferences(stored.buyer?.preferences) },
        seller: { ...emptySeller, ...stored.seller },
      }
    }
  } catch {
    // Private mode or blocked storage — carry on with an empty draft.
  }
}

function subscribe(listener: () => void) {
  restoreOnce()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Must return a stable reference, so the snapshot is only swapped in `write`. */
function getSnapshot() {
  restoreOnce()
  return snapshot
}

function getServerSnapshot() {
  return emptyDraft
}

function write(next: OnboardingDraft) {
  snapshot = next
  savePreferences(next.buyer)
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Persistence is best-effort.
  }
  listeners.forEach((listener) => listener())
}

function useOnboarding() {
  const draft = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  return React.useMemo(
    () => ({
      draft,
      setRole: (role: OnboardingDraft["role"]) =>
        write({ ...snapshot, role }),
      updateBuyer: (patch: Updater<BuyerDraft>) =>
        write({ ...snapshot, buyer: applyUpdater(snapshot.buyer, patch) }),
      updateSeller: (patch: Updater<SellerDraft>) =>
        write({ ...snapshot, seller: applyUpdater(snapshot.seller, patch) }),
      /** Drops in a whole finished draft at once — what a demo "quick
       *  login" button uses to skip the wizard entirely, rather than
       *  replaying every step's `updateBuyer`/`updateSeller` call. */
      loadDraft: (next: OnboardingDraft) => write({ ...next, buyer: withSavedPreferences({ ...emptyBuyer, ...next.buyer }) }),
      reset: () => {
        try {
          window.sessionStorage.removeItem(STORAGE_KEY)
        } catch {
          // ignore
        }
        write(emptyDraft)
      },
    }),
    [draft]
  )
}

export { useOnboarding }
