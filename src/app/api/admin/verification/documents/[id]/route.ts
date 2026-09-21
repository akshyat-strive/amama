import { z } from "zod"

import { apiErrorResponse } from "@/lib/api/errors"
import { requirePermission } from "@/features/admin/services/current-admin-service"
import { setDocumentStatus } from "@/features/verification/services/verification-service"

const patchSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
  note: z.string().nullable().default(null),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("onboarding.review")
    const { id } = await params
    const { status, note } = patchSchema.parse(await request.json())
    await setDocumentStatus(id, status, note)
    return new Response(null, { status: 204 })
  } catch (error) {
    return apiErrorResponse(error)
  }
}
