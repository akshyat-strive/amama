"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  CheckIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  ClockIcon,
  FileCheck2Icon,
  FileSignatureIcon,
  HandshakeIcon,
  MessageSquareIcon,
  PenLineIcon,
  ReceiptIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import { useUsers } from "@/features/admin/user-store"
import { ContractAuthoring } from "@/features/contracts/contract-authoring"
import {
  allClausesAgreed,
  approveDraft,
  cancelPurchaseOrder,
  CLAUSE_LABELS,
  CLAUSE_ORDER,
  confirmPurchaseOrder,
  contractForDeal,
  CONTRACT_STAGE_LABELS,
  CONTRACT_STAGE_ORDER,
  contractsForParty,
  createContract,
  issuePurchaseOrder,
  requestProgress,
  requestsForParty,
  signContract,
  useContracts,
  type ClauseKey,
  type ClauseStatus,
  type Contract,
  type TermSheetRequest,
} from "@/features/contracts/contract-store"
import { TermSheetDialog } from "@/features/contracts/term-sheet-dialog"
import type { ChatParty } from "@/features/marketplace/conversation-store"
import { formatInr } from "@/features/marketplace/currency"
import {
  requestContract,
  useDeals,
  type Deal,
  type NegotiationRound,
} from "@/features/marketplace/deal-store"

const clauseStatusStyles: Record<ClauseStatus, string> = {
  pending: "bg-status-warning/10 text-status-warning",
  agreed: "bg-amama-subtle text-amama-deep",
  disputed: "bg-destructive/10 text-destructive",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })
}

/**
 * Every contract this account can see, and one of them opened in full.
 *
 * One component for all three audiences rather than a KAM copy and a
 * trader copy: the record is identical, only what you may *do* to it
 * differs, and keeping that difference as a handful of `viewer` checks is
 * what stops the two copies drifting into showing different truths about
 * the same contract.
 */
function ContractsView({ viewer, identity }: { viewer: ChatParty; identity: { id: string; name: string } }) {
  // `useSearchParams` opts a route out of static rendering unless it sits
  // under a boundary, and all three roles reach this same component — so
  // the boundary lives here once rather than in each of their pages.
  return (
    <React.Suspense fallback={<ContractsSkeleton />}>
      <ContractsWorkspace viewer={viewer} identity={identity} />
    </React.Suspense>
  )
}

function ContractsSkeleton() {
  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Contracts</h1>
      <div className="mt-6 h-40 animate-pulse rounded-3xl bg-muted" />
    </div>
  )
}

function ContractsWorkspace({
  viewer,
  identity,
}: {
  viewer: ChatParty
  identity: { id: string; name: string }
}) {
  const contracts = useContracts()
  const deals = useDeals()
  const searchParams = useSearchParams()
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const visible = React.useMemo(
    () => (viewer === "kam" ? contracts : contractsForParty(contracts, identity.id)),
    [contracts, identity.id, viewer]
  )

  // No auto-select: the list starts full width, the way Google Chat's own
  // thread list does, and only narrows into a rail once something is
  // actually open — either clicked here, or landed on directly via a
  // `?contract=` deep link (the chat cards' "Open contract" links, which
  // *are* a deliberate destination and should still work exactly as before).
  const requestedId = searchParams.get("contract")
  const effectiveId =
    selectedId ?? (requestedId && visible.some((entry) => entry.id === requestedId) ? requestedId : null)
  const selected = effectiveId ? (visible.find((entry) => entry.id === effectiveId) ?? null) : null

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Contracts</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {viewer === "kam"
          ? "Every agreed deal being turned into paperwork."
          : "The agreements your account manager is putting together for your deals."}
      </p>

      {viewer === "kam" ? (
        <TermSheetRequestQueue deals={deals} contracts={contracts} me={identity} />
      ) : (
        <ReadyForTermSheet deals={deals} contracts={contracts} viewer={viewer} identity={identity} />
      )}

      {visible.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-5 py-16 text-center">
          <FileSignatureIcon className="size-6 text-muted-foreground" />
          <p className="text-[15px] font-semibold">No contracts yet</p>
          <p className="max-w-sm text-[13px] text-muted-foreground">
            {viewer === "kam"
              ? "Open a contract from an agreed deal on the Deals page and it'll appear here."
              : "Once you and your counterparty agree a deal, your account manager opens a contract and it shows up here."}
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start">
          {/* Full width and nothing selected reads as a browsing gallery —
              richer cards, since there's room. The moment something's
              picked it becomes the rail: narrow, compact, and hidden
              outright on a phone (no room to show a list next to a detail
              pane there, so the detail takes the whole screen and a back
              arrow returns to the list, same as a mobile chat app). */}
          <ul
            className={cn(
              "flex flex-col gap-2",
              selected ? "lg:w-[280px] lg:shrink-0" : "w-full",
              selected && "hidden lg:flex"
            )}
          >
            {visible.map((contract) =>
              selected ? (
                <li key={contract.id}>
                  <CompactContractRow
                    contract={contract}
                    active={contract.id === selected.id}
                    onSelect={() => setSelectedId(contract.id)}
                  />
                </li>
              ) : (
                <li key={contract.id}>
                  <ContractGalleryCard contract={contract} onSelect={() => setSelectedId(contract.id)} />
                </li>
              )
            )}
          </ul>

          {selected ? (
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground lg:hidden"
              >
                <ArrowLeftIcon className="size-4" />
                All contracts
              </button>
              <ContractDetail contract={selected} viewer={viewer} identity={identity} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

/** A contract's own "what am I looking at" signal — a disputed clause
 *  outranks everything else (it's the one state that needs someone's
 *  attention right now), then the two states worth celebrating get their
 *  own mark, and every ordinary in-progress stage reads as the same
 *  neutral handshake. Shared by the gallery card and the compact row so a
 *  contract's badge never changes meaning between the two. */
function contractBadge(contract: Contract): { icon: React.ComponentType<{ className?: string }>; tone: "neutral" | "warning" | "success" } {
  if (contract.clauses.some((clause) => clause.status === "disputed")) {
    return { icon: AlertTriangleIcon, tone: "warning" }
  }
  if (contract.stage === "final") return { icon: FileCheck2Icon, tone: "success" }
  if (contract.stage === "signatures") return { icon: PenLineIcon, tone: "neutral" }
  return { icon: HandshakeIcon, tone: "neutral" }
}

const badgeToneStyles: Record<"neutral" | "warning" | "success", string> = {
  neutral: "bg-amama-subtle text-amama-deep",
  warning: "bg-status-warning/15 text-status-warning",
  success: "bg-amama-deep text-white",
}

/** The narrow-rail row, once something's selected — compact, just enough
 *  to tell contracts apart while the detail pane does the real work. */
function CompactContractRow({
  contract,
  active,
  onSelect,
}: {
  contract: Contract
  active: boolean
  onSelect: () => void
}) {
  const badge = contractBadge(contract)
  const BadgeIcon = badge.icon
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-[18px] border p-3.5 text-start transition-colors",
        active ? "border-amama-deep bg-amama-subtle" : "border-border bg-card hover:bg-muted"
      )}
    >
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", badgeToneStyles[badge.tone])}>
        <BadgeIcon className="size-[15px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold text-foreground">{contract.listingTitle}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{contract.reference}</p>
        <p className="mt-1.5 inline-flex rounded-full bg-card px-2 py-0.5 text-[11px] font-semibold text-amama-deep">
          {CONTRACT_STAGE_LABELS[contract.stage]}
        </p>
      </div>
    </button>
  )
}

/** The full-width browsing card — shown only while nothing's selected, so
 *  it can afford to say more: the stage as a filled progress bar rather
 *  than just a label, since at this width there's room for the fuller
 *  answer to "where is this one" without opening it. Led with the badge
 *  and the product itself (what a KAM or trader actually scans a list
 *  for) rather than the reference code, which is a lookup key, not a
 *  headline. */
function ContractGalleryCard({ contract, onSelect }: { contract: Contract; onSelect: () => void }) {
  const stageIndex = CONTRACT_STAGE_ORDER.indexOf(contract.stage)
  const progressPct = ((stageIndex + 1) / CONTRACT_STAGE_ORDER.length) * 100
  const badge = contractBadge(contract)
  const BadgeIcon = badge.icon

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full rounded-2xl border border-border bg-card p-4 text-start transition-colors hover:border-amama-deep/40 hover:bg-muted"
    >
      <div className="flex items-start gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", badgeToneStyles[badge.tone])}>
          <BadgeIcon className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold tracking-tight text-foreground">{contract.listingTitle}</p>
              <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{contract.reference}</p>
            </div>
            <span className="shrink-0 rounded-full bg-amama-subtle px-2.5 py-1 text-[11px] font-semibold text-amama-deep">
              {CONTRACT_STAGE_LABELS[contract.stage]}
            </span>
          </div>
          <p className="mt-2 truncate text-[12px] text-muted-foreground">
            {contract.buyerName} ↔ {contract.sellerName}
          </p>
          <p className="mt-2 text-[13px] font-semibold text-foreground tabular-nums">
            {formatInr(contract.terms.pricePerTonneUsd)}/t × {contract.terms.quantityMt} MT
          </p>
          <div aria-hidden className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-amama-deep" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>
    </button>
  )
}

/**
 * A buyer or seller's own nudge: any deal they're party to that's agreed
 * but has no contract yet. Silent once there's nothing to ask for — this
 * is a prompt, not a permanent fixture of the page.
 */
function ReadyForTermSheet({
  deals,
  contracts,
  viewer,
  identity,
}: {
  deals: Deal[]
  contracts: Contract[]
  viewer: ChatParty
  identity: { id: string; name: string }
}) {
  const pending = deals.filter(
    (deal) =>
      deal.status === "active" &&
      (viewer === "buyer" ? deal.buyerId === identity.id : deal.sellerId === identity.id) &&
      !contractForDeal(contracts, deal.id)
  )
  if (pending.length === 0) return null

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-[15px] font-semibold">Ready for a term sheet</h2>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        Agreed deals that haven&apos;t become paperwork yet.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {pending.map((deal) => {
          const counterparty = viewer === "buyer" ? deal.sellerName : deal.buyerName
          return (
            <li
              key={deal.id}
              className="flex flex-wrap items-center gap-3 rounded-[14px] bg-muted px-3.5 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-foreground">{deal.listingTitle}</p>
                <p className="truncate text-[12px] text-muted-foreground">
                  with {counterparty} · {formatInr(deal.agreedPricePerTonneUsd)}/t × {deal.agreedQuantityMt} MT
                </p>
              </div>
              {deal.contractRequestedAt ? (
                <span className="shrink-0 rounded-full bg-status-warning/10 px-3 py-1 text-[12px] font-semibold text-status-warning">
                  Requested {formatDate(deal.contractRequestedAt)}
                </span>
              ) : (
                <Button size="sm" onClick={() => requestContract(deal.id, viewer as "buyer" | "seller", identity.name)}>
                  Request a term sheet
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/**
 * The KAM side of the same signal — every agreed deal a trader has asked
 * to formalize, that nobody's picked up yet. Self-claim needs no special
 * grant (see the identical reasoning on `assignKam` in `deals-view.tsx`);
 * handing it to someone else does, and shows what everyone's already
 * carrying so a Master KAM isn't reassigning blind.
 */
function TermSheetRequestQueue({
  deals,
  contracts,
  me,
}: {
  deals: Deal[]
  contracts: Contract[]
  me: { id: string; name: string }
}) {
  const admin = useCurrentAdmin()
  const users = useUsers()

  const queue = deals.filter(
    (deal) => deal.status === "active" && deal.contractRequestedAt && !contractForDeal(contracts, deal.id)
  )
  if (queue.length === 0 || !admin) return null

  const workload = (userId: string) => contracts.filter((contract) => contract.kamId === userId).length

  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-[15px] font-semibold">
        Term sheet requests <span className="font-normal text-muted-foreground">· {queue.length}</span>
      </h2>
      <p className="mt-0.5 text-[13px] text-muted-foreground">
        Agreed deals waiting for someone to open the paperwork.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {queue.map((deal) => (
          <li key={deal.id} className="flex flex-wrap items-center gap-3 rounded-[14px] bg-muted px-3.5 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-foreground">{deal.listingTitle}</p>
              <p className="truncate text-[12px] text-muted-foreground">
                {deal.buyerName} ↔ {deal.sellerName} · requested by{" "}
                {deal.contractRequestedBy === "seller" ? deal.sellerName : deal.buyerName} ·{" "}
                {deal.contractRequestedAt ? formatDate(deal.contractRequestedAt) : "—"}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {admin.can("deals.work") ? (
                <Button size="sm" variant="outline" onClick={() => createContract(deal, me)}>
                  Start the term sheet
                </Button>
              ) : null}
              {admin.can("deals.assign") ? (
                <Select
                  onValueChange={(value) => {
                    const user = users.find((entry) => entry.id === value)
                    if (user) createContract(deal, user)
                  }}
                >
                  <SelectTrigger size="sm">
                    <SelectValue placeholder="Assign to…" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Nobody has signed in yet
                      </SelectItem>
                    ) : (
                      users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} — {workload(user.id)} open
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * What the viewer actually needs to do, if anything — computed fresh from
 * the same fields every section below already reads, not a separate
 * status to keep in sync. Answering "what do I need to do here" before
 * anything else is the single biggest thing standing between this screen
 * and "confusing": everything below is detail; this is the answer.
 */
function actionItemsFor(contract: Contract, viewer: ChatParty): string[] {
  const items: string[] = []
  const isTrader = viewer === "buyer" || viewer === "seller"

  if (isTrader) {
    for (const request of requestsForParty(contract, viewer)) {
      if (request.status !== "submitted") items.push(`Fill in "${request.title}"`)
    }
  } else {
    for (const request of contract.requests) {
      if (request.status !== "submitted") {
        const partyName = request.party === "buyer" ? contract.buyerName : contract.sellerName
        items.push(`Waiting on ${partyName} for "${request.title}"`)
      }
    }
  }

  const disputed = contract.clauses.filter((clause) => clause.status === "disputed")
  if (disputed.length > 0) {
    items.push(`${disputed.length} clause${disputed.length === 1 ? "" : "s"} disputed in the term sheet`)
  }

  // Every clause agreed and no live PO yet is the one moment a buyer would
  // otherwise have to notice for themselves, scrolling past an already-
  // resolved term sheet to spot that the next step (raising the PO) is
  // now theirs to take.
  if (allClausesAgreed(contract) && (!contract.po || contract.po.cancelledAt)) {
    items.push(
      viewer === "buyer"
        ? "Raise the purchase order"
        : viewer === "seller"
          ? `Waiting on ${contract.buyerName} to raise the purchase order`
          : `Term sheet agreed — waiting on ${contract.buyerName} to raise the purchase order`
    )
  }

  if (contract.po && !contract.po.cancelledAt && contract.po.status === "pending-seller-confirmation") {
    items.push(
      viewer === "seller"
        ? "Confirm the purchase order"
        : viewer === "buyer"
          ? `Waiting on ${contract.sellerName} to confirm the purchase order`
          : `Purchase order awaiting ${contract.sellerName}'s confirmation`
    )
  }

  if (contract.draftBody) {
    const signing = contract.stage === "signatures" || contract.stage === "final"
    const state = signing ? contract.signatures : contract.approvals
    if (isTrader && !state[viewer as "buyer" | "seller"].agreed) {
      items.push(signing ? "Sign the contract" : "Approve the draft")
    }
  }

  const openAmendments = contract.amendments.filter((amendment) => !amendment.resolved)
  if (viewer === "kam" && openAmendments.length > 0) {
    items.push(`${openAmendments.length} change request${openAmendments.length === 1 ? "" : "s"} to address`)
  }

  if (contract.shipmentDates && !contract.shipmentDates.chosenOptionId && viewer === "buyer") {
    items.push("Pick a shipping date")
  }

  return items
}

function ActionItemsBanner({ items }: { items: string[] }) {
  return (
    <section className="rounded-2xl border border-status-warning/25 bg-status-warning/5 p-4">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
        <ClipboardCheckIcon className="size-4 text-status-warning" />
        Needs your attention
      </h3>
      <ul className="mt-2 flex flex-col gap-1">
        {items.map((item) => (
          <li key={item} className="flex items-baseline gap-2 text-[13px] text-foreground">
            <span aria-hidden className="text-status-warning">
              ·
            </span>
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}

function ContractDetail({
  contract,
  viewer,
  identity,
}: {
  contract: Contract
  viewer: ChatParty
  identity: { id: string; name: string }
}) {
  const deals = useDeals()
  const deal = deals.find((entry) => entry.id === contract.dealId) ?? null
  const isTrader = viewer === "buyer" || viewer === "seller"
  const myRequests = isTrader ? requestsForParty(contract, viewer) : contract.requests
  const actionItems = actionItemsFor(contract, viewer)

  return (
    <div className="flex flex-col gap-4">
      {/* Overview — who, what, where in the process, and the commercial
          terms. Everything a reader needs to orient before anything else,
          grouped in the one place that's always visible. */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[17px] font-bold tracking-tight">{contract.reference}</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{contract.listingTitle}</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {contract.buyerName} ↔ {contract.sellerName} · managed by{" "}
              <span className="font-medium text-foreground">{contract.kamName}</span>
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-amama-subtle px-3 py-1 text-[12px] font-semibold text-amama-deep">
            {CONTRACT_STAGE_LABELS[contract.stage]}
          </span>
        </div>

        <div className="mt-4">
          <StageRail stage={contract.stage} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Term label="Price" value={`${formatInr(contract.terms.pricePerTonneUsd)}/t`} />
          <Term label="Quantity" value={`${contract.terms.quantityMt} MT`} />
          <Term
            label="Total value"
            value={formatInr(contract.terms.pricePerTonneUsd * contract.terms.quantityMt)}
          />
          <Term label="Incoterm" value={contract.terms.incoterm ?? "—"} />
          <Term label="Payment" value={contract.terms.paymentTerm ?? "—"} />
          <Term label="Origin" value={contract.terms.originPort ?? "—"} />
          <Term label="Destination" value={contract.terms.destinationPort ?? "—"} />
          <Term label="Quality" value={contract.terms.qualitySpec ?? "—"} />
        </dl>
      </section>

      {/* What to do next, if anything — answered before any of the detail
          sections that explain *why*. */}
      {actionItems.length > 0 ? <ActionItemsBanner items={actionItems} /> : null}

      {/* Paperwork: the term sheet and the PO issued off it, together —
          they're one sequential story (clauses agreed → PO locks them in),
          not two unrelated topics, so they share one card with an internal
          seam instead of two identically-weighted ones. */}
      {contract.clauses.length > 0 || contract.po ? (
        <PaperworkSection contract={contract} viewer={viewer} viewerName={identity.name} />
      ) : null}

      {myRequests.length > 0 ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <ClipboardListIcon className="size-4 text-muted-foreground" />
            {isTrader ? "What you've been asked for" : "Details requested from both sides"}
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {myRequests.map((request) => (
              <RequestRow
                key={request.id}
                contract={contract}
                request={request}
                viewer={viewer}
                viewerName={identity.name}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {/* Draft, its approvals or signatures, and any changes raised
          against it — again one story (a draft, and what's still open on
          it) rather than a draft card followed by a separate amendments
          card that only makes sense next to it. */}
      {contract.draftBody ? (
        <DraftSection contract={contract} viewer={viewer} viewerName={identity.name} />
      ) : null}

      {contract.shipmentDates ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold">
            <CalendarDaysIcon className="size-4 text-muted-foreground" />
            Shipping date
          </h3>
          {contract.shipmentDates.chosenOptionId ? (
            <p className="mt-2 text-[13px] text-foreground">
              {formatDate(
                contract.shipmentDates.options.find(
                  (option) => option.id === contract.shipmentDates?.chosenOptionId
                )?.date ?? ""
              )}{" "}
              <span className="text-muted-foreground">— chosen by {contract.shipmentDates.chosenBy}</span>
            </p>
          ) : (
            <p className="mt-2 text-[13px] text-muted-foreground">
              {contract.shipmentDates.options.length} dates offered — waiting for {contract.buyerName} to pick
              one in the conversation.
            </p>
          )}
        </section>
      ) : null}

      {viewer === "kam" ? <ContractAuthoring contract={contract} kamName={identity.name} /> : null}

      {/* History — how the price was actually agreed. Real and worth
          keeping, but it's the past, not something to act on, so it's
          collapsed by default rather than competing with everything above
          it for the same amount of attention. */}
      {deal ? <NegotiationHistory deal={deal} /> : null}
    </div>
  )
}

/** Collapsed by default — a KAM drafting the contract, or anyone curious
 *  how the price landed where it did, expands it; everyone else never
 *  has to scroll past it. */
function NegotiationHistory({ deal }: { deal: Deal }) {
  const [open, setOpen] = React.useState(false)
  return (
    <section className="rounded-2xl border border-border bg-muted/40 p-5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-start text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <HandshakeIcon className="size-4" />
        How this deal was agreed
        <span className="text-[12px] font-normal">
          ({deal.rounds.length} {deal.rounds.length === 1 ? "round" : "rounds"})
        </span>
        <ChevronDownIcon className={cn("ms-auto size-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <ol className="mt-3 flex flex-col gap-2">
          {deal.rounds.map((round) => (
            <RoundRow key={round.id} round={round} />
          ))}
        </ol>
      ) : null}
    </section>
  )
}

/** The term sheet's clauses, and — once every one of them is agreed — the
 *  PO issued off it, in one card: a PO is what a term sheet *becomes*, so
 *  reading them as two separately-bordered topics splits one story into
 *  two seemingly unrelated ones. */
function PaperworkSection({
  contract,
  viewer,
  viewerName,
}: {
  contract: Contract
  viewer: ChatParty
  viewerName: string
}) {
  const [issuing, setIssuing] = React.useState(false)
  const allAgreed = allClausesAgreed(contract)
  const canIssue = viewer === "buyer" && allAgreed && (!contract.po || contract.po.cancelledAt)
  const po = contract.po
  const cancelled = !!po?.cancelledAt
  const needsSellerConfirm = po?.status === "pending-seller-confirmation" && !cancelled

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      {contract.clauses.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold">
              <FileCheck2Icon className="size-4 text-muted-foreground" />
              Term sheet
            </h3>
            {canIssue ? (
              <Button size="sm" onClick={() => setIssuing(true)}>
                Issue PO
              </Button>
            ) : null}
          </div>
          <ul className="mt-3 flex flex-col gap-1.5">
            {contract.clauses.map((clause) => (
              <li key={clause.id} className="flex items-baseline justify-between gap-2 text-[13px]">
                <span className="text-muted-foreground">{clause.label}</span>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium text-foreground">{clause.value ?? "—"}</span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      clauseStatusStyles[clause.status]
                    )}
                  >
                    {clause.status === "pending" ? "Pending" : clause.status === "agreed" ? "Agreed" : "Disputed"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {!allAgreed ? (
            <p className="mt-3 text-[12px] text-muted-foreground">
              Every clause needs both sides to agree before a PO can be issued — see the term sheet card in the
              conversation to propose or agree a value.
            </p>
          ) : null}
        </>
      ) : null}

      {po ? (
        <div className={cn(contract.clauses.length > 0 && "mt-4 border-t border-border pt-4")}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold">
              <ReceiptIcon className="size-4 text-muted-foreground" />
              Purchase order
            </h3>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                cancelled
                  ? "bg-muted text-muted-foreground"
                  : needsSellerConfirm
                    ? "bg-status-warning/10 text-status-warning"
                    : "bg-amama-subtle text-amama-deep"
              )}
            >
              {cancelled
                ? "Withdrawn"
                : po.status === "auto-accepted"
                  ? "Binding — matched exactly"
                  : po.status === "confirmed"
                    ? "Binding — confirmed"
                    : "Awaiting seller confirmation"}
            </span>
          </div>
          {po.deviatedClauses.length > 0 ? (
            <p className="mt-2 flex items-start gap-1.5 text-[12px] text-status-warning">
              <AlertTriangleIcon className="mt-px size-3.5 shrink-0" />
              Changed at issuance: {po.deviatedClauses.map((key) => CLAUSE_LABELS[key]).join(", ")}
            </p>
          ) : null}
          {needsSellerConfirm ? (
            <div className="mt-3 flex gap-2">
              {viewer === "seller" ? (
                <Button size="sm" onClick={() => confirmPurchaseOrder(contract.id, viewerName)}>
                  <CheckIcon className="size-4" />
                  Confirm PO
                </Button>
              ) : null}
              {viewer === "buyer" ? (
                <Button size="sm" variant="outline" onClick={() => cancelPurchaseOrder(contract.id, viewerName)}>
                  Withdraw PO
                </Button>
              ) : null}
              {viewer === "kam" ? (
                <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <ClockIcon className="size-3.5" />
                  Waiting on {contract.sellerName}.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <IssuePoDialog open={issuing} onOpenChange={setIssuing} contract={contract} viewerName={viewerName} />
    </section>
  )
}

/** The one moment the buyer can change something on the way out — issuing
 *  exactly the agreed values is one click; editing any of them here is
 *  what turns this into a counter-offer (see `issuePurchaseOrder`). */
function IssuePoDialog({
  open,
  onOpenChange,
  contract,
  viewerName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contract: Contract
  viewerName: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Issue PO — {contract.reference}</DialogTitle>
          <DialogDescription>
            These are the agreed term sheet values. Issuing them as-is is binding immediately; changing any of
            them here makes this a counter-offer {contract.sellerName} will need to confirm.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, same convention as `DealTermsDialog`'s
            `TermsFields` — a fresh mount reads the agreed values through
            `useState` initializers instead of an effect racing to reset
            whatever was half-edited and abandoned last time. */}
        {open ? (
          <IssuePoFields
            contract={contract}
            onSubmit={(values) => {
              issuePurchaseOrder(contract.id, viewerName, values)
              onOpenChange(false)
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function IssuePoFields({
  contract,
  onSubmit,
}: {
  contract: Contract
  onSubmit: (values: Record<ClauseKey, string>) => void
}) {
  const [values, setValues] = React.useState<Record<ClauseKey, string>>(
    () =>
      Object.fromEntries(
        CLAUSE_ORDER.map((key) => [key, contract.clauses.find((clause) => clause.key === key)?.value ?? ""])
      ) as Record<ClauseKey, string>
  )

  return (
    <>
      <div className="flex flex-col gap-2.5">
        {CLAUSE_ORDER.map((key) => (
          <label key={key} className="flex flex-col gap-1 text-[12px] font-medium text-foreground">
            {CLAUSE_LABELS[key]}
            <Input
              value={values[key]}
              onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}
            />
          </label>
        ))}
      </div>
      <DialogFooter>
        <Button onClick={() => onSubmit(values)}>Issue PO</Button>
      </DialogFooter>
    </>
  )
}

/** The seven steps, as a rail. Reads as "where are we" at a glance, which
 *  is the single most common question anyone opens a contract to answer. */
function StageRail({ stage }: { stage: Contract["stage"] }) {
  const currentIndex = CONTRACT_STAGE_ORDER.indexOf(stage)
  return (
    <ol className="flex flex-wrap gap-1.5">
      {CONTRACT_STAGE_ORDER.map((entry, index) => {
        const done = index < currentIndex
        const current = index === currentIndex
        return (
          <li
            key={entry}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
              current
                ? "bg-amama-deep text-white"
                : done
                  ? "bg-amama-subtle text-amama-deep"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {done ? <CheckIcon className="size-3" /> : null}
            {CONTRACT_STAGE_LABELS[entry]}
          </li>
        )
      })}
    </ol>
  )
}

function Term({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="truncate text-[14px] font-bold text-foreground">{value}</dd>
    </div>
  )
}

const roundOutcomeStyles = {
  pending: "bg-status-warning/10 text-status-warning",
  accepted: "bg-amama-subtle text-amama-deep",
  declined: "bg-destructive/10 text-destructive",
  countered: "bg-muted text-muted-foreground",
} as const

function RoundRow({ round }: { round: NegotiationRound }) {
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-[14px] bg-muted px-3 py-2.5 text-[13px]">
      <span className="font-semibold text-foreground">{round.byName}</span>
      <span className="tabular-nums text-foreground">
        {formatInr(round.pricePerTonneUsd)}/t × {round.quantityMt} MT
      </span>
      {round.incoterm ? <span className="text-muted-foreground">{round.incoterm}</span> : null}
      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", roundOutcomeStyles[round.outcome])}>
        {round.outcome === "pending" ? "Awaiting reply" : round.outcome}
        {round.outcomeBy ? ` · ${round.outcomeBy}` : ""}
      </span>
      <span className="ms-auto text-[12px] text-muted-foreground">{formatDate(round.at)}</span>
      {round.comments.length > 0 ? (
        <span className="flex w-full items-center gap-1.5 text-[12px] text-muted-foreground">
          <MessageSquareIcon className="size-3" />
          {round.comments.map((comment) => `${comment.byName}: ${comment.text}`).join(" · ")}
        </span>
      ) : null}
    </li>
  )
}

function RequestRow({
  contract,
  request,
  viewer,
  viewerName,
}: {
  contract: Contract
  request: TermSheetRequest
  viewer: ChatParty
  viewerName: string
}) {
  const [open, setOpen] = React.useState(false)
  const progress = requestProgress(request)
  const isRecipient = viewer === request.party

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-[14px] bg-muted px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-foreground">{request.title}</p>
        <p className="text-[12px] text-muted-foreground">
          {viewer === "kam" ? `${request.party === "buyer" ? contract.buyerName : contract.sellerName} · ` : ""}
          {progress.done}/{progress.total} required items ·{" "}
          {request.status === "submitted" ? "submitted" : "in progress"}
        </p>
      </div>
      <Button size="sm" variant={request.status === "submitted" ? "outline" : "default"} onClick={() => setOpen(true)}>
        {isRecipient && request.status !== "submitted" ? "Fill this in" : "View"}
      </Button>
      <TermSheetDialog
        open={open}
        onOpenChange={setOpen}
        contractId={contract.id}
        request={request}
        partyName={viewerName}
        readOnly={!isRecipient}
      />
    </li>
  )
}

function DraftSection({
  contract,
  viewer,
  viewerName,
}: {
  contract: Contract
  viewer: ChatParty
  viewerName: string
}) {
  const isTrader = viewer === "buyer" || viewer === "seller"
  const signing = contract.stage === "signatures" || contract.stage === "final"
  const state = signing ? contract.signatures : contract.approvals
  const mine = isTrader ? state[viewer] : null

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold">
          <PenLineIcon className="size-4 text-muted-foreground" />
          Draft v{contract.draftVersion}
        </h3>
        {isTrader && !mine?.agreed ? (
          <Button
            size="sm"
            onClick={() =>
              signing
                ? signContract(contract.id, viewer, viewerName)
                : approveDraft(contract.id, viewer, viewerName)
            }
          >
            <CheckIcon className="size-4" />
            {signing ? "Sign contract" : "I agree to this draft"}
          </Button>
        ) : null}
      </div>

      <div className="mt-3 flex flex-col gap-1.5">
        <ApprovalLine name={contract.buyerName} label="Buyer" approval={state.buyer} />
        <ApprovalLine name={contract.sellerName} label="Seller" approval={state.seller} />
      </div>

      <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-[14px] bg-muted p-4 font-sans text-[13px] leading-relaxed text-foreground">
        {contract.draftBody}
      </pre>

      {/* Changes requested against this draft — kept with the draft they're
          about rather than as a card of their own a reader has to first
          connect back to it. */}
      {contract.amendments.length > 0 ? (
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">
            Changes requested
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {contract.amendments.map((amendment) => (
              <li
                key={amendment.id}
                className={cn(
                  "rounded-[14px] px-3 py-2.5 text-[13px]",
                  amendment.resolved ? "bg-muted text-muted-foreground" : "bg-status-warning/10 text-foreground"
                )}
              >
                <span className="font-semibold">{amendment.raisedByName}</span> · {formatDate(amendment.at)}
                {amendment.resolved ? " · resolved" : ""}
                <p className="mt-0.5">{amendment.text}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

function ApprovalLine({
  name,
  label,
  approval,
}: {
  name: string
  label: string
  approval: { agreed: boolean; at: string | null }
}) {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full",
          approval.agreed ? "bg-amama-deep text-white" : "bg-border text-muted-foreground"
        )}
      >
        {approval.agreed ? <CheckIcon className="size-3" /> : <span className="size-1.5 rounded-full bg-current" />}
      </span>
      <span className="min-w-0 flex-1 truncate text-foreground">
        {name} <span className="text-muted-foreground">· {label}</span>
      </span>
      <span className="shrink-0 text-[12px] text-muted-foreground">
        {approval.agreed && approval.at ? formatDate(approval.at) : "Waiting"}
      </span>
    </div>
  )
}

export { ContractsView }
