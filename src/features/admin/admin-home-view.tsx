"use client"

import * as React from "react"
import { CheckCircle2, FileText, Inbox, RotateCcw, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AdminEmptyState, AdminPanel, AdminStatCard } from "@/features/admin/admin-ui"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import { useUsers } from "@/features/admin/user-store"
import { useDeals } from "@/features/marketplace/deal-store"
import { useListings } from "@/features/marketplace/listing-store"
import en from "@/features/i18n/translations/en"
import { countries, countryCodeToFlag } from "@/features/onboarding/countries"
import type { OnboardingRole } from "@/features/onboarding/types"
import {
  useVerification,
  type DocumentReviewStatus,
  type ReviewStatus,
  type Submission,
  type SubmittedDocument,
} from "@/features/verification/verification-context"

const statusStyles: Record<ReviewStatus, { label: string; className: string }> = {
  "not-submitted": { label: "Not submitted", className: "bg-muted text-muted-foreground" },
  pending: { label: "Awaiting review", className: "bg-status-warning/15 text-status-warning" },
  approved: { label: "Approved", className: "bg-amama-subtle text-amama-deep" },
  "changes-requested": {
    label: "Changes requested",
    className: "bg-destructive/10 text-destructive",
  },
}

const documentStyles: Record<DocumentReviewStatus, { label: string; className: string }> = {
  pending: { label: "Not reviewed", className: "bg-muted text-muted-foreground" },
  approved: { label: "Approved", className: "bg-amama-subtle text-amama-deep" },
  rejected: { label: "Not approved", className: "bg-destructive/10 text-destructive" },
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function describeApplicant(submission: Submission) {
  const country = countries.find((entry) => entry.code === submission.applicant.country)
  const parts = [
    submission.role === "seller" ? "Seller" : "Buyer",
    submission.applicant.entityType === "organization" ? "Organisation" : "Individual",
    submission.applicant.sellerSubType
      ? submission.applicant.sellerSubType === "producer"
        ? "Producer"
        : "Trader"
      : null,
    country ? `${countryCodeToFlag(country.code)} ${country.name}` : null,
  ]
  return parts.filter(Boolean).join(" · ")
}

function DocumentRow({ role, document }: { role: OnboardingRole; document: SubmittedDocument }) {
  const { setDocumentStatus } = useVerification()
  const [rejecting, setRejecting] = React.useState(false)
  const [note, setNote] = React.useState("")
  const status = documentStyles[document.reviewStatus]

  return (
    <li className="flex flex-col gap-2 rounded-[14px] border border-border px-3 py-2.5">
      <div className="flex items-center gap-2.5">
        <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
          {en.onboarding.options.documents[
            document.id as keyof typeof en.onboarding.options.documents
          ]?.label ?? document.id}
          {document.required ? (
            <span aria-hidden className="text-destructive">
              {" "}
              *
            </span>
          ) : null}
        </span>
        <span className="shrink-0 truncate text-[12px] text-muted-foreground">
          {document.name} · {formatBytes(document.size)}
        </span>
        <Badge className={cn("shrink-0", status.className)}>{status.label}</Badge>
      </div>

      {document.reviewStatus === "rejected" && document.reviewNote ? (
        <p className="rounded-[10px] bg-destructive/10 px-2.5 py-1.5 text-[12px] text-destructive">
          {document.reviewNote}
        </p>
      ) : null}

      {rejecting ? (
        <div className="flex flex-col gap-1.5">
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="What's wrong with this one specifically?"
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              disabled={note.trim().length === 0}
              onClick={() => {
                setDocumentStatus(role, document.id, "rejected", note.trim())
                setRejecting(false)
                setNote("")
              }}
            >
              Confirm not approved
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="outline"
            disabled={document.reviewStatus === "approved"}
            onClick={() => setDocumentStatus(role, document.id, "approved")}
          >
            <CheckCircle2 className="size-3.5" />
            Approve
          </Button>
          <Button size="sm" variant="outline" className="text-destructive" onClick={() => setRejecting(true)}>
            <XCircle className="size-3.5" />
            Not approved
          </Button>
        </div>
      )}
    </li>
  )
}

function SubmissionCard({ submission, reviewer }: { submission: Submission; reviewer: { id: string; name: string } }) {
  const { approve, requestChanges } = useVerification()
  const [note, setNote] = React.useState("")
  const [showNote, setShowNote] = React.useState(false)
  const status = statusStyles[submission.status]

  const submittedOn = submission.submittedAt
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(submission.submittedAt)
      )
    : null

  return (
    <article className="overflow-hidden rounded-[20px] border border-border bg-muted">
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-[17px] font-bold tracking-tight">
            {submission.applicant.fullName || "Unnamed applicant"}
          </h2>
          <p className="truncate text-[13px] text-muted-foreground">
            {submission.applicant.email}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {describeApplicant(submission)}
          </p>
        </div>
        <Badge className={cn("shrink-0", status.className)}>{status.label}</Badge>
      </header>

      <div className="flex flex-col gap-3 border-t border-border bg-card p-5">
        {submittedOn ? (
          <p className="text-[12px] text-muted-foreground">Submitted {submittedOn}</p>
        ) : null}
        {submission.reviewedByKamName ? (
          <p className="-mt-1.5 text-[12px] text-muted-foreground">
            Reviewed by {submission.reviewedByKamName}
          </p>
        ) : null}

        <ul className="flex flex-col gap-1.5">
          {submission.documents.map((document) => (
            <DocumentRow key={document.id} role={submission.role} document={document} />
          ))}
        </ul>

        {submission.reviewerNote ? (
          <p className="rounded-[14px] bg-muted px-3 py-2 text-[13px] text-muted-foreground">
            Sent back: {submission.reviewerNote}
          </p>
        ) : null}

        {showNote ? (
          <div className="flex flex-col gap-2">
            <label htmlFor={`note-${submission.role}`} className="text-[13px] font-medium">
              What needs fixing?
            </label>
            <Textarea
              id={`note-${submission.role}`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="The land record is too blurry to read the survey number."
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={note.trim().length === 0}
                onClick={() => {
                  requestChanges(submission.role, note.trim(), reviewer)
                  setShowNote(false)
                  setNote("")
                }}
              >
                Send back
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNote(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={submission.status === "approved"}
              onClick={() => approve(submission.role, reviewer)}
            >
              <CheckCircle2 />
              Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowNote(true)}>
              <RotateCcw />
              Request changes
            </Button>
          </div>
        )}
      </div>
    </article>
  )
}

function OverviewSection() {
  const { submissions } = useVerification()
  const listings = useListings()
  const users = useUsers()
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

      <AdminPanel
        title="By team member"
        subtitle="Who's verified how much, and who's carrying which deals."
        className="mt-6"
      >
        {users.length === 0 ? (
          <p className="px-5 py-4 text-[13px] text-muted-foreground">Nobody&apos;s signed in yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {users.map((user) => {
              const reviewed = applications.filter((submission) => submission.reviewedByKamId === user.id).length
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
          </ul>
        )}
      </AdminPanel>
    </div>
  )
}

function ReviewQueueSection({ reviewer }: { reviewer: { id: string; name: string } }) {
  const { submissions } = useVerification()
  const roles: OnboardingRole[] = ["buyer", "seller"]
  const open = roles
    .map((role) => submissions[role])
    .filter((submission): submission is Submission => Boolean(submission))

  return (
    <div>
      <h2 className="text-[15px] font-semibold text-foreground">Review queue</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Onboarding applications, and the documents behind each one.
      </p>

      {open.length === 0 ? (
        <AdminEmptyState
          icon={Inbox}
          title="Nothing waiting"
          description="Applications land here once someone finishes onboarding and submits their documents."
        />
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          {open.map((submission) => (
            <SubmissionCard key={submission.role} submission={submission} reviewer={reviewer} />
          ))}
        </div>
      )}
    </div>
  )
}

/** The one admin landing page now — what shows on it is decided by
 *  permission, not by which of the old two consoles you were in.
 *  `overview.view` gets the cross-team stats, `onboarding.review` gets the
 *  review queue; either, both, or (if a role somehow has neither) an
 *  empty state. */
function AdminHomeView() {
  const admin = useCurrentAdmin()
  if (!admin) return null

  const canSeeOverview = admin.can("overview.view")
  const canReview = admin.can("onboarding.review")

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">
        <span className="opacity-60">Good Afternoon</span> {admin.user.name.split(" ")[0]}
      </h1>

      <div className="mt-6 flex flex-col gap-8">
        {canSeeOverview ? <OverviewSection /> : null}
        {canReview ? <ReviewQueueSection reviewer={{ id: admin.user.id, name: admin.user.name }} /> : null}
        {!canSeeOverview && !canReview ? (
          <AdminEmptyState icon={Inbox} title="Nothing to show" description="Your role doesn't grant any home-page widgets yet." />
        ) : null}
      </div>
    </div>
  )
}

export { AdminHomeView }
