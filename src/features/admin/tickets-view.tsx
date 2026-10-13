"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronDownIcon, Columns3Icon, Inbox, ListIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ButtonGroup } from "@/components/ui/button-group"
import { Input } from "@/components/ui/input"
import { Sheet, SheetCloseButton, SheetContent } from "@/components/ui/sheet"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AdminEmptyState, AdminListSkeleton } from "@/features/admin/admin-ui"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import { StatusPill, type Tone } from "@/features/admin/review-ui"
import { SubmissionCard } from "@/features/admin/review-queue-view"
import { useUsers } from "@/features/admin/user-store"
import { TicketsList } from "@/features/tickets/tickets-list"
import { useTickets } from "@/features/tickets/ticket-store"
import { PAGE_TABS_SPACE, PageTabs } from "@/features/dashboard/page-tabs"
import { countries } from "@/features/onboarding/countries"
import type { ReviewStatus } from "@/features/verification/verification-context"
import {
  approveApplication,
  useAllVerificationQueuesLoaded,
  useVerificationQueue,
  type AdminSubmission,
} from "@/features/verification/admin-verification"
import { kycTicketId } from "@/features/verification/ticket"

/**
 * Every KYC application as a ticket, in one queue, sliced by tags —
 * "seller KYC, producers, waiting on the applicant" — without switching
 * pages. What's in the queue follows the hierarchy: a KAM sees the
 * tickets they own plus unclaimed ones; Master KAMs and executives (who hold
 * `onboarding.viewAll`) see every ticket.
 */

type TicketState = "open" | "waiting" | "resolved"
type Filter = TicketState | "all"
type View = "list" | "board"

type Ticket = {
  submission: AdminSubmission
  id: string
  state: TicketState
  tags: Tag[]
}

const BOARD_COLUMNS: TicketState[] = ["open", "waiting", "resolved"]

const STATE_OF: Record<ReviewStatus, TicketState | null> = {
  pending: "open",
  "changes-requested": "waiting",
  approved: "resolved",
  "not-submitted": null,
}

const STATE_LABEL: Record<TicketState, { label: string; tone: Tone }> = {
  open: { label: "Open", tone: "warning" },
  waiting: { label: "Waiting on applicant", tone: "danger" },
  resolved: { label: "Resolved", tone: "success" },
}

type Tag = { id: string; label: string }

function tagsOf(submission: AdminSubmission): Tag[] {
  const tags: Tag[] = [
    submission.role === "buyer" ? { id: "buyer-kyc", label: "Buyer KYC" } : { id: "seller-kyc", label: "Seller KYC" },
    submission.entityType === "organization" ? { id: "organisation", label: "Organisation" } : { id: "individual", label: "Individual" },
  ]
  if (submission.sellerSubType) {
    tags.push(submission.sellerSubType === "producer" ? { id: "producer", label: "Producer" } : { id: "trader", label: "Trader" })
  }
  const country = countries.find((entry) => entry.code === submission.country)
  if (country) tags.push({ id: `country-${country.code}`, label: country.name })
  return tags
}

const VIEWS = [
  { value: "list", label: "List", icon: ListIcon },
  { value: "board", label: "Board", icon: Columns3Icon },
] as const

const FILTER_TAGS: Tag[] = [
  { id: "buyer-kyc", label: "Buyer KYC" },
  { id: "seller-kyc", label: "Seller KYC" },
  { id: "organisation", label: "Organisation" },
  { id: "individual", label: "Individual" },
  { id: "producer", label: "Producer" },
  { id: "trader", label: "Trader" },
]

function ago(iso: string | null): string {
  if (!iso) return "—"
  const hours = (Date.now() - new Date(iso).getTime()) / 3_600_000
  if (hours < 1) return "just now"
  if (hours < 24) return `${Math.round(hours)}h`
  return `${Math.round(hours / 24)}d`
}

function TicketsWorkspace() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const admin = useCurrentAdmin()
  const buyers = useVerificationQueue("buyer")
  const sellers = useVerificationQueue("seller")
  const loaded = useAllVerificationQueuesLoaded()

  const filter = (searchParams.get("status") as Filter | null) ?? "open"
  const view: View = searchParams.get("view") === "board" ? "board" : "list"
  const [sheetId, setSheetId] = React.useState<string | null>(null)
  const activeTags = searchParams.get("tag")?.split(",").filter(Boolean) ?? []
  const [query, setQuery] = React.useState("")
  const [openId, setOpenId] = React.useState<string | null>(null)

  const setParams = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (!value) params.delete(key)
      else params.set(key, value)
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }
  const toggleTag = (id: string) => {
    const next = activeTags.includes(id) ? activeTags.filter((tag) => tag !== id) : [...activeTags, id]
    setParams({ tag: next.join(",") || null })
  }

  const users = useUsers()
  const seesAll = admin?.can("onboarding.viewAll") ?? false
  const myId = admin?.user.id ?? null
  const mineOnly = searchParams.get("owner") === "me"

  const tickets = React.useMemo(
    () =>
      [...buyers, ...sellers]
        .filter((submission) => seesAll || submission.assigneeId === myId || submission.assigneeId === null)
        .map((submission) => ({
          submission,
          id: kycTicketId(submission.role, submission.email),
          state: STATE_OF[submission.reviewStatus],
          tags: tagsOf(submission),
        }))
        .filter((ticket): ticket is Ticket => ticket.state !== null)
        .sort((a, b) => (b.submission.submittedAt ?? "").localeCompare(a.submission.submittedAt ?? "")),
    [buyers, sellers, seesAll, myId]
  )

  const needle = query.trim().toLowerCase()
  const tagged = tickets.filter(
    (ticket) =>
      (!mineOnly || ticket.submission.assigneeId === myId) &&
      activeTags.every((tag) => ticket.tags.some((entry) => entry.id === tag)) &&
      (!needle || [ticket.id, ticket.submission.fullName, ticket.submission.email].join(" ").toLowerCase().includes(needle))
  )
  const visible = filter === "all" ? tagged : tagged.filter((ticket) => ticket.state === filter)
  const count = (state: Filter) => (state === "all" ? tagged.length : tagged.filter((ticket) => ticket.state === state).length)
  const sheetTicket = sheetId ? (tickets.find((ticket) => ticket.id === sheetId) ?? null) : null

  /** Moving a card is a decision: Resolved approves the application,
   *  Waiting opens the ticket so the reviewer can say what to fix. A
   *  ticket never moves back to Open — that only happens when the
   *  applicant resubmits. */
  const moveTicket = (ticket: Ticket, to: TicketState) => {
    if (ticket.state === to || !admin) return
    if (!admin.can("onboarding.review")) {
      toast("Your role can see tickets but not act on them")
      return
    }
    if (to === "resolved") {
      const blocked = ticket.submission.documents.some(
        (document) => document.reviewStatus === "rejected" || (document.required && document.reviewStatus === "missing")
      )
      if (blocked) {
        setSheetId(ticket.id)
        toast("This one is still waiting on the applicant")
        return
      }
      approveApplication(ticket.submission.role, ticket.submission.userId, { id: admin.user.id, name: admin.user.name, title: admin.role.name })
      toast.success(`${ticket.id} approved`)
    } else if (to === "waiting") {
      setSheetId(ticket.id)
      toast("Say what needs fixing, then send it back")
    } else {
      toast("A ticket reopens when the applicant resubmits")
    }
  }

  if (!admin) return null
  // KYC is SaleOps' queue; raised tickets and catalog requests are open to
  // every role, scoped by level inside `RequestsPanel`.
  const canKyc = admin.can("onboarding.review") || seesAll
  const type: "kyc" | "requests" = searchParams.get("type") === "requests" || !canKyc ? "requests" : "kyc"
  const typeSwitch = canKyc ? (
    <ButtonGroup
      label="Ticket type"
      value={type}
      onChange={(value) => setParams({ type: value === "kyc" ? null : value, status: null, tag: null, view: null })}
      options={[
        { value: "kyc", label: "KYC" },
        { value: "requests", label: "Requests" },
      ]}
    />
  ) : null

  if (type === "requests") {
    return (
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="me-auto text-[34px] font-semibold tracking-[-0.03em]">Tickets</h1>
          {typeSwitch}
        </div>
        <div className="mt-4">
          <RequestsPanel />
        </div>
      </div>
    )
  }
  const ownerName = (id: string | null) => (id ? (users.find((user) => user.id === id)?.name ?? "—") : "Unassigned")

  return (
    <div className={PAGE_TABS_SPACE}>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="me-auto text-[34px] font-semibold tracking-[-0.03em]">Tickets</h1>
        {typeSwitch}
        <ButtonGroup
          label="View"
          value={view}
          onChange={(value) => setParams({ view: value === "list" ? null : value })}
          options={VIEWS.map((option) => ({ value: option.value, label: option.label, icon: option.icon }))}
        />
      </div>

      {view === "list" ? (
        <PageTabs
          label="Ticket status"
          className="mt-5"
          value={filter}
          onChange={(next) => setParams({ status: next === "open" ? null : next })}
          tabs={[
            { value: "open", label: "Open", count: count("open") },
            { value: "waiting", label: "Waiting", count: count("waiting") },
            { value: "resolved", label: "Resolved", count: count("resolved") },
            { value: "all", label: "All", count: count("all") },
          ]}
        />
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <SearchIcon aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ticket, name or email"
            aria-label="Search tickets"
            className="h-9 rounded-full ps-9"
          />
        </div>
        <div role="group" aria-label="Filter by tag" className="flex flex-wrap gap-1.5">
          {admin.can("onboarding.review") ? (
            <button
              type="button"
              aria-pressed={mineOnly}
              onClick={() => setParams({ owner: mineOnly ? null : "me" })}
              className={cn(
                "h-8 rounded-full border px-3 text-[12.5px] font-medium transition-colors",
                mineOnly ? "border-amama-deep bg-amama-subtle text-amama-deep" : "border-border bg-card text-foreground hover:bg-muted"
              )}
            >
              Mine
            </button>
          ) : null}
          {FILTER_TAGS.map((tag) => {
            const on = activeTags.includes(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleTag(tag.id)}
                className={cn(
                  "h-8 rounded-full border px-3 text-[12.5px] font-medium transition-colors",
                  on ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:bg-muted"
                )}
              >
                {tag.label}
              </button>
            )
          })}
        </div>
      </div>

      {!loaded ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          <AdminListSkeleton rows={4} />
        </div>
      ) : view === "board" ? (
        <TicketBoard tickets={tagged} onOpen={setSheetId} onMove={moveTicket} ownerName={ownerName} />
      ) : visible.length === 0 ? (
        <AdminEmptyState
          icon={Inbox}
          title={filter === "open" ? "No open tickets" : "No tickets here"}
          description="A ticket opens when someone finishes onboarding and submits their KYC."
        />
      ) : (
        <TooltipProvider delay={300}>
          <ul className="mt-4 flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
            {visible.map((ticket) => {
              const open = openId === ticket.id
              const state = STATE_LABEL[ticket.state]
              return (
                <li key={ticket.id} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : ticket.id)}
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-4 py-3.5 text-start transition-colors hover:bg-muted/50 sm:grid-cols-[7rem_minmax(0,1.4fr)_minmax(0,1.4fr)_7.5rem_9.5rem_3rem_1rem]"
                  >
                    <span className="font-mono text-[12px] text-muted-foreground">{ticket.id}</span>
                    <span className="min-w-0 max-sm:col-span-2 max-sm:row-start-2">
                      <span className="block truncate text-[13.5px] font-semibold text-foreground">{ticket.submission.fullName || "Unnamed applicant"}</span>
                      <span className="block truncate text-[12px] text-muted-foreground">{ticket.submission.email}</span>
                    </span>
                    <span className="flex min-w-0 flex-wrap gap-1 max-sm:col-span-2 max-sm:row-start-3">
                      {ticket.tags.map((tag) => (
                        <span
                          key={tag.id}
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11.5px] font-medium",
                            tag.id.endsWith("-kyc") ? "bg-foreground/[0.07] text-foreground" : "bg-muted text-muted-foreground"
                          )}
                        >
                          {tag.label}
                        </span>
                      ))}
                    </span>
                    <span className="hidden truncate text-[12.5px] sm:block">
                      <span className={ticket.submission.assigneeId ? "text-foreground" : "text-muted-foreground"}>{ownerName(ticket.submission.assigneeId)}</span>
                    </span>
                    <span className="justify-self-end sm:justify-self-start max-sm:col-start-2 max-sm:row-start-1">
                      <StatusPill tone={state.tone}>{state.label}</StatusPill>
                    </span>
                    <span className="hidden text-[12px] text-muted-foreground tabular-nums sm:block">{ago(ticket.submission.submittedAt)}</span>
                    <ChevronDownIcon aria-hidden className={cn("hidden size-4 text-muted-foreground transition-transform sm:block", open && "rotate-180")} />
                  </button>
                  {open ? (
                    <div className="border-t border-border bg-muted/30 p-3">
                      <SubmissionCard submission={ticket.submission} />
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </TooltipProvider>
      )}

      <Sheet open={sheetTicket !== null} onOpenChange={(open) => !open && setSheetId(null)}>
        <SheetContent side="responsive" className="overflow-y-auto sm:max-w-xl">
          <SheetCloseButton />
          {sheetTicket ? (
            <TooltipProvider delay={300}>
              <p className="mb-3 font-mono text-[12px] text-muted-foreground">{sheetTicket.id}</p>
              <SubmissionCard submission={sheetTicket.submission} />
            </TooltipProvider>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}

/** Three columns, one per ticket state. Cards open the ticket; dragging a
 *  card to another column makes that decision (see `moveTicket`). */
function TicketBoard({
  tickets,
  onOpen,
  onMove,
  ownerName,
}: {
  tickets: Ticket[]
  onOpen: (id: string) => void
  onMove: (ticket: Ticket, to: TicketState) => void
  ownerName: (id: string | null) => string
}) {
  const [dragging, setDragging] = React.useState<string | null>(null)
  const [over, setOver] = React.useState<TicketState | null>(null)

  return (
    <div className="-mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
      {BOARD_COLUMNS.map((state) => {
        const column = tickets.filter((ticket) => ticket.state === state)
        const label = STATE_LABEL[state]
        return (
          <section
            key={state}
            aria-label={`${label.label}, ${column.length}`}
            onDragOver={(event) => {
              if (!dragging) return
              event.preventDefault()
              setOver(state)
            }}
            onDragLeave={() => setOver((current) => (current === state ? null : current))}
            onDrop={(event) => {
              event.preventDefault()
              const ticket = tickets.find((entry) => entry.id === dragging)
              setDragging(null)
              setOver(null)
              if (ticket) onMove(ticket, state)
            }}
            className={cn(
              "flex w-[82%] shrink-0 snap-start flex-col rounded-[20px] bg-muted/60 p-2 transition-colors sm:w-auto",
              over === state && "bg-amama-subtle ring-2 ring-amama-deep/30"
            )}
          >
            <header className="flex items-center justify-between gap-2 px-2 pt-1 pb-2.5">
              <StatusPill tone={label.tone}>{label.label}</StatusPill>
              <span className="text-[12px] font-medium text-muted-foreground tabular-nums">{column.length}</span>
            </header>
            {column.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border px-3 py-6 text-center text-[12.5px] text-muted-foreground">
                No tickets
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {column.map((ticket) => (
                  <li key={ticket.id}>
                    <button
                      type="button"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move"
                        setDragging(ticket.id)
                      }}
                      onDragEnd={() => {
                        setDragging(null)
                        setOver(null)
                      }}
                      onClick={() => onOpen(ticket.id)}
                      className={cn(
                        "w-full cursor-grab rounded-2xl border border-border bg-card p-3 text-start transition-shadow hover:shadow-md active:cursor-grabbing",
                        dragging === ticket.id && "opacity-50"
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11.5px] text-muted-foreground">{ticket.id}</span>
                        <span className="text-[11.5px] text-muted-foreground tabular-nums">{ago(ticket.submission.submittedAt)}</span>
                      </span>
                      <span className="mt-1.5 block truncate text-[13.5px] font-semibold text-foreground">
                        {ticket.submission.fullName || "Unnamed applicant"}
                      </span>
                      <span className="block truncate text-[12px] text-muted-foreground">{ticket.submission.email}</span>
                      <span className="mt-1 block truncate text-[11.5px] text-muted-foreground">Owner · {ownerName(ticket.submission.assigneeId)}</span>
                      <span className="mt-2 flex flex-wrap gap-1">
                        {ticket.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] font-medium",
                              tag.id.endsWith("-kyc") ? "bg-foreground/[0.07] text-foreground" : "bg-muted text-muted-foreground"
                            )}
                          >
                            {tag.label}
                          </span>
                        ))}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}

/**
 * Raised tickets and catalog requests, staff side. Executives and Master
 * KAMs (who hold `overview.view`) see every one; anyone else sees what's
 * assigned to them or what they raised.
 */
function RequestsPanel() {
  const admin = useCurrentAdmin()
  const users = useUsers()
  const tickets = useTickets()
  if (!admin) return null
  const seesAll = admin.can("overview.view")
  const visible = seesAll ? tickets : tickets.filter((ticket) => ticket.assigneeId === admin.user.id || ticket.raisedBy.id === admin.user.id)
  return (
    <TicketsList
      title="Requests"
      heightClassName="h-[calc(100dvh-160px)] sm:h-[calc(100dvh-172px)]"
      tickets={visible}
      me={{ kind: "staff", id: admin.user.id, name: admin.user.name, title: admin.role.name }}
      staff={users.map((user) => ({ id: user.id, name: user.name }))}
      emptyText={seesAll ? "No tickets raised yet." : "Nothing assigned to you."}
    />
  )
}

/** `useSearchParams` keeps the filters in the URL, so it needs a boundary. */
function TicketsView() {
  return (
    <React.Suspense fallback={null}>
      <TicketsWorkspace />
    </React.Suspense>
  )
}

export { TicketsView }
