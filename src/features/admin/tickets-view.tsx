"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronDownIcon, Inbox, SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AdminEmptyState, AdminListSkeleton } from "@/features/admin/admin-ui"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import { StatusPill, type Tone } from "@/features/admin/review-ui"
import { SubmissionCard } from "@/features/admin/review-queue-view"
import { PAGE_TABS_SPACE, PageTabs } from "@/features/dashboard/page-tabs"
import { countries } from "@/features/onboarding/countries"
import type { ReviewStatus } from "@/features/verification/verification-context"
import {
  useAllVerificationQueuesLoaded,
  useVerificationQueue,
  type AdminSubmission,
} from "@/features/verification/admin-verification"
import { kycTicketId } from "@/features/verification/ticket"

/**
 * Every KYC application as a ticket, in one queue. Buyer and seller
 * applications used to live on two separate pages; here they are tags on
 * the same list, alongside the account type, so a reviewer can slice the
 * queue any way — "seller KYC, producers, waiting on me" — without
 * switching pages.
 */

type TicketState = "open" | "waiting" | "resolved"
type Filter = TicketState | "all"

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

  const tickets = React.useMemo(
    () =>
      [...buyers, ...sellers]
        .map((submission) => ({
          submission,
          id: kycTicketId(submission.role, submission.email),
          state: STATE_OF[submission.reviewStatus],
          tags: tagsOf(submission),
        }))
        .filter((ticket): ticket is typeof ticket & { state: TicketState } => ticket.state !== null)
        .sort((a, b) => (b.submission.submittedAt ?? "").localeCompare(a.submission.submittedAt ?? "")),
    [buyers, sellers]
  )

  const needle = query.trim().toLowerCase()
  const tagged = tickets.filter(
    (ticket) =>
      activeTags.every((tag) => ticket.tags.some((entry) => entry.id === tag)) &&
      (!needle || [ticket.id, ticket.submission.fullName, ticket.submission.email].join(" ").toLowerCase().includes(needle))
  )
  const visible = filter === "all" ? tagged : tagged.filter((ticket) => ticket.state === filter)
  const count = (state: Filter) => (state === "all" ? tagged.length : tagged.filter((ticket) => ticket.state === state).length)

  if (!admin) return null
  if (!admin.can("onboarding.review")) {
    return (
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Tickets</h1>
        <AdminEmptyState
          icon={Inbox}
          title="No review permission on your role"
          description="Ask a Master Admin for the 'Review onboarding' permission to see tickets here."
        />
      </div>
    )
  }

  return (
    <div className={PAGE_TABS_SPACE}>
      <h1 className="text-[28px] font-bold tracking-tight">Tickets</h1>

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
                    className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-4 py-3.5 text-start transition-colors hover:bg-muted/50 sm:grid-cols-[7rem_minmax(0,1.4fr)_minmax(0,1.6fr)_9rem_3rem_1rem]"
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
    </div>
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
