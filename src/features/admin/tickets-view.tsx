"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronDownIcon, Columns3Icon, Inbox, ListIcon, SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { ButtonGroup } from "@/components/ui/button-group"
import { Button } from "@/components/ui/button"
import { ColumnCard } from "@/components/ui/column-card"
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet"
import { DetailPage, useDetailRoute } from "@/components/ui/detail-page"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AdminEmptyState, AdminListSkeleton } from "@/features/admin/admin-ui"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import { StatusPill, type Tone } from "@/features/admin/review-ui"
import { SubmissionCard } from "@/features/admin/review-queue-view"
import { useUsers } from "@/features/admin/user-store"
import { TicketsList } from "@/features/tickets/tickets-list"
import { useTickets } from "@/features/tickets/ticket-store"
import { CategoryTabs } from "@/features/marketplace/marketplace-ui"
import { countries } from "@/features/onboarding/countries"
import {
  approveApplication,
  useAllVerificationQueuesLoaded,
  useVerificationQueue,
  type AdminSubmission,
} from "@/features/verification/admin-verification"
import { owesUpload } from "@/features/verification/components/kyc-ticket-parts"
import { resolveKycTicket } from "@/features/verification/kyc-store"
import type { KycTicket, KycTicketStatus } from "@/features/verification/kyc-types"

/**
 * Every KYC ticket, in one queue, sliced by tags — "seller KYC, KAM
 * requests, waiting on the applicant" — without switching pages. An
 * account has many tickets over time: its onboarding submission, updates
 * the account holder raises, and documents a KAM asks for. What's in the
 * queue follows the hierarchy: a KAM sees the tickets they own plus
 * unclaimed ones; Master KAMs and executives (who hold
 * `onboarding.viewAll`) see every ticket.
 */

type TicketState = "open" | "waiting" | "resolved"
type Filter = TicketState | "all"
type View = "list" | "board"

type Ticket = {
  submission: AdminSubmission
  ticket: KycTicket
  id: string
  state: TicketState
  tags: Tag[]
}

const BOARD_COLUMNS: TicketState[] = ["open", "waiting", "resolved"]

const STATE_OF: Record<KycTicketStatus, TicketState> = {
  open: "open",
  "in-progress": "open",
  waiting: "waiting",
  resolved: "resolved",
}

const ORIGIN_TAG: Record<KycTicket["origin"], Tag> = {
  onboarding: { id: "onboarding", label: "Onboarding" },
  applicant: { id: "applicant-update", label: "Applicant update" },
  staff: { id: "kam-request", label: "KAM request" },
}

const STATE_LABEL: Record<TicketState, { label: string; tone: Tone }> = {
  open: { label: "Open", tone: "warning" },
  waiting: { label: "Waiting on applicant", tone: "danger" },
  resolved: { label: "Resolved", tone: "success" },
}

type Tag = { id: string; label: string }

function tagsOf(submission: AdminSubmission, ticket: KycTicket): Tag[] {
  const tags: Tag[] = [
    submission.role === "buyer" ? { id: "buyer-kyc", label: "Buyer KYC" } : { id: "seller-kyc", label: "Seller KYC" },
    ORIGIN_TAG[ticket.origin],
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
  ORIGIN_TAG.onboarding,
  ORIGIN_TAG.applicant,
  ORIGIN_TAG.staff,
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
  const detail = useDetailRoute({ query: "ticket" })
  const activeTags = searchParams.get("tag")?.split(",").filter(Boolean) ?? []
  const [query, setQuery] = React.useState("")
  const [openId, setOpenId] = React.useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = React.useState(false)

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
        .flatMap((submission) =>
          submission.tickets.map((ticket): Ticket => ({
            submission,
            ticket,
            id: ticket.id,
            state: STATE_OF[ticket.status],
            tags: tagsOf(submission, ticket),
          }))
        )
        .filter(({ ticket }) => seesAll || ticket.assignee?.id === myId || !ticket.assignee)
        .sort((a, b) => b.ticket.openedAt.localeCompare(a.ticket.openedAt)),
    [buyers, sellers, seesAll, myId]
  )

  const needle = query.trim().toLowerCase()
  const tagged = tickets.filter(
    (ticket) =>
      (!mineOnly || ticket.ticket.assignee?.id === myId) &&
      activeTags.every((tag) => ticket.tags.some((entry) => entry.id === tag)) &&
      (!needle || [ticket.id, ticket.ticket.title, ticket.submission.fullName, ticket.submission.email].join(" ").toLowerCase().includes(needle))
  )
  const visible = filter === "all" ? tagged : tagged.filter((ticket) => ticket.state === filter)
  const count = (state: Filter) => (state === "all" ? tagged.length : tagged.filter((ticket) => ticket.state === state).length)
  const sheetTicket = detail.selectedId ? (tickets.find((ticket) => ticket.id === detail.selectedId) ?? null) : null

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
      const onboarding = ticket.ticket.origin === "onboarding"
      const blocked = onboarding
        ? ticket.submission.documents.some((document) => document.reviewStatus === "rejected" || (document.required && document.reviewStatus === "missing"))
        : ticket.ticket.items.some((entry) => owesUpload(entry.status))
      if (blocked) {
        detail.open(ticket.id)
        toast("This one is still waiting on the applicant")
        return
      }
      const by = { id: admin.user.id, name: admin.user.name, title: admin.role.name }
      if (onboarding) approveApplication(ticket.submission.role, ticket.submission.userId, by)
      else resolveKycTicket(ticket.submission.role, ticket.submission.userId, ticket.id, by)
      toast.success(`${ticket.id} ${onboarding ? "approved" : "resolved"}`)
    } else if (to === "waiting") {
      detail.open(ticket.id)
      toast("Say what needs fixing, then send it back")
    } else {
      toast("A ticket reopens when the applicant resubmits")
    }
  }

  if (!admin) return null
  if (sheetTicket) {
    return (
      <DetailPage backLabel="Tickets" onBack={detail.close} trail={["Tickets", sheetTicket.id]}>
        <TooltipProvider delay={300}>
          <SubmissionCard submission={sheetTicket.submission} ticketId={sheetTicket.id} onOpenTicket={detail.open} />
        </TooltipProvider>
      </DetailPage>
    )
  }
  // KYC is SaleOps' queue; raised tickets and catalog requests are open to
  // every role, scoped by level inside `RequestsPanel`.
  const canKyc = admin.can("onboarding.review") || seesAll
  const type: "kyc" | "requests" = searchParams.get("type") === "requests" || !canKyc ? "requests" : "kyc"
  const setType = (value: "kyc" | "requests") => setParams({ type: value === "kyc" ? null : value, status: null, tag: null, view: null, owner: null })
  const typeSwitch = canKyc ? (
    <ButtonGroup
      label="Ticket type"
      value={type}
      onChange={setType}
      options={[
        { value: "kyc", label: "KYC" },
        { value: "requests", label: "Requests" },
      ]}
    />
  ) : null

  if (type === "requests") return <RequestsPanel action={typeSwitch} />

  const ownerName = (ticket: KycTicket) => (ticket.assignee ? (users.find((user) => user.id === ticket.assignee!.id)?.name ?? ticket.assignee.name) : "Unassigned")
  const filterCount = activeTags.length + (mineOnly ? 1 : 0)
  const clearFilters = () => setParams({ tag: null, owner: null })

  return (
    <>
      <ColumnCard
        title="Tickets"
        heading={
          <div className="flex items-center gap-2">
            <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl bg-card px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring/30 sm:max-w-sm">
              <SearchIcon aria-hidden className="size-4 shrink-0" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tickets, names, emails"
                aria-label="Search tickets"
                className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
              />
              {query ? (
                <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="grid size-6 shrink-0 place-items-center rounded-full hover:bg-muted">
                  <XIcon className="size-3.5" />
                </button>
              ) : null}
            </label>
            {/* On a phone every switch and filter lives in one bottom sheet. */}
            <FiltersButton count={filterCount || (type !== "kyc" || view !== "list" ? 1 : 0)} onClick={() => setFiltersOpen(true)} className="sm:hidden" />
          </div>
        }
        action={
          <div className="flex items-center gap-2">
            {typeSwitch}
            <ButtonGroup
              label="View"
              value={view}
              onChange={(value) => setParams({ view: value === "list" ? null : value })}
              options={VIEWS.map((option) => ({ value: option.value, label: option.label, icon: option.icon }))}
            />
            <FiltersButton count={filterCount} onClick={() => setFiltersOpen(true)} labelled />
          </div>
        }
      >
        {view === "list" ? (
          // The status pills sit just under the header's divider and stay
          // put while the tickets scroll beneath.
          <div className="sticky -top-1.5 z-20 -mx-1.5 -mt-1.5 bg-background px-3 pt-2">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <CategoryTabs
                  label="Ticket status"
                  items={[
                    { id: "open", label: "Open", count: count("open") },
                    { id: "waiting", label: "Waiting", count: count("waiting") },
                    { id: "resolved", label: "Resolved", count: count("resolved") },
                    { id: "all", label: "All", count: count("all") },
                  ]}
                  selectedId={filter}
                  onSelect={(next) => setParams({ status: next === "open" ? null : next })}
                />
              </div>
              {filterCount ? (
                <button type="button" onClick={clearFilters} className="shrink-0 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Clear {filterCount} filter{filterCount === 1 ? "" : "s"}
                </button>
              ) : null}
            </div>
            <div aria-hidden className="mt-2 h-px bg-border" />
          </div>
        ) : null}

        {!loaded ? (
          <AdminListSkeleton rows={4} />
        ) : view === "board" ? (
          <TicketBoard tickets={tagged} onOpen={detail.open} onMove={moveTicket} ownerName={ownerName} />
        ) : visible.length === 0 ? (
          <AdminEmptyState
            icon={Inbox}
            title={filter === "open" ? "No open tickets" : "No tickets here"}
            description="A ticket opens when someone submits their KYC, raises a document update, or a KAM asks for a document."
          />
        ) : (
          <TooltipProvider delay={300}>
            <ul className="divide-inset pt-1">
              {visible.map((ticket) => {
                const open = openId === ticket.id
                const state = STATE_LABEL[ticket.state]
                const docs = `${ticket.ticket.items.length} doc${ticket.ticket.items.length === 1 ? "" : "s"}`
                return (
                  <li key={ticket.id}>
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenId(open ? null : ticket.id)}
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-xl px-3 py-3 text-start transition-colors hover:bg-card/70 sm:grid-cols-[6.5rem_minmax(0,1.3fr)_minmax(0,1fr)_8rem_auto_2.25rem_1rem]"
                    >
                      <span className="hidden font-mono text-[12px] text-muted-foreground sm:block">{ticket.id}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-semibold text-foreground">{ticket.submission.fullName || "Unnamed applicant"}</span>
                        <span className="block truncate text-[12.5px] text-muted-foreground">
                          <span className="sm:hidden">{ticket.id} · </span>
                          {ticket.ticket.title} · {docs}
                        </span>
                      </span>
                      <span className="hidden truncate text-[12.5px] text-muted-foreground sm:block">{ticket.tags.map((tag) => tag.label).join(" · ")}</span>
                      <span className={cn("hidden truncate text-[12.5px] sm:block", ticket.ticket.assignee ? "text-foreground" : "text-muted-foreground")}>{ownerName(ticket.ticket)}</span>
                      <span className="justify-self-end sm:justify-self-start">
                        <StatusPill tone={state.tone}>{state.label}</StatusPill>
                      </span>
                      <span className="hidden text-end text-[12px] text-muted-foreground tabular-nums sm:block">{ago(ticket.ticket.openedAt)}</span>
                      <ChevronDownIcon aria-hidden className={cn("hidden size-4 text-muted-foreground transition-transform sm:block", open && "rotate-180")} />
                    </button>
                    {open ? (
                      <div className="px-1 pb-3">
                        <SubmissionCard submission={ticket.submission} ticketId={ticket.id} onOpenTicket={detail.open} />
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </TooltipProvider>
        )}
      </ColumnCard>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="responsive" className="overflow-y-auto sm:max-w-sm">
          <div className="flex flex-col gap-6 pb-2">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Filters</h2>
              <SheetClose aria-label="Close filters" className="grid size-9 place-items-center rounded-full bg-card text-foreground/75 transition-colors hover:bg-muted">
                <XIcon aria-hidden className="size-4" />
              </SheetClose>
            </div>

            {/* The header's switches, for phones where the header has no room. */}
            <div className="flex flex-col gap-6 sm:hidden">
              {canKyc ? (
                <SheetChoice
                  legend="Tickets"
                  value={type}
                  onChange={setType}
                  options={[
                    { value: "kyc", label: "KYC" },
                    { value: "requests", label: "Requests" },
                  ]}
                />
              ) : null}
              <SheetChoice legend="View" value={view} onChange={(value) => setParams({ view: value === "list" ? null : value })} options={VIEWS.map((option) => ({ value: option.value, label: option.label }))} />
            </div>

            {admin.can("onboarding.review") ? (
              <button
                type="button"
                role="switch"
                aria-checked={mineOnly}
                onClick={() => setParams({ owner: mineOnly ? null : "me" })}
                className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3 text-start"
              >
                <span>
                  <span className="block text-[15px] font-medium">Only mine</span>
                  <span className="block text-[12.5px] text-muted-foreground">Tickets assigned to you</span>
                </span>
                <span aria-hidden className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", mineOnly ? "bg-amama-deep" : "bg-foreground/15")}>
                  <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-[inset-inline-start]", mineOnly ? "start-[18px]" : "start-0.5")} />
                </span>
              </button>
            ) : null}

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-[13px] font-medium text-muted-foreground">Tags</legend>
              <div className="flex flex-wrap gap-1.5">
                {FILTER_TAGS.map((tag) => {
                  const on = activeTags.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleTag(tag.id)}
                      className={cn("h-9 rounded-full px-3.5 text-[13.5px] font-medium transition-colors", on ? "bg-graphite text-white" : "bg-card text-foreground hover:bg-muted")}
                    >
                      {tag.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <div className="flex gap-2">
              {filterCount ? (
                <Button variant="outline" className="flex-1" onClick={clearFilters}>
                  Clear
                </Button>
              ) : null}
              <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
                Show {view === "list" ? visible.length : tagged.length} ticket{(view === "list" ? visible.length : tagged.length) === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

/** Opens the filter sheet. A dot (or, labelled, a count) shows when
 *  something is filtered. */
function FiltersButton({ count, onClick, labelled = false, className }: { count: number; onClick: () => void; labelled?: boolean; className?: string }) {
  if (labelled) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn("inline-flex h-9 items-center gap-1.5 rounded-xl bg-card px-3 text-[13.5px] font-medium text-foreground transition-colors hover:bg-muted", className)}
      >
        <SlidersHorizontalIcon aria-hidden className="size-4 text-muted-foreground" />
        Filters
        {count ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-graphite px-1.5 text-[11px] text-white tabular-nums">{count}</span> : null}
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Filters"
      className={cn("relative grid size-10 shrink-0 place-items-center rounded-xl bg-card text-foreground transition-colors hover:bg-muted", className)}
    >
      <SlidersHorizontalIcon aria-hidden className="size-[18px]" />
      {count ? <span aria-hidden className="absolute end-2 top-2 size-2 rounded-full bg-amama-deep ring-2 ring-card" /> : null}
    </button>
  )
}

/** One choice in the filter sheet, as full-width radio rows. */
function SheetChoice<T extends string>({ legend, value, onChange, options }: { legend: string; value: T; onChange: (value: T) => void; options: { value: T; label: string }[] }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[13px] font-medium text-muted-foreground">{legend}</legend>
      <div className="flex gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn("h-11 flex-1 rounded-2xl text-[14.5px] font-medium transition-colors", value === option.value ? "bg-graphite text-white" : "bg-card text-foreground")}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
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
  ownerName: (ticket: KycTicket) => string
}) {
  const [dragging, setDragging] = React.useState<string | null>(null)
  const [over, setOver] = React.useState<TicketState | null>(null)

  return (
    <div className="-mx-1.5 flex snap-x gap-2 overflow-x-auto px-1.5 pb-1.5 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
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
              "flex w-[82%] shrink-0 snap-start flex-col rounded-[20px] bg-card p-2 transition-colors sm:w-auto",
              over === state && "bg-amama-subtle ring-2 ring-amama-deep/30"
            )}
          >
            <header className="flex items-center justify-between gap-2 px-2 pt-1 pb-2.5">
              <StatusPill tone={label.tone}>{label.label}</StatusPill>
              <span className="text-[12px] font-medium text-muted-foreground tabular-nums">{column.length}</span>
            </header>
            {column.length === 0 ? (
              <p className="rounded-2xl bg-background/60 px-3 py-6 text-center text-[12.5px] text-muted-foreground">
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
                        "w-full cursor-grab rounded-2xl bg-background p-3 text-start transition-colors hover:ring-1 hover:ring-border active:cursor-grabbing",
                        dragging === ticket.id && "opacity-50"
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11.5px] text-muted-foreground">{ticket.id}</span>
                        <span className="text-[11.5px] text-muted-foreground tabular-nums">{ago(ticket.ticket.openedAt)}</span>
                      </span>
                      <span className="mt-1.5 block truncate text-[13.5px] font-semibold text-foreground">
                        {ticket.submission.fullName || "Unnamed applicant"}
                      </span>
                      <span className="block truncate text-[12px] text-muted-foreground">{ticket.ticket.title}</span>
                      <span className="mt-1 block truncate text-[11.5px] text-muted-foreground">Owner · {ownerName(ticket.ticket)}</span>
                      <span className="mt-1.5 block truncate text-[11.5px] text-muted-foreground">{ticket.tags.map((tag) => tag.label).join(" · ")}</span>
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
function RequestsPanel({ action }: { action?: React.ReactNode }) {
  const admin = useCurrentAdmin()
  const users = useUsers()
  const tickets = useTickets()
  if (!admin) return null
  const seesAll = admin.can("overview.view")
  const visible = seesAll ? tickets : tickets.filter((ticket) => ticket.assigneeId === admin.user.id || ticket.raisedBy.id === admin.user.id)
  return (
    <TicketsList
      title="Tickets"
      listAction={action}
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
