"use client"

import Link from "next/link"
import { BadgeCheckIcon, ChevronRightIcon, ClockIcon, TriangleAlertIcon, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { ColumnCard } from "@/components/ui/column-card"
import { Panel } from "@/features/dashboard/dashboard-ui"
import { PlansPanel } from "@/features/dashboard/plans-panel"
import { LanguageSwitcher } from "@/features/i18n/components/language-switcher"
import { usePlan } from "@/features/dashboard/plan-store"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import { useVerification } from "@/features/verification/verification-context"
import type { OnboardingRole } from "@/features/onboarding/types"

type Row = { label: string; value: React.ReactNode; href?: string }

function Rows({ rows }: { rows: Row[] }) {
  return (
    <ul className="divide-inset">
      {rows.map((row) => {
        const body = (
          <>
            <span className="text-[14px] text-muted-foreground">{row.label}</span>
            <span className="ms-auto flex min-w-0 items-center gap-1.5 text-end text-[14px] font-medium">
              <span className="truncate">{row.value}</span>
              {row.href ? <ChevronRightIcon aria-hidden className="size-4 shrink-0 text-muted-foreground/60 rtl:-scale-x-100" /> : null}
            </span>
          </>
        )
        return (
          <li key={row.label}>
            {row.href ? (
              <Link href={row.href} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-card/60">
                {body}
              </Link>
            ) : (
              <div className="flex items-center gap-4 px-5 py-3.5">{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Account-level settings, apart from Profile (who you are): the account
 * itself, where verification stands, and the plan. Plans unlock once KYC
 * is approved.
 */
function SettingsView({ role }: { role: OnboardingRole }) {
  const { draft } = useOnboarding()
  const { statusFor } = useVerification()
  const status = statusFor(role)
  const [tier] = usePlan(`amama.plan.${role}`)
  const person = role === "buyer" ? draft.buyer : draft.seller
  const approved = status === "approved"

  const standing: { icon: LucideIcon; label: string; tone: string } = approved
    ? { icon: BadgeCheckIcon, label: "Approved", tone: "text-amama-deep" }
    : status === "changes-requested"
      ? { icon: TriangleAlertIcon, label: "Waiting on you", tone: "text-status-warning" }
      : { icon: ClockIcon, label: "In review", tone: "text-status-warning" }
  const Standing = standing.icon

  return (
    <ColumnCard title="Settings">
      <div className="flex flex-col gap-3 p-1.5">
        <Panel title="Account" className="bg-card">
          <Rows
            rows={[
              { label: "Name", value: person.fullName.trim() || "—", href: `/${role}/dashboard/profile` },
              { label: "Email", value: person.email.trim() || "—", href: `/${role}/dashboard/profile` },
              { label: "Role", value: role === "buyer" ? "Buyer" : "Seller" },
              { label: "Plan", value: tier === "gold" ? "amama Gold" : tier === "pro" ? "amama Pro" : "No plan" },
            ]}
          />
        </Panel>

        <Panel title="Preferences" className="bg-card">
          <div className="flex items-center justify-between gap-4 px-5 py-3">
            <span className="text-[14px] text-muted-foreground">Language</span>
            <LanguageSwitcher variant="field" />
          </div>
        </Panel>

        <Panel title="Verification" className="bg-card">
          <Rows
            rows={[
              {
                label: "KYC status",
                value: (
                  <span className={cn("inline-flex items-center gap-1.5", standing.tone)}>
                    <Standing aria-hidden className="size-4" />
                    {standing.label}
                  </span>
                ),
                href: `/${role}/dashboard/verification`,
              },
              {
                label: "Account manager",
                value: approved ? "Has cleared this account" : status === "changes-requested" ? "Needs something from you" : "Reviewing your documents",
                href: `/${role}/dashboard/verification`,
              },
            ]}
          />
        </Panel>

        <PlansPanel role={role} unlocked={approved} />
      </div>
    </ColumnCard>
  )
}

export { SettingsView }
