"use client"

import * as React from "react"

const STORAGE_KEY = "amama.marketplace.wishlist"

/** Keyed by whichever buyer/seller identity id owns the list — a seller
 *  browsing the marketplace for reference pricing gets their own wishlist
 *  too, same as a buyer shortlisting products to follow up on. */
type Store = Record<string, string[]>

const emptyStore: Store = {}
const emptyList: string[] = []

let snapshot: Store = emptyStore
let restored = false
const listeners = new Set<() => void>()

function restoreOnce() {
  if (restored || typeof window === "undefined") return
  restored = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) snapshot = JSON.parse(raw)
  } catch {
    // Private mode or blocked storage — carry on with nothing saved.
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
  return emptyStore
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

function useWishlist(personId: string): string[] {
  const store = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return store[personId] ?? emptyList
}

function toggleWishlist(personId: string, listingId: string) {
  restoreOnce()
  const current = snapshot[personId] ?? emptyList
  const next = current.includes(listingId)
    ? current.filter((id) => id !== listingId)
    : [...current, listingId]
  write({ ...snapshot, [personId]: next })
}

export { useWishlist, toggleWishlist }
