"use client"

import * as React from "react"
import { ChevronDownIcon, InboxIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { StatusPill } from "@/features/admin/review-ui"
import { timeAgo } from "@/features/verification/components/kyc-ticket-parts"
import { SupportTicketCard, TICKET_STATUS } from "@/features/tickets/support-ticket-card"
import type { SupportTicket, TicketAuthor, TicketStatus } from "@/features/tickets/ticket-store"

type Filter = TicketStatus | "all"

/** A list of raised tickets that open in place, with status filters. */
function TicketsList({
  tickets,
  me,
  staff,
  emptyText,
}: {
  tickets: SupportTicket[]
  me: TicketAuthor
  staff?: { id: string; name: string }[]
  emptyText: string
}) {
  const [filter, setFilter] = React.useState<Filter>("all")
  const [kind, setKind] = React.useState<"all" | SupportTicket["kind"]>("all")
  const [openId, setOpenId] = React.useState<string | null>(null)

  const visible = tickets.filter((ticket) => (filter === "all" || ticket.status === filter) && (kind === "all" || ticket.kind === kind))
  const count = (status: Filter) => tickets.filter((ticket) => status === "all" || ticket.status === status).length

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Status" className="flex rounded-full bg-card p-1">
          {(["all", "open", "waiting", "resolved"] as const).map((status) => (
            <button
              key={status}
              type="button"
              role="radio"
              aria-checked={filter === status}
              onClick={() => setFilter(status)}
              className={cn(
                "h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors",
                filter === status ? "bg-background text-foreground ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {status === "all" ? "All" : status === "open" ? "Open" : status === "waiting" ? "Waiting" : "Resolved"}
              <span className="ms-1.5 text-muted-foreground tabular-nums">{count(status)}</span>
            </button>
          ))}
        </div>
        {staff ? (
          <div className="flex gap-1.5">
            {(
              [
                ["all", "Everything"],
                ["catalog-request", "Catalog requests"],
                ["support", "Support"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={kind === value}
                onClick={() => setKind(value)}
                className={cn(
                  "h-8 rounded-full border px-3 text-[12.5px] font-medium transition-colors",
                  kind === value ? "border-amama-deep bg-amama-subtle text-amama-deep" : "border-input text-foreground hover:bg-card"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[24px] bg-card px-6 py-12 text-center">
          <InboxIcon aria-hidden className="size-6 text-muted-foreground" />
          <p className="text-[14px] text-muted-foreground">{emptyText}</p>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[24px] bg-card">
          {visible.map((ticket) => {
            const open = openId === ticket.id
            return (
              <li key={ticket.id} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : ticket.id)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 text-start transition-colors hover:bg-[#ededf1] sm:grid-cols-[5.5rem_minmax(0,1fr)_auto_3rem_1rem] dark:hover:bg-muted"
                >
                  <span className="hidden font-mono text-[12px] text-muted-foreground sm:block">{ticket.id}</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold">{ticket.title}</span>
                    <span className="block truncate text-[12.5px] text-muted-foreground">
                      {ticket.raisedBy.name} · {ticket.tags.join(" · ")}
                    </span>
                  </span>
                  <StatusPill tone={TICKET_STATUS[ticket.status].tone}>{TICKET_STATUS[ticket.status].label}</StatusPill>
                  <span className="hidden text-[12px] text-muted-foreground sm:block">{timeAgo(ticket.createdAt)}</span>
                  <ChevronDownIcon aria-hidden className={cn("hidden size-4 text-muted-foreground transition-transform sm:block", open && "rotate-180")} />
                </button>
                {open ? (
                  <div className="px-3 pb-3">
                    <SupportTicketCard ticket={ticket} me={me} staff={staff} />
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export { TicketsList }
