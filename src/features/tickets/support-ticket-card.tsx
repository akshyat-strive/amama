"use client"

import * as React from "react"
import Link from "next/link"
import { CheckIcon, ClockIcon, FileTextIcon, LifeBuoyIcon, MessageSquareIcon, PackagePlusIcon, RotateCcwIcon, SendIcon, UserRoundIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { StatusPill, type Tone } from "@/features/admin/review-ui"
import {
  assignSupportTicket,
  commentOnTicket,
  setTicketStatus,
  type SupportTicket,
  type TicketAuthor,
  type TicketComment,
  type TicketStatus,
} from "@/features/tickets/ticket-store"

export const TICKET_STATUS: Record<TicketStatus, { label: string; tone: Tone }> = {
  open: { label: "Open", tone: "warning" },
  waiting: { label: "Waiting on requester", tone: "info" },
  resolved: { label: "Resolved", tone: "success" },
}

/** The dot colour beside a status in the list — the same hues as the pill. */
export const TICKET_STATUS_DOT: Record<TicketStatus, string> = {
  open: "bg-status-warning",
  waiting: "bg-sky-600",
  resolved: "bg-amama-deep",
}

/** "Waiting on requester" reads oddly to the requester — to them it's
 *  waiting on *them*. */
function ticketStatusLabel(status: TicketStatus, me: TicketAuthor) {
  if (status === "waiting" && me.kind !== "staff") return "Waiting on you"
  return TICKET_STATUS[status].label
}

/** Someone typing, not the platform logging a change. */
function humanComments(ticket: SupportTicket) {
  return ticket.comments.filter((comment) => comment.author.kind !== "system")
}

/** When anything last happened on the ticket — the latest comment or
 *  event, else when it was raised. */
function ticketLastActivity(ticket: SupportTicket) {
  return ticket.comments.reduce((latest, comment) => (comment.at > latest ? comment.at : latest), ticket.createdAt)
}

/**
 * Whether the ball is in `me`'s court — the closest thing to "unread"
 * the data has. A requester owes a reply once staff have spoken last; staff
 * owe one when the requester has, or when a fresh ticket of theirs (or an
 * unowned one) has had no reply at all.
 */
function ticketNeedsReply(ticket: SupportTicket, me: TicketAuthor) {
  if (ticket.status === "resolved") return false
  const last = humanComments(ticket).at(-1)
  if (!last) return me.kind === "staff" && ticket.status === "open" && (!ticket.assigneeId || ticket.assigneeId === me.id)
  if (last.author.id === me.id) return false
  return me.kind === "staff" ? last.author.kind !== "staff" : last.author.kind === "staff"
}

/** A line of preview for the list: the latest reply, prefixed with who. */
function ticketPreview(ticket: SupportTicket, me: TicketAuthor) {
  const last = humanComments(ticket).at(-1)
  if (!last) return ticket.description || ticket.comments.at(-1)?.text || ""
  const who = last.author.id === me.id ? "You" : last.author.name.split(" ")[0]
  return `${who}: ${last.text}`
}

/** Who owns it, by name — the staff list when we have it, else whoever
 *  from that address has replied, else the address itself, tidied. */
function assigneeName(ticket: SupportTicket, staff?: { id: string; name: string }[]) {
  if (!ticket.assigneeId) return null
  const id = ticket.assigneeId
  const known = staff?.find((member) => member.id === id)?.name ?? ticket.comments.find((comment) => comment.author.id === id)?.author.name
  if (known) return known
  const local = id.split("@")[0] ?? id
  return local.charAt(0).toUpperCase() + local.slice(1)
}

function dayKey(at: string) {
  return new Date(at).toDateString()
}

function daysAgo(at: string) {
  return Math.round((new Date(new Date().toDateString()).getTime() - new Date(dayKey(at)).getTime()) / 86_400_000)
}

/** "Today" / "Yesterday" / "Monday, Oct 12" — the break between days. */
function dayLabel(at: string) {
  const date = new Date(at)
  const days = daysAgo(at)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  return date.toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric", year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric" })
}

/** The time beside a name: just the clock today, the weekday this week,
 *  the date before that. */
function stampLabel(at: string) {
  const date = new Date(at)
  const time = date.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })
  const days = daysAgo(at)
  if (days === 0) return time
  if (days < 7) return `${date.toLocaleDateString("en", { weekday: "short" })} ${time}`
  return `${date.toLocaleDateString("en", { month: "short", day: "numeric" })}, ${time}`
}

/** The list's compact time: clock today, "Yesterday", weekday, then date. */
function listTimeLabel(at: string) {
  const date = new Date(at)
  const days = daysAgo(at)
  if (days === 0) return date.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })
  if (days === 1) return "Yesterday"
  if (days < 7) return date.toLocaleDateString("en", { weekday: "short" })
  return date.toLocaleDateString("en", { month: "short", day: "numeric" })
}

function withinMinutes(a: string, b: string, minutes: number) {
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) <= minutes * 60_000
}

/** A small round tile for the ticket's kind — a lifebuoy for a question,
 *  a parcel for a catalog request. */
function TicketKindIcon({ kind, active }: { kind: SupportTicket["kind"]; active?: boolean }) {
  const Icon = kind === "catalog-request" ? PackagePlusIcon : LifeBuoyIcon
  return (
    <span aria-hidden className={cn("grid size-10 shrink-0 place-items-center rounded-full", active ? "bg-sun text-sun-foreground" : "bg-amama-subtle text-amama-deep")}>
      <Icon className="size-[18px]" />
    </span>
  )
}

/** A quiet chip in the summary — tags, the page, records it was about. */
function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex h-7 max-w-full items-center gap-1.5 rounded-full bg-background px-2.5 text-[12px] font-medium text-foreground/80", className)}>{children}</span>
}

/**
 * The top of the thread: where it stands, what was raised, by whom and
 * from where, and who has it — so the conversation below never needs to
 * repeat the context.
 */
function TicketSummary({ ticket, me, staff }: { ticket: SupportTicket; me: TicketAuthor; staff?: { id: string; name: string }[] }) {
  const isStaff = me.kind === "staff"
  const owner = assigneeName(ticket, staff)
  const role = ticket.raisedBy.kind === "admin" ? "Team" : ticket.raisedBy.kind === "buyer" ? "Buyer" : "Seller"
  return (
    <section aria-label="Ticket summary" className="rounded-[20px] bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={TICKET_STATUS[ticket.status].tone}>{ticketStatusLabel(ticket.status, me)}</StatusPill>
        <span className="font-mono text-[12px] text-muted-foreground">{ticket.id}</span>
        <span className="ms-auto text-[12px] text-muted-foreground">{ticket.kind === "catalog-request" ? "Catalog request" : "Support"}</span>
      </div>
      <h2 className="mt-2.5 text-[17px] font-semibold tracking-[-0.02em]">{ticket.title}</h2>
      <p className="mt-0.5 text-[12.5px] text-muted-foreground">
        Raised by {ticket.raisedBy.id === me.id ? "you" : ticket.raisedBy.name} · {role} · {stampLabel(ticket.createdAt)}
      </p>
      {ticket.description ? <p className="mt-3 text-[14px] leading-relaxed whitespace-pre-line">{ticket.description}</p> : null}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {isStaff ? (
          <Chip>
            <FileTextIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{ticket.metadata.pageTitle}</span>
            <span className="truncate font-mono text-[11px] text-muted-foreground">{ticket.metadata.page}</span>
          </Chip>
        ) : (
          <Link href={ticket.metadata.page} className="max-w-full">
            <Chip className="text-amama-deep transition-colors hover:bg-amama-subtle">
              <FileTextIcon aria-hidden className="size-3.5 shrink-0" />
              <span className="truncate">{ticket.metadata.pageTitle}</span>
            </Chip>
          </Link>
        )}
        {Object.entries(ticket.metadata.refs).map(([key, value]) => (
          <Chip key={key}>
            <span className="text-muted-foreground capitalize">{key}</span>
            <span className="truncate font-mono text-[11.5px]">{value}</span>
          </Chip>
        ))}
        {ticket.tags.map((tag) => (
          <Chip key={tag}>{tag}</Chip>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[12.5px]">
        <span aria-hidden className={cn("grid size-6 shrink-0 place-items-center rounded-full", owner ? "bg-amama-subtle text-amama-deep" : "bg-background text-muted-foreground")}>
          <UserRoundIcon className="size-3.5" />
        </span>
        {isStaff && staff ? (
          <label className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
            Assigned to
            <select
              value={ticket.assigneeId ?? ""}
              onChange={(event) => {
                const next = staff.find((member) => member.id === event.target.value) ?? null
                assignSupportTicket(ticket.id, next, me)
              }}
              className="h-7 min-w-0 rounded-full bg-background px-2.5 text-[12.5px] font-medium text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              <option value="">Unassigned</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="text-muted-foreground">
            {owner ? (
              <>
                Assigned to <span className="font-medium text-foreground">{owner}</span>
              </>
            ) : (
              "Not picked up yet — the team will assign it shortly"
            )}
          </span>
        )}
      </div>
    </section>
  )
}

/** The platform's own voice — raised, reassigned, resolved — as a small
 *  centred pill rather than a bubble. */
function SystemEvent({ comment }: { comment: TicketComment }) {
  return (
    <div className="my-2 flex justify-center">
      <p className="inline-flex max-w-[90%] items-center gap-1.5 rounded-full bg-muted px-3.5 py-1.5 text-[12px] font-medium text-muted-foreground">
        <span className="truncate">{comment.text}</span>
        <span aria-hidden>·</span>
        <span className="shrink-0">{new Date(comment.at).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}</span>
      </p>
    </div>
  )
}

/**
 * A comment the way a work chat shows it: the first in a run gets an
 * avatar, the name and the time; the rest tuck in under it. Your own sit
 * on the right in green with just the time.
 */
function CommentBubble({ comment, mine, grouped }: { comment: TicketComment; mine: boolean; grouped: boolean }) {
  const isStaff = comment.author.kind === "staff"
  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className={cn("flex max-w-[80%] gap-3", mine && "flex-row-reverse", grouped ? "mt-0.5" : "mt-3")}>
        {mine ? null : grouped ? (
          <span aria-hidden className="w-9 shrink-0" />
        ) : (
          <span
            aria-hidden
            className={cn("mt-6 grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold", isStaff ? "bg-amama-subtle text-amama-deep" : "bg-graphite text-white")}
          >
            {comment.author.name.trim().charAt(0).toUpperCase() || "?"}
          </span>
        )}
        <div className={cn("flex min-w-0 flex-col", mine ? "items-end" : "items-start")}>
          {grouped ? null : (
            <p className={cn("mb-1 flex min-w-0 items-baseline gap-2 px-1", mine && "flex-row-reverse")}>
              {mine ? null : <span className="shrink-0 text-[13px] font-semibold text-foreground">{comment.author.name}</span>}
              {!mine && comment.author.title ? <span className="hidden min-w-0 truncate text-[12px] text-muted-foreground sm:inline">{comment.author.title}</span> : null}
              <span className="shrink-0 text-[12px] text-muted-foreground">{stampLabel(comment.at)}</span>
            </p>
          )}
          <p className={cn("rounded-[20px] px-4 py-2.5 text-[14px] leading-relaxed break-words whitespace-pre-line", mine ? "bg-amama-deep text-white" : "bg-muted text-foreground")}>{comment.text}</p>
        </div>
      </div>
    </div>
  )
}

/** Resolve / Reopen / Mark waiting — for the window header. Staff move a
 *  ticket through every state; the requester can close their own or bring
 *  it back. */
function TicketStatusActions({ ticket, me }: { ticket: SupportTicket; me: TicketAuthor }) {
  const isStaff = me.kind === "staff"
  if (ticket.status === "resolved") {
    return (
      <Button variant="outline" size="sm" onClick={() => setTicketStatus(ticket.id, "open", me)}>
        <RotateCcwIcon />
        Reopen
      </Button>
    )
  }
  return (
    <div className="flex items-center gap-1.5">
      {isStaff && ticket.status === "open" ? (
        <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => setTicketStatus(ticket.id, "waiting", me)}>
          <ClockIcon />
          Mark waiting
        </Button>
      ) : null}
      <Button size="sm" onClick={() => setTicketStatus(ticket.id, "resolved", me)}>
        <CheckIcon />
        Resolve
      </Button>
    </div>
  )
}

/**
 * The ticket window's body: the summary, then the conversation as chat —
 * day breaks, runs, system events as pills — and the composer pinned at
 * the bottom.
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
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const seen = React.useRef(ticket.comments.length)
  const isStaff = me.kind === "staff"
  const replies = humanComments(ticket)

  // A ticket opens at its summary (the list keys this per ticket); a new
  // comment while it's open scrolls down to it.
  React.useEffect(() => {
    const node = scrollRef.current
    if (ticket.comments.length > seen.current && node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" })
    seen.current = ticket.comments.length
  }, [ticket.comments.length])

  const send = () => {
    if (!text.trim()) return
    commentOnTicket(ticket.id, me, text)
    setText("")
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4 sm:px-5">
        <TicketSummary ticket={ticket} me={me} staff={staff} />
        <div className="mt-2 flex flex-col">
          {ticket.comments.map((comment, index) => {
            const previous = index > 0 ? ticket.comments[index - 1] : undefined
            const newDay = !previous || dayKey(previous.at) !== dayKey(comment.at)
            const grouped = !newDay && !!previous && previous.author.kind !== "system" && previous.author.id === comment.author.id && withinMinutes(previous.at, comment.at, 5)
            return (
              <React.Fragment key={comment.id}>
                {newDay ? <p className="mt-4 mb-1 text-center text-[12.5px] font-medium text-muted-foreground">{dayLabel(comment.at)}</p> : null}
                {comment.author.kind === "system" ? <SystemEvent comment={comment} /> : <CommentBubble comment={comment} mine={comment.author.id === me.id} grouped={grouped} />}
              </React.Fragment>
            )
          })}
        </div>
        {replies.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 px-6 pb-2 text-center">
            <span aria-hidden className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
              <MessageSquareIcon className="size-[18px]" />
            </span>
            <p className="text-[13.5px] font-medium">No replies yet</p>
            <p className="max-w-xs text-[12.5px] text-muted-foreground">
              {isStaff ? "Write the first reply — the requester sees it here and on their Support page." : "The team usually replies within a working day. Add anything that helps below."}
            </p>
          </div>
        ) : null}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          send()
        }}
        className="flex shrink-0 items-center gap-2 border-t border-border p-3"
      >
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-label={isStaff ? "Reply to the requester" : "Add a comment"}
          placeholder={ticket.status === "resolved" ? "Add a note to this resolved ticket…" : isStaff ? "Reply to the requester…" : "Add a comment…"}
          className="h-10 min-w-0 flex-1 rounded-full border border-border bg-transparent px-4 text-[14px] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="Send comment"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-graphite text-white transition-colors hover:bg-black disabled:pointer-events-none disabled:opacity-40"
        >
          <SendIcon className="size-4 rtl:-scale-x-100" />
        </button>
      </form>
    </div>
  )
}

export { SupportTicketCard, TicketStatusActions, TicketKindIcon, ticketStatusLabel, ticketLastActivity, ticketNeedsReply, ticketPreview, listTimeLabel }
