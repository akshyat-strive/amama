"use client"

import { apiRequest, createFetchStore } from "@/lib/api/fetch-store"
import type { OnboardingRole } from "@/features/onboarding/types"

export type ReviewStatus = "not-submitted" | "pending" | "approved" | "changes-requested"
export type DocumentReviewStatus = "pending" | "approved" | "rejected"

export type SubmittedDocument = {
  id: string
  name: string
  size: number
  required: boolean
  reviewStatus: DocumentReviewStatus
  reviewNote: string | null
  /** Real files now live in object storage, not inline — always `null`
   *  from this endpoint. A KAM previews/downloads via a presigned URL
   *  instead (see `review-queue-view.tsx`), fetched only when they
   *  actually open a document rather than inlined for every row. */
  dataUrl: string | null
}

/** What a signed-in buyer/seller can see about *their own* application —
 *  never anyone else's, so unlike the old prototype this has no
 *  `applicant` field: the caller already knows who they are. The admin
 *  review queue (many applicants at once) is a separate hook below. */
export type Submission = {
  role: OnboardingRole
  status: ReviewStatus
  documents: SubmittedDocument[]
  submittedAt: string | null
  reviewerNote: string | null
}

type ProfileResponse = {
  profile: { reviewStatus: "draft" | ReviewStatus; submittedAt: string | null; reviewerNote: string | null } | null
  documents: SubmittedDocument[]
}

const roles: OnboardingRole[] = ["buyer", "seller"]
const stores = Object.fromEntries(
  roles.map((role) => [role, createFetchStore<ProfileResponse | null>(`/api/onboarding/${role}`, null)])
) as Record<OnboardingRole, ReturnType<typeof createFetchStore<ProfileResponse | null>>>

function toSubmission(role: OnboardingRole, data: ProfileResponse | null): Submission | null {
  if (!data?.profile || data.profile.reviewStatus === "draft") return null
  return {
    role,
    status: data.profile.reviewStatus,
    documents: data.documents,
    submittedAt: data.profile.submittedAt,
    reviewerNote: data.profile.reviewerNote,
  }
}

/**
 * Reads *my own* application for both roles — in practice only the one
 * matching the signed-in account's kind ever resolves to non-null; asking
 * for the other role 403s, which the underlying fetch store just quietly
 * caches as `null` rather than throwing, matching the old prototype's
 * always-null-for-the-role-you-aren't shape.
 */
function useVerification() {
  const buyer = stores.buyer.useStore()
  const seller = stores.seller.useStore()
  const buyerLoaded = stores.buyer.useIsLoaded()
  const sellerLoaded = stores.seller.useIsLoaded()
  const submissions: Record<OnboardingRole, Submission | null> = {
    buyer: toSubmission("buyer", buyer),
    seller: toSubmission("seller", seller),
  }
  const loaded: Record<OnboardingRole, boolean> = { buyer: buyerLoaded, seller: sellerLoaded }

  return {
    submissions,
    /** Whether `role`'s status has actually come back from the server —
     *  check this before trusting `statusFor`, which otherwise can't tell
     *  "still loading" apart from a real `not-submitted`. */
    isLoaded: (role: OnboardingRole): boolean => loaded[role],
    statusFor: (role: OnboardingRole): ReviewStatus => submissions[role]?.status ?? "not-submitted",

    submit: async (
      role: OnboardingRole,
      applicant: Record<string, unknown>,
      documents: Array<{ id: string; name: string; size: number; required: boolean; dataUrl: string | null }>
    ) => {
      await apiRequest(`/api/onboarding/${role}/submit`, {
        method: "POST",
        body: JSON.stringify({
          fields: applicant,
          documents: documents.map((document) => ({ ...document, dataUrl: document.dataUrl ?? "" })),
        }),
      })
      await stores[role].invalidate()
    },

    /** Same submit endpoint — a resubmission only ever carries a fresh set
     *  of documents for whatever was rejected, so it's the same "replace
     *  what's there" write the first submission already does. */
    resubmitDocuments: async (
      role: OnboardingRole,
      documents: Array<{ id: string; name: string; size: number; required: boolean; dataUrl: string | null }>
    ) => {
      await apiRequest(`/api/onboarding/${role}/submit`, {
        method: "POST",
        body: JSON.stringify({ fields: {}, documents: documents.map((document) => ({ ...document, dataUrl: document.dataUrl ?? "" })) }),
      })
      await stores[role].invalidate()
    },
  }
}

export { useVerification }
