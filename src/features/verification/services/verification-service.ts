import { ApiError } from "@/lib/api/errors"
import { presignedReadUrl, uploadFile, uploadKey } from "@/lib/storage/files"
import {
  drizzleProfileRepository,
  type BuyerProfileRow,
  type ProfileRepository,
  type SellerProfileRow,
  type SubmittedDocument,
} from "@/features/verification/lib/profile-repository"
import type { OnboardingRole } from "@/features/onboarding/types"

type IncomingDocument = { id: string; name: string; size: number; required: boolean; dataUrl: string }

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** The wizard's own upload card produces a base64 `dataUrl` client-side
 *  (see `document-upload-card.tsx`) — this is the one place that actually
 *  turns it into bytes in the `uploads` bucket, so nothing upstream of
 *  submit had to change how it collects files. */
function decodeDataUrl(dataUrl: string): { buffer: Buffer; contentType: string } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl)
  if (!match) throw new ApiError(400, "That document wasn't uploaded correctly — try again.")
  return { buffer: Buffer.from(match[2], "base64"), contentType: match[1] }
}

async function storeDocuments(userId: string, role: OnboardingRole, documents: IncomingDocument[]) {
  for (const document of documents) {
    const { buffer, contentType } = decodeDataUrl(document.dataUrl)
    const key = uploadKey(`kyc/${role}`, userId, document.name)
    await uploadFile(key, buffer, contentType)
    await drizzleProfileRepository.addDocument({
      id: generateId("doc"),
      userId,
      role,
      name: document.name,
      size: document.size,
      required: document.required,
      storageKey: key,
    })
  }
}

/** Submits (or re-submits) a role's KYC application — the buyer/seller
 *  wizard's terminal action. Every field the wizard collected goes
 *  straight onto the profile row; documents get uploaded for real here
 *  rather than earlier, since a draft that's never submitted shouldn't
 *  leave orphaned objects in the bucket. */
async function submitApplication(
  userId: string,
  role: OnboardingRole,
  fields: Record<string, unknown>,
  documents: IncomingDocument[],
  repo: ProfileRepository = drizzleProfileRepository
) {
  if (role === "buyer") await repo.submitBuyer(userId, fields as never)
  else await repo.submitSeller(userId, fields as never)
  await storeDocuments(userId, role, documents)
}

async function getProfile(userId: string, role: OnboardingRole, repo: ProfileRepository = drizzleProfileRepository) {
  const profile = role === "buyer" ? await repo.findBuyer(userId) : await repo.findSeller(userId)
  const documents = await repo.documentsFor(userId)
  return { profile, documents }
}

/** Every non-draft application for a role, across every account — the
 *  admin review queue. Documents are fetched per applicant (this app's
 *  scale doesn't warrant a join here) since the queue view shows each
 *  applicant's full document list inline. */
async function reviewQueue(role: OnboardingRole, repo: ProfileRepository = drizzleProfileRepository) {
  const rows = role === "buyer" ? await repo.listSubmittedBuyers() : await repo.listSubmittedSellers()
  const submitted = rows.filter((row) => row.reviewStatus !== "draft")
  return Promise.all(
    submitted.map(async (row) => ({ ...row, role, documents: await repo.documentsFor(row.userId) }))
  )
}

async function approveApplication(
  userId: string,
  role: OnboardingRole,
  admin: { id: string; name: string },
  repo: ProfileRepository = drizzleProfileRepository
) {
  await repo.setReview(userId, role, {
    reviewStatus: "approved",
    reviewerNote: null,
    reviewedByAdminId: admin.id,
    reviewedByName: admin.name,
  })
}

async function requestChanges(
  userId: string,
  role: OnboardingRole,
  note: string,
  admin: { id: string; name: string },
  repo: ProfileRepository = drizzleProfileRepository
) {
  await repo.setReview(userId, role, {
    reviewStatus: "changes-requested",
    reviewerNote: note,
    reviewedByAdminId: admin.id,
    reviewedByName: admin.name,
  })
}

async function setDocumentStatus(
  documentId: string,
  status: "pending" | "approved" | "rejected",
  note: string | null,
  repo: ProfileRepository = drizzleProfileRepository
) {
  await repo.setDocumentStatus(documentId, status, note)
}

async function documentReadUrl(storageKey: string) {
  return presignedReadUrl(storageKey)
}

export type { BuyerProfileRow, SellerProfileRow, SubmittedDocument }
export {
  submitApplication,
  getProfile,
  reviewQueue,
  approveApplication,
  requestChanges,
  setDocumentStatus,
  documentReadUrl,
}
