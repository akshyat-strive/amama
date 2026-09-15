"use client"

import * as React from "react"
import { CheckCircle2, FileText, Inbox, RotateCcw, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useKamIdentity } from "@/features/admin/kam-identity"
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
    <li className="flex flex-col gap-2 rounded-xl border border-border px-3 py-2.5">
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
        <p className="rounded-lg bg-destructive/10 px-2.5 py-1.5 text-[12px] text-destructive">
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

function SubmissionCard({ submission }: { submission: Submission }) {
  const { approve, requestChanges } = useVerification()
  const identity = useKamIdentity()
  const [note, setNote] = React.useState("")
  const [showNote, setShowNote] = React.useState(false)
  const status = statusStyles[submission.status]

  // `AdminShell` already redirects a signed-out visitor away from every KAM
  // route before this ever renders — the fallback only covers the instant
  // between that redirect firing and the route actually changing.
  const kam = identity ?? { id: "kam", name: "KAM" }

  const submittedOn = submission.submittedAt
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(submission.submittedAt)
      )
    : null

  return (
    <article className="rounded-3xl border border-border bg-card p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
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

      {submittedOn ? (
        <p className="mt-3 text-[12px] text-muted-foreground">Submitted {submittedOn}</p>
      ) : null}
      {submission.reviewedByKamName ? (
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Reviewed by {submission.reviewedByKamName}
        </p>
      ) : null}

      <ul className="mt-4 flex flex-col gap-1.5">
        {submission.documents.map((document) => (
          <DocumentRow key={document.id} role={submission.role} document={document} />
        ))}
      </ul>

      {submission.reviewerNote ? (
        <p className="mt-3 rounded-2xl bg-muted px-3 py-2 text-[13px] text-muted-foreground">
          Sent back: {submission.reviewerNote}
        </p>
      ) : null}

      {showNote ? (
        <div className="mt-4 flex flex-col gap-2">
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
                requestChanges(submission.role, note.trim(), kam)
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
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={submission.status === "approved"}
            onClick={() => approve(submission.role, kam)}
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
    </article>
  )
}

function OnboardingQueueView() {
  const { submissions } = useVerification()
  const roles: OnboardingRole[] = ["buyer", "seller"]
  const open = roles
    .map((role) => submissions[role])
    .filter((submission): submission is Submission => Boolean(submission))

  return (
    <div>
      <h1 className="text-[19px] font-bold tracking-tight">Review queue</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Onboarding applications, and the documents behind each one.
      </p>

      {open.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-5 py-16 text-center">
          <Inbox aria-hidden className="size-6 text-muted-foreground" />
          <p className="text-[15px] font-semibold">Nothing waiting</p>
          <p className="max-w-sm text-[13px] text-muted-foreground">
            Applications land here once someone finishes onboarding and submits their
            documents.
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {open.map((submission) => (
            <SubmissionCard key={submission.role} submission={submission} />
          ))}
        </div>
      )}
    </div>
  )
}

export { OnboardingQueueView }
