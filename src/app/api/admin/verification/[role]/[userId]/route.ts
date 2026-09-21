import { z } from "zod"

import { apiErrorResponse, ApiError } from "@/lib/api/errors"
import { requirePermission } from "@/features/admin/services/current-admin-service"
import { approveApplication, requestChanges } from "@/features/verification/services/verification-service"

const roleSchema = z.enum(["buyer", "seller"])
const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("request-changes"), note: z.string().min(1) }),
])

export async function POST(request: Request, { params }: { params: Promise<{ role: string; userId: string }> }) {
  try {
    const { user } = await requirePermission("onboarding.review")
    const { role, userId } = await params
    const parsedRole = roleSchema.parse(role)
    const body = bodySchema.parse(await request.json())

    if (body.action === "approve") {
      await approveApplication(userId, parsedRole, user)
    } else {
      await requestChanges(userId, parsedRole, body.note, user)
    }
    return new Response(null, { status: 204 })
  } catch (error) {
    if (error instanceof z.ZodError) return apiErrorResponse(new ApiError(400, "That request wasn't valid."))
    return apiErrorResponse(error)
  }
}
