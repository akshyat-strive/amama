import type { EntityType, OnboardingRole, SellerSubType } from "@/features/onboarding/types"

export type ReviewStatus = "not-submitted" | "pending" | "approved" | "changes-requested"

/** `missing` is a document a KAM asked for that hasn't been uploaded yet;
 *  `update-requested` is one on file that a KAM wants a fresh copy of —
 *  it expired, or the details changed — while the old one stays on record. */
export type DocumentReviewStatus = "missing" | "pending" | "approved" | "rejected" | "update-requested"

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
  /** When the document on this upload stops being valid, if it does. */
  expiresAt?: string | null
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
  /** The KYC ticket it belongs to. Older entries without one belong to
   *  the account's first (onboarding) ticket. */
  ticketId?: string | null
}

export type KycActor = { id: string; name: string }

/** Where a ticket came from: the first submission at onboarding, an
 *  update the account holder raised themselves, or a KAM asking for
 *  something. */
export type KycTicketOrigin = "onboarding" | "applicant" | "staff"

/** Derived from the items on every write — see `deriveTicketStatus`. */
export type KycTicketStatus = "open" | "in-progress" | "waiting" | "resolved"

/** `submitted` — the applicant sent it; `update` — a KAM asked for a fresh
 *  copy of a document on file; `new` — a KAM asked for a document the
 *  account didn't have. */
export type KycTicketItemKind = "submitted" | "update" | "new"

/** One document inside one ticket. Its status is the verdict within this
 *  ticket; the document itself carries the account's current state. */
export type KycTicketItem = {
  docId: string
  kind: KycTicketItemKind
  status: DocumentReviewStatus
  /** The upload this ticket is about, once there is one. */
  versionId: string | null
  /** The KAM's reason — why it was asked for, or what to fix. */
  note: string | null
  requestedBy: KycActor | null
  reviewedBy: (KycActor & { at: string }) | null
}

export type KycTicket = {
  /** `KYC-S12345` for the first, `KYC-S12345-2` onwards for later ones. */
  id: string
  seq: number
  origin: KycTicketOrigin
  title: string
  status: KycTicketStatus
  openedAt: string
  openedBy: KycAuthor
  assignee: KycActor | null
  items: KycTicketItem[]
  resolvedAt: string | null
  resolvedBy: KycActor | null
}

/** A replacement the applicant has picked but not sent yet — they collect
 *  as many as they like, then "Finalise & submit" raises one ticket. */
export type KycDraftUpdate = {
  docId: string
  version: DocumentVersion
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
  /** Every KYC ticket on the account, oldest first. Data written before
   *  tickets existed gets them filled in on read (`withTickets`). */
  tickets: KycTicket[]
  drafts: KycDraftUpdate[]
}
