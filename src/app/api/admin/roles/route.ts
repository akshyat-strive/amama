import { z } from "zod"

import { apiErrorResponse } from "@/lib/api/errors"
import { PERMISSION_CATALOG, type Permission } from "@/features/admin/permissions"
import { requirePermission } from "@/features/admin/services/current-admin-service"
import { createRole, listRoles } from "@/features/admin/services/role-service"

const permissionIds = PERMISSION_CATALOG.map((entry) => entry.id) as [Permission, ...Permission[]]
const permissionsSchema = z.union([z.tuple([z.literal("*")]), z.array(z.enum(permissionIds))])

export async function GET() {
  try {
    await requirePermission("roles.manage")
    return Response.json(await listRoles())
  } catch (error) {
    return apiErrorResponse(error)
  }
}

const createSchema = z.object({ name: z.string().min(1), permissions: permissionsSchema })

export async function POST(request: Request) {
  try {
    await requirePermission("roles.manage")
    const { name, permissions } = createSchema.parse(await request.json())
    return Response.json(await createRole(name, permissions))
  } catch (error) {
    return apiErrorResponse(error)
  }
}
