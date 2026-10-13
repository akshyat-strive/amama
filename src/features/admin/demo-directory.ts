"use client"

import { useRoles } from "@/features/admin/role-store"
import { useUsers } from "@/features/admin/user-store"
import { DOMAIN_LABEL } from "@/features/admin/permissions"
import type { Role } from "@/features/admin/staff-seed"

export type DemoDirectoryEntry = {
  id: string
  name: string
  email: string
  roleId: string
  roleName: string
  title: string
  level: Role["level"]
  domain: Role["domain"]
  domainLabel: string
}

/** Every staff account with its role, for the two places that list them
 *  before anyone signs in: `/creds` and the login screen's quick login. */
function useDemoDirectory(): DemoDirectoryEntry[] {
  const users = useUsers()
  const roles = useRoles()
  return users.map((user) => {
    const role = roles.find((entry) => entry.id === user.roleId)
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      roleName: role?.name ?? user.roleId,
      title: user.title,
      level: role?.level ?? "member",
      domain: role?.domain ?? "saleops",
      domainLabel: DOMAIN_LABEL[role?.domain ?? "saleops"],
    }
  })
}

export { useDemoDirectory }
