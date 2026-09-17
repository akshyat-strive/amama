"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdminPanel } from "@/features/admin/admin-ui"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import { PERMISSION_CATALOG, isFullAccess, type Permission } from "@/features/admin/permissions"
import { createRole, useRoles, updateRole, type Role } from "@/features/admin/role-store"
import { createUser, DEMO_PASSWORD, updateUser, useUsers, type AdminUser } from "@/features/admin/user-store"

/**
 * Master-Admin-editable roles and users — the thing that actually makes
 * this a role-to-permission *system* rather than two hardcoded roles.
 * Two independently-gated panels; a role missing one of the two
 * permissions below never even sees this page in the nav, but `DealsView`-
 * style defense in depth still applies if someone hits the URL directly.
 */
function TeamManagementView() {
  const admin = useCurrentAdmin()
  const users = useUsers()
  const roles = useRoles()
  if (!admin) return null

  const canManageUsers = admin.can("users.manage")
  const canManageRoles = admin.can("roles.manage")

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Team</h1>

      <div className="mt-6 flex flex-col gap-6">
        {canManageUsers ? <UsersPanel users={users} roles={roles} createdBy={admin.user.id} /> : null}
        {canManageRoles ? <RolesPanel roles={roles} users={users} /> : null}
      </div>
    </div>
  )
}

function UsersPanel({ users, roles, createdBy }: { users: AdminUser[]; roles: Role[]; createdBy: string }) {
  const [adding, setAdding] = React.useState(false)
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [roleId, setRoleId] = React.useState(roles[0]?.id ?? "")
  const [error, setError] = React.useState<string | null>(null)

  const submit = () => {
    const result = createUser({ name, email, password: DEMO_PASSWORD, roleId }, createdBy)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setName("")
    setEmail("")
    setError(null)
    setAdding(false)
  }

  return (
    <AdminPanel
      title="Users"
      subtitle={`${users.length} accounts`}
      action={
        <Button size="sm" variant="outline" onClick={() => setAdding((value) => !value)}>
          <PlusIcon />
          Create user
        </Button>
      }
    >
      <div className="flex flex-col gap-3 p-5">
        {adding ? (
          <div className="grid grid-cols-1 gap-2 rounded-[14px] border border-dashed border-border p-3 sm:grid-cols-4">
            <Input placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} />
            <Input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value.toLowerCase())}
            />
            <Select value={roleId} onValueChange={(value) => setRoleId(value ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={submit} disabled={!name.trim() || !email.trim()}>
              Create — password will be {DEMO_PASSWORD}
            </Button>
            {error ? <p className="text-[12px] text-destructive sm:col-span-4">{error}</p> : null}
          </div>
        ) : null}

        <ul className="flex flex-col gap-2">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex flex-wrap items-center gap-3 rounded-[14px] border border-border px-3 py-2.5"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amama-deep text-[12px] font-semibold text-white">
                {user.name.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-foreground">{user.name}</p>
                <p className="truncate text-[12px] text-muted-foreground">{user.email}</p>
              </div>
              <Select value={user.roleId} onValueChange={(value) => value && updateUser(user.id, { roleId: value })}>
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </li>
          ))}
        </ul>
      </div>
    </AdminPanel>
  )
}

function RolesPanel({ roles, users }: { roles: Role[]; users: AdminUser[] }) {
  const [adding, setAdding] = React.useState(false)
  const [name, setName] = React.useState("")
  const [permissions, setPermissions] = React.useState<Set<Permission>>(new Set())

  const togglePermission = (permission: Permission, checked: boolean) => {
    setPermissions((current) => {
      const next = new Set(current)
      if (checked) next.add(permission)
      else next.delete(permission)
      return next
    })
  }

  const submit = () => {
    if (!name.trim()) return
    createRole(name.trim(), Array.from(permissions))
    setName("")
    setPermissions(new Set())
    setAdding(false)
  }

  return (
    <AdminPanel
      title="Roles"
      subtitle={`${roles.length} roles`}
      action={
        <Button size="sm" variant="outline" onClick={() => setAdding((value) => !value)}>
          <PlusIcon />
          Create role
        </Button>
      }
    >
      <div className="flex flex-col gap-3 p-5">
        {adding ? (
          <div className="flex flex-col gap-3 rounded-[14px] border border-dashed border-border p-3">
            <Input placeholder="Role name" value={name} onChange={(event) => setName(event.target.value)} />
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {PERMISSION_CATALOG.map((permission) => (
                <label key={permission.id} className="flex items-start gap-2.5 text-[13px] text-foreground">
                  <Checkbox
                    checked={permissions.has(permission.id)}
                    onCheckedChange={(checked) => togglePermission(permission.id, checked === true)}
                  />
                  <span>
                    <span className="font-medium">{permission.label}</span>
                    <span className="block text-[12px] text-muted-foreground">{permission.description}</span>
                  </span>
                </label>
              ))}
            </div>
            <Button size="sm" onClick={submit} disabled={!name.trim()} className="w-fit">
              Create role
            </Button>
          </div>
        ) : null}

        <ul className="flex flex-col gap-3">
          {roles.map((role) => (
            <RoleRow key={role.id} role={role} memberCount={users.filter((user) => user.roleId === role.id).length} />
          ))}
        </ul>
      </div>
    </AdminPanel>
  )
}

function RoleRow({ role, memberCount }: { role: Role; memberCount: number }) {
  const fullAccess = isFullAccess(role.permissions)

  return (
    <li className="rounded-[14px] border border-border p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-foreground">{role.name}</p>
          <p className="text-[12px] text-muted-foreground">
            {memberCount} {memberCount === 1 ? "person" : "people"}
            {role.isSystem ? " · built in" : ""}
          </p>
        </div>
      </div>

      {fullAccess ? (
        <p className="mt-2.5 text-[12px] font-medium text-amama-deep">Every permission — full access.</p>
      ) : (
        <div className="mt-2.5 grid grid-cols-1 gap-1 sm:grid-cols-2">
          {PERMISSION_CATALOG.map((permission) => (
            <label key={permission.id} className="flex items-center gap-2 text-[12px] text-foreground">
              <Checkbox
                checked={(role.permissions as Permission[]).includes(permission.id)}
                onCheckedChange={(checked) => {
                  const current = new Set(role.permissions as Permission[])
                  if (checked === true) current.add(permission.id)
                  else current.delete(permission.id)
                  updateRole(role.id, { permissions: Array.from(current) })
                }}
              />
              {permission.label}
            </label>
          ))}
        </div>
      )}
    </li>
  )
}

export { TeamManagementView }
