"use client"

import * as React from "react"

import type { OnboardingRole } from "@/features/onboarding/types"

export type KamMessage = { from: "kam" | "you"; text: string; at: string }

const STORAGE_KEY = "amama.marketplace.kamThreads"
const KAM_NAME = "Priya Nair"

/** Keyed by whichever buyer/seller identity id owns the thread — every
 *  account gets exactly one KAM channel, not one per product. */
type Store = Record<string, KamMessage[]>

const emptyStore: Store = {}

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
    // Private mode or blocked storage — carry on with nothing sent yet.
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

function defaultWelcome(role: OnboardingRole): KamMessage[] {
  return [
    {
      from: "kam",
      text:
        role === "buyer"
          ? "Welcome aboard! I'm your account manager for anything from documents to order questions."
          : "Welcome aboard! I'm your account manager — reach out any time you need a hand with an order or a document.",
      at: "2026-08-01T09:00:00.000Z",
    },
    {
      from: "kam",
      text: "Happy to help with anything on your account — just ask.",
      at: "2026-08-01T09:00:05.000Z",
    },
  ]
}

/** The one persisted KAM channel for a given account. Reads with a canned
 *  welcome pair as the fallback so the thread never looks empty before
 *  anyone's actually said anything — that pair is never written to storage
 *  until either side sends a real message, so it can change later without
 *  a migration. */
function useKamThread(personId: string, role: OnboardingRole): KamMessage[] {
  const store = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return store[personId] ?? defaultWelcome(role)
}

function appendKamMessage(personId: string, role: OnboardingRole, message: KamMessage) {
  restoreOnce()
  const existing = snapshot[personId] ?? defaultWelcome(role)
  write({ ...snapshot, [personId]: [...existing, message] })
}

/** The account holder replying in their own KAM thread. */
function sendToKam(personId: string, role: OnboardingRole, text: string) {
  appendKamMessage(personId, role, { from: "you", text, at: new Date().toISOString() })
}

/** A KAM's own message into someone's thread — used when flagging a
 *  listing with an explanation, so it lands in the seller's inbox and not
 *  just as a banner on the listing itself. */
function notifyFromKam(personId: string, role: OnboardingRole, text: string) {
  appendKamMessage(personId, role, { from: "kam", text, at: new Date().toISOString() })
}

export { useKamThread, sendToKam, notifyFromKam, KAM_NAME }
