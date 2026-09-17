"use client"

import Link from "next/link"

import { cn } from "@/lib/utils"
import { Panel } from "@/features/dashboard/dashboard-ui"
import { countries, countryCodeToFlag } from "@/features/onboarding/countries"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import type { OnboardingRole } from "@/features/onboarding/types"

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
 * Who you are, as read-only — every value here came from onboarding, and
 * the only place that flow currently lives is onboarding itself, so "Edit"
 * goes back there rather than duplicating the form.
 */
function ProfileView({ role }: { role: OnboardingRole }) {
  const { draft } = useOnboarding()
  const person = role === "buyer" ? draft.buyer : draft.seller
  const country = countries.find((entry) => entry.code === person.country)

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Profile</h1>

      <Panel title="Profile" className="mt-6">
        <div className="divide-y divide-border">
          <Field label="Name" value={person.fullName || "—"} />
          <Field label="Email" value={person.email || "—"} />
          <Field
            label="Country"
            value={country ? `${countryCodeToFlag(country.code)} ${country.name}` : "—"}
          />
          <Field
            label="Account type"
            value={
              person.entityType === "organization"
                ? "Business or organisation"
                : person.entityType === "individual"
                  ? "Individual"
                  : "—"
            }
          />
          {role === "buyer" ? (
            <>
              <Field label="Company" value={draft.buyer.companyName || "—"} />
              <Field label="Business type" value={formatOption(draft.buyer.businessType)} />
            </>
          ) : (
            <>
              <Field label="Farm" value={draft.seller.farmName || "—"} />
              <Field
                label="Selling as"
                value={
                  draft.seller.sellerSubType === "producer"
                    ? "Producer"
                    : draft.seller.sellerSubType === "trader"
                      ? "Trader"
                      : "—"
                }
              />
            </>
          )}
        </div>
        <div className="border-t border-border px-5 py-3.5">
          <Link
            href={`/${role}/onboarding/country`}
            className={cn("text-[13px] font-medium text-amama-deep underline underline-offset-4")}
          >
            Edit in onboarding
          </Link>
        </div>
      </Panel>
    </div>
  )
}

function formatOption(value: string) {
  if (!value) return "—"
  const spaced = value.replace(/([a-z])([A-Z])/g, "$1 $2")
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export { ProfileView }
