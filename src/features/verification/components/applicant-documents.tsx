"use client"

import * as React from "react"
import {
  AlertTriangleIcon,
  BadgeCheckIcon,
  ChevronRightIcon,
  FilePlusIcon,
  FileTextIcon,
  RefreshCwIcon,
  SendIcon,
  UploadIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { OnWhite } from "@/components/ui/column-card"
import { StatusPill, type Tone } from "@/features/admin/review-ui"
import {
  FilePreview,
  VersionHistory,
  daysUntil,
  expiryOf,
  expiryState,
  formatDate,
  timeAgo,
  useDocumentLabel,
} from "@/features/verification/components/kyc-ticket-parts"
import { openTicketFor } from "@/features/verification/kyc-store"
import type { KycApplication, KycDocument, KycTicket } from "@/features/verification/kyc-types"

/** What the applicant owes on one document, if anything — a KAM's
 *  request, a send-back, or an expiry nobody has chased yet. */
type ActionNeeded = {
  icon: LucideIcon
  title: string
  text: string
  by: string | null
  at: string | null
  cta: string
  danger: boolean
}

function actionFor(document: KycDocument, label: string): ActionNeeded | null {
  const expiry = expiryOf(document)
  if (document.reviewStatus === "missing") {
    return {
      icon: FilePlusIcon,
      title: "Needs upload",
      text: document.reviewNote ?? (document.hint ? `${document.hint}.` : `Please upload your ${label}.`),
      by: document.requestedBy?.name ?? null,
      at: document.requestedBy?.at ?? null,
      cta: "Upload",
      danger: false,
    }
  }
  if (document.reviewStatus === "update-requested") {
    return {
      icon: RefreshCwIcon,
      title: expiryState(expiry) === "expired" ? "Expired" : "Update requested",
      text: document.reviewNote ?? `Please upload a current ${label}.`,
      by: document.requestedBy?.name ?? null,
      at: document.requestedBy?.at ?? null,
      cta: "Update",
      danger: expiryState(expiry) === "expired",
    }
  }
  if (document.reviewStatus === "rejected") {
    return {
      icon: AlertTriangleIcon,
      title: "Changes requested",
      text: document.reviewNote ?? "Please upload this again.",
      by: document.reviewedBy?.name ?? null,
      at: document.reviewedBy?.at ?? null,
      cta: "Re-upload",
      danger: true,
    }
  }
  if (document.reviewStatus === "approved" && expiryState(expiry) === "expired" && expiry) {
    return {
      icon: AlertTriangleIcon,
      title: "Expired",
      text: `This expired on ${formatDate(expiry)}. Upload a current copy to keep your account in good standing.`,
      by: null,
      at: null,
      cta: "Update",
      danger: true,
    }
  }
  return null
}

/** The pill on a document that doesn't need anything from the applicant. */
function standing(document: KycDocument, staged: boolean): { label: string; tone: Tone } {
  if (staged) return { label: "Change staged", tone: "info" }
  if (document.reviewStatus === "pending") return { label: "In review", tone: "warning" }
  const expiry = expiryOf(document)
  if (expiryState(expiry) === "soon" && expiry) {
    const days = daysUntil(expiry)
    return { label: `Expires in ${days} day${days === 1 ? "" : "s"}`, tone: "warning" }
  }
  return { label: "Approved", tone: "success" }
}

/**
 * The left column of the applicant's KYC page: where the account stands,
 * every document that needs something pinned on top as an alert, the
 * changes they've picked but not sent, and everything on file — each with
 * its own Update.
 */
function DocumentsColumn({
  application,
  className,
  switcher,
  onUpload,
  onOpenTicket,
  onFinalise,
  onSubmitFirst,
  onDiscardDraft,
}: {
  application: KycApplication
  className?: string
  switcher?: React.ReactNode
  onUpload: (docId: string) => void
  onOpenTicket: (ticketId: string) => void
  onFinalise: () => void
  onSubmitFirst: () => void
  onDiscardDraft: (docId: string) => void
}) {
  const labelOf = useDocumentLabel()
  const staged = new Set(application.drafts.map((draft) => draft.docId))
  const rows = application.documents.map((document) => {
    const { label, hint } = labelOf(document)
    return { document, label, hint, action: staged.has(document.id) ? null : actionFor(document, label), ticket: openTicketFor(application, document.id) }
  })
  const needs = rows.filter((row) => row.action)
  const onFile = rows.filter((row) => !row.action)
  const inReview = application.documents.filter((document) => document.reviewStatus === "pending").length
  const notSubmitted = application.reviewStatus === "not-submitted"
  const missingRequired = application.documents.filter((document) => document.required && document.versions.length === 0).length

  return (
    <OnWhite>
      <section aria-label="Documents" className={cn("min-w-0 flex-col overflow-hidden rounded-[24px] bg-background p-2", className)}>
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-3 pt-1 pb-3">
          <h1 className="text-[28px] font-semibold tracking-[-0.025em]">Documents</h1>
          {switcher}
        </header>
        <div aria-hidden className="mx-3 h-px shrink-0 bg-border" />

        <div data-scroll-root className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-1.5 pt-3 pb-2">
          <AccountSummary application={application} needs={needs.length} inReview={inReview} onFile={application.documents.filter((document) => document.versions.length > 0).length} />

          {application.drafts.length > 0 ? (
            <section aria-label="Pending changes" className="mt-5">
              <SectionTitle icon={UploadIcon} tone="text-foreground/70">
                Ready to submit <Count>{application.drafts.length}</Count>
              </SectionTitle>
              <ul className="mt-2 flex flex-col gap-1.5">
                {application.drafts.map((draft) => {
                  const document = application.documents.find((entry) => entry.id === draft.docId)
                  if (!document) return null
                  const { label } = labelOf(document)
                  return (
                    <li key={draft.docId} className="flex items-center gap-3 rounded-2xl bg-card px-3 py-2.5">
                      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-background text-foreground/75">
                        <FileTextIcon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold">{label}</span>
                        <span className="block truncate text-[12px] text-muted-foreground">
                          <FilePreview version={draft.version} title={`${label} · new`} />
                          {draft.version.expiresAt ? ` · valid until ${formatDate(draft.version.expiresAt)}` : ""} · replaces v{document.versions.length}
                        </span>
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => onUpload(draft.docId)}>
                        Change
                      </Button>
                      <button
                        type="button"
                        onClick={() => onDiscardDraft(draft.docId)}
                        aria-label={`Discard the new ${label}`}
                        className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                      >
                        <XIcon className="size-4" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}

          <section aria-label="Your documents" className="mt-5">
            <SectionTitle icon={FileTextIcon} tone="text-muted-foreground">
              {notSubmitted ? "Your documents" : "Documents"} <Count>{rows.length}</Count>
              {needs.length > 0 ? <span className="ms-auto text-[12.5px] font-medium text-status-warning">{needs.length} need{needs.length === 1 ? "s" : ""} your attention</span> : null}
            </SectionTitle>
            <ul className="mt-1">
              {[...needs, ...onFile].map(({ document, label, hint, action, ticket }) => (
                <DocumentRow
                  key={document.id}
                  document={document}
                  label={label}
                  hint={hint}
                  action={action}
                  ticket={ticket}
                  staged={staged.has(document.id)}
                  notSubmitted={notSubmitted}
                  onUpload={() => onUpload(document.id)}
                  onOpenTicket={onOpenTicket}
                />
              ))}
            </ul>
          </section>
        </div>

        {notSubmitted ? (
          <FooterBar
            text={missingRequired > 0 ? `${missingRequired} required document${missingRequired === 1 ? "" : "s"} still to upload` : "Everything required is uploaded"}
            action={
              <Button size="sm" disabled={missingRequired > 0} onClick={onSubmitFirst}>
                <SendIcon />
                Submit for review
              </Button>
            }
          />
        ) : application.drafts.length > 0 ? (
          <FooterBar
            text={`${application.drafts.length} change${application.drafts.length === 1 ? "" : "s"} ready — nothing is sent until you submit`}
            action={
              <Button size="sm" onClick={onFinalise}>
                <SendIcon />
                Finalise & submit
              </Button>
            }
          />
        ) : null}
      </section>
    </OnWhite>
  )
}

function AccountSummary({ application, needs, inReview, onFile }: { application: KycApplication; needs: number; inReview: number; onFile: number }) {
  const status =
    application.reviewStatus === "approved"
      ? { label: "Verified", dot: "bg-amama-deep" }
      : application.reviewStatus === "changes-requested"
        ? { label: "Changes requested", dot: "bg-status-warning" }
        : application.reviewStatus === "pending"
          ? { label: "In review", dot: "bg-status-warning" }
          : { label: "Not submitted", dot: "bg-muted-foreground/50" }

  return (
    <div className="rounded-[20px] bg-card p-2">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-2xl bg-background px-3 py-2.5">
          <dt className="text-[11.5px] text-muted-foreground">Status</dt>
          <dd className="mt-1 flex items-center gap-1.5 text-[15px] font-semibold tracking-[-0.01em]">
            <span aria-hidden className={cn("size-2 shrink-0 rounded-full", status.dot)} />
            {status.label}
          </dd>
        </div>
        <Stat label="On file" value={onFile} />
        <Stat label="Need action" value={needs} />
        <Stat label="In review" value={inReview} />
      </dl>
      {application.reviewerNote ? (
        <p className="mt-2 rounded-2xl bg-background px-3.5 py-2.5 text-[13px] leading-relaxed">
          <span className="font-semibold">{application.reviewedByName ?? "Your KAM"}:</span> {application.reviewerNote}
        </p>
      ) : null}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-2xl bg-background px-3 py-2.5">
      <dt className="text-[11.5px] text-muted-foreground">{label}</dt>
      <dd className={cn("text-[20px] font-semibold tracking-[-0.02em] tabular-nums", tone)}>{value}</dd>
    </div>
  )
}

function SectionTitle({ icon: Icon, tone, children }: { icon: LucideIcon; tone: string; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-1.5 px-1.5 text-[13px] font-semibold text-foreground">
      <Icon aria-hidden className={cn("size-4", tone)} />
      {children}
    </h2>
  )
}

function Count({ children }: { children: React.ReactNode }) {
  return <span className="ms-0.5 font-normal text-muted-foreground tabular-nums">{children}</span>
}

/**
 * One document, the same row whether it's fine or needs something: name,
 * the file on record, its status, and the button. When the applicant owes
 * something, the row gains a dot on its icon, a status in words, the
 * account manager's note and the ticket it sits on — and the button turns
 * primary. Nothing is split into a separate alert box.
 */
function DocumentRow({
  document,
  label,
  hint,
  action,
  ticket,
  staged,
  notSubmitted,
  onUpload,
  onOpenTicket,
}: {
  document: KycDocument
  label: string
  hint: string
  action: ActionNeeded | null
  ticket: KycTicket | null
  staged: boolean
  notSubmitted: boolean
  onUpload: () => void
  onOpenTicket: (ticketId: string) => void
}) {
  const current = document.versions.at(-1)
  const expiry = expiryOf(document)
  const expiring = expiryState(expiry)
  const verified = !action && document.reviewStatus === "approved" && expiring !== "soon"
  const pill = action
    ? { label: action.title, tone: (action.danger ? "danger" : "warning") as Tone }
    : notSubmitted && !current
      ? { label: document.required ? "To upload" : "Optional", tone: "neutral" as Tone }
      : standing(document, staged)
  const Icon = action ? action.icon : verified ? BadgeCheckIcon : FileTextIcon

  return (
    <li className="chat-row flex items-start gap-3 rounded-xl px-2 py-3.5 transition-colors [--row-inset:3.75rem] hover:bg-card">
      <span aria-hidden className={cn("relative grid size-10 shrink-0 place-items-center rounded-xl", verified ? "bg-amama-subtle text-amama-deep" : "bg-muted text-foreground/70")}>
        <Icon className="size-[18px]" />
        {action ? <span className={cn("absolute -end-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-background", action.danger ? "bg-destructive" : "bg-status-warning")} /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold">
              {label}
              {document.required ? null : <span className="font-normal text-muted-foreground"> · optional</span>}
            </p>
            {current ? <FilePreview version={current} title={label} /> : <p className="truncate text-[12.5px] text-muted-foreground">{hint || "Not uploaded yet"}</p>}
          </div>
          <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
        </div>

        {current ? (
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[12px] text-muted-foreground">
            <span className="tabular-nums">v{document.versions.length}</span>
            <span aria-hidden>·</span>
            <span>Uploaded {formatDate(current.uploadedAt)}</span>
            {expiry ? (
              <>
                <span aria-hidden>·</span>
                <span className={cn(expiring === "soon" && "font-medium text-status-warning", expiring === "expired" && "font-medium text-destructive")}>
                  {expiring === "expired" ? "Expired" : "Expires"} {formatDate(expiry)}
                </span>
              </>
            ) : null}
            {document.reviewedBy && document.reviewStatus === "approved" && !action ? (
              <>
                <span aria-hidden>·</span>
                <span>Approved by {document.reviewedBy.name}</span>
              </>
            ) : null}
          </p>
        ) : null}

        {action ? (
          <div className="mt-2.5 rounded-xl bg-card px-3 py-2.5">
            {action.by || action.at ? (
              <p className="text-[12px] text-muted-foreground">
                {action.by ? <span className="font-medium text-foreground">{action.by}</span> : null}
                {action.by && action.at ? " · " : null}
                {action.at ? timeAgo(action.at) : null}
              </p>
            ) : null}
            <p className="mt-0.5 text-[13px] leading-relaxed text-pretty text-foreground/85">{action.text}</p>
          </div>
        ) : null}

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <Button size="sm" variant={action ? "default" : "secondary"} onClick={onUpload} className="h-8 rounded-[10px] px-3 text-[12.5px]">
            {current ? <RefreshCwIcon className="size-3.5" /> : <UploadIcon className="size-3.5" />}
            {action ? action.cta : current ? (staged ? "Change" : "Update") : "Upload"}
          </Button>
          {ticket ? (
            <button
              type="button"
              onClick={() => onOpenTicket(ticket.id)}
              className="inline-flex h-8 items-center gap-0.5 rounded-[10px] px-2.5 font-mono text-[12px] text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              {ticket.id}
              <ChevronRightIcon aria-hidden className="size-3.5 rtl:-scale-x-100" />
            </button>
          ) : null}
          <span className="ms-auto">
            <VersionHistory document={document} title={label} />
          </span>
        </div>
      </div>
    </li>
  )
}

function FooterBar({ text, action }: { text: string; action: React.ReactNode }) {
  return (
    <div className="mt-2 flex shrink-0 flex-wrap items-center gap-3 rounded-[18px] bg-card px-4 py-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <p className="me-auto min-w-0 text-[13.5px] font-medium">{text}</p>
      {action}
    </div>
  )
}

export { DocumentsColumn }
