"use client"

import { ShieldCheckIcon } from "lucide-react"

import { AdminPanel } from "@/features/admin/admin-ui"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import { isFullAccess } from "@/features/admin/permissions"

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <span className="shrink-0 text-[13px] text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-end text-[14px] font-medium text-foreground">
        {value}
      </span>
    </div>
  )
}

/** Every signed-in admin is now a real `AdminUser` row (see
 *  `user-store.ts`) — this just reflects it, and the role it's tied to,
 *  back. `AdminShell` already guards every route behind a real session, so
 *  there's no "what if nobody's signed in" branch to render here. */
function AdminProfileView() {
  const admin = useCurrentAdmin()
  if (!admin) return null

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Profile</h1>

      <AdminPanel title="Profile" className="mt-6">
        <div className="divide-y divide-border">
          <Field label="Name" value={admin.user.name} />
          <Field label="Email" value={admin.user.email} />
          <Field
            label="On this team since"
            value={new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(admin.user.createdAt))}
          />
        </div>
      </AdminPanel>

      <AdminPanel title="Role" className="mt-4">
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-amama-deep text-white">
            <ShieldCheckIcon className="size-4.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-foreground">{admin.role.name}</p>
            <p className="text-[13px] text-muted-foreground">
              {isFullAccess(admin.role.permissions)
                ? "Every permission — full oversight of the whole console."
                : "See Settings for what this role can and can't do."}
            </p>
          </div>
        </div>
      </AdminPanel>
    </div>
  )
}

export { AdminProfileView }
