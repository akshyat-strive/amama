import { eq } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { buyerProfiles, sellerProfiles, submissionDocuments, type ReviewStatus } from "@/features/verification/lib/schema"
import { neonAuthUser } from "@/features/identity/lib/schema"
import type { OnboardingRole } from "@/features/onboarding/types"

type BuyerProfileRow = typeof buyerProfiles.$inferSelect
type SellerProfileRow = typeof sellerProfiles.$inferSelect
type ProfileRow = BuyerProfileRow | SellerProfileRow
type BuyerDraftInput = Partial<typeof buyerProfiles.$inferInsert>
type SellerDraftInput = Partial<typeof sellerProfiles.$inferInsert>

type SubmittedDocument = {
  id: string
  name: string
  size: number
  required: boolean
  reviewStatus: "pending" | "approved" | "rejected"
  reviewNote: string | null
  storageKey: string
}

function toDocument(row: typeof submissionDocuments.$inferSelect): SubmittedDocument {
  return {
    id: row.id,
    name: row.name,
    size: row.size,
    required: row.required,
    reviewStatus: row.reviewStatus,
    reviewNote: row.reviewNote,
    storageKey: row.storageKey,
  }
}

/**
 * Buyer and seller profiles are shaped almost identically (see
 * `schema.ts`) but are still two distinct tables, so each method branches
 * on `role` explicitly rather than pretending one generic function can
 * safely operate on either Drizzle table object — that trick reads
 * cleaner but silently erases the column types it needs to stay correct.
 */
interface ProfileRepository {
  findBuyer(userId: string): Promise<BuyerProfileRow | null>
  findSeller(userId: string): Promise<SellerProfileRow | null>
  /** Every profile with `reviewStatus !== "draft"` — the admin review
   *  queue. Joins in the applicant's email since that's the one thing
   *  only Better Auth's own table knows. */
  listSubmittedBuyers(): Promise<(BuyerProfileRow & { email: string })[]>
  listSubmittedSellers(): Promise<(SellerProfileRow & { email: string })[]>
  submitBuyer(userId: string, data: BuyerDraftInput): Promise<void>
  submitSeller(userId: string, data: SellerDraftInput): Promise<void>
  setReview(
    userId: string,
    role: OnboardingRole,
    patch: { reviewStatus: ReviewStatus; reviewerNote: string | null; reviewedByAdminId: string; reviewedByName: string }
  ): Promise<void>
  documentsFor(userId: string): Promise<SubmittedDocument[]>
  addDocument(input: {
    id: string
    userId: string
    role: OnboardingRole
    name: string
    size: number
    required: boolean
    storageKey: string
  }): Promise<void>
  setDocumentStatus(id: string, status: "pending" | "approved" | "rejected", note: string | null): Promise<void>
  findDocument(id: string): Promise<{ storageKey: string } | null>
}

const drizzleProfileRepository: ProfileRepository = {
  async findBuyer(userId) {
    const [row] = await db.select().from(buyerProfiles).where(eq(buyerProfiles.userId, userId)).limit(1)
    return row ?? null
  },

  async findSeller(userId) {
    const [row] = await db.select().from(sellerProfiles).where(eq(sellerProfiles.userId, userId)).limit(1)
    return row ?? null
  },

  async listSubmittedBuyers() {
    const rows = await db
      .select({ profile: buyerProfiles, email: neonAuthUser.email })
      .from(buyerProfiles)
      .innerJoin(neonAuthUser, eq(neonAuthUser.id, buyerProfiles.userId))
    return rows.map((row) => ({ ...row.profile, email: row.email }))
  },

  async listSubmittedSellers() {
    const rows = await db
      .select({ profile: sellerProfiles, email: neonAuthUser.email })
      .from(sellerProfiles)
      .innerJoin(neonAuthUser, eq(neonAuthUser.id, sellerProfiles.userId))
    return rows.map((row) => ({ ...row.profile, email: row.email }))
  },

  async submitBuyer(userId, data) {
    const now = new Date()
    await db
      .insert(buyerProfiles)
      .values({ userId, ...data, reviewStatus: "pending", submittedAt: now })
      .onConflictDoUpdate({
        target: buyerProfiles.userId,
        set: { ...data, reviewStatus: "pending", submittedAt: now, reviewerNote: null, updatedAt: now },
      })
  },

  async submitSeller(userId, data) {
    const now = new Date()
    await db
      .insert(sellerProfiles)
      .values({ userId, ...data, reviewStatus: "pending", submittedAt: now })
      .onConflictDoUpdate({
        target: sellerProfiles.userId,
        set: { ...data, reviewStatus: "pending", submittedAt: now, reviewerNote: null, updatedAt: now },
      })
  },

  async setReview(userId, role, patch) {
    const now = new Date()
    if (role === "buyer") {
      await db.update(buyerProfiles).set({ ...patch, reviewedAt: now, updatedAt: now }).where(eq(buyerProfiles.userId, userId))
    } else {
      await db.update(sellerProfiles).set({ ...patch, reviewedAt: now, updatedAt: now }).where(eq(sellerProfiles.userId, userId))
    }
  },

  async documentsFor(userId) {
    const rows = await db.select().from(submissionDocuments).where(eq(submissionDocuments.userId, userId))
    return rows.map(toDocument)
  },

  async addDocument(input) {
    await db.insert(submissionDocuments).values(input)
  },

  async setDocumentStatus(id, status, note) {
    await db
      .update(submissionDocuments)
      .set({ reviewStatus: status, reviewNote: note })
      .where(eq(submissionDocuments.id, id))
  },

  async findDocument(id) {
    const [row] = await db
      .select({ storageKey: submissionDocuments.storageKey })
      .from(submissionDocuments)
      .where(eq(submissionDocuments.id, id))
      .limit(1)
    return row ?? null
  },
}

export type { ProfileRepository, ProfileRow, BuyerProfileRow, SellerProfileRow, SubmittedDocument }
export { drizzleProfileRepository }
