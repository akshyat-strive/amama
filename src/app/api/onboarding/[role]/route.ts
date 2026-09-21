import { z } from "zod"

import { apiErrorResponse, ApiError } from "@/lib/api/errors"
import { requireAppUserOfKind } from "@/features/identity/services/identity-service"
import { getProfile } from "@/features/verification/services/verification-service"

const roleSchema = z.enum(["buyer", "seller"])

/** A signed-in buyer/seller reading their own application — never anyone
 *  else's, so there's no `userId` in the path at all. */
export async function GET(_request: Request, { params }: { params: Promise<{ role: string }> }) {
  try {
    const role = roleSchema.parse((await params).role)
    const appUser = await requireAppUserOfKind(role)
    return Response.json(await getProfile(appUser.id, role))
  } catch (error) {
    if (error instanceof z.ZodError) return apiErrorResponse(new ApiError(400, "Unknown role."))
    return apiErrorResponse(error)
  }
}
