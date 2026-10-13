"use client"

import * as React from "react"
import { InboxIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { ButtonGroup } from "@/components/ui/button-group"
import { StatusPill } from "@/features/admin/review-ui"
import { ChatLayout, useChatSelection } from "@/features/chat/chat-layout"
import { timeAgo } from "@/features/verification/components/kyc-ticket-parts"
import { SupportTicketCard, TICKET_STATUS } from "@/features/tickets/support-ticket-card"
import type { SupportTicket, TicketAuthor, TicketStatus } from "@/features/tickets/ticket-store"

type Filter = TicketStatus | "all"

/**
 * Raised tickets laid out like chat: the list on its own, full width;
 * pick one and its details — what was raised, from where, the
 * conversation and a comment box — open as a second column. On a phone
 * it's list, then ticket, with back.
 */
function TicketsList(props: {
  tickets: SupportTicket[]
  me: TicketAuthor
  staff?: { id: string; name: string }[]
  emptyText: string
  title: string
  heightClassName?: string
}) {
  return (
    <React.Suspense fallback={null}>
      <TicketsListInner {...props} />
    </React.Suspense>
  )
}

function TicketsListInner({
  tickets,
  me,
  staff,
  emptyText,
  title,
  heightClassName,
}: {
  tickets: SupportTicket[]
  me: TicketAuthor
  staff?: { id: string; name: string }[]
  emptyText: string
  title: string
  heightClassName?: string
}) {
  const { selectedId, select, clear } = useChatSelection("ticket")
  const [filter, setFilter] = React.useState<Filter>("all")
  const [kind, setKind] = React.useState<"all" | SupportTicket["kind"]>("all")
  const visible = tickets.filter((ticket) => (filter === "all" || ticket.status === filter) && (kind === "all" || ticket.kind === kind))
  const selected = tickets.find((ticket) => ticket.id === selectedId) ?? null

  return (
    <ChatLayout
      title={title}
      heightClassName={heightClassName}
      open={!!selected}
      onClose={clear}
      list={
        <>
          <div className="px-1.5 pt-1 pb-2">
            <ButtonGroup
              label="Status"
              size="sm"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All" },
                { value: "open", label: "Open" },
                { value: "waiting", label: "Waiting" },
                { value: "resolved", label: "Resolved" },
              ]}
            />
          </div>
          {staff ? (
            <div className="flex flex-wrap gap-1.5 px-1.5 pt-1 pb-2">
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
                    "h-8 rounded-[10px] border px-3 text-[12.5px] font-medium transition-colors",
                    kind === value ? "border-amama-deep bg-amama-subtle text-amama-deep" : "border-input text-foreground hover:bg-card"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <InboxIcon aria-hidden className="size-6 text-muted-foreground" />
              <p className="text-[14px] text-muted-foreground">{emptyText}</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {visible.map((ticket) => {
                const active = ticket.id === selected?.id
                return (
                  <li key={ticket.id}>
                    <button
                      type="button"
                      onClick={() => select(ticket.id)}
                      aria-current={active ? "true" : undefined}
                      className={cn("flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-start transition-colors", active ? "bg-amama text-white" : "hover:bg-card")}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-[14px] font-semibold">{ticket.title}</span>
                          <span className={cn("shrink-0 text-[11.5px]", active ? "text-white/70" : "text-muted-foreground")}>{timeAgo(ticket.createdAt)}</span>
                        </span>
                        <span className={cn("block truncate text-[12.5px]", active ? "text-white/75" : "text-muted-foreground")}>
                          <span className="font-mono">{ticket.id}</span> · {ticket.raisedBy.name} · {ticket.tags.join(" · ")}
                        </span>
                      </span>
                      {active ? null : <StatusPill tone={TICKET_STATUS[ticket.status].tone}>{TICKET_STATUS[ticket.status].label}</StatusPill>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      }
      windowHeader={
        selected ? (
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold">{selected.title}</p>
            <p className="truncate text-[12px] text-muted-foreground">
              <span className="font-mono">{selected.id}</span> · {TICKET_STATUS[selected.status].label}
            </p>
          </div>
        ) : null
      }
      windowBody={
        selected ? (
          <div className="min-h-0 flex-1 overflow-y-auto bg-card p-3">
            <SupportTicketCard ticket={selected} me={me} staff={staff} />
          </div>
        ) : null
      }
    />
  )
}

export { TicketsList }
