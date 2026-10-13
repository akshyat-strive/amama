"use client"

import * as React from "react"
import { FilePlusIcon, FileTextIcon, MessageSquareIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import { hasPermission } from "@/features/admin/permissions"
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
import { useRoles } from "@/features/admin/role-store"
import { useUsers } from "@/features/admin/user-store"
import { countries, countryCodeToFlag } from "@/features/onboarding/countries"
import {
  Composer,
  FilePreview,
  Timeline,
  VersionHistory,
  applicationStatus,
  documentStatus,
  timeAgo,
  useDocumentLabel,
} from "@/features/verification/components/kyc-ticket-parts"
import {
  addStaffComment,
  approveApplication,
  assignTicket,
  requestApplicationChanges,
  requestDocument,
  setDocumentStatus,
  withdrawRequest,
  type StaffActor,
} from "@/features/verification/kyc-store"
import type { KycApplication, KycDocument, ReviewStatus } from "@/features/verification/kyc-types"

export const statusStyles: Record<ReviewStatus, { label: string; className: string; tone: Tone }> = {
  "not-submitted": { label: "Not submitted", className: "bg-muted text-muted-foreground", tone: "neutral" },
  pending: { label: "Awaiting review", className: "bg-status-warning/15 text-status-warning", tone: "warning" },
  approved: { label: "Approved", className: "bg-amama-subtle text-amama-deep", tone: "success" },
  "changes-requested": { label: "Waiting on applicant", className: "bg-destructive/10 text-destructive", tone: "danger" },
}

export function describeApplicant(submission: KycApplication) {
  const country = countries.find((entry) => entry.code === submission.country)
  const parts = [
    submission.role === "seller" ? "Seller" : "Buyer",
    submission.entityType === "organization" ? "Organisation" : "Individual",
    submission.sellerSubType ? (submission.sellerSubType === "producer" ? "Producer" : "Trader") : null,
    country ? `${countryCodeToFlag(country.code)} ${country.name}` : null,
  ]
  return parts.filter(Boolean).join(" · ")
}

/** Whether the application can be approved now: nothing sent back and
 *  every required document uploaded. Pending documents are approved
 *  along with it. */
function readiness(submission: KycApplication) {
  const rejected = submission.documents.filter((document) => document.reviewStatus === "rejected").length
  const missing = submission.documents.filter((document) => document.required && document.reviewStatus === "missing").length
  if (rejected > 0) return { ready: false, reason: `${rejected} sent back — waiting on the applicant` }
  if (missing > 0) return { ready: false, reason: `${missing} requested document${missing === 1 ? "" : "s"} not uploaded yet` }
  return { ready: true, reason: "Approve application" }
}

/**
 * One KYC ticket, staff side. Who owns it; every document with its
 * upload history, verdict and comments; asking for a document the list
 * didn't include; and the conversation with the applicant. Read-only for
 * staff without `onboarding.review` — an executive from another domain
 * sees everything but can't act.
 */
function SubmissionCard({ submission }: { submission: KycApplication }) {
  const admin = useCurrentAdmin()
  const users = useUsers()
  const roles = useRoles()
  const labelOf = useDocumentLabel()
  const [requesting, setRequesting] = React.useState(false)
  const [askingForDoc, setAskingForDoc] = React.useState(false)
  const [docId, setDocId] = React.useState<string | null>(null)
  const conversationRef = React.useRef<HTMLDivElement>(null)

  if (!admin) return null
  const me: StaffActor = { id: admin.user.id, name: admin.user.name, title: admin.role.name }
  const canReview = admin.can("onboarding.review") && submission.reviewStatus !== "approved"
  const canAssign = admin.can("onboarding.assign")
  const status = statusStyles[submission.reviewStatus]
  const approvedDocs = submission.documents.filter((document) => document.reviewStatus === "approved").length
  const name = submission.fullName || "Unnamed applicant"
  const { ready, reason } = readiness(submission)

  // Who can own a KYC ticket: anyone whose role reviews KYC.
  const reviewers = users.filter((user) => {
    const role = roles.find((entry) => entry.id === user.roleId)
    return role && hasPermission(role.permissions, "onboarding.review")
  })
  const assignee = users.find((user) => user.id === submission.assigneeId) ?? null

  const labelForId = (id: string) => {
    const document = submission.documents.find((entry) => entry.id === id)
    return document ? labelOf(document).label : null
  }

  const commentOn = (id: string) => {
    setDocId(id)
    conversationRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    conversationRef.current?.querySelector("textarea")?.focus()
  }

  return (
    <div className="flex flex-col gap-3 @container">
      <ReviewGroup
        header={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
            <Initials name={name} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <h2 className="truncate text-[15px] font-semibold tracking-tight text-foreground">{name}</h2>
                <StatusPill tone={status.tone}>{status.label}</StatusPill>
              </div>
              <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                {submission.companyName && submission.companyName !== name ? `${submission.companyName} · ` : ""}
                {submission.email} · {describeApplicant(submission)}
              </p>
              <p className="truncate text-[11.5px] text-muted-foreground/80">
                {submission.submittedAt ? `Submitted ${timeAgo(submission.submittedAt)}` : "Not yet submitted"}
                {submission.reviewStatus === "approved" && submission.reviewedByName ? ` · Approved by ${submission.reviewedByName}` : ""}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 max-sm:w-full max-sm:justify-end">
              <DocsMeter approved={approvedDocs} total={submission.documents.length} />
              {canReview ? (
                <>
                  <ApproveButton
                    label={reason}
                    disabled={!ready}
                    onClick={() => {
                      approveApplication(submission.role, submission.userId, me)
                      toast.success(`${name} approved`)
                    }}
                  />
                  <RequestAgainButton label="Send back" active={requesting} onClick={() => setRequesting((value) => !value)} />
                </>
              ) : submission.reviewStatus === "approved" ? (
                <ApproveButton label="Approved" done onClick={() => {}} />
              ) : null}
            </div>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2 bg-muted/40 px-4 py-2 text-[12.5px]">
          <span className="text-muted-foreground">Owner</span>
          {canAssign && submission.reviewStatus !== "approved" ? (
            <Select
              items={Object.fromEntries([["none", "Unassigned"], ...reviewers.map((user) => [user.id, user.name])])}
              value={submission.assigneeId ?? "none"}
              onValueChange={(value) => {
                const next = reviewers.find((user) => user.id === value) ?? null
                assignTicket(submission.role, submission.userId, next ? { id: next.id, name: next.name } : null, me)
              }}
            >
              <SelectTrigger size="sm" aria-label="Ticket owner" className="h-7 min-w-36 bg-card text-[12.5px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {reviewers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="font-medium text-foreground">{assignee?.name ?? "Unassigned"}</span>
          )}
          {canReview && !canAssign && !assignee ? (
            <button
              type="button"
              onClick={() => assignTicket(submission.role, submission.userId, { id: me.id, name: me.name }, me)}
              className="rounded-full border border-border bg-card px-2.5 py-0.5 font-medium hover:bg-muted"
            >
              Take ticket
            </button>
          ) : null}
        </div>

        {requesting ? (
          <RequestNote
            id={`note-${submission.userId}`}
            prompt="What needs fixing before this can be approved?"
            placeholder="The company name on the trade licence doesn't match the one you registered with."
            submitLabel="Send back"
            onCancel={() => setRequesting(false)}
            onSubmit={(note) => {
              requestApplicationChanges(submission.role, submission.userId, note, me)
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
            <DocumentRow
              key={document.id}
              submission={submission}
              document={document}
              label={labelOf(document).label}
              me={me}
              canReview={canReview}
              onComment={() => commentOn(document.id)}
            />
          ))
        )}

        {canReview ? (
          askingForDoc ? (
            <RequestDocumentForm
              onCancel={() => setAskingForDoc(false)}
              onSubmit={(input) => {
                requestDocument(submission.role, submission.userId, input, me)
                setAskingForDoc(false)
                toast.success(`Asked for ${input.label}`)
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAskingForDoc(true)}
              className="flex w-full items-center gap-2 px-4 py-3 text-start text-[13px] font-medium text-amama-deep transition-colors hover:bg-muted/50"
            >
              <FilePlusIcon aria-hidden className="size-4" />
              Ask for another document
            </button>
          )
        ) : null}
      </ReviewGroup>

      <section ref={conversationRef} aria-label="Conversation" className="overflow-hidden rounded-[18px] border border-border bg-card">
        <h3 className="flex items-center gap-1.5 border-b border-border px-4 py-2.5 text-[13px] font-semibold">
          <MessageSquareIcon aria-hidden className="size-3.5 text-muted-foreground" />
          Conversation
          <span className="font-normal text-muted-foreground">· {submission.comments.filter((entry) => entry.author.kind !== "system").length}</span>
        </h3>
        <div className="max-h-[360px] overflow-y-auto">
          <Timeline comments={submission.comments} labelFor={labelForId} viewer="staff" />
        </div>
        {admin.can("onboarding.review") ? (
          <Composer
            placeholder="Comment for the applicant…"
            documents={submission.documents.map((document) => ({ id: document.id, label: labelOf(document).label }))}
            docId={docId}
            onDocChange={setDocId}
            onSend={(text, about) => addStaffComment(submission.role, submission.userId, text, about, me)}
          />
        ) : null}
      </section>
    </div>
  )
}

function DocumentRow({
  submission,
  document,
  label,
  me,
  canReview,
  onComment,
}: {
  submission: KycApplication
  document: KycDocument
  label: string
  me: StaffActor
  canReview: boolean
  onComment: () => void
}) {
  const [requesting, setRequesting] = React.useState(false)
  const style = documentStatus[document.reviewStatus]
  const current = document.versions.at(-1)
  const comments = submission.comments.filter((entry) => entry.docId === document.id && entry.author.kind !== "system").length

  return (
    <>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2 px-4 py-3">
        <span
          aria-hidden
          className={cn(
            "mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl",
            document.reviewStatus === "approved" ? "bg-amama-subtle text-amama-deep" : document.reviewStatus === "missing" ? "bg-sky-500/10 text-sky-700" : "bg-muted text-muted-foreground"
          )}
        >
          {document.reviewStatus === "missing" ? <FilePlusIcon className="size-4" /> : <FileTextIcon className="size-4" />}
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
          {current ? (
            <FilePreview version={current} title={label} />
          ) : (
            <p className="text-[12px] text-muted-foreground">
              Requested by {document.requestedBy?.name ?? "the team"}
              {document.requestedBy ? ` ${timeAgo(document.requestedBy.at)}` : ""} · not uploaded yet
            </p>
          )}
          <VersionHistory document={document} title={label} />
          {document.reviewedBy && document.reviewStatus !== "pending" ? (
            <p className="mt-0.5 text-[11.5px] text-muted-foreground/80">
              {document.reviewStatus === "approved" ? "Approved" : "Sent back"} by {document.reviewedBy.name} · {timeAgo(document.reviewedBy.at)}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 max-sm:w-full max-sm:justify-end">
          <StatusPill tone={style.tone}>{style.label}</StatusPill>
          <button
            type="button"
            onClick={onComment}
            aria-label={`Comment on ${label}`}
            className="inline-flex h-8 items-center gap-1 rounded-full px-2 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <MessageSquareIcon aria-hidden className="size-3.5" />
            {comments > 0 ? comments : null}
          </button>
          {canReview && document.reviewStatus === "missing" ? (
            <button
              type="button"
              onClick={() => withdrawRequest(submission.role, submission.userId, document.id, me)}
              aria-label={`Withdraw the request for ${label}`}
              className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <XIcon className="size-4" />
            </button>
          ) : null}
          {canReview && document.reviewStatus !== "missing" ? (
            <>
              <ApproveButton
                label="Approve document"
                done={document.reviewStatus === "approved"}
                onClick={() => setDocumentStatus(submission.role, submission.userId, document.id, "approved", null, me)}
              />
              <RequestAgainButton active={requesting} disabled={document.reviewStatus === "rejected"} onClick={() => setRequesting((value) => !value)} />
            </>
          ) : null}
        </div>
      </div>

      {requesting ? (
        <RequestNote
          id={`doc-note-${submission.userId}-${document.id}`}
          prompt={`What should they re-upload for ${label.toLowerCase()}?`}
          placeholder="The scan is cut off — please upload all pages."
          onCancel={() => setRequesting(false)}
          onSubmit={(note) => {
            setDocumentStatus(submission.role, submission.userId, document.id, "rejected", note, me)
            setRequesting(false)
          }}
        />
      ) : document.reviewStatus === "rejected" && document.reviewNote ? (
        <RowNote>Sent back: {document.reviewNote}</RowNote>
      ) : null}
    </>
  )
}

/** Names a document the standard list didn't ask for — another licence,
 *  a certificate — and why it's needed. */
function RequestDocumentForm({ onSubmit, onCancel }: { onSubmit: (input: { label: string; note?: string }) => void; onCancel: () => void }) {
  const [label, setLabel] = React.useState("")
  const [note, setNote] = React.useState("")
  const ref = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => ref.current?.focus(), [])
  const submit = () => label.trim() && onSubmit({ label: label.trim(), note: note.trim() || undefined })

  return (
    <form
      className="flex flex-col gap-2 bg-muted/50 px-4 py-3"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <label htmlFor="extra-doc-name" className="text-[12px] font-semibold">
        Which document?
      </label>
      <Input ref={ref} id="extra-doc-name" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Cold storage licence" className="h-9 bg-card" />
      <label htmlFor="extra-doc-note" className="text-[12px] font-semibold">
        Why it&apos;s needed <span className="font-normal text-muted-foreground">(optional)</span>
      </label>
      <Input
        id="extra-doc-note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="You listed frozen produce, so we need the cold store's licence."
        className="h-9 bg-card"
      />
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={onCancel} className="h-8 rounded-full px-3 text-[12.5px] font-medium text-muted-foreground hover:bg-card hover:text-foreground">
          Cancel
        </button>
        <button
          type="submit"
          disabled={!label.trim()}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-[12.5px] font-semibold text-background transition-opacity disabled:opacity-40"
        >
          <FilePlusIcon aria-hidden className="size-3.5" />
          Ask for it
        </button>
      </div>
    </form>
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

export { SubmissionCard, applicationStatus }
