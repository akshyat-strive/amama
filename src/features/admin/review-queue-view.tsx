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
import { ADMIN_SELECTED_CLASS, AdminEmptyState } from "@/features/admin/admin-ui"
import { useCurrentAdmin } from "@/features/admin/current-admin"
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

/** The short file-type word an attachment caption shows next to size —
 *  read straight off the data URL's own MIME type rather than threaded
 *  through as a separate field. */
function describeFileType(dataUrl: string) {
  const mime = dataUrl.match(/^data:([^;]+);/)?.[1] ?? ""
  if (mime === "application/pdf") return "PDF"
  if (mime.startsWith("image/")) return mime.slice("image/".length).toUpperCase()
  return "FILE"
}

export function describeApplicant(submission: Submission) {
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

/** Inline for whatever the browser can actually render on its own — an
 *  image, or a PDF via the browser's native viewer in an `iframe` — and a
 *  plain "can't preview this" note for anything else. Download works
 *  either way, since that's just the same data URL as an `href`. */
function DocumentPreview({ dataUrl, name }: { dataUrl: string; name: string }) {
  if (dataUrl.startsWith("data:image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={dataUrl} alt={name} className="max-h-[65vh] w-full rounded-2xl object-contain" />
    )
  }
  if (dataUrl.startsWith("data:application/pdf")) {
    return <iframe src={dataUrl} title={name} className="h-[65vh] w-full rounded-2xl border border-border" />
  }
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-center">
      <FileText className="size-6 text-muted-foreground" />
      <p className="text-[13px] text-muted-foreground">Preview isn&apos;t available for this file type.</p>
    </div>
  )
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
        {document.dataUrl ? (
          <Dialog>
            <DialogTrigger
              render={<Attachment className="shrink-0 cursor-pointer hover:border-amama-deep/40" />}
            >
              <AttachmentMedia
                src={document.dataUrl.startsWith("data:image/") ? document.dataUrl : undefined}
                alt={document.name}
              />
              <AttachmentContent>
                <AttachmentTitle>{document.name}</AttachmentTitle>
                <AttachmentDescription>
                  {describeFileType(document.dataUrl)} · {formatBytes(document.size)}
                </AttachmentDescription>
              </AttachmentContent>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>{document.name}</DialogTitle>
              </DialogHeader>
              <DocumentPreview dataUrl={document.dataUrl} name={document.name} />
              <DialogFooter>
                <a
                  href={document.dataUrl}
                  download={document.name}
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  <DownloadIcon className="size-4" />
                  Download
                </a>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <Attachment className="shrink-0 opacity-60">
            <AttachmentMedia alt={document.name} />
            <AttachmentContent>
              <AttachmentTitle>{document.name}</AttachmentTitle>
              <AttachmentDescription>{formatBytes(document.size)}</AttachmentDescription>
            </AttachmentContent>
          </Attachment>
        )}
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

const QUEUE_STATUSES: ReviewStatus[] = ["pending", "changes-requested"]

type Mode = "queue" | "registered"

const MODES: { id: Mode; label: string }[] = [
  { id: "queue", label: "Queue" },
  { id: "registered", label: "Registered" },
]

/**
 * One role's own review page — split out of the combined queue so a
 * buyer application and a seller one each get their own URL (and their
 * own sidebar item) instead of always showing up bundled together.
 *
 * The toggle inside is a second, narrower split: "Queue" is only whoever
 * actually needs a decision right now (`pending`/`changes-requested`);
 * "Registered" is everyone who has ever gone through onboarding for this
 * role, whatever their current status — the roster, not the to-do list.
 *
 * Same defense-in-depth as `TeamManagementView`: the nav item is already
 * gated on `onboarding.review`, this re-checks it directly in case someone
 * hits the URL without it.
 */
function ReviewQueueView({ role }: { role: OnboardingRole }) {
  const admin = useCurrentAdmin()
  const { submissions } = useVerification()
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

  const submission = submissions[role]
  const visible =
    submission && (mode === "registered" || QUEUE_STATUSES.includes(submission.status)) ? submission : null

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">{roleLabel} queue</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {roleLabel} onboarding applications, and the documents behind each one.
      </p>

      <div className="mt-4 flex gap-2">
        {MODES.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              mode === id ? ADMIN_SELECTED_CLASS : "border-border text-foreground hover:bg-muted"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {!visible ? (
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
          <SubmissionCard submission={visible} reviewer={{ id: admin.user.id, name: admin.user.name }} />
        </div>
      )}
    </div>
  )
}

export { ReviewQueueView }
