import { z } from "zod"

import { apiErrorResponse } from "@/lib/api/errors"
import { registerAppUser } from "@/features/identity/services/identity-service"

const bodySchema = z.object({ kind: z.enum(["buyer", "seller", "admin"]) })

/** Called once, right after `authClient.signUp.email()` succeeds — turns
 *  the bare Better Auth credential into a buyer, seller, or admin account
 *  by writing the `app_users` row. */
export async function POST(request: Request) {
  try {
    const { kind } = bodySchema.parse(await request.json())
    const appUser = await registerAppUser(kind)
    return Response.json(appUser)
  } catch (error) {
    return apiErrorResponse(error)
  }
}
