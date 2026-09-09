"use client"

import * as React from "react"

import type { UploadedFile } from "@/features/documents/components/document-upload-card"
import type { OnboardingRole } from "@/features/onboarding/types"

const STORAGE_KEY = "amama.documents.draft"

type DraftStore = Record<OnboardingRole, Record<string, UploadedFile>>

const emptyStore: DraftStore = { buyer: {}, seller: {} }

/*
 * Same external-store shape as `onboarding-context` and `verification-context`,
 * but `localStorage` rather than `sessionStorage`: unlike the rest of the
 * onboarding draft, a half-finished set of document uploads should still be
 * there the next time the applicant logs in, not just later in the same tab.
 * Keyed by role, same as `verification-context`, since a browser can carry an
 * in-progress buyer and seller draft at once.
 */
let snapshot: DraftStore = emptyStore
let restored = false
const listeners = new Set<() => void>()

function restoreOnce() {
  if (restored || typeof window === "undefined") return
  restored = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DraftStore>
      snapshot = { buyer: { ...parsed.buyer }, seller: { ...parsed.seller } }
    }
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

function write(next: DraftStore) {
  snapshot = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Persistence is best-effort.
  }
  listeners.forEach((listener) => listener())
}

/**
 * One role's in-progress document uploads, saved as each one finishes rather
 * than only on final submit — so closing the tab (or the whole browser)
 * midway through KYC and coming back later resumes from whatever was already
 * uploaded instead of starting the whole form over.
 */
function useDocumentDraft(role: OnboardingRole) {
  const store = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  return React.useMemo(
    () => ({
      uploads: store[role],
      setUpload: (id: string, file: UploadedFile | null) => {
        const current = snapshot[role]
        if (!file) {
          if (!(id in current)) return
          const next = { ...current }
          delete next[id]
          write({ ...snapshot, [role]: next })
          return
        }
        write({ ...snapshot, [role]: { ...current, [id]: file } })
      },
      /** Called once the draft has become a real submission — from then on
       *  `verification-context` is the record of what was uploaded, so
       *  carrying the draft forward too would just be a second, staler copy. */
      clear: () => write({ ...snapshot, [role]: {} }),
    }),
    [store, role]
  )
}

export { useDocumentDraft }
