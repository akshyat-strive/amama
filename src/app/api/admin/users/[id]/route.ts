import { z } from "zod"

import { apiErrorResponse } from "@/lib/api/errors"
import { requirePermission } from "@/features/admin/services/current-admin-service"
import { deleteAdminUser, updateAdminUserRole } from "@/features/admin/services/admin-user-service"

const patchSchema = z.object({ roleId: z.string().min(1) })

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("users.manage")
    const { id } = await params
    const { roleId } = patchSchema.parse(await request.json())
    await updateAdminUserRole(id, roleId)
    return new Response(null, { status: 204 })
  } catch (error) {
    return apiErrorResponse(error)
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("users.manage")
    const { id } = await params
    await deleteAdminUser(id)
    return new Response(null, { status: 204 })
  } catch (error) {
    return apiErrorResponse(error)
  }
}
