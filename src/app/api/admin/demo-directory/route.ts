import { eq } from "drizzle-orm"

import { apiErrorResponse } from "@/lib/api/errors"
import { db } from "@/lib/db/client"
import { neonAuthUser } from "@/features/identity/lib/schema"
import { adminProfiles, roles } from "@/features/admin/lib/schema"

/**
 * Deliberately public, unlike `/api/admin/users` — this backs the two
 * surfaces that exist specifically to get someone *into* a session before
 * they have one: `/creds` and the login screen's own quick-login list.
 * Same "prototype only" tradeoff `/creds` already documents: nothing
 * secret is exposed here, since every demo account shares one known
 * password kept client-side (`DEMO_PASSWORD`), never returned by this
 * endpoint.
 */
export async function GET() {
  try {
    const rows = await db
      .select({
        id: adminProfiles.userId,
        name: adminProfiles.name,
        email: neonAuthUser.email,
        roleId: adminProfiles.roleId,
        roleName: roles.name,
      })
      .from(adminProfiles)
      .innerJoin(neonAuthUser, eq(neonAuthUser.id, adminProfiles.userId))
      .innerJoin(roles, eq(roles.id, adminProfiles.roleId))
    return Response.json(rows)
  } catch (error) {
    return apiErrorResponse(error)
  }
}
