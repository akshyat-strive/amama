import type { EntityType, OnboardingRole, SellerSubType } from "@/features/onboarding/types"

export type ReviewStatus = "not-submitted" | "pending" | "approved" | "changes-requested"

/** `missing` is a document a KAM asked for that hasn't been uploaded yet. */
export type DocumentReviewStatus = "missing" | "pending" | "approved" | "rejected"

/** One upload of one document. Until the application is approved every
 *  upload is kept, so the reviewer can compare a replacement against what
 *  it replaced; approval keeps only the last one. */
export type DocumentVersion = {
  id: string
  name: string
  size: number
  /** Key into the IndexedDB file store (`local-db/file-store.ts`). */
  fileId: string | null
  uploadedAt: string
}

export type KycDocument = {
  /** A catalog `DocumentId`, or `extra-…` for one a KAM asked for. */
  id: string
  /** Set for a document a KAM asked for — the catalog ones have their own. */
  label?: string
  hint?: string
  required: boolean
  reviewStatus: DocumentReviewStatus
  /** Why it was sent back, in the reviewer's words. */
  reviewNote: string | null
  reviewedBy: { id: string; name: string; at: string } | null
  requestedBy: { id: string; name: string; at: string } | null
  /** Oldest first; the last one is current. */
  versions: DocumentVersion[]
}

export type KycAuthor = { kind: "staff" | "applicant" | "system"; id: string; name: string; title?: string }

/** One entry on the ticket's timeline — a message from either side, or a
 *  system event (submitted, re-uploaded, approved). `docId` ties it to a
 *  single document. */
export type KycComment = {
  id: string
  author: KycAuthor
  text: string
  at: string
  docId: string | null
}

export type KycApplication = {
  /** The applicant's email — the same key every other store uses. */
  userId: string
  role: OnboardingRole
  email: string
  fullName: string
  companyName: string
  entityType: EntityType
  sellerSubType?: SellerSubType
  country: string
  reviewStatus: ReviewStatus
  /** A whole-application send-back that hasn't been answered yet. */
  reviewerNote: string | null
  reviewedByAdminId: string | null
  reviewedByName: string | null
  submittedAt: string | null
  reviewedAt: string | null
  /** The KAM who owns this ticket. */
  assigneeId: string | null
  documents: KycDocument[]
  comments: KycComment[]
}
