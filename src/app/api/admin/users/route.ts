import { z } from "zod"

import { apiErrorResponse } from "@/lib/api/errors"
import { requirePermission } from "@/features/admin/services/current-admin-service"
import { createAdminUser, listAdminUsers } from "@/features/admin/services/admin-user-service"

export async function GET() {
  try {
    // Reading the roster to populate an assign dropdown (deals, contracts)
    // is a lower bar than managing accounts outright — a Master KAM who can
    // reassign work needs the names to reassign it to, even without
    // `users.manage`.
    await requirePermission(["users.manage", "deals.assign"])
    return Response.json(await listAdminUsers())
  } catch (error) {
    return apiErrorResponse(error)
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  roleId: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const { user } = await requirePermission("users.manage")
    const input = createSchema.parse(await request.json())
    return Response.json(await createAdminUser(input, user.id))
  } catch (error) {
    return apiErrorResponse(error)
  }
}
