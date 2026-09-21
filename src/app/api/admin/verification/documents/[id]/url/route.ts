import { apiErrorResponse, ApiError } from "@/lib/api/errors"
import { requirePermission } from "@/features/admin/services/current-admin-service"
import { drizzleProfileRepository } from "@/features/verification/lib/profile-repository"
import { documentReadUrl } from "@/features/verification/services/verification-service"

/** Fetched on demand when a KAM actually opens a document, rather than
 *  inlined on every row — a presigned URL is a credential in its own
 *  right, so the fewer that exist unopened in the client the better. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("onboarding.review")
    const { id } = await params
    const document = await drizzleProfileRepository.findDocument(id)
    if (!document) throw new ApiError(404, "That document doesn't exist.")
    const url = await documentReadUrl(document.storageKey)
    return Response.json({ url })
  } catch (error) {
    return apiErrorResponse(error)
  }
}
