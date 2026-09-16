"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRightIcon, InboxIcon, MessagesSquareIcon, PackageSearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { AdminPanel, AdminStatCard } from "@/features/admin/admin-ui"
import { useKamRoster } from "@/features/admin/kam-roster-store"
import { useDeals } from "@/features/marketplace/deal-store"
import { useListings } from "@/features/marketplace/listing-store"
import { useVerification } from "@/features/verification/verification-context"

const quickLinks = [
  {
    href: "/admin/kam",
    icon: InboxIcon,
    label: "Onboarding queue",
    description: "Applications waiting on a KAM's sign-off",
  },
  {
    href: "/admin/kam/listings",
    icon: PackageSearchIcon,
    label: "Listings",
    description: "Every listing a seller has published",
  },
  {
    href: "/admin/kam/chat",
    icon: MessagesSquareIcon,
    label: "Chat",
    description: "Every buyer/seller conversation, plus the KAM team",
  },
] as const

/**
 * The master admin's own landing page — one level above a single KAM's own
 * queue, so it reads across both onboarding review and the marketplace
 * itself rather than just one. Deliberately thin: this is the seam for
 * whatever cross-KAM oversight comes next (assigning applications, auditing
 * a specific KAM's decisions), not a rebuild of the KAM console itself —
 * for now it's a read-only summary plus a way in.
 */
function MasterOverviewView() {
  const { submissions } = useVerification()
  const listings = useListings()
  const roster = useKamRoster()
  const deals = useDeals()

  const applications = (["buyer", "seller"] as const)
    .map((role) => submissions[role])
    .filter((submission): submission is NonNullable<typeof submission> => Boolean(submission))

  const pendingApplications = applications.filter(
    (submission) => submission.status === "pending" || submission.status === "changes-requested"
  ).length

  const activeListings = listings.filter((listing) => !listing.deletedAt)
  const flaggedListings = activeListings.filter((listing) => listing.moderationStatus === "flagged").length
  const unverifiedListings = activeListings.filter(
    (listing) => listing.moderationStatus === "unverified"
  ).length

  return (
    <div>
      <h1 className="text-[19px] font-bold tracking-tight">Overview</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Onboarding and the marketplace, across every KAM.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AdminStatCard label="Applications" value={String(applications.length)} caption="Submitted so far" />
        <AdminStatCard
          label="Awaiting a KAM"
          value={String(pendingApplications)}
          tone={pendingApplications > 0 ? "warning" : "plain"}
          caption="Pending or sent back"
        />
        <AdminStatCard label="Live listings" value={String(activeListings.length)} caption="Not soft-deleted" />
        <AdminStatCard
          label="Need a look"
          value={String(flaggedListings + unverifiedListings)}
          tone={flaggedListings + unverifiedListings > 0 ? "warning" : "plain"}
          caption={`${flaggedListings} flagged · ${unverifiedListings} unverified`}
        />
      </div>

      <AdminPanel
        title="Jump into the KAM console"
        subtitle="Same queue every KAM works from — a master admin can step in directly."
        className="mt-6"
      >
        <ul className="divide-y divide-border">
          {quickLinks.map(({ href, icon: Icon, label, description }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex items-center gap-3 px-5 py-3.5 text-start transition-colors hover:bg-muted/50"
                )}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-foreground/70">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-foreground">{label}</span>
                  <span className="block truncate text-[12px] text-muted-foreground">{description}</span>
                </span>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
              </Link>
            </li>
          ))}
        </ul>
      </AdminPanel>

      <AdminPanel
        title="By KAM"
        subtitle="Who's verified how much, and who's carrying which deals."
        className="mt-6"
      >
        {roster.length === 0 ? (
          <p className="px-5 py-4 text-[13px] text-muted-foreground">No KAM has signed in yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {roster.map((kam) => {
              const reviewed = applications.filter((submission) => submission.reviewedByKamId === kam.id).length
              const activeDeals = deals.filter(
                (deal) => deal.status === "active" && deal.assignedKamId === kam.id
              ).length
              const moderated = listings.filter((listing) => listing.moderatedBy === kam.name).length

              return (
                <li key={kam.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-[12px] font-bold text-foreground/70">
                    {kam.name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-foreground">{kam.name}</p>
                    <p className="truncate text-[12px] text-muted-foreground">{kam.email}</p>
                  </div>
                  <div className="flex shrink-0 gap-4 text-end">
                    <div>
                      <p className="text-[15px] font-semibold tabular-nums text-foreground">{reviewed}</p>
                      <p className="text-[11px] text-muted-foreground">Reviewed</p>
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold tabular-nums text-foreground">{activeDeals}</p>
                      <p className="text-[11px] text-muted-foreground">Active deals</p>
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold tabular-nums text-foreground">{moderated}</p>
                      <p className="text-[11px] text-muted-foreground">Moderated</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </AdminPanel>
    </div>
  )
}

export { MasterOverviewView }
