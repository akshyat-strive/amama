"use client"

import { CrownIcon, ShieldCheckIcon } from "lucide-react"

import { AdminPanel } from "@/features/admin/admin-ui"
import { useKamIdentity } from "@/features/admin/kam-identity"
import { useKamRoster } from "@/features/admin/kam-roster-store"
import type { AdminRole } from "@/features/admin/admin-nav-config"

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

/**
 * A KAM's identity is whatever they typed at sign-in (see `kam-identity.ts`)
 * — this just reflects it back, plus when the roster first saw them. Master
 * Admin has no per-account identity to show (one fixed role, no sign-in
 * gate), so that half is just the static role description.
 */
function AdminProfileView({ role }: { role: AdminRole }) {
  const identity = useKamIdentity()
  const roster = useKamRoster()
  const rosterEntry = identity ? roster.find((entry) => entry.id === identity.id) : undefined

  return (
    <div>
      <h1 className="text-[24px] font-bold tracking-tight">Profile</h1>
      <p className="mt-1 text-[15px] text-muted-foreground">
        {role === "kam" ? "Your identity across the KAM console." : "Master Admin's fixed account."}
      </p>

      <AdminPanel title="Profile" className="mt-6">
        {role === "kam" ? (
          <div className="divide-y divide-border">
            <Field label="Name" value={identity?.name || "—"} />
            <Field label="Email" value={identity?.email || "—"} />
            <Field
              label="On this team since"
              value={
                rosterEntry
                  ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(rosterEntry.firstSeenAt))
                  : "—"
              }
            />
          </div>
        ) : (
          <div className="flex items-center gap-3 px-5 py-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-amama-deep text-white">
              <CrownIcon className="size-4.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-foreground">Master Admin</p>
              <p className="text-[13px] text-muted-foreground">
                One shared account for oversight — not tied to a person the way a KAM&apos;s is.
              </p>
            </div>
          </div>
        )}
      </AdminPanel>

      {role === "kam" ? (
        <AdminPanel title="Role" className="mt-4">
          <div className="flex items-center gap-3 px-5 py-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-amama-deep text-white">
              <ShieldCheckIcon className="size-4.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-foreground">Key Account Manager</p>
              <p className="text-[13px] text-muted-foreground">
                Onboarding review, listing moderation, and the deals assigned to you.
              </p>
            </div>
          </div>
        </AdminPanel>
      ) : null}
    </div>
  )
}

export { AdminProfileView }
