"use client"

import Link from "next/link"
import { CheckCircle2Icon, ClockIcon } from "lucide-react"

import { Panel } from "@/features/dashboard/dashboard-ui"
import { PlansPanel } from "@/features/dashboard/plans-panel"
import { useVerification } from "@/features/verification/verification-context"
import type { OnboardingRole } from "@/features/onboarding/types"

/**
 * Account-level preferences, distinct from the "Profile" page — that one
 * covers who you are (the details onboarding collected); this one covers
 * the account's standing. Just verification status for now, but it's the
 * seam for whatever other account-wide settings show up later.
 */
function SettingsView({ role }: { role: OnboardingRole }) {
  const { statusFor } = useVerification()
  const status = statusFor(role)

  return (
    <div>
      <h1 className="text-[34px] font-semibold tracking-[-0.03em]">Settings</h1>

      <Panel
        title="Verification"
        className="mt-6"
        action={
          status === "approved" ? (
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-amama-deep">
              <CheckCircle2Icon className="size-4" />
              Approved
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-status-warning">
              <ClockIcon className="size-4" />
              {status === "changes-requested" ? "Waiting on you" : "In review"}
            </span>
          )
        }
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4 text-[13px] text-muted-foreground">
          <span>
            {status === "approved"
              ? "Your key account manager has cleared this account."
              : status === "changes-requested"
                ? "Your key account manager needs something from you."
                : "Your key account manager is still reviewing the documents you submitted."}
          </span>
          <Link href={`/${role}/dashboard/verification`} className="shrink-0 font-medium text-amama-deep hover:underline">
            Open ticket
          </Link>
        </div>
      </Panel>

      <PlansPanel role={role} />
    </div>
  )
}

export { SettingsView }
