import { z } from "zod"

import { apiErrorResponse } from "@/lib/api/errors"
import { PERMISSION_CATALOG, type Permission } from "@/features/admin/permissions"
import { requirePermission } from "@/features/admin/services/current-admin-service"
import { deleteRole, updateRole } from "@/features/admin/services/role-service"

const permissionIds = PERMISSION_CATALOG.map((entry) => entry.id) as [Permission, ...Permission[]]
const patchSchema = z.object({
  name: z.string().min(1).optional(),
  permissions: z.union([z.tuple([z.literal("*")]), z.array(z.enum(permissionIds))]).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("roles.manage")
    const { id } = await params
    const patch = patchSchema.parse(await request.json())
    await updateRole(id, patch)
    return new Response(null, { status: 204 })
  } catch (error) {
    return apiErrorResponse(error)
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("roles.manage")
    const { id } = await params
    await deleteRole(id)
    return new Response(null, { status: 204 })
  } catch (error) {
    return apiErrorResponse(error)
  }
}
