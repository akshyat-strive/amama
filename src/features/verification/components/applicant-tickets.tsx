"use client"

import * as React from "react"
import {
  BadgeCheckIcon,
  ChevronLeftIcon,
  FilePlusIcon,
  InboxIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  UploadCloudIcon,
  UploadIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { OnWhite } from "@/components/ui/column-card"
import { StatusPill } from "@/features/admin/review-ui"
import {
  Composer,
  FilePreview,
  Timeline,
  documentStatus,
  formatDate,
  itemKind,
  owesUpload,
  ticketOrigin,
  ticketStatus,
  timeAgo,
  useDocumentLabel,
} from "@/features/verification/components/kyc-ticket-parts"
import { ticketComments } from "@/features/verification/kyc-store"
import type { KycApplication, KycTicket, KycTicketOrigin } from "@/features/verification/kyc-types"

const ORIGIN_ICON: Record<KycTicketOrigin, LucideIcon> = {
  onboarding: ShieldCheckIcon,
  applicant: UploadCloudIcon,
  staff: FilePlusIcon,
}

/** The last thing that happened on a ticket — what the list sorts by. */
function lastActivity(application: KycApplication, ticket: KycTicket) {
  return ticketComments(application, ticket.id).reduce((latest, entry) => (entry.at > latest ? entry.at : latest), ticket.resolvedAt ?? ticket.openedAt)
}

function TicketIcon({ origin, active, size = "md" }: { origin: KycTicketOrigin; active?: boolean; size?: "md" | "lg" }) {
  const Icon = ORIGIN_ICON[origin]
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-full",
        size === "lg" ? "size-11" : "size-10",
        active ? "bg-sun text-sun-foreground" : origin === "staff" ? "bg-status-warning/15 text-status-warning" : "bg-amama-subtle text-amama-deep"
      )}
    >
      <Icon className="size-[18px]" />
    </span>
  )
}

/**
 * Every KYC ticket on the account, as a chat-style list: open and in
 * progress first, resolved ones behind the toggle. Each row says where it
 * came from, how many documents, and whose move it is.
 */
function TicketListColumn({
  application,
  selectedId,
  onSelect,
  className,
  switcher,
}: {
  application: KycApplication
  selectedId: string | null
  onSelect: (id: string) => void
  className?: string
  switcher?: React.ReactNode
}) {
  const [filter, setFilter] = React.useState<"active" | "resolved">("active")
  const sorted = application.tickets
    .map((ticket) => ({ ticket, last: lastActivity(application, ticket) }))
    .sort((a, b) => b.last.localeCompare(a.last))
  const active = sorted.filter(({ ticket }) => ticket.status !== "resolved")
  const resolved = sorted.filter(({ ticket }) => ticket.status === "resolved")
  const visible = filter === "active" ? active : resolved
  // Waiting-on-you tickets float to the top of the open list.
  const ordered = filter === "active" ? [...visible].sort((a, b) => Number(b.ticket.status === "waiting") - Number(a.ticket.status === "waiting")) : visible

  return (
    <OnWhite>
      <section aria-label="KYC tickets" className={cn("min-w-0 flex-col overflow-hidden rounded-[24px] bg-background p-2", className)}>
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-3 pt-1 pb-3">
          <h2 className="text-[28px] font-semibold tracking-[-0.025em]">Tickets</h2>
          {switcher}
        </header>
        <div className="shrink-0 px-3 pb-2">
          <ButtonGroup
            label="Ticket status"
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "active", label: `Open · ${active.length}` },
              { value: "resolved", label: `Resolved · ${resolved.length}` },
            ]}
          />
        </div>
        <div aria-hidden className="mx-3 h-px shrink-0 bg-border" />
        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {ordered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <span aria-hidden className="grid size-12 place-items-center rounded-full bg-card text-muted-foreground">
                <InboxIcon className="size-5" />
              </span>
              <p className="text-[14px] font-semibold">{filter === "active" ? "Nothing open" : "No resolved tickets yet"}</p>
              <p className="max-w-60 text-[12.5px] leading-relaxed text-muted-foreground">
                {application.tickets.length === 0
                  ? "Your first ticket opens when you submit your documents for review."
                  : filter === "active"
                    ? "Update a document and submit it, and a new ticket opens here."
                    : "Tickets move here once every document on them is approved."}
              </p>
            </div>
          ) : (
            <ul className="flex flex-col">
              {ordered.map(({ ticket, last }) => {
                const on = ticket.id === selectedId
                const status = ticketStatus[ticket.status]
                const waiting = ticket.status === "waiting"
                return (
                  <li key={ticket.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(ticket.id)}
                      aria-current={on ? "true" : undefined}
                      className={cn(
                        "chat-row flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-start transition-colors [--row-inset:3.875rem]",
                        on ? "bg-amama text-white" : "hover:bg-card"
                      )}
                    >
                      <TicketIcon origin={ticket.origin} active={on} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={cn("truncate text-[13.5px]", waiting && !on ? "font-bold" : "font-semibold")}>{ticket.title}</span>
                          <span className={cn("shrink-0 text-[11px]", on ? "text-white/70" : "text-muted-foreground")}>{timeAgo(last)}</span>
                        </span>
                        <span className={cn("block truncate text-[12.5px]", on ? "text-white/75" : "text-muted-foreground")}>
                          {ticketOrigin[ticket.origin].applicantLabel} · {ticket.items.length} document{ticket.items.length === 1 ? "" : "s"}
                        </span>
                        <span className={cn("mt-1 flex items-center gap-1.5 text-[11.5px]", on ? "text-white/80" : waiting ? "font-semibold text-destructive" : "text-muted-foreground")}>
                          <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", on ? "bg-white/80" : status.dot)} />
                          <span className="truncate">{status.applicantLabel}</span>
                          <span aria-hidden>·</span>
                          <span className={cn("shrink-0 font-mono text-[11px]", !on && "font-normal text-muted-foreground")}>{ticket.id}</span>
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    </OnWhite>
  )
}

/**
 * One ticket, opened: how far along it is, who has it, every document on
 * it with the KAM's note and the upload it's about, and the conversation.
 */
function TicketDetailColumn({
  application,
  ticket,
  className,
  onBack,
  onClose,
  onUpload,
  onSend,
}: {
  application: KycApplication
  ticket: KycTicket
  className?: string
  onBack: () => void
  onClose: () => void
  onUpload: (docId: string) => void
  onSend: (text: string, docId: string | null) => void
}) {
  const labelOf = useDocumentLabel()
  const [docId, setDocId] = React.useState<string | null>(null)
  const status = ticketStatus[ticket.status]
  const comments = ticketComments(application, ticket.id)
  const resolved = ticket.status === "resolved"
  const docs = ticket.items.map((entry) => {
    const document = application.documents.find((candidate) => candidate.id === entry.docId) ?? null
    return { entry, document, label: document ? labelOf(document).label : "Removed document" }
  })
  const labelFor = (id: string) => docs.find((row) => row.entry.docId === id)?.label ?? null
  const owed = ticket.items.filter((entry) => owesUpload(entry.status)).length
  const stage = resolved ? 2 : ticket.status === "in-progress" ? 1 : ticket.status === "waiting" && ticket.items.some((entry) => entry.versionId) ? 1 : 0
  const last = comments.at(-1)?.at ?? ticket.openedAt

  return (
    <OnWhite>
      <section aria-label={`Ticket ${ticket.id}`} className={cn("min-w-0 flex-col overflow-hidden rounded-[24px] bg-background p-2 animate-in fade-in slide-in-from-right-3 duration-300", className)}>
        <header className="flex shrink-0 items-center gap-2.5 px-2 pt-1.5 pb-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to tickets"
            className="grid size-9 shrink-0 place-items-center rounded-xl text-foreground/75 transition-colors hover:bg-muted 2xl:hidden"
          >
            <ChevronLeftIcon className="size-5 rtl:-scale-x-100" />
          </button>
          <TicketIcon origin={ticket.origin} />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[17px] leading-tight font-semibold tracking-[-0.02em]">{ticket.title}</h2>
            <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
              <span className="font-mono">{ticket.id}</span> · {ticketOrigin[ticket.origin].applicantLabel}
            </p>
          </div>
          <StatusPill tone={status.tone} className="max-sm:hidden">
            {status.applicantLabel}
          </StatusPill>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close ticket"
            className="hidden size-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground 2xl:grid"
          >
            <XIcon className="size-4" />
          </button>
        </header>
        <div aria-hidden className="mx-3 h-px shrink-0 bg-border" />

        <div data-scroll-root className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 pt-3 pb-2">
          <Progress stage={stage} waiting={ticket.status === "waiting"} />

          {owed > 0 && !resolved ? (
            <p className="mt-3 rounded-2xl bg-status-warning/12 px-3.5 py-2.5 text-[13px] leading-relaxed">
              <span className="font-semibold">Waiting on you.</span> Upload {owed === 1 ? "the document" : `the ${owed} documents`} below and this ticket goes straight back to {ticket.assignee?.name ?? "your KAM"}.
            </p>
          ) : null}

          <dl className="mt-3 grid grid-cols-2 gap-2">
            <Fact label="Assigned to">
              {ticket.assignee ? (
                <span className="flex items-center gap-2">
                  <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full bg-amama-deep text-[10.5px] font-bold text-white">
                    {ticket.assignee.name.charAt(0)}
                  </span>
                  <span className="truncate">{ticket.assignee.name}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">Being assigned</span>
              )}
            </Fact>
            <Fact label="Raised by">{ticket.openedBy.kind === "applicant" ? "You" : ticket.openedBy.name}</Fact>
            <Fact label="Opened">{formatDate(ticket.openedAt)}</Fact>
            <Fact label={resolved ? "Resolved" : "Last update"}>
              {resolved && ticket.resolvedAt ? `${formatDate(ticket.resolvedAt)}${ticket.resolvedBy?.name ? ` · ${ticket.resolvedBy.name}` : ""}` : timeAgo(last)}
            </Fact>
          </dl>

          <h3 className="mt-5 px-1.5 text-[13px] font-semibold">
            Documents <span className="font-normal text-muted-foreground tabular-nums">{ticket.items.length}</span>
          </h3>
          <ul className="mt-2 flex flex-col gap-2">
            {docs.map(({ entry, document, label }) => {
              const version = document?.versions.find((candidate) => candidate.id === entry.versionId) ?? null
              const style = documentStatus[entry.status]
              const owes = owesUpload(entry.status) && !resolved
              return (
                <li key={entry.docId} className={cn("rounded-[18px] p-3.5", owes ? "bg-status-warning/10" : "bg-card")}>
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-xl",
                        entry.status === "approved" ? "bg-amama-subtle text-amama-deep" : owes ? "bg-status-warning/15 text-status-warning" : "bg-background text-muted-foreground"
                      )}
                    >
                      {entry.status === "approved" ? <BadgeCheckIcon className="size-4" /> : entry.kind === "new" ? <FilePlusIcon className="size-4" /> : entry.kind === "update" ? <RefreshCwIcon className="size-4" /> : <UploadIcon className="size-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold">{label}</p>
                      <p className="text-[12px] text-muted-foreground">{itemKind[entry.kind]}</p>
                    </div>
                    <StatusPill tone={owes ? "warning" : style.tone}>{entry.status === "missing" ? "Needs filling" : style.label}</StatusPill>
                  </div>
                  {entry.note ? (
                    <p className="mt-2.5 rounded-xl bg-background px-3 py-2 text-[13px] leading-relaxed">
                      {entry.requestedBy || entry.reviewedBy ? <span className="font-semibold">{(entry.status === "rejected" ? entry.reviewedBy?.name : entry.requestedBy?.name) ?? entry.reviewedBy?.name}: </span> : null}
                      {entry.note}
                    </p>
                  ) : null}
                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 text-[12px] text-muted-foreground">
                      {version ? (
                        <span className="inline-flex max-w-full items-center gap-1">
                          Submitted <FilePreview version={version} title={label} />
                        </span>
                      ) : (
                        "Nothing uploaded yet"
                      )}
                      {entry.reviewedBy && entry.status === "approved" ? ` · approved by ${entry.reviewedBy.name}` : ""}
                    </span>
                    {owes ? (
                      <Button size="sm" onClick={() => onUpload(entry.docId)}>
                        <UploadIcon />
                        Upload
                      </Button>
                    ) : !resolved && entry.status === "pending" && document ? (
                      <Button size="sm" variant="secondary" onClick={() => onUpload(entry.docId)} className="h-8 rounded-[10px] px-3 text-[12.5px]">
                        <RefreshCwIcon className="size-3.5" />
                        Replace
                      </Button>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>

          <h3 className="mt-5 px-1.5 text-[13px] font-semibold">
            Activity <span className="font-normal text-muted-foreground tabular-nums">{comments.length}</span>
          </h3>
          <div className="-mx-2">
            <Timeline comments={comments} labelFor={labelFor} viewer="applicant" />
          </div>
        </div>

        {resolved ? (
          <p className="mx-1 mt-1 shrink-0 rounded-2xl bg-card px-4 py-3 text-[12.5px] leading-relaxed text-muted-foreground">
            Resolved. If anything changes later, update the document from your list and submit — a new ticket opens.
          </p>
        ) : (
          <div className="-mx-2 -mb-2 shrink-0">
            <Composer
              placeholder={`Message ${ticket.assignee?.name ?? "your KAM"} about this ticket…`}
              generalLabel="This ticket"
              documents={docs.map((row) => ({ id: row.entry.docId, label: row.label }))}
              docId={docId}
              onDocChange={setDocId}
              onSend={(text, about) => onSend(text, about)}
            />
          </div>
        )}
      </section>
    </OnWhite>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl bg-card px-3 py-2.5">
      <dt className="text-[11.5px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-[13px] font-medium">{children}</dd>
    </div>
  )
}

/** Raised, in review, resolved — the waiting step turns amber when it's
 *  the applicant's move. */
function Progress({ stage, waiting }: { stage: number; waiting: boolean }) {
  return (
    <ol aria-label="Progress" className="grid grid-cols-3 gap-2 px-1">
      {["Raised", "In review", "Resolved"].map((label, index) => {
        const done = index <= stage
        const next = index === stage + 1
        return (
          <li key={label} className="flex flex-col gap-1.5" aria-current={index === stage ? "step" : undefined}>
            <span aria-hidden className={cn("h-1.5 rounded-full", done ? "bg-amama-deep" : next ? (waiting ? "bg-status-warning" : "bg-amama/40") : "bg-muted")} />
            <span className={cn("text-[12px]", done ? "font-medium text-foreground" : "text-muted-foreground")}>{label}</span>
          </li>
        )
      })}
    </ol>
  )
}

export { TicketListColumn, TicketDetailColumn }
