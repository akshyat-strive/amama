"use client"

import * as React from "react"
import { DownloadIcon, EyeIcon, FileText, Inbox } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AdminEmptyState } from "@/features/admin/admin-ui"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import {
  ApproveButton,
  Initials,
  RequestAgainButton,
  RequestNote,
  ReviewGroup,
  RowNote,
  StatusPill,
  type Tone,
} from "@/features/admin/review-ui"
import { PAGE_TABS_SPACE, PageTabs } from "@/features/dashboard/page-tabs"
import en from "@/features/i18n/translations/en"
import { countries, countryCodeToFlag } from "@/features/onboarding/countries"
import type { OnboardingRole } from "@/features/onboarding/types"
import type { DocumentReviewStatus, ReviewStatus } from "@/features/verification/verification-context"
import {
  approveApplication,
  documentPreviewUrl,
  requestApplicationChanges,
  setDocumentStatus,
  useVerificationQueue,
  type AdminSubmission,
} from "@/features/verification/admin-verification"

export const statusStyles: Record<ReviewStatus, { label: string; className: string; tone: Tone }> = {
  "not-submitted": { label: "Not submitted", className: "bg-muted text-muted-foreground", tone: "neutral" },
  pending: { label: "Awaiting review", className: "bg-status-warning/15 text-status-warning", tone: "warning" },
  approved: { label: "Approved", className: "bg-amama-subtle text-amama-deep", tone: "success" },
  "changes-requested": {
    label: "Changes requested",
    className: "bg-destructive/10 text-destructive",
    tone: "danger",
  },
}

const documentStyles: Record<DocumentReviewStatus, { label: string; tone: Tone }> = {
  pending: { label: "Not reviewed", tone: "neutral" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Requested again", tone: "danger" },
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function describeApplicant(submission: AdminSubmission) {
  const country = countries.find((entry) => entry.code === submission.country)
  const parts = [
    submission.role === "seller" ? "Seller" : "Buyer",
    submission.entityType === "organization" ? "Organisation" : "Individual",
    submission.sellerSubType ? (submission.sellerSubType === "producer" ? "Producer" : "Trader") : null,
    country ? `${countryCodeToFlag(country.code)} ${country.name}` : null,
  ]
  return parts.filter(Boolean).join(" · ")
}

/** Inline for whatever the browser can render on its own — an image, or a
 *  PDF via the native viewer in an `iframe` — fetched as a presigned URL
 *  only once the dialog actually opens, never eagerly for every row. */
function DocumentPreview({ documentId, name }: { documentId: string; name: string }) {
  const [url, setUrl] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    documentPreviewUrl(documentId).then((value) => {
      if (!cancelled) setUrl(value)
    })
    return () => {
      cancelled = true
    }
  }, [documentId])

  if (!url) {
    return <div className="flex h-40 items-center justify-center text-[13px] text-muted-foreground">Loading…</div>
  }
  return <iframe src={url} title={name} className="h-[65vh] w-full rounded-2xl border border-border" />
}

function DocumentRow({ role, document }: { role: OnboardingRole; document: AdminSubmission["documents"][number] }) {
  const [requesting, setRequesting] = React.useState(false)
  const status = documentStyles[document.reviewStatus]
  const label =
    en.onboarding.options.documents[document.id as keyof typeof en.onboarding.options.documents]?.label ?? document.id

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <span
          aria-hidden
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            document.reviewStatus === "approved" ? "bg-amama-subtle text-amama-deep" : "bg-muted text-muted-foreground"
          )}
        >
          <FileText className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-foreground">
            {label}
            {document.required ? (
              <span className="ms-0.5 text-destructive" aria-label="required">
                *
              </span>
            ) : null}
          </p>
          <Dialog>
            <DialogTrigger className="group/file inline-flex max-w-full items-center gap-1 text-[12px] text-muted-foreground outline-none hover:text-foreground focus-visible:underline">
              <span className="truncate underline decoration-border underline-offset-2 group-hover/file:decoration-foreground/40">
                {document.name}
              </span>
              <span className="shrink-0">· {formatBytes(document.size)}</span>
              <EyeIcon aria-hidden className="size-3.5 shrink-0" />
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{document.name}</DialogTitle>
              </DialogHeader>
              <DocumentPreview documentId={document.id} name={document.name} />
              <DialogFooter>
                <DownloadDocumentLink documentId={document.id} name={document.name} />
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex shrink-0 items-center gap-2 max-sm:w-full max-sm:justify-end">
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
          <ApproveButton
            label="Approve document"
            done={document.reviewStatus === "approved"}
            onClick={() => setDocumentStatus(role, document.id, "approved")}
          />
          <RequestAgainButton active={requesting} onClick={() => setRequesting((value) => !value)} />
        </div>
      </div>

      {requesting ? (
        <RequestNote
          id={`doc-note-${document.id}`}
          prompt={`What should they re-upload for ${label.toLowerCase()}?`}
          placeholder="The scan is cut off — please upload all pages."
          onCancel={() => setRequesting(false)}
          onSubmit={(note) => {
            setDocumentStatus(role, document.id, "rejected", note)
            setRequesting(false)
          }}
        />
      ) : document.reviewStatus === "rejected" && document.reviewNote ? (
        <RowNote>Requested again: {document.reviewNote}</RowNote>
      ) : null}
    </>
  )
}

function DownloadDocumentLink({ documentId, name }: { documentId: string; name: string }) {
  const [url, setUrl] = React.useState<string | null>(null)
  React.useEffect(() => {
    documentPreviewUrl(documentId).then(setUrl)
  }, [documentId])
  return (
    <a
      href={url ?? undefined}
      download={name}
      className={cn(buttonVariants({ variant: "outline" }), !url && "pointer-events-none opacity-50")}
    >
      <DownloadIcon className="size-4" />
      Download
    </a>
  )
}

/** One applicant as one island: who they are and the decision on the
 *  whole application in the shell, each document as its own row in the
 *  tray, each with the same tick / request-again pair. */
function SubmissionCard({ submission }: { submission: AdminSubmission }) {
  const [requesting, setRequesting] = React.useState(false)
  const status = statusStyles[submission.reviewStatus]
  const approvedDocs = submission.documents.filter((document) => document.reviewStatus === "approved").length
  const totalDocs = submission.documents.length
  const name = submission.fullName || "Unnamed applicant"

  const submittedOn = submission.submittedAt
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(submission.submittedAt))
    : null

  return (
    <ReviewGroup
      header={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
          <Initials name={name} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="truncate text-[15px] font-bold tracking-tight text-foreground">{name}</h2>
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
            </div>
            <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
              {submission.email} · {describeApplicant(submission)}
            </p>
            <p className="truncate text-[11.5px] text-muted-foreground/80">
              {submittedOn ? `Submitted ${submittedOn}` : "Not yet submitted"}
              {submission.reviewedByName ? ` · Reviewed by ${submission.reviewedByName}` : ""}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 max-sm:w-full max-sm:justify-end">
            <DocsMeter approved={approvedDocs} total={totalDocs} />
            <ApproveButton
              label="Approve application"
              done={submission.reviewStatus === "approved"}
              onClick={() => approveApplication(submission.role, submission.userId)}
            />
            <RequestAgainButton active={requesting} onClick={() => setRequesting((value) => !value)} />
          </div>
        </div>
      }
    >
      {requesting ? (
        <RequestNote
          id={`note-${submission.userId}`}
          prompt="What needs fixing before this can be approved?"
          placeholder="The land record is too blurry to read the survey number."
          onCancel={() => setRequesting(false)}
          onSubmit={(note) => {
            requestApplicationChanges(submission.role, submission.userId, note)
            setRequesting(false)
          }}
        />
      ) : submission.reviewerNote ? (
        <RowNote tone="warning">
          <span className="font-semibold">Sent back:</span> {submission.reviewerNote}
        </RowNote>
      ) : null}

      {submission.documents.length === 0 ? (
        <p className="px-4 py-5 text-center text-[12.5px] text-muted-foreground">No documents uploaded.</p>
      ) : (
        submission.documents.map((document) => (
          <DocumentRow key={document.id} role={submission.role} document={document} />
        ))
      )}
    </ReviewGroup>
  )
}

/** How much of the paperwork has been cleared, as a count and a bar. */
function DocsMeter({ approved, total }: { approved: number; total: number }) {
  if (total === 0) return null
  return (
    <span className="hidden items-center gap-2 pe-1 sm:flex" title={`${approved} of ${total} documents approved`}>
      <span className="text-[11.5px] font-semibold text-muted-foreground tabular-nums">
        {approved}/{total}
      </span>
      <span aria-hidden className="flex gap-0.5">
        {Array.from({ length: total }).map((_, index) => (
          <span key={index} className={cn("h-1.5 w-3 rounded-full", index < approved ? "bg-amama-deep" : "bg-border")} />
        ))}
      </span>
    </span>
  )
}

const QUEUE_STATUSES: ReviewStatus[] = ["pending", "changes-requested"]

type Mode = "queue" | "registered"

const MODES: { id: Mode; label: string }[] = [
  { id: "queue", label: "Queue" },
  { id: "registered", label: "Registered" },
]

/**
 * One role's own review page. "Queue" is only whoever actually needs a
 * decision right now (`pending`/`changes-requested`); "Registered" is
 * everyone who has ever submitted for this role, whatever their current
 * status — the roster, not the to-do list. Genuinely a list now (many
 * buyers, many sellers), not the single global slot per role the old
 * prototype's `localStorage` model was stuck with.
 */
function ReviewQueueView({ role }: { role: OnboardingRole }) {
  const admin = useCurrentAdmin()
  const submissions = useVerificationQueue(role)
  const [mode, setMode] = React.useState<Mode>("queue")
  const roleLabel = role === "buyer" ? "Buyer" : "Seller"

  if (!admin) return null

  if (!admin.can("onboarding.review")) {
    return (
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">{roleLabel} queue</h1>
        <AdminEmptyState
          icon={Inbox}
          title="No review permission on your role"
          description="Ask a Master Admin for the 'Review onboarding' permission to see applications here."
        />
      </div>
    )
  }

  const visible = mode === "registered" ? submissions : submissions.filter((entry) => QUEUE_STATUSES.includes(entry.reviewStatus))

  return (
    <div className={PAGE_TABS_SPACE}>
      <h1 className="text-[28px] font-bold tracking-tight">{roleLabel} queue</h1>

      <PageTabs
        label={`${roleLabel} lists`}
        className="mt-5"
        value={mode}
        onChange={setMode}
        tabs={MODES.map(({ id, label }) => ({
          value: id,
          label,
          count:
            id === "queue"
              ? submissions.filter((entry) => QUEUE_STATUSES.includes(entry.reviewStatus)).length
              : submissions.length,
        }))}
      />

      {visible.length === 0 ? (
        <AdminEmptyState
          icon={Inbox}
          title={mode === "queue" ? "Nothing waiting" : "No one registered yet"}
          description={
            mode === "queue"
              ? `${roleLabel} applications land here once someone finishes onboarding and submits their documents.`
              : `Once a ${role} finishes onboarding, they'll show up here regardless of review status.`
          }
        />
      ) : (
        <TooltipProvider delay={300}>
          <div className="mt-4 flex flex-col gap-3">
            {visible.map((submission) => (
              <SubmissionCard key={submission.userId} submission={submission} />
            ))}
          </div>
        </TooltipProvider>
      )}
    </div>
  )
}

export { ReviewQueueView }
