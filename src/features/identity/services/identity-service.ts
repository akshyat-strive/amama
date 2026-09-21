import { auth } from "@/lib/auth/server"
import { ApiError } from "@/lib/api/errors"
import {
  drizzleAppUsersRepository,
  type AppUser,
  type AppUsersRepository,
  type AuthUser,
} from "@/features/identity/lib/app-users-repository"
import type { AppUserKind } from "@/features/identity/lib/schema"

/** The Better Auth session, unwrapped — everything downstream just wants
 *  "who is this," not Better Auth's own `{data, error}` envelope. */
async function requireAuthUser(): Promise<AuthUser> {
  const { data: session } = await auth.getSession()
  if (!session?.user) throw new ApiError(401, "You need to be signed in.")
  return session.user
}

/** The app-side identity for whoever is signed in. A signed-in Better
 *  Auth user with no `app_users` row yet (mid-signup, before
 *  `registerAppUser` ran) is treated as unauthorized rather than crashing
 *  — the client is expected to call `/api/identity/register` right after
 *  sign-up before touching anything else. */
async function requireAppUser(repo: AppUsersRepository = drizzleAppUsersRepository): Promise<AppUser> {
  const authUser = await requireAuthUser()
  const appUser = await repo.findById(authUser.id)
  if (!appUser) throw new ApiError(403, "Your account isn't finished setting up yet.")
  return appUser
}

async function requireAppUserOfKind(
  kind: AppUserKind,
  repo: AppUsersRepository = drizzleAppUsersRepository
): Promise<AppUser> {
  const appUser = await requireAppUser(repo)
  if (appUser.kind !== kind) throw new ApiError(403, "You don't have access to this.")
  return appUser
}

/** Bootstraps the app-side row right after a Better Auth sign-up —
 *  `authClient.signUp.email()` only creates the credential, this is what
 *  turns it into a buyer, seller, or admin account. Idempotent: calling it
 *  again for an already-registered user just returns the existing row,
 *  since sign-up can't be replayed to change someone's kind afterward. */
async function registerAppUser(
  kind: AppUserKind,
  repo: AppUsersRepository = drizzleAppUsersRepository
): Promise<AppUser> {
  const authUser = await requireAuthUser()
  return repo.ensure(authUser, kind)
}

export { requireAuthUser, requireAppUser, requireAppUserOfKind, registerAppUser }
