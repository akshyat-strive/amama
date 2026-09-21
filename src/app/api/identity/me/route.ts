import { apiErrorResponse } from "@/lib/api/errors"
import { auth } from "@/lib/auth/server"
import { drizzleAppUsersRepository } from "@/features/identity/lib/app-users-repository"
import { drizzleAdminUsersRepository } from "@/features/admin/lib/admin-users-repository"
import { drizzleRolesRepository } from "@/features/admin/lib/roles-repository"
import { drizzleProfileRepository } from "@/features/verification/lib/profile-repository"

/**
 * The one call every dashboard shell makes on load: who is this, and what
 * do they see. Shaped differently per kind (an admin needs their role's
 * permissions; a buyer/seller needs their review status) because that's
 * genuinely all each one needs — a single flat "user" DTO would just mean
 * every consumer re-deriving which fields apply to them.
 */
export async function GET() {
  try {
    const { data: session } = await auth.getSession()
    if (!session?.user) return Response.json(null)

    const appUser = await drizzleAppUsersRepository.findById(session.user.id)
    if (!appUser) return Response.json(null)

    if (appUser.kind === "admin") {
      const user = await drizzleAdminUsersRepository.findById(appUser.id)
      if (!user) return Response.json(null)
      const role = await drizzleRolesRepository.findById(user.roleId)
      if (!role) return Response.json(null)
      return Response.json({ kind: "admin", user, role })
    }

    if (appUser.kind === "buyer") {
      const profile = await drizzleProfileRepository.findBuyer(appUser.id)
      return Response.json({
        kind: "buyer",
        id: appUser.id,
        name: profile?.fullName || profile?.companyName || appUser.name,
        email: appUser.email,
        reviewStatus: profile?.reviewStatus ?? "draft",
      })
    }

    const profile = await drizzleProfileRepository.findSeller(appUser.id)
    return Response.json({
      kind: "seller",
      id: appUser.id,
      name: profile?.farmName || profile?.fullName || appUser.name,
      email: appUser.email,
      reviewStatus: profile?.reviewStatus ?? "draft",
    })
  } catch (error) {
    return apiErrorResponse(error)
  }
}
