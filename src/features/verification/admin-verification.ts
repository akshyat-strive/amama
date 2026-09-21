"use client"

import { apiRequest, createFetchStore } from "@/lib/api/fetch-store"
import type { OnboardingRole, EntityType, SellerSubType } from "@/features/onboarding/types"
import type { ReviewStatus, SubmittedDocument } from "@/features/verification/verification-context"

/** One applicant's full application, as the admin review queue sees it —
 *  unlike `Submission` (the self-service type), this carries the
 *  applicant's own fields plus who reviewed it, since a KAM is looking at
 *  *someone else's* application rather than their own. */
export type AdminSubmission = {
  userId: string
  role: OnboardingRole
  email: string
  fullName: string
  entityType: EntityType
  sellerSubType?: SellerSubType
  country: string
  reviewStatus: ReviewStatus
  reviewerNote: string | null
  reviewedByAdminId: string | null
  reviewedByName: string | null
  submittedAt: string | null
  reviewedAt: string | null
  documents: SubmittedDocument[]
}

const stores = {
  buyer: createFetchStore<AdminSubmission[]>("/api/admin/verification/buyer", []),
  seller: createFetchStore<AdminSubmission[]>("/api/admin/verification/seller", []),
}

function useVerificationQueue(role: OnboardingRole): AdminSubmission[] {
  return stores[role].useStore()
}

/** All applications across both roles — for Home's cross-team stats,
 *  where "how many are pending" doesn't care which role they came from. */
function useAllVerificationQueues(): AdminSubmission[] {
  const buyer = stores.buyer.useStore()
  const seller = stores.seller.useStore()
  return [...buyer, ...seller]
}

/** Whether a single role's queue fetch has resolved — see
 *  `useAllVerificationQueuesLoaded` for the combined version. */
function useVerificationQueueLoaded(role: OnboardingRole): boolean {
  return stores[role].useIsLoaded()
}

/** Both queues' fetches resolved — a Home-page widget reads this to show
 *  a loading skeleton instead of briefly flashing "no one registered yet"
 *  before either request comes back. */
function useAllVerificationQueuesLoaded(): boolean {
  const buyerLoaded = stores.buyer.useIsLoaded()
  const sellerLoaded = stores.seller.useIsLoaded()
  return buyerLoaded && sellerLoaded
}

async function approveApplication(role: OnboardingRole, userId: string): Promise<void> {
  await apiRequest(`/api/admin/verification/${role}/${userId}`, {
    method: "POST",
    body: JSON.stringify({ action: "approve" }),
  })
  await stores[role].invalidate()
}

async function requestApplicationChanges(role: OnboardingRole, userId: string, note: string): Promise<void> {
  await apiRequest(`/api/admin/verification/${role}/${userId}`, {
    method: "POST",
    body: JSON.stringify({ action: "request-changes", note }),
  })
  await stores[role].invalidate()
}

async function setDocumentStatus(
  role: OnboardingRole,
  documentId: string,
  status: "pending" | "approved" | "rejected",
  note: string | null = null
): Promise<void> {
  await apiRequest(`/api/admin/verification/documents/${documentId}`, {
    method: "PATCH",
    body: JSON.stringify({ status, note }),
  })
  await stores[role].invalidate()
}

async function documentPreviewUrl(documentId: string): Promise<string> {
  const { url } = await apiRequest<{ url: string }>(`/api/admin/verification/documents/${documentId}/url`)
  return url
}

export {
  useVerificationQueue,
  useAllVerificationQueues,
  useVerificationQueueLoaded,
  useAllVerificationQueuesLoaded,
  approveApplication,
  requestApplicationChanges,
  setDocumentStatus,
  documentPreviewUrl,
}
