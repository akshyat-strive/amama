"use client"

import * as React from "react"
import { InboxIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { ButtonGroup } from "@/components/ui/button-group"
import { ChatLayout, useChatSelection } from "@/features/chat/chat-layout"
import {
  listTimeLabel,
  SupportTicketCard,
  TICKET_STATUS_DOT,
  TicketKindIcon,
  ticketLastActivity,
  ticketNeedsReply,
  ticketPreview,
  ticketStatusLabel,
  TicketStatusActions,
} from "@/features/tickets/support-ticket-card"
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
  // Most recent activity first, the way a chat list orders threads.
  const visible = tickets
    .filter((ticket) => (filter === "all" || ticket.status === filter) && (kind === "all" || ticket.kind === kind))
    .map((ticket) => ({ ticket, last: ticketLastActivity(ticket) }))
    .sort((a, b) => (a.last < b.last ? 1 : a.last > b.last ? -1 : 0))
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
            <ul className="flex flex-col">
              {visible.map(({ ticket, last }) => {
                const active = ticket.id === selected?.id
                const needsReply = !active && ticketNeedsReply(ticket, me)
                return (
                  <li key={ticket.id}>
                    <button
                      type="button"
                      onClick={() => select(ticket.id)}
                      aria-current={active ? "true" : undefined}
                      aria-label={needsReply ? `${ticket.title}, needs your reply` : undefined}
                      className={cn("chat-row flex w-full items-start gap-3 rounded-xl px-2.5 py-2.5 text-start transition-colors [--row-inset:3.875rem]", active ? "bg-amama text-white" : "hover:bg-card")}
                    >
                      <TicketKindIcon kind={ticket.kind} active={active} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={cn("truncate text-[13.5px]", needsReply ? "font-bold" : "font-semibold")}>{ticket.title}</span>
                          <span className={cn("shrink-0 text-[11px]", active ? "text-white/70" : needsReply ? "font-semibold text-amama-deep" : "text-muted-foreground")}>{listTimeLabel(last)}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className={cn("min-w-0 flex-1 truncate text-[12.5px]", active ? "text-white/75" : needsReply ? "font-medium text-foreground" : "text-muted-foreground")}>{ticketPreview(ticket, me)}</span>
                          {needsReply ? <span aria-hidden className="size-2 shrink-0 rounded-full bg-amama-deep" /> : null}
                        </span>
                        <span className={cn("mt-1 flex items-center gap-1.5 text-[11.5px]", active ? "text-white/70" : "text-muted-foreground")}>
                          <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", active ? "bg-white/80" : TICKET_STATUS_DOT[ticket.status])} />
                          <span className="truncate">{ticketStatusLabel(ticket.status, me)}</span>
                          <span aria-hidden>·</span>
                          <span className="shrink-0 font-mono text-[11px]">{ticket.id}</span>
                          {staff ? (
                            <>
                              <span aria-hidden>·</span>
                              <span className="truncate">{ticket.raisedBy.name}</span>
                            </>
                          ) : null}
                        </span>
                      </span>
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
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden sm:contents">
              <TicketKindIcon kind={selected.kind} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold tracking-[-0.016em]">{selected.title}</p>
              <p className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted-foreground">
                <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", TICKET_STATUS_DOT[selected.status])} />
                <span className="truncate">{ticketStatusLabel(selected.status, me)}</span>
                <span aria-hidden>·</span>
                <span className="shrink-0 font-mono text-[11.5px]">{selected.id}</span>
              </p>
            </div>
          </div>
        ) : null
      }
      windowActions={selected ? <TicketStatusActions ticket={selected} me={me} /> : null}
      windowBody={selected ? <SupportTicketCard key={selected.id} ticket={selected} me={me} staff={staff} /> : null}
    />
  )
}

export { TicketsList }
