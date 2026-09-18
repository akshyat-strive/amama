"use client"

import * as React from "react"

import type {
  EntityType,
  OnboardingRole,
  SellerSubType,
} from "@/features/onboarding/types"

const STORAGE_KEY = "amama.verification"

/**
 * Where an application sits in Key Account Manager review. Nobody reaches
 * the dashboard on "pending" — a trade account that hasn't had its KYC
 * documents checked by a human isn't an account yet, it's a request for
 * one.
 */
export type ReviewStatus =
  | "not-submitted"
  | "pending"
  | "approved"
  | "changes-requested"

export type DocumentReviewStatus = "pending" | "approved" | "rejected"

export type SubmittedDocument = {
  id: string
  name: string
  size: number
  required: boolean
  /** Per-document sign-off, independent of the submission's own overall
   *  status — a KAM can accept nine documents and send just the tenth
   *  back, rather than the whole application. */
  reviewStatus: DocumentReviewStatus
  reviewNote: string | null
  /** The file's own contents, as a data URL — `null` if it was over
   *  `PREVIEW_CAP_BYTES` (see `document-upload-card.tsx`) or predates this
   *  field. A KAM's review view needs to actually open what was uploaded,
   *  not just its name and size, and this is the only thing here that
   *  survives from the applicant's tab into a KAM's own. */
  dataUrl: string | null
}

export type Submission = {
  role: OnboardingRole
  status: ReviewStatus
  applicant: {
    fullName: string
    email: string
    country: string
    entityType: EntityType
    sellerSubType?: SellerSubType
  }
  documents: SubmittedDocument[]
  submittedAt: string | null
  reviewedAt: string | null
  /** The KAM's reason, when they send an application back. */
  reviewerNote: string | null
  /** Which KAM actually decided this — `null` until `approve`/`requestChanges`
   *  sets it, so Master Admin can count real per-KAM verification stats
   *  instead of an anonymous aggregate. */
  reviewedByKamId: string | null
  reviewedByKamName: string | null
}

export type Store = Record<OnboardingRole, Submission | null>

const emptyStore: Store = { buyer: null, seller: null }

/*
 * Same external-store shape as `i18n-context` and `onboarding-context`.
 * `localStorage`, not `sessionStorage`: a review outlives the tab the
 * application was filled in on — that's the whole point of it being a
 * review — and the KAM console is a separate route reading the same store.
 *
 * A real build puts this behind an API with the KAM on the other side of
 * it. Keeping the shape submission-shaped (rather than a loose "approved"
 * boolean) is what makes that swap a change of transport rather than a
 * change of model.
 */
let snapshot: Store = emptyStore
let restored = false
const listeners = new Set<() => void>()

/** Backfills the per-document review fields for anything already saved in
 *  `localStorage` before they existed — same one-level merge every other
 *  store here does for exactly this reason. */
function normalizeDocument(document: Partial<SubmittedDocument>): SubmittedDocument {
  return { reviewStatus: "pending", reviewNote: null, dataUrl: null, ...document } as SubmittedDocument
}

function normalizeSubmission(submission: Partial<Submission> | null): Submission | null {
  if (!submission) return null
  return {
    reviewedByKamId: null,
    reviewedByKamName: null,
    ...submission,
    documents: (submission.documents ?? []).map(normalizeDocument),
  } as Submission
}

function restoreOnce() {
  if (restored || typeof window === "undefined") return
  restored = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = { ...emptyStore, ...JSON.parse(raw) } as Store
      snapshot = {
        buyer: normalizeSubmission(parsed.buyer),
        seller: normalizeSubmission(parsed.seller),
      }
    }
  } catch {
    // Private mode or blocked storage — carry on with nothing submitted.
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

function useVerification() {
  const submissions = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  return React.useMemo(
    () => ({
      submissions,
      statusFor: (role: OnboardingRole): ReviewStatus =>
        submissions[role]?.status ?? "not-submitted",

      submit: (
        role: OnboardingRole,
        applicant: Submission["applicant"],
        documents: SubmittedDocument[]
      ) =>
        write({
          ...snapshot,
          [role]: {
            role,
            status: "pending",
            applicant,
            documents,
            submittedAt: new Date().toISOString(),
            reviewedAt: null,
            reviewerNote: null,
            reviewedByKamId: null,
            reviewedByKamName: null,
          },
        }),

      approve: (role: OnboardingRole, kam: { id: string; name: string }) => {
        const existing = snapshot[role]
        if (!existing) return
        write({
          ...snapshot,
          [role]: {
            ...existing,
            status: "approved",
            reviewedAt: new Date().toISOString(),
            reviewerNote: null,
            reviewedByKamId: kam.id,
            reviewedByKamName: kam.name,
          },
        })
      },

      requestChanges: (role: OnboardingRole, note: string, kam: { id: string; name: string }) => {
        const existing = snapshot[role]
        if (!existing) return
        write({
          ...snapshot,
          [role]: {
            ...existing,
            status: "changes-requested",
            reviewedAt: new Date().toISOString(),
            reviewerNote: note,
            reviewedByKamId: kam.id,
            reviewedByKamName: kam.name,
          },
        })
      },

      /** Marks one document within a submission approved or rejected — the
       *  overall application can stay "pending" while individual documents
       *  already have a verdict, since a KAM works through them one at a
       *  time rather than all-or-nothing. */
      setDocumentStatus: (
        role: OnboardingRole,
        documentId: string,
        status: DocumentReviewStatus,
        note: string | null = null
      ) => {
        const existing = snapshot[role]
        if (!existing) return
        write({
          ...snapshot,
          [role]: {
            ...existing,
            documents: existing.documents.map((document) =>
              document.id === documentId
                ? { ...document, reviewStatus: status, reviewNote: note }
                : document
            ),
          },
        })
      },

      /** Sends just the documents a KAM flagged back in, merged into the
       *  existing submission rather than replacing it — anything the KAM
       *  didn't reject (approved or still-pending) stays exactly as it was.
       *  The touched documents go back to "pending" review, and the
       *  submission as a whole goes back to "pending" too, since it needs
       *  another look — but only for the pieces that changed, not a full
       *  from-scratch resubmission. */
      resubmitDocuments: (role: OnboardingRole, updatedDocuments: SubmittedDocument[]) => {
        const existing = snapshot[role]
        if (!existing) return
        const updatedById = new Map(updatedDocuments.map((document) => [document.id, document]))
        write({
          ...snapshot,
          [role]: {
            ...existing,
            status: "pending",
            documents: existing.documents.map(
              (document) => updatedById.get(document.id) ?? document
            ),
            submittedAt: new Date().toISOString(),
            reviewedAt: null,
            reviewerNote: null,
          },
        })
      },

      reset: () => write(emptyStore),
    }),
    [submissions]
  )
}

/** Seeds a fixed pair of submissions, but only if the store is genuinely
 *  empty — see `seed-data.ts`. */
function seedSubmissionsIfEmpty(store: Partial<Store>) {
  restoreOnce()
  if (snapshot.buyer || snapshot.seller) return
  write({ ...emptyStore, ...store })
}

export { useVerification, seedSubmissionsIfEmpty }
