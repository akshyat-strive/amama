"use client"

import * as React from "react"
import { CheckCircle2, DownloadIcon, FileText, Inbox, RotateCcw, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { AdminEmptyState } from "@/features/admin/admin-ui"
import { useCurrentAdmin } from "@/features/admin/current-admin"
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

export const statusStyles: Record<ReviewStatus, { label: string; className: string }> = {
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
        <Dialog>
          <DialogTrigger render={<Attachment className="shrink-0 cursor-pointer hover:border-amama-deep/40" />}>
            <AttachmentMedia alt={document.name} />
            <AttachmentContent>
              <AttachmentTitle>{document.name}</AttachmentTitle>
              <AttachmentDescription>{formatBytes(document.size)}</AttachmentDescription>
            </AttachmentContent>
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

/** One applicant, one plain surface — no colored header band sitting
 *  over a white body (that split is what made this read as a generic
 *  templated card rather than a considered review row). Name, status and
 *  the who/when meta sit close together at the top since they're all the
 *  same kind of fact; documents and the decision come after a single
 *  hairline, not a second boxed section. */
function SubmissionCard({ submission }: { submission: AdminSubmission }) {
  const [note, setNote] = React.useState("")
  const [showNote, setShowNote] = React.useState(false)
  const status = statusStyles[submission.reviewStatus]

  const submittedOn = submission.submittedAt
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(submission.submittedAt)
      )
    : null

  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-bold tracking-tight text-foreground">
            {submission.fullName || "Unnamed applicant"}
          </h2>
          <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
            {submission.email} · {describeApplicant(submission)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {submittedOn ? `Submitted ${submittedOn}` : "Not yet submitted"}
            {submission.reviewedByName ? ` · Reviewed by ${submission.reviewedByName}` : ""}
          </p>
        </div>
        <Badge className={cn("shrink-0", status.className)}>{status.label}</Badge>
      </div>

      <ul className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
        {submission.documents.map((document) => (
          <DocumentRow key={document.id} role={submission.role} document={document} />
        ))}
      </ul>

      {submission.reviewerNote ? (
        <p className="mt-3 rounded-[14px] bg-muted px-3 py-2 text-[13px] text-muted-foreground">
          Sent back: {submission.reviewerNote}
        </p>
      ) : null}

      {showNote ? (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          <label htmlFor={`note-${submission.userId}`} className="text-[13px] font-medium">
            What needs fixing?
          </label>
          <Textarea
            id={`note-${submission.userId}`}
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
                requestApplicationChanges(submission.role, submission.userId, note.trim())
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
        <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
          <Button
            size="sm"
            disabled={submission.reviewStatus === "approved"}
            onClick={() => approveApplication(submission.role, submission.userId)}
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
      <p className="mt-1 text-[13px] text-muted-foreground">
        {roleLabel} onboarding applications, and the documents behind each one.
      </p>

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
        <div className="mt-4 flex flex-col gap-4">
          {visible.map((submission) => (
            <SubmissionCard key={submission.userId} submission={submission} />
          ))}
        </div>
      )}
    </div>
  )
}

export { ReviewQueueView }
