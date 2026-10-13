"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { AdminPanel } from "@/features/admin/admin-ui"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import { DOMAINS, DOMAIN_LABEL, PERMISSION_CATALOG, isFullAccess, type Domain, type Permission } from "@/features/admin/permissions"
import { createRole, deleteRole, useRoles, updateRole, type Role } from "@/features/admin/role-store"
import { LEVEL_LABEL, type RoleLevel } from "@/features/admin/staff-seed"
import { createUser, DEMO_PASSWORD, updateUser, useUsers, type AdminUser } from "@/features/admin/user-store"

/**
 * The org as it actually runs: the chief executive and one executive per
 * domain on top, then each domain's lead and members under them. Access
 * follows both lines — level (executives see everything, leads their
 * whole domain, members what's assigned to them) and domain (what kind of
 * work a role can act on). People and roles are editable for whoever
 * holds `users.manage` / `roles.manage`; everyone with `team.view` can
 * read it.
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
        <OrgPanel users={users} roles={roles} canManage={canManageUsers} />
        {canManageRoles ? <RolesPanel roles={roles} users={users} /> : null}
      </div>
    </div>
  )
}

const roleOf = (roles: Role[], user: AdminUser) => roles.find((role) => role.id === user.roleId)

function OrgPanel({ users, roles, canManage }: { users: AdminUser[]; roles: Role[]; canManage: boolean }) {
  const [adding, setAdding] = React.useState(false)
  const executives = users.filter((user) => roleOf(roles, user)?.level === "executive")
  const chief = executives.filter((user) => roleOf(roles, user)?.domain === "all")

  return (
    <AdminPanel
      title="Organisation"
      subtitle={`${users.length} people across ${DOMAINS.length} domains`}
      action={
        canManage ? (
          <Button size="sm" variant="outline" onClick={() => setAdding((value) => !value)}>
            <PlusIcon />
            Add person
          </Button>
        ) : null
      }
    >
      {adding ? <AddPersonForm users={users} roles={roles} onDone={() => setAdding(false)} /> : null}

      <div className="flex flex-col gap-5 p-5">
        {chief.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {chief.map((user) => (
              <PersonCard key={user.id} user={user} users={users} roles={roles} canManage={canManage} emphasis />
            ))}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {DOMAINS.map((domain) => {
            const inDomain = users.filter((user) => roleOf(roles, user)?.domain === domain.id)
            const order: Record<RoleLevel, number> = { executive: 0, lead: 1, member: 2 }
            const sorted = [...inDomain].sort((a, b) => order[roleOf(roles, a)!.level] - order[roleOf(roles, b)!.level] || a.name.localeCompare(b.name))
            return (
              <section key={domain.id} aria-label={domain.label} className="rounded-[18px] border border-border bg-muted/40 p-2">
                <header className="px-2 pt-1 pb-2">
                  <h3 className="text-[14px] font-semibold">{domain.label}</h3>
                  <p className="text-[12px] text-muted-foreground">{domain.description}</p>
                </header>
                <ul className="flex flex-col gap-1.5">
                  {sorted.map((user) => (
                    <li key={user.id} className={cn(roleOf(roles, user)?.level === "member" && "ms-4", roleOf(roles, user)?.level === "lead" && "ms-2")}>
                      <PersonCard user={user} users={users} roles={roles} canManage={canManage} />
                    </li>
                  ))}
                  {sorted.length === 0 ? <li className="px-2 py-3 text-[12.5px] text-muted-foreground">Nobody here yet.</li> : null}
                </ul>
              </section>
            )
          })}
        </div>
      </div>
    </AdminPanel>
  )
}

const LEVEL_TONE: Record<RoleLevel, string> = {
  executive: "bg-amama-deep text-white",
  lead: "bg-amama-subtle text-amama-deep",
  member: "bg-muted text-muted-foreground",
}

function PersonCard({
  user,
  users,
  roles,
  canManage,
  emphasis,
}: {
  user: AdminUser
  users: AdminUser[]
  roles: Role[]
  canManage: boolean
  emphasis?: boolean
}) {
  const [editing, setEditing] = React.useState(false)
  const role = roleOf(roles, user)
  const manager = users.find((entry) => entry.id === user.reportsTo)

  return (
    <div className={cn("rounded-[14px] border border-border bg-card px-3 py-2.5", emphasis && "min-w-[260px]")}>
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground/[0.07] text-[12px] font-semibold">
          {user.name.trim().charAt(0).toUpperCase() || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold">{user.name}</p>
          <p className="truncate text-[11.5px] text-muted-foreground">{user.title || role?.name}</p>
        </div>
        {role ? <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold", LEVEL_TONE[role.level])}>{LEVEL_LABEL[role.level]}</span> : null}
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 text-[11.5px] text-muted-foreground">
        <span className="truncate">
          {role?.name}
          {manager ? ` · reports to ${manager.name.split(" ")[0]}` : ""}
        </span>
        {canManage ? (
          <button type="button" onClick={() => setEditing((value) => !value)} className="shrink-0 font-medium text-amama-deep hover:underline">
            {editing ? "Done" : "Edit"}
          </button>
        ) : null}
      </div>
      {editing ? (
        <div className="mt-2 grid gap-1.5 border-t border-border pt-2">
          <PlainSelect
            label="Role"
            value={user.roleId}
            onChange={(roleId) => updateUser(user.id, { roleId })}
            options={roles.map((entry) => ({ value: entry.id, label: `${entry.name} · ${DOMAIN_LABEL[entry.domain]}` }))}
          />
          <PlainSelect
            label="Reports to"
            value={user.reportsTo ?? ""}
            onChange={(reportsTo) => updateUser(user.id, { reportsTo: reportsTo || null })}
            options={[{ value: "", label: "Nobody" }, ...users.filter((entry) => entry.id !== user.id).map((entry) => ({ value: entry.id, label: entry.name }))]}
          />
        </div>
      ) : null}
    </div>
  )
}

/** A native select — compact enough to sit inside a person card. */
function PlainSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="flex items-center justify-between gap-2 text-[11.5px] text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-7 max-w-[170px] truncate rounded-lg border border-border bg-card px-1.5 text-[12px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-amama-deep/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function AddPersonForm({ users, roles, onDone }: { users: AdminUser[]; roles: Role[]; onDone: () => void }) {
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [title, setTitle] = React.useState("")
  const [roleId, setRoleId] = React.useState(roles.find((role) => role.level === "member")?.id ?? roles[0]?.id ?? "")
  const [reportsTo, setReportsTo] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  const submit = async () => {
    const result = await createUser({ name, email, password: DEMO_PASSWORD, roleId, reportsTo: reportsTo || null, title })
    if (!result.ok) {
      setError(result.error)
      return
    }
    onDone()
  }

  return (
    <div className="grid grid-cols-1 gap-2 border-b border-border bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-3">
      <Input placeholder="Name" value={name} onChange={(event) => setName(event.target.value)} className="bg-card" />
      <Input placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value.toLowerCase())} className="bg-card" />
      <Input placeholder="Title, e.g. Key Account Manager" value={title} onChange={(event) => setTitle(event.target.value)} className="bg-card" />
      <PlainSelect label="Role" value={roleId} onChange={setRoleId} options={roles.map((role) => ({ value: role.id, label: `${role.name} · ${DOMAIN_LABEL[role.domain]}` }))} />
      <PlainSelect label="Reports to" value={reportsTo} onChange={setReportsTo} options={[{ value: "", label: "Nobody" }, ...users.map((user) => ({ value: user.id, label: user.name }))]} />
      <Button size="sm" onClick={() => void submit()} disabled={!name.trim() || !email.trim()}>
        Add — password {DEMO_PASSWORD}
      </Button>
      {error ? <p className="text-[12px] text-destructive sm:col-span-2 lg:col-span-3">{error}</p> : null}
    </div>
  )
}

const PERMISSION_GROUPS: { id: Domain | "company"; label: string }[] = [{ id: "company", label: "Company-wide" }, ...DOMAINS.map((domain) => ({ id: domain.id, label: domain.label }))]

function RolesPanel({ roles, users }: { roles: Role[]; users: AdminUser[] }) {
  const [adding, setAdding] = React.useState(false)
  const [name, setName] = React.useState("")
  const [level, setLevel] = React.useState<RoleLevel>("member")
  const [domain, setDomain] = React.useState<Domain>("saleops")

  const submit = async () => {
    if (!name.trim()) return
    await createRole(name.trim(), [], { level, domain })
    setName("")
    setAdding(false)
  }

  return (
    <AdminPanel
      title="Roles"
      subtitle={`${roles.length} roles · level decides how far a role sees, domain what it can act on`}
      action={
        <Button size="sm" variant="outline" onClick={() => setAdding((value) => !value)}>
          <PlusIcon />
          Create role
        </Button>
      }
    >
      {adding ? (
        <div className="grid grid-cols-1 gap-2 border-b border-border bg-muted/40 p-4 sm:grid-cols-4">
          <Input placeholder="Role name" value={name} onChange={(event) => setName(event.target.value)} className="bg-card sm:col-span-2" />
          <PlainSelect label="Level" value={level} onChange={(value) => setLevel(value as RoleLevel)} options={(["executive", "lead", "member"] as const).map((entry) => ({ value: entry, label: LEVEL_LABEL[entry] }))} />
          <PlainSelect label="Domain" value={domain} onChange={(value) => setDomain(value as Domain)} options={DOMAINS.map((entry) => ({ value: entry.id, label: entry.label }))} />
          <Button size="sm" onClick={() => void submit()} disabled={!name.trim()} className="w-fit">
            Create role
          </Button>
        </div>
      ) : null}

      <ul className="grid gap-3 p-5 lg:grid-cols-2">
        {roles.map((role) => (
          <RoleRow key={role.id} role={role} memberCount={users.filter((user) => user.roleId === role.id).length} />
        ))}
      </ul>
    </AdminPanel>
  )
}

function RoleRow({ role, memberCount }: { role: Role; memberCount: number }) {
  const [open, setOpen] = React.useState(false)
  const fullAccess = isFullAccess(role.permissions)
  const granted = new Set(role.permissions as Permission[])

  return (
    <li className="rounded-[14px] border border-border p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            {role.name}
            <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-semibold", LEVEL_TONE[role.level])}>{LEVEL_LABEL[role.level]}</span>
          </p>
          <p className="text-[12px] text-muted-foreground">
            {DOMAIN_LABEL[role.domain]} · {memberCount} {memberCount === 1 ? "person" : "people"}
            {role.isSystem ? " · built in" : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {!fullAccess ? (
            <button type="button" onClick={() => setOpen((value) => !value)} className="text-[12px] font-medium text-amama-deep hover:underline">
              {open ? "Done" : `${granted.size} permissions`}
            </button>
          ) : null}
          {!role.isSystem ? (
            <button type="button" onClick={() => void deleteRole(role.id)} className="text-[12px] font-medium text-muted-foreground hover:text-destructive">
              Delete
            </button>
          ) : null}
        </div>
      </div>

      {fullAccess ? (
        <p className="mt-2 text-[12px] font-medium text-amama-deep">Every permission — full access.</p>
      ) : open ? (
        <div className="mt-3 flex flex-col gap-3">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.id}>
              <p className="mb-1 text-[11.5px] font-semibold text-muted-foreground">{group.label}</p>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {PERMISSION_CATALOG.filter((permission) => permission.domain === group.id).map((permission) => (
                  <label key={permission.id} className="flex items-center gap-2 text-[12px] text-foreground" title={permission.description}>
                    <Checkbox
                      checked={granted.has(permission.id)}
                      onCheckedChange={(checked) => {
                        const next = new Set(granted)
                        if (checked === true) next.add(permission.id)
                        else next.delete(permission.id)
                        void updateRole(role.id, { permissions: Array.from(next) })
                      }}
                    />
                    {permission.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </li>
  )
}

export { TeamManagementView }
