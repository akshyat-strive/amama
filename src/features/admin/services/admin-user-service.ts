import { auth } from "@/lib/auth/server"
import { ApiError } from "@/lib/api/errors"
import {
  drizzleAdminUsersRepository,
  type AdminUser,
  type AdminUsersRepository,
} from "@/features/admin/lib/admin-users-repository"

async function listAdminUsers(repo: AdminUsersRepository = drizzleAdminUsersRepository): Promise<AdminUser[]> {
  return repo.list()
}

/**
 * Creates a real Better Auth credential for a new teammate *and* this
 * app's own `admin_profiles`/RBAC row — via `auth.admin.createUser`
 * rather than `authClient.signUp.email`, specifically because `signUp`
 * signs the browser that calls it in as the new account. An admin
 * creating a teammate from a form must keep their own session; the admin
 * plugin's `createUser` exists precisely for that case.
 *
 * Every admin-kind account is also given Better Auth's own built-in
 * `role: "admin"` — not our RBAC (that's `roleId`/`admin_profiles`
 * entirely), but the coarse flag the admin plugin itself checks before
 * letting a session call `admin.createUser` at all. Without this, the
 * very next teammate this person tries to create would be rejected.
 */
async function createAdminUser(
  input: { name: string; email: string; password: string; roleId: string },
  createdBy: string,
  repo: AdminUsersRepository = drizzleAdminUsersRepository
): Promise<AdminUser> {
  const email = input.email.trim().toLowerCase()
  if (!email) throw new ApiError(400, "An email is required.")
  if (await repo.findByEmail(email)) throw new ApiError(400, "That email is already in use.")

  const { data, error } = await auth.admin.createUser({
    email,
    password: input.password,
    name: input.name.trim() || "New team member",
    role: "admin",
  })
  if (error || !data?.user) throw new ApiError(400, error?.message ?? "Couldn't create that account.")

  return repo.create({ id: data.user.id, name: input.name.trim() || "New team member", roleId: input.roleId, createdBy })
}

async function updateAdminUserRole(
  id: string,
  roleId: string,
  repo: AdminUsersRepository = drizzleAdminUsersRepository
): Promise<void> {
  const user = await repo.findById(id)
  if (!user) throw new ApiError(404, "That teammate doesn't exist.")
  await repo.updateRole(id, roleId)
}

async function deleteAdminUser(id: string, repo: AdminUsersRepository = drizzleAdminUsersRepository): Promise<void> {
  await repo.delete(id)
  await auth.admin.removeUser({ userId: id })
}

export { listAdminUsers, createAdminUser, updateAdminUserRole, deleteAdminUser }
