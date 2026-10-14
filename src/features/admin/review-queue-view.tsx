"use client"

import * as React from "react"
import { ChevronDownIcon, FilePlusIcon, FileTextIcon, MessageSquareIcon, RefreshCwIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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
  expiryOf,
  expiryState,
  formatDate,
  itemKind,
  owesUpload,
  ticketOrigin,
  ticketStatus,
  timeAgo,
  useDocumentLabel,
} from "@/features/verification/components/kyc-ticket-parts"
import {
  addStaffComment,
  approveApplication,
  assignKycTicket,
  requestApplicationChanges,
  requestDocument,
  requestDocumentUpdate,
  resolveKycTicket,
  setDocumentStatus,
  ticketComments,
  withdrawRequest,
  type StaffActor,
} from "@/features/verification/kyc-store"
import type { KycApplication, KycDocument, KycTicket, KycTicketItem, ReviewStatus } from "@/features/verification/kyc-types"

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

/** Whether the first ticket can be approved now: nothing sent back and
 *  every required document uploaded. Pending documents are approved
 *  along with it. */
function readiness(submission: KycApplication) {
  const rejected = submission.documents.filter((document) => document.reviewStatus === "rejected").length
  const missing = submission.documents.filter((document) => document.required && document.reviewStatus === "missing").length
  if (rejected > 0) return { ready: false, reason: `${rejected} sent back — waiting on the applicant` }
  if (missing > 0) return { ready: false, reason: `${missing} requested document${missing === 1 ? "" : "s"} not uploaded yet` }
  return { ready: true, reason: "Approve application" }
}

/** Whether a later ticket can be resolved: nothing still owed by the
 *  applicant. Anything in review is approved with it. */
function ticketReadiness(ticket: KycTicket) {
  const owed = ticket.items.filter((entry) => owesUpload(entry.status)).length
  if (owed > 0) return { ready: false, reason: `${owed} document${owed === 1 ? "" : "s"} waiting on the applicant` }
  return { ready: true, reason: "Approve and resolve ticket" }
}

/**
 * One KYC ticket, staff side. Who owns it; every document on it with its
 * upload history, verdict and the actions a KAM has — approve, request
 * changes, request an update — plus everything else on file, asking for a
 * document the account doesn't have, the account's other tickets, and the
 * conversation on this ticket. Read-only for staff without
 * `onboarding.review` — an executive from another domain sees everything
 * but can't act.
 */
function SubmissionCard({ submission, ticketId, onOpenTicket }: { submission: KycApplication; ticketId?: string; onOpenTicket?: (id: string) => void }) {
  const admin = useCurrentAdmin()
  const users = useUsers()
  const roles = useRoles()
  const labelOf = useDocumentLabel()
  const [requesting, setRequesting] = React.useState(false)
  const [askingForDoc, setAskingForDoc] = React.useState(false)
  const [showOthers, setShowOthers] = React.useState(false)
  const [docId, setDocId] = React.useState<string | null>(null)
  const conversationRef = React.useRef<HTMLDivElement>(null)

  const ticket = submission.tickets.find((entry) => entry.id === ticketId) ?? submission.tickets.find((entry) => entry.origin === "onboarding") ?? null
  if (!admin) return null
  if (!ticket) return <p className="rounded-2xl bg-background px-4 py-6 text-center text-[13px] text-muted-foreground">This applicant hasn&apos;t submitted anything yet.</p>

  const me: StaffActor = { id: admin.user.id, name: admin.user.name, title: admin.role.name }
  const canAct = admin.can("onboarding.review")
  const onboarding = ticket.origin === "onboarding"
  const resolved = !!ticket.resolvedAt
  const canReview = canAct && !resolved
  const canAssign = admin.can("onboarding.assign")
  const status = ticketStatus[ticket.status]
  const approvedItems = ticket.items.filter((entry) => entry.status === "approved").length
  const name = submission.fullName || "Unnamed applicant"
  const { ready, reason } = onboarding ? readiness(submission) : ticketReadiness(ticket)
  const comments = ticketComments(submission, ticket.id)
  const others = submission.documents.filter((document) => !ticket.items.some((entry) => entry.docId === document.id))
  const otherTickets = submission.tickets.filter((entry) => entry.id !== ticket.id).reverse()

  // Who can own a KYC ticket: anyone whose role reviews KYC.
  const reviewers = users.filter((user) => {
    const role = roles.find((entry) => entry.id === user.roleId)
    return role && hasPermission(role.permissions, "onboarding.review")
  })
  const accountKam = users.find((user) => user.id === submission.assigneeId) ?? null

  const labelForId = (id: string) => {
    const document = submission.documents.find((entry) => entry.id === id)
    return document ? labelOf(document).label : null
  }

  const commentOn = (id: string) => {
    setDocId(id)
    conversationRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    conversationRef.current?.querySelector("textarea")?.focus()
  }

  const assign = (next: StaffActor | null) => assignKycTicket(submission.role, submission.userId, ticket.id, next, me)

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
              <p className="mt-0.5 truncate text-[12.5px] text-foreground/80">
                <span className="font-mono text-[12px]">{ticket.id}</span> · {ticket.title} · {ticketOrigin[ticket.origin].label}
              </p>
              <p className="truncate text-[12px] text-muted-foreground">
                {submission.companyName && submission.companyName !== name ? `${submission.companyName} · ` : ""}
                {submission.email} · {describeApplicant(submission)}
              </p>
              <p className="truncate text-[11.5px] text-muted-foreground/80">
                Opened {timeAgo(ticket.openedAt)} by {ticket.openedBy.kind === "applicant" ? "the applicant" : ticket.openedBy.name}
                {resolved && ticket.resolvedBy ? ` · Resolved by ${ticket.resolvedBy.name}` : ""}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 max-sm:w-full max-sm:justify-end">
              <DocsMeter approved={approvedItems} total={ticket.items.length} />
              {canReview ? (
                onboarding ? (
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
                ) : (
                  <ApproveButton
                    label={reason}
                    disabled={!ready}
                    onClick={() => {
                      resolveKycTicket(submission.role, submission.userId, ticket.id, me)
                      toast.success(`${ticket.id} resolved`)
                    }}
                  />
                )
              ) : resolved ? (
                <ApproveButton label={onboarding ? "Approved" : "Resolved"} done onClick={() => {}} />
              ) : null}
            </div>
          </div>
        }
      >
        <div className="flex flex-wrap items-center gap-2 bg-muted/40 px-4 py-2 text-[12.5px]">
          <span className="text-muted-foreground">Assigned to</span>
          {canAssign && !resolved ? (
            <Select
              items={Object.fromEntries([["none", "Unassigned"], ...reviewers.map((user) => [user.id, user.name])])}
              value={ticket.assignee?.id ?? "none"}
              onValueChange={(value) => {
                const next = reviewers.find((user) => user.id === value) ?? null
                assign(next ? { id: next.id, name: next.name } : null)
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
            <span className={cn("font-medium", ticket.assignee ? "text-foreground" : "text-muted-foreground")}>{ticket.assignee?.name ?? "Unassigned"}</span>
          )}
          {canReview && !canAssign && ticket.assignee?.id !== me.id ? (
            <button type="button" onClick={() => assign(me)} className="rounded-full bg-background px-2.5 py-0.5 font-medium hover:bg-muted">
              Take ticket
            </button>
          ) : null}
          {!onboarding && accountKam ? <span className="ms-auto text-muted-foreground">Account KAM · {accountKam.name}</span> : null}
        </div>

        {onboarding && requesting ? (
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
        ) : onboarding && submission.reviewerNote ? (
          <RowNote tone="warning">
            <span className="font-semibold">Sent back:</span> {submission.reviewerNote}
          </RowNote>
        ) : null}

        {ticket.items.length === 0 ? (
          <p className="px-4 py-5 text-center text-[12.5px] text-muted-foreground">No documents on this ticket.</p>
        ) : (
          ticket.items.map((entry) => {
            const document = submission.documents.find((candidate) => candidate.id === entry.docId)
            if (!document) return null
            return (
              <DocumentRow
                key={entry.docId}
                submission={submission}
                ticket={ticket}
                entry={entry}
                document={document}
                label={labelOf(document).label}
                me={me}
                canAct={canAct}
                canReview={canReview}
                onComment={() => commentOn(document.id)}
              />
            )
          })
        )}

        {others.length > 0 ? (
          <>
            <button
              type="button"
              aria-expanded={showOthers}
              onClick={() => setShowOthers((value) => !value)}
              className="flex w-full items-center gap-2 px-4 py-3 text-start text-[13px] font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              <ChevronDownIcon aria-hidden className={cn("size-4 text-muted-foreground transition-transform", showOthers && "rotate-180")} />
              {showOthers ? "Hide" : "Show"} {others.length} other document{others.length === 1 ? "" : "s"} on file
              <span className="ms-auto text-[12px] font-normal text-muted-foreground">Request an update from here</span>
            </button>
            {showOthers
              ? others.map((document) => (
                  <DocumentRow
                    key={document.id}
                    submission={submission}
                    ticket={ticket}
                    entry={null}
                    document={document}
                    label={labelOf(document).label}
                    me={me}
                    canAct={canAct}
                    canReview={false}
                    onComment={() => commentOn(document.id)}
                  />
                ))
              : null}
          </>
        ) : null}

        {canAct ? (
          askingForDoc ? (
            <RequestDocumentForm
              onCancel={() => setAskingForDoc(false)}
              onSubmit={(input) => {
                requestDocument(submission.role, submission.userId, input, me, ticket.id)
                setAskingForDoc(false)
                toast.success(resolved ? `New ticket raised for ${input.label}` : `Asked for ${input.label}`)
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setAskingForDoc(true)}
              className="flex w-full items-center gap-2 px-4 py-3 text-start text-[13px] font-medium text-amama-deep transition-colors hover:bg-muted/50"
            >
              <FilePlusIcon aria-hidden className="size-4" />
              Request a new document
              {resolved ? <span className="ms-auto text-[12px] font-normal text-muted-foreground">Opens a new ticket</span> : null}
            </button>
          )
        ) : null}
      </ReviewGroup>

      {otherTickets.length > 0 ? (
        <section aria-label="Other tickets for this account" className="rounded-[18px] bg-background px-4 py-3">
          <h3 className="text-[13px] font-semibold">
            Other KYC tickets <span className="font-normal text-muted-foreground">· {otherTickets.length}</span>
          </h3>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {otherTickets.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  disabled={!onOpenTicket}
                  onClick={() => onOpenTicket?.(entry.id)}
                  className="inline-flex h-8 items-center gap-2 rounded-full bg-card px-3 text-[12.5px] transition-colors hover:bg-muted disabled:pointer-events-none"
                >
                  <span aria-hidden className={cn("size-1.5 rounded-full", ticketStatus[entry.status].dot)} />
                  <span className="font-mono text-[11.5px] text-muted-foreground">{entry.id}</span>
                  <span className="max-w-48 truncate font-medium">{entry.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section ref={conversationRef} aria-label="Conversation" className="overflow-hidden rounded-[18px] bg-background">
        <h3 className="flex items-center gap-1.5 border-b border-border px-4 py-2.5 text-[13px] font-semibold">
          <MessageSquareIcon aria-hidden className="size-3.5 text-muted-foreground" />
          Conversation on {ticket.id}
          <span className="font-normal text-muted-foreground">· {comments.filter((entry) => entry.author.kind !== "system").length}</span>
        </h3>
        <div className="max-h-[360px] overflow-y-auto">
          <Timeline comments={comments} labelFor={labelForId} viewer="staff" />
        </div>
        {canAct ? (
          <Composer
            placeholder="Comment for the applicant…"
            generalLabel="This ticket"
            documents={submission.documents.map((document) => ({ id: document.id, label: labelOf(document).label }))}
            docId={docId}
            onDocChange={setDocId}
            onSend={(text, about) => addStaffComment(submission.role, submission.userId, text, about, me, ticket.id)}
          />
        ) : null}
      </section>
    </div>
  )
}

/**
 * One document, as it stands on this ticket (`entry`) or — for the rest
 * of what's on file — on its own. On the ticket: approve, request changes,
 * or withdraw a request still unanswered. Anywhere: request an update,
 * which lands on this ticket while it's open, or a new one.
 */
function DocumentRow({
  submission,
  ticket,
  entry,
  document,
  label,
  me,
  canAct,
  canReview,
  onComment,
}: {
  submission: KycApplication
  ticket: KycTicket
  entry: KycTicketItem | null
  document: KycDocument
  label: string
  me: StaffActor
  canAct: boolean
  canReview: boolean
  onComment: () => void
}) {
  const [mode, setMode] = React.useState<"changes" | "update" | null>(null)
  const status = entry?.status ?? document.reviewStatus
  const style = documentStatus[status]
  const version = (entry?.versionId ? document.versions.find((candidate) => candidate.id === entry.versionId) : null) ?? document.versions.at(-1)
  const comments = submission.comments.filter((line) => line.docId === document.id && line.author.kind !== "system").length
  const expiry = expiryOf(document)
  const expiring = expiryState(expiry)
  const awaiting = status === "missing" || status === "update-requested"
  const toggle = (next: "changes" | "update") => setMode((current) => (current === next ? null : next))

  return (
    <>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2 px-4 py-3">
        <span
          aria-hidden
          className={cn(
            "mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl",
            status === "approved" ? "bg-amama-subtle text-amama-deep" : awaiting ? "bg-status-warning/12 text-status-warning" : "bg-muted text-muted-foreground"
          )}
        >
          {status === "missing" ? <FilePlusIcon className="size-4" /> : status === "update-requested" ? <RefreshCwIcon className="size-4" /> : <FileTextIcon className="size-4" />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-semibold text-foreground">
            {label}
            {document.required ? (
              <span className="ms-0.5 text-destructive" aria-label="required">
                *
              </span>
            ) : null}
            {entry && entry.kind !== "submitted" ? <span className="ms-2 text-[11.5px] font-medium text-muted-foreground">{itemKind[entry.kind]}</span> : null}
          </p>
          {version ? (
            <FilePreview version={version} title={label} />
          ) : (
            <p className="text-[12px] text-muted-foreground">
              Requested by {entry?.requestedBy?.name ?? document.requestedBy?.name ?? "the team"}
              {document.requestedBy ? ` ${timeAgo(document.requestedBy.at)}` : ""} · not uploaded yet
            </p>
          )}
          <VersionHistory document={document} title={label} />
          <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-[11.5px] text-muted-foreground/80">
            {expiry ? (
              <span className={cn(expiring === "soon" && "font-semibold text-status-warning", expiring === "expired" && "font-semibold text-destructive")}>
                {expiring === "expired" ? "Expired" : "Expires"} {formatDate(expiry)}
              </span>
            ) : null}
            {(entry?.reviewedBy ?? document.reviewedBy) && status !== "pending" && !awaiting ? (
              <span>
                {expiry ? "· " : ""}
                {status === "approved" ? "Approved" : "Sent back"} by {(entry?.reviewedBy ?? document.reviewedBy)!.name} · {timeAgo((entry?.reviewedBy ?? document.reviewedBy)!.at)}
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 max-sm:w-full max-sm:justify-end">
          <StatusPill tone={style.tone}>{status === "missing" ? "Awaiting upload" : style.label}</StatusPill>
          <button
            type="button"
            onClick={onComment}
            aria-label={`Comment on ${label}`}
            className="inline-flex h-8 items-center gap-1 rounded-full px-2 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <MessageSquareIcon aria-hidden className="size-3.5" />
            {comments > 0 ? comments : null}
          </button>
          {canReview && entry && awaiting ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={() => withdrawRequest(submission.role, submission.userId, document.id, me)}
                    aria-label={`Withdraw the request for ${label}`}
                    className="grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  />
                }
              >
                <XIcon className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="top">Withdraw request</TooltipContent>
            </Tooltip>
          ) : null}
          {canReview && entry && !awaiting ? (
            <>
              <ApproveButton
                label="Approve document"
                done={status === "approved"}
                onClick={() => setDocumentStatus(submission.role, submission.userId, document.id, "approved", null, me, ticket.id)}
              />
              <RequestAgainButton label="Request changes" active={mode === "changes"} disabled={status === "rejected"} onClick={() => toggle("changes")} />
            </>
          ) : null}
          {canAct && document.versions.length > 0 && status !== "update-requested" ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-expanded={mode === "update"}
                    onClick={() => toggle("update")}
                    aria-label={`Request an update to ${label}`}
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-amama-deep/40",
                      mode === "update" ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground/70 hover:bg-muted"
                    )}
                  />
                }
              >
                <RefreshCwIcon className="size-3.5" />
              </TooltipTrigger>
              <TooltipContent side="top">Request update (e.g. expired)</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </div>

      {mode === "changes" ? (
        <RequestNote
          id={`doc-note-${submission.userId}-${document.id}`}
          prompt={`What should they fix in ${label}?`}
          placeholder="The scan is cut off — please upload all pages."
          submitLabel="Request changes"
          onCancel={() => setMode(null)}
          onSubmit={(note) => {
            setDocumentStatus(submission.role, submission.userId, document.id, "rejected", note, me, ticket.id)
            setMode(null)
          }}
        />
      ) : mode === "update" ? (
        <RequestNote
          id={`doc-update-${submission.userId}-${document.id}`}
          prompt={`Why does ${label} need updating?`}
          placeholder={expiry ? `It expires on ${formatDate(expiry)} — please upload the renewed one.` : "The details have changed — please upload a current copy."}
          submitLabel="Request update"
          onCancel={() => setMode(null)}
          onSubmit={(note) => {
            requestDocumentUpdate(submission.role, submission.userId, document.id, note, me, ticket.id)
            setMode(null)
            toast.success(ticket.resolvedAt || !entry ? `Update requested for ${label}` : `Asked for an updated ${label}`, {
              description: ticket.resolvedAt ? "This ticket is resolved, so a new one was raised." : undefined,
            })
          }}
        />
      ) : (entry?.note || document.reviewNote) && (status === "rejected" || awaiting) ? (
        <RowNote tone={status === "rejected" ? "danger" : "warning"}>
          {status === "rejected" ? "Changes requested" : status === "missing" ? "Requested" : "Update requested"}: {entry?.note ?? document.reviewNote}
        </RowNote>
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
          Request document
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
