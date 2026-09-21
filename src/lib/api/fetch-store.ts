"use client"

import * as React from "react"

/**
 * Generic client-side cache for a REST resource — the same fetch-on-mount
 * / in-memory-snapshot / `useSyncExternalStore` shape every `*-store.ts`
 * in this app already used for `localStorage`, just backed by a real API
 * instead. Feature-agnostic on purpose: it knows nothing about deals,
 * listings, or any other domain, so every feature can reuse it without
 * depending on another feature's business logic.
 */
function createFetchStore<T>(url: string, initial: T) {
  let snapshot: T = initial
  let loaded = false
  let inFlight: Promise<void> | null = null
  const listeners = new Set<() => void>()

  function notify() {
    listeners.forEach((listener) => listener())
  }

  function load(): Promise<void> {
    if (loaded) return Promise.resolve()
    if (inFlight) return inFlight
    inFlight = fetch(url)
      .then((res) => (res.ok ? res.json() : initial))
      .then((data: T) => {
        snapshot = data
        loaded = true
        notify()
      })
      .finally(() => {
        inFlight = null
      })
    return inFlight
  }

  function subscribe(listener: () => void) {
    load()
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  function getSnapshot() {
    return snapshot
  }

  function getServerSnapshot() {
    return initial
  }

  /** Replaces the cached snapshot directly — for a mutation whose own
   *  response already carries the new state, so a full refetch would just
   *  be a slower way to arrive at the same data. */
  function setSnapshot(next: T) {
    snapshot = next
    loaded = true
    notify()
  }

  /** Drops the cache and refetches — for a mutation whose response
   *  doesn't carry the whole collection back. */
  function invalidate() {
    loaded = false
    return load()
  }

  function useStore(): T {
    return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  }

  /** Whether the initial fetch has resolved — a consumer that redirects
   *  on "no data" (e.g. bouncing a signed-out visitor to `/login`) has to
   *  check this first, or it fires during the network round-trip every
   *  fetch-backed store needs on a fresh page load, which a `localStorage`
   *  read never did. */
  function useIsLoaded(): boolean {
    return React.useSyncExternalStore(subscribe, () => loaded, () => false)
  }

  return { useStore, useIsLoaded, setSnapshot, invalidate, load, getSnapshot }
}

/** A small `fetch` wrapper for mutations — throws with the server's own
 *  error message on failure, so a `try/catch` at the call site has
 *  something a user could actually be shown instead of a bare "Failed to
 *  fetch". */
async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Request to ${url} failed (${res.status})`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export { createFetchStore, apiRequest }
