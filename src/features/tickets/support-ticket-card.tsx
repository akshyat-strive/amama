"use client"

import * as React from "react"
import Link from "next/link"
import { SendIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { StatusPill, type Tone } from "@/features/admin/review-ui"
import { timeAgo } from "@/features/verification/components/kyc-ticket-parts"
import {
  assignSupportTicket,
  commentOnTicket,
  setTicketStatus,
  type SupportTicket,
  type TicketAuthor,
  type TicketStatus,
} from "@/features/tickets/ticket-store"

export const TICKET_STATUS: Record<TicketStatus, { label: string; tone: Tone }> = {
  open: { label: "Open", tone: "warning" },
  waiting: { label: "Waiting on requester", tone: "info" },
  resolved: { label: "Resolved", tone: "success" },
}

/**
 * One raised ticket, both sides: what was raised and from where, the
 * conversation, and — for staff — who owns it and where it stands.
 */
function SupportTicketCard({
  ticket,
  me,
  staff,
}: {
  ticket: SupportTicket
  me: TicketAuthor
  /** Set for staff: everyone it can be assigned to. */
  staff?: { id: string; name: string }[]
}) {
  const [text, setText] = React.useState("")
  const isStaff = me.kind === "staff"
  const send = () => {
    if (!text.trim()) return
    commentOnTicket(ticket.id, me, text)
    setText("")
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-[20px] bg-background p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[15px] font-semibold tracking-[-0.016em]">{ticket.title}</p>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">
              {ticket.raisedBy.name} · {ticket.raisedBy.kind === "admin" ? "Team" : ticket.raisedBy.kind === "buyer" ? "Buyer" : "Seller"} · {timeAgo(ticket.createdAt)}
            </p>
          </div>
          <StatusPill tone={TICKET_STATUS[ticket.status].tone}>{TICKET_STATUS[ticket.status].label}</StatusPill>
        </div>
        {ticket.description ? <p className="mt-3 text-[14px] leading-relaxed">{ticket.description}</p> : null}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ticket.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-card px-2.5 py-0.5 text-[12px] font-medium text-foreground/80">
              {tag}
            </span>
          ))}
        </div>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[12.5px]">
          <dt className="text-muted-foreground">Raised from</dt>
          <dd className="truncate">
            {isStaff ? (
              <span>{ticket.metadata.pageTitle}</span>
            ) : (
              <Link href={ticket.metadata.page} className="text-amama-deep hover:underline">
                {ticket.metadata.pageTitle}
              </Link>
            )}{" "}
            <span className="font-mono text-muted-foreground">{ticket.metadata.page}</span>
          </dd>
          {Object.entries(ticket.metadata.refs).map(([key, value]) => (
            <React.Fragment key={key}>
              <dt className="text-muted-foreground capitalize">{key}</dt>
              <dd className="truncate">{value}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>

      {isStaff && staff ? (
        <div className="flex flex-wrap items-center gap-2 px-1 text-[12.5px]">
          <label className="flex items-center gap-1.5 text-muted-foreground">
            Owner
            <select
              value={ticket.assigneeId ?? ""}
              onChange={(event) => {
                const next = staff.find((member) => member.id === event.target.value) ?? null
                assignSupportTicket(ticket.id, next, me)
              }}
              className="h-8 rounded-full border border-input bg-background px-2.5 text-[12.5px] text-foreground outline-none"
            >
              <option value="">Unassigned</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          <div role="radiogroup" aria-label="Status" className="flex rounded-full border border-input bg-background p-0.5">
            {(["open", "waiting", "resolved"] as const).map((status) => (
              <button
                key={status}
                type="button"
                role="radio"
                aria-checked={ticket.status === status}
                onClick={() => ticket.status !== status && setTicketStatus(ticket.id, status, me)}
                className={cn(
                  "h-7 rounded-full px-3 font-medium transition-colors",
                  ticket.status === status ? "bg-amama text-white" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {status === "open" ? "Open" : status === "waiting" ? "Waiting" : "Resolved"}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[20px] bg-background">
        <ol className="flex flex-col gap-3 px-4 py-4">
          {ticket.comments.map((entry) =>
            entry.author.kind === "system" ? (
              <li key={entry.id} className="flex items-center gap-2 ps-1 text-[12px] text-muted-foreground">
                <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-border" />
                {entry.text} · {timeAgo(entry.at)}
              </li>
            ) : (
              <li key={entry.id} className={cn("flex gap-2.5", entry.author.id === me.id && "flex-row-reverse")}>
                <span
                  aria-hidden
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                    entry.author.kind === "staff" ? "bg-amama text-sun" : "bg-card text-foreground"
                  )}
                >
                  {entry.author.name.charAt(0).toUpperCase()}
                </span>
                <div className={cn("min-w-0 max-w-[85%]", entry.author.id === me.id && "text-end")}>
                  <p className="text-[11.5px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{entry.author.name}</span>
                    {entry.author.title ? ` · ${entry.author.title}` : ""} · {timeAgo(entry.at)}
                  </p>
                  <p className={cn("mt-1 inline-block rounded-2xl px-3 py-2 text-start text-[14px] leading-relaxed", entry.author.kind === "staff" ? "bg-amama-subtle" : "bg-card")}>
                    {entry.text}
                  </p>
                </div>
              </li>
            )
          )}
        </ol>
        <div className="flex items-end gap-2 border-t border-border p-3">
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) send()
            }}
            rows={1}
            placeholder={isStaff ? "Reply to the requester…" : "Add a comment…"}
            className="min-h-10 resize-none rounded-xl border-input bg-background text-[14px]"
          />
          <button
            type="button"
            onClick={send}
            disabled={!text.trim()}
            aria-label="Send comment"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-amama text-white transition-opacity disabled:opacity-40"
          >
            <SendIcon className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export { SupportTicketCard }
