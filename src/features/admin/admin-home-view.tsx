"use client"

import Link from "next/link"
import { ArrowRightIcon, HandshakeIcon, Inbox } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  AdminEmptyState,
  AdminListSkeleton,
  AdminPanel,
  AdminStatCard,
  AdminStatCardSkeleton,
} from "@/features/admin/admin-ui"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import { statusStyles, describeApplicant } from "@/features/admin/review-queue-view"
import { useUsers, useUsersLoaded } from "@/features/admin/user-store"
import { formatInr } from "@/features/marketplace/currency"
import { useDeals, type Deal } from "@/features/marketplace/deal-store"
import { useListings } from "@/features/marketplace/listing-store"
import type { OnboardingRole } from "@/features/onboarding/types"
import {
  useAllVerificationQueues,
  useAllVerificationQueuesLoaded,
  useVerificationQueue,
  useVerificationQueueLoaded,
} from "@/features/verification/admin-verification"

/** How many rows a Home preview card shows before it just points at the
 *  section's own full page instead of growing further — a preview, not a
 *  second copy of the whole list. */
const PREVIEW_ROWS = 3

function ViewAllLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
    >
      {label}
      <ArrowRightIcon className="size-3.5" />
    </Link>
  )
}

function OverviewSection() {
  const applications = useAllVerificationQueues()
  const applicationsLoaded = useAllVerificationQueuesLoaded()
  const listings = useListings()

  const pendingApplications = applications.filter(
    (submission) => submission.reviewStatus === "pending" || submission.reviewStatus === "changes-requested"
  ).length

  const activeListings = listings.filter((listing) => !listing.deletedAt)
  const flaggedListings = activeListings.filter((listing) => listing.moderationStatus === "flagged").length
  const unverifiedListings = activeListings.filter(
    (listing) => listing.moderationStatus === "unverified"
  ).length

  if (!applicationsLoaded) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AdminStatCardSkeleton />
        <AdminStatCardSkeleton />
        <AdminStatCardSkeleton />
        <AdminStatCardSkeleton />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <AdminStatCard label="Applications" value={String(applications.length)} caption="Submitted so far" />
      <AdminStatCard
        label="Awaiting review"
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
  )
}

/** Compact preview of "By team member" — a handful of rows, each still
 *  the full three-stat readout, with the rest one click away on `/internal/team`
 *  rather than the whole roster living on Home too. */
function TeamPreviewCard() {
  const users = useUsers()
  const usersLoaded = useUsersLoaded()
  const deals = useDeals()
  const listings = useListings()
  const applications = useAllVerificationQueues()
  const applicationsLoaded = useAllVerificationQueuesLoaded()

  const preview = users.slice(0, PREVIEW_ROWS)
  const remaining = users.length - preview.length

  return (
    <AdminPanel
      title="By team member"
      subtitle="Who's verified how much, and who's carrying which deals."
      action={<ViewAllLink href="/internal/team" label="View team" />}
    >
      {!usersLoaded || !applicationsLoaded ? (
        <AdminListSkeleton />
      ) : users.length === 0 ? (
        <p className="px-5 py-4 text-[13px] text-muted-foreground">Nobody&apos;s signed in yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {preview.map((user) => {
            const reviewed = applications.filter((submission) => submission.reviewedByAdminId === user.id).length
            const activeDeals = deals.filter(
              (deal) => deal.status === "active" && deal.assignedKamId === user.id
            ).length
            const moderated = listings.filter((listing) => listing.moderatedBy === user.name).length

            return (
              <li key={user.id} className="flex items-center gap-3 px-5 py-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-[12px] font-bold text-foreground/70">
                  {user.name.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-foreground">{user.name}</p>
                  <p className="truncate text-[12px] text-muted-foreground">{user.email}</p>
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
          {remaining > 0 ? (
            <li className="px-5 py-3 text-[12px] font-medium text-muted-foreground">
              +{remaining} more on the team
            </li>
          ) : null}
        </ul>
      )}
    </AdminPanel>
  )
}

/** One role's own registered application, if there is one — just who it
 *  is and their status, no document list or approve/decline actions;
 *  those live on that role's own `/internal/review-queue/{role}` page. Split
 *  by role rather than one combined card, since a buyer application and
 *  a seller one are never really the same queue. */
function RoleQueuePreviewCard({ role }: { role: OnboardingRole }) {
  const submissions = useVerificationQueue(role)
  const loaded = useVerificationQueueLoaded(role)
  const roleLabel = role === "buyer" ? "Buyer" : "Seller"
  const preview = submissions.slice(0, PREVIEW_ROWS)
  const remaining = submissions.length - preview.length

  return (
    <AdminPanel
      title={`${roleLabel} queue`}
      subtitle={`${roleLabel} applications, and where each stands.`}
      action={<ViewAllLink href={`/internal/review-queue/${role}`} label="View queue" />}
    >
      {!loaded ? (
        <AdminListSkeleton />
      ) : submissions.length === 0 ? (
        <p className="px-5 py-4 text-[13px] text-muted-foreground">No one registered yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {preview.map((submission) => (
            <li key={submission.userId} className="flex items-center gap-3 px-5 py-3.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-[12px] font-bold text-foreground/70">
                {(submission.fullName || "?").charAt(0)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-foreground">
                  {submission.fullName || "Unnamed applicant"}
                </p>
                <p className="truncate text-[12px] text-muted-foreground">{describeApplicant(submission)}</p>
              </div>
              <Badge className={cn("shrink-0", statusStyles[submission.reviewStatus].className)}>
                {statusStyles[submission.reviewStatus].label}
              </Badge>
            </li>
          ))}
          {remaining > 0 ? (
            <li className="px-5 py-3 text-[12px] font-medium text-muted-foreground">+{remaining} more</li>
          ) : null}
        </ul>
      )}
    </AdminPanel>
  )
}

/** One deal, previewed the same way across both deal cards below — who
 *  it's between and what it's worth, with whatever's most relevant to
 *  that particular card (unassigned vs. who's actually driving it) as
 *  the trailing badge. */
function DealPreviewRow({ deal, trailing }: { deal: Deal; trailing: React.ReactNode }) {
  const value = deal.agreedPricePerTonneUsd * deal.agreedQuantityMt
  return (
    <li className="flex items-center gap-3 px-5 py-3.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-foreground/70">
        <HandshakeIcon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-foreground">{deal.listingTitle}</p>
        <p className="truncate text-[12px] text-muted-foreground">
          {deal.buyerName} ↔ {deal.sellerName}
        </p>
      </div>
      <div className="shrink-0 text-end">
        <p className="text-[13px] font-semibold tabular-nums text-foreground">{formatInr(value)}</p>
        {trailing}
      </div>
    </li>
  )
}

/** Active deals nobody's actually driving yet — the same
 *  `assignedKamId === null` set the Deals page's own "Assign a team
 *  member" filter shows, so the "View deals" link can jump straight to
 *  it via `?filter=needs-a-team-member`. */
function AssignTeamMemberPreviewCard() {
  const deals = useDeals()
  const needsAssignment = deals.filter((deal) => deal.status === "active" && deal.assignedKamId === null)
  const preview = needsAssignment.slice(0, PREVIEW_ROWS)
  const remaining = needsAssignment.length - preview.length

  return (
    <AdminPanel
      title="Assign a team member"
      subtitle="Active deals nobody's driving yet."
      action={<ViewAllLink href="/internal/deals?filter=needs-a-team-member" label="View deals" />}
    >
      {needsAssignment.length === 0 ? (
        <p className="px-5 py-4 text-[13px] text-muted-foreground">Nothing waiting to be assigned.</p>
      ) : (
        <ul className="divide-y divide-border">
          {preview.map((deal) => (
            <DealPreviewRow
              key={deal.id}
              deal={deal}
              trailing={
                <Badge className="bg-status-warning/15 text-status-warning">Unassigned</Badge>
              }
            />
          ))}
          {remaining > 0 ? (
            <li className="px-5 py-3 text-[12px] font-medium text-muted-foreground">
              +{remaining} more waiting
            </li>
          ) : null}
        </ul>
      )}
    </AdminPanel>
  )
}

/** Every deal currently active, assigned or not — the Deals page's own
 *  "Active" filter, one click away via `?filter=active`. */
function ActiveDealsPreviewCard() {
  const deals = useDeals()
  const active = deals.filter((deal) => deal.status === "active")
  const preview = active.slice(0, PREVIEW_ROWS)
  const remaining = active.length - preview.length

  return (
    <AdminPanel
      title="Active deals"
      subtitle="Every deal currently moving through the pipeline."
      action={<ViewAllLink href="/internal/deals?filter=active" label="View deals" />}
    >
      {active.length === 0 ? (
        <p className="px-5 py-4 text-[13px] text-muted-foreground">Nothing active right now.</p>
      ) : (
        <ul className="divide-y divide-border">
          {preview.map((deal) => (
            <DealPreviewRow
              key={deal.id}
              deal={deal}
              trailing={
                <p className="text-[11px] text-muted-foreground">{deal.assignedKamName ?? "Unassigned"}</p>
              }
            />
          ))}
          {remaining > 0 ? (
            <li className="px-5 py-3 text-[12px] font-medium text-muted-foreground">
              +{remaining} more active
            </li>
          ) : null}
        </ul>
      )}
    </AdminPanel>
  )
}

/** The one admin landing page now — what shows on it is decided by
 *  permission, not by which of the old two consoles you were in.
 *  `overview.view` gets the stats and the team/review preview cards
 *  (each pointing at its own full page); either, both, or (if a role
 *  somehow has neither) an empty state. */
function AdminHomeView() {
  const admin = useCurrentAdmin()
  if (!admin) return null

  const canSeeOverview = admin.can("overview.view")
  const canReview = admin.can("onboarding.review")
  const canSeeDeals = admin.can("deals.viewAll")

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">
        <span className="opacity-60">Good Afternoon</span> {admin.user.name.split(" ")[0]}
      </h1>

      <div className="mt-6 flex flex-col gap-6">
        {canSeeOverview ? <OverviewSection /> : null}

        {canSeeOverview || canReview || canSeeDeals ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {canSeeOverview ? <TeamPreviewCard /> : null}
            {canReview ? <RoleQueuePreviewCard role="buyer" /> : null}
            {canReview ? <RoleQueuePreviewCard role="seller" /> : null}
            {canSeeDeals ? <AssignTeamMemberPreviewCard /> : null}
            {canSeeDeals ? <ActiveDealsPreviewCard /> : null}
          </div>
        ) : (
          <AdminEmptyState
            icon={Inbox}
            title="Nothing to show"
            description="Your role doesn't grant any home-page widgets yet."
          />
        )}
      </div>
    </div>
  )
}

export { AdminHomeView }
