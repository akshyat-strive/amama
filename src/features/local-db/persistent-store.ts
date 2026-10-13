"use client"

import * as React from "react"

import { ensureSeedVersion } from "@/features/local-db/seed-version"

type Updater<T> = T | ((previous: T) => T)

export type PersistentStore<T> = {
  /** The current value, re-rendering on every change. */
  use: () => T
  /** False during the server render and the hydration pass, true after —
   *  for the few screens that must not flash "nothing here" first. */
  useLoaded: () => boolean
  get: () => T
  set: (next: Updater<T>) => void
}

const noSubscribe = () => () => {}
const loadedOnClient = () => true
const notLoadedOnServer = () => false

function useStorageLoaded() {
  return React.useSyncExternalStore(noSubscribe, loadedOnClient, notLoadedOnServer)
}

/**
 * One value kept in `localStorage` under `key`, read through
 * `useSyncExternalStore`. A fresh browser gets `seed()` written on first
 * read; after that, what's stored is the truth. The server and the
 * hydration pass both see `initial`, then React re-renders once against
 * real storage. Other tabs' writes arrive through the `storage` event, so
 * an applicant and a reviewer open side by side see each other's changes.
 */
function createPersistentStore<T>(key: string, seed: () => T, initial: T): PersistentStore<T> {
  let snapshot: T = initial
  let restored = false
  const listeners = new Set<() => void>()

  const read = () => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw !== null) return JSON.parse(raw) as T
    } catch {
      // Corrupt or blocked — reseed below.
    }
    const value = seed()
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Quota or private mode — keep it in memory only.
    }
    return value
  }

  const restoreOnce = () => {
    if (restored || typeof window === "undefined") return
    restored = true
    ensureSeedVersion()
    snapshot = read()
    window.addEventListener("storage", (event) => {
      if (event.key !== key && event.key !== null) return
      snapshot = read()
      listeners.forEach((listener) => listener())
    })
  }

  const subscribe = (listener: () => void) => {
    restoreOnce()
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  const get = () => {
    restoreOnce()
    return snapshot
  }

  const set = (next: Updater<T>) => {
    restoreOnce()
    snapshot = typeof next === "function" ? (next as (previous: T) => T)(snapshot) : next
    try {
      window.localStorage.setItem(key, JSON.stringify(snapshot))
    } catch {
      // Best effort — the in-memory value still updates.
    }
    listeners.forEach((listener) => listener())
  }

  const getServerSnapshot = () => initial

  return {
    use: () => React.useSyncExternalStore(subscribe, get, getServerSnapshot),
    useLoaded: useStorageLoaded,
    get,
    set,
  }
}

/** A short random id — good enough to keep records apart in one browser. */
function localId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
}

export { createPersistentStore, localId, useStorageLoaded }
