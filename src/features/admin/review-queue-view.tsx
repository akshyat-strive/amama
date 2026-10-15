"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon, ChevronRightIcon, EllipsisIcon, FilePlusIcon, FileTextIcon, MessageSquareIcon, PlusIcon, RefreshCwIcon, RotateCcwIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import { hasPermission } from "@/features/admin/permissions"
import {
  Initials,
  RequestNote,
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
 * One KYC ticket, staff side, laid out around the one decision it asks
 * for. At the top: how far the documents are and the button that settles
 * the ticket. Then the documents, each with plain approve / request
 * changes buttons and a menu for the rest. Beside it: who the applicant
 * is and who owns the ticket. Below: the conversation. Read-only for
 * staff without `onboarding.review`.
 */
function SubmissionCard({ submission, ticketId, onOpenTicket }: { submission: KycApplication; ticketId?: string; onOpenTicket?: (id: string) => void }) {
  const admin = useCurrentAdmin()
  const users = useUsers()
  const roles = useRoles()
  const labelOf = useDocumentLabel()
  const [sendingBack, setSendingBack] = React.useState(false)
  const [askingForDoc, setAskingForDoc] = React.useState(false)
  const [showOthers, setShowOthers] = React.useState(false)
  const [docId, setDocId] = React.useState<string | null>(null)
  const conversationRef = React.useRef<HTMLElement>(null)

  const ticket = submission.tickets.find((entry) => entry.id === ticketId) ?? submission.tickets.find((entry) => entry.origin === "onboarding") ?? null
  if (!admin) return null
  if (!ticket) return <p className="rounded-2xl bg-card px-4 py-6 text-center text-[13px] text-muted-foreground">This applicant hasn&apos;t submitted anything yet.</p>

  const me: StaffActor = { id: admin.user.id, name: admin.user.name, title: admin.role.name }
  const canAct = admin.can("onboarding.review")
  const onboarding = ticket.origin === "onboarding"
  const resolved = !!ticket.resolvedAt
  const canReview = canAct && !resolved
  const canAssign = admin.can("onboarding.assign")
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
  const settle = () => {
    if (onboarding) {
      approveApplication(submission.role, submission.userId, me)
      toast.success(`${name} approved`)
    } else {
      resolveKycTicket(submission.role, submission.userId, ticket.id, me)
      toast.success(`${ticket.id} resolved`)
    }
  }

  const owner =
    canAssign && !resolved ? (
      <Select
        items={Object.fromEntries([["none", "Unassigned"], ...reviewers.map((user) => [user.id, user.name])])}
        value={ticket.assignee?.id ?? "none"}
        onValueChange={(value) => {
          const next = reviewers.find((user) => user.id === value) ?? null
          assign(next ? { id: next.id, name: next.name } : null)
        }}
      >
        <SelectTrigger size="sm" aria-label="Ticket owner" className="-me-2 h-8 border-transparent bg-transparent text-[13.5px] font-medium shadow-none hover:bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="none">Unassigned</SelectItem>
          {reviewers.map((user) => (
            <SelectItem key={user.id} value={user.id}>
              {user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    ) : canReview && ticket.assignee?.id !== me.id ? (
      <button type="button" onClick={() => assign(me)} className="text-[13.5px] font-medium text-amama-deep hover:underline">
        {ticket.assignee ? `${ticket.assignee.name} · take over` : "Take this ticket"}
      </button>
    ) : (
      <span className={cn("text-[13.5px] font-medium", !ticket.assignee && "text-muted-foreground")}>{ticket.assignee?.name ?? "Unassigned"}</span>
    )

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px]">
      {/* Who and what — beside the work on wide screens, after it on a phone. */}
      <aside className="order-2 flex min-w-0 flex-col gap-3 lg:sticky lg:top-0">
        <div className="rounded-[20px] bg-card p-4">
          <div className="flex items-center gap-3">
            <Initials name={name} className="size-11 text-[13px]" />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold">{name}</p>
              <p className="truncate text-[12.5px] text-muted-foreground">{submission.companyName && submission.companyName !== name ? submission.companyName : submission.email}</p>
            </div>
          </div>
          <dl className="divide-inset mt-3 rounded-2xl bg-background">
            <Fact label="Account">{describeApplicant(submission)}</Fact>
            <Fact label="Type">{ticketOrigin[ticket.origin].label}</Fact>
            <Fact label="Opened">
              {timeAgo(ticket.openedAt)} by {ticket.openedBy.kind === "applicant" ? "applicant" : ticket.openedBy.name}
            </Fact>
            <Fact label="Owner">{owner}</Fact>
            {accountKam && !onboarding ? <Fact label="Account KAM">{accountKam.name}</Fact> : null}
            <Fact label="Ticket">
              <span className="font-mono text-[12.5px]">{ticket.id}</span>
            </Fact>
          </dl>
        </div>

        {otherTickets.length > 0 ? (
          <div className="rounded-[20px] bg-card p-1.5">
            <p className="px-2.5 pt-1.5 pb-2 text-[13px] font-semibold">Other tickets</p>
            <ul className="divide-inset rounded-2xl bg-background">
              {otherTickets.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    disabled={!onOpenTicket}
                    onClick={() => onOpenTicket?.(entry.id)}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-start transition-colors hover:bg-card/60 disabled:pointer-events-none"
                  >
                    <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", ticketStatus[entry.status].dot)} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{entry.title}</span>
                    <ChevronRightIcon aria-hidden className="size-4 shrink-0 text-muted-foreground/60 rtl:-scale-x-100" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </aside>

      <div className="order-1 flex min-w-0 flex-col gap-5">
        {/* The decision. */}
        <section aria-label="Decision" className="rounded-[20px] bg-card p-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold">
                {resolved ? (onboarding ? "Approved" : "Resolved") : `${approvedItems} of ${ticket.items.length} document${ticket.items.length === 1 ? "" : "s"} approved`}
              </p>
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {resolved
                  ? `${ticket.resolvedBy ? `By ${ticket.resolvedBy.name} · ` : ""}${ticket.resolvedAt ? formatDate(ticket.resolvedAt) : ""}`
                  : ready
                    ? onboarding
                      ? "Everything needed is in. Approving accepts every document under review."
                      : "Nothing is owed. Resolving accepts every document under review."
                    : `${reason.charAt(0).toUpperCase()}${reason.slice(1)}.`}
              </p>
              {!resolved && ticket.items.length > 0 ? (
                <div aria-hidden className="mt-3 flex gap-1">
                  {ticket.items.map((entry) => (
                    <span key={entry.docId} className={cn("h-1.5 flex-1 rounded-full", entry.status === "approved" ? "bg-amama-deep" : "bg-foreground/10")} />
                  ))}
                </div>
              ) : null}
            </div>
            {canReview ? (
              <div className="flex shrink-0 items-center gap-2 max-sm:w-full">
                {onboarding ? (
                  <Button size="sm" variant="outline" className="max-sm:flex-1" onClick={() => setSendingBack((value) => !value)}>
                    Send back
                  </Button>
                ) : null}
                <Button size="sm" className="max-sm:flex-1" disabled={!ready} onClick={settle}>
                  <CheckIcon />
                  {onboarding ? "Approve" : "Resolve"}
                </Button>
              </div>
            ) : resolved ? (
              <span className="grid size-9 place-items-center rounded-full bg-amama-deep text-white">
                <CheckIcon aria-hidden className="size-4" />
              </span>
            ) : null}
          </div>

          {onboarding && sendingBack ? (
            <div className="mt-3 overflow-hidden rounded-2xl bg-background">
              <RequestNote
                id={`note-${submission.userId}`}
                prompt="What needs fixing before this can be approved?"
                placeholder="The company name on the trade licence doesn't match the one you registered with."
                submitLabel="Send back"
                onCancel={() => setSendingBack(false)}
                onSubmit={(note) => {
                  requestApplicationChanges(submission.role, submission.userId, note, me)
                  setSendingBack(false)
                }}
              />
            </div>
          ) : onboarding && submission.reviewerNote ? (
            <p className="mt-3 flex gap-2 rounded-2xl bg-background px-3.5 py-2.5 text-[13px] leading-relaxed">
              <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-status-warning" />
              <span>
                <span className="font-semibold">Sent back:</span> {submission.reviewerNote}
              </span>
            </p>
          ) : null}
        </section>

        {/* The documents. */}
        <section aria-label="Documents">
          <h3 className="px-1.5 pb-2 text-[15px] font-semibold">
            Documents <span className="font-normal text-muted-foreground tabular-nums">{ticket.items.length}</span>
          </h3>
          <div className="divide-inset overflow-hidden rounded-[20px] bg-card">
            {ticket.items.length === 0 ? <p className="px-4 py-5 text-center text-[13px] text-muted-foreground">No documents on this ticket.</p> : null}
            {ticket.items.map((entry) => {
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
            })}
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
                  className="flex w-full items-center gap-2.5 px-4 py-3.5 text-start text-[13.5px] font-medium text-amama-deep transition-colors hover:bg-background/60"
                >
                  <PlusIcon aria-hidden className="size-4" />
                  Ask for another document
                </button>
              )
            ) : null}
          </div>

          {others.length > 0 ? (
            <div className="mt-3">
              <button
                type="button"
                aria-expanded={showOthers}
                onClick={() => setShowOthers((value) => !value)}
                className="flex w-full items-center gap-1.5 px-1.5 py-1 text-start text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Already on file
                <span className="tabular-nums">{others.length}</span>
                <ChevronDownIcon aria-hidden className={cn("size-4 transition-transform", showOthers && "rotate-180")} />
              </button>
              {showOthers ? (
                <div className="divide-inset mt-2 overflow-hidden rounded-[20px] bg-card">
                  {others.map((document) => (
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
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* The conversation. */}
        <section ref={conversationRef} aria-label="Conversation">
          <h3 className="px-1.5 pb-2 text-[15px] font-semibold">
            Conversation <span className="font-normal text-muted-foreground tabular-nums">{comments.filter((entry) => entry.author.kind !== "system").length}</span>
          </h3>
          <div className="overflow-hidden rounded-[20px] bg-card">
            <div className="max-h-[420px] overflow-y-auto">
              <Timeline comments={comments} labelFor={labelForId} viewer="staff" />
            </div>
            {canAct ? (
              <Composer
                placeholder={`Message ${name.split(" ")[0]}…`}
                generalLabel="This ticket"
                documents={submission.documents.map((document) => ({ id: document.id, label: labelOf(document).label }))}
                docId={docId}
                onDocChange={setDocId}
                onSend={(text, about) => addStaffComment(submission.role, submission.userId, text, about, me, ticket.id)}
              />
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 px-3.5 py-2">
      <dt className="shrink-0 text-[13px] text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-end text-[13.5px] font-medium">{children}</dd>
    </div>
  )
}

/**
 * One document, as it stands on this ticket (`entry`) or — for the rest
 * of what's on file — on its own. The two decisions a reviewer makes are
 * plain buttons; everything rarer (asking for an update, withdrawing a
 * request, commenting) sits in the row's menu.
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
  const decidable = canReview && !!entry && !awaiting
  const canWithdraw = canReview && !!entry && awaiting
  const canAskUpdate = canAct && document.versions.length > 0 && status !== "update-requested"
  const reviewed = entry?.reviewedBy ?? document.reviewedBy

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 px-4 py-3.5">
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-xl bg-background text-foreground/70">
          {status === "missing" ? <FilePlusIcon className="size-[18px]" /> : status === "update-requested" ? <RefreshCwIcon className="size-[18px]" /> : <FileTextIcon className="size-[18px]" />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[14px] font-semibold">{label}</span>
            <StatusPill tone={style.tone} className="bg-background">
              {status === "missing" ? "Awaiting upload" : style.label}
            </StatusPill>
          </p>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-[12.5px] text-muted-foreground">
            {version ? (
              <FilePreview version={version} title={label} />
            ) : (
              <span>Requested by {entry?.requestedBy?.name ?? document.requestedBy?.name ?? "the team"} · not uploaded yet</span>
            )}
            {expiry ? (
              <span className={cn(expiring === "soon" && "font-medium text-status-warning", expiring === "expired" && "font-medium text-destructive")}>
                · {expiring === "expired" ? "Expired" : "Expires"} {formatDate(expiry)}
              </span>
            ) : null}
            {reviewed && status !== "pending" && !awaiting ? (
              <span>
                · {status === "approved" ? "Approved" : "Sent back"} by {reviewed.name}
              </span>
            ) : null}
          </div>
          <VersionHistory document={document} title={label} />
        </div>

        <div className="flex shrink-0 items-center gap-1.5 max-sm:w-full max-sm:justify-end">
          {decidable && status !== "approved" ? (
            <>
              {status !== "rejected" ? (
                <Button size="sm" variant="outline" onClick={() => setMode((current) => (current === "changes" ? null : "changes"))}>
                  Request changes
                </Button>
              ) : null}
              <Button size="sm" onClick={() => setDocumentStatus(submission.role, submission.userId, document.id, "approved", null, me, ticket.id)}>
                Approve
              </Button>
            </>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={`More for ${label}`}
              className="relative grid size-9 place-items-center rounded-[10px] text-muted-foreground outline-none transition-colors hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <EllipsisIcon aria-hidden className="size-4" />
              {comments > 0 ? <span aria-hidden className="absolute end-1.5 top-1.5 size-1.5 rounded-full bg-amama-deep" /> : null}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52 p-1">
              <DropdownMenuItem onClick={onComment} className="gap-2 py-2 text-[13.5px]">
                <MessageSquareIcon aria-hidden className="size-4" />
                Comment{comments > 0 ? ` · ${comments}` : ""}
              </DropdownMenuItem>
              {decidable && status === "approved" ? (
                <DropdownMenuItem onClick={() => setMode("changes")} className="gap-2 py-2 text-[13.5px]">
                  <RotateCcwIcon aria-hidden className="size-4" />
                  Request changes
                </DropdownMenuItem>
              ) : null}
              {canAskUpdate ? (
                <DropdownMenuItem onClick={() => setMode("update")} className="gap-2 py-2 text-[13.5px]">
                  <RefreshCwIcon aria-hidden className="size-4" />
                  Ask for an updated copy
                </DropdownMenuItem>
              ) : null}
              {canWithdraw ? (
                <DropdownMenuItem onClick={() => withdrawRequest(submission.role, submission.userId, document.id, me)} className="gap-2 py-2 text-[13.5px]">
                  <XIcon aria-hidden className="size-4" />
                  Withdraw request
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {mode === "changes" ? (
        <div className="px-3 pb-3">
          <div className="overflow-hidden rounded-2xl bg-background">
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
          </div>
        </div>
      ) : mode === "update" ? (
        <div className="px-3 pb-3">
          <div className="overflow-hidden rounded-2xl bg-background">
            <RequestNote
              id={`doc-update-${submission.userId}-${document.id}`}
              prompt={`Why does ${label} need updating?`}
              placeholder={expiry ? `It expires on ${formatDate(expiry)} — please upload the renewed one.` : "The details have changed — please upload a current copy."}
              submitLabel="Ask for update"
              onCancel={() => setMode(null)}
              onSubmit={(note) => {
                requestDocumentUpdate(submission.role, submission.userId, document.id, note, me, ticket.id)
                setMode(null)
                toast.success(ticket.resolvedAt || !entry ? `Update requested for ${label}` : `Asked for an updated ${label}`, {
                  description: ticket.resolvedAt ? "This ticket is resolved, so a new one was raised." : undefined,
                })
              }}
            />
          </div>
        </div>
      ) : (entry?.note || document.reviewNote) && (status === "rejected" || awaiting) ? (
        <p className="mx-4 mb-3.5 ms-[4.25rem] rounded-xl bg-background px-3 py-2 text-[13px] leading-relaxed">
          <span className="font-medium">{status === "rejected" ? "Changes requested" : status === "missing" ? "Requested" : "Update requested"}:</span> {entry?.note ?? document.reviewNote}
        </p>
      ) : null}
    </div>
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

export { SubmissionCard, applicationStatus }
