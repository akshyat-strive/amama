import { z } from "zod"

import { apiErrorResponse, ApiError } from "@/lib/api/errors"
import { requirePermission } from "@/features/admin/services/current-admin-service"
import { reviewQueue } from "@/features/verification/services/verification-service"

const roleSchema = z.enum(["buyer", "seller"])

export async function GET(_request: Request, { params }: { params: Promise<{ role: string }> }) {
  try {
    await requirePermission("onboarding.review")
    const role = roleSchema.parse((await params).role)
    return Response.json(await reviewQueue(role))
  } catch (error) {
    if (error instanceof z.ZodError) return apiErrorResponse(new ApiError(400, "Unknown role."))
    return apiErrorResponse(error)
  }
}
