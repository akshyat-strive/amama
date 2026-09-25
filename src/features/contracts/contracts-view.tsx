"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  AlertTriangleIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  CheckIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  ClockIcon,
  FileCheck2Icon,
  HandshakeIcon,
  MessageSquareIcon,
  PenLineIcon,
  ReceiptIcon,
  FileTextIcon,
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
import { Sheet, SheetContent, SheetCloseButton } from "@/components/ui/sheet"
import { PAGE_TABS_SPACE, PageTabs } from "@/features/dashboard/page-tabs"
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
import { IncotermInfoButton } from "@/features/marketplace/incoterm-picker"
import {
  requestContract,
  useDeals,
  type Deal,
  type NegotiationRound,
} from "@/features/marketplace/deal-store"
import { StageDots } from "@/features/orders/order-journey"

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

type ContractsTab = "requests" | "prepared"

function ContractsWorkspace({
  viewer,
  identity,
}: {
  viewer: ChatParty
  identity: { id: string; name: string }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const contracts = useContracts()
  const deals = useDeals()
  const searchParams = useSearchParams()

  const prepared = React.useMemo(
    () => (viewer === "kam" ? contracts : contractsForParty(contracts, identity.id)),
    [contracts, identity.id, viewer]
  )

  // A term sheet "request" is an agreed deal with no contract opened
  // against it yet — a buyer/seller's own nudge on their own deals, or
  // (for a KAM) every trader's nudge that nobody's picked up.
  const requests = React.useMemo(
    () =>
      deals.filter(
        (deal) =>
          deal.status === "active" &&
          !contractForDeal(contracts, deal.id) &&
          (viewer === "kam"
            ? !!deal.contractRequestedAt
            : viewer === "buyer"
              ? deal.buyerId === identity.id
              : deal.sellerId === identity.id)
      ),
    [deals, contracts, viewer, identity.id]
  )

  const tab: ContractsTab = searchParams.get("tab") === "prepared" ? "prepared" : "requests"
  const selectedId = searchParams.get("contract")
  const selected = selectedId ? (prepared.find((entry) => entry.id === selectedId) ?? null) : null

  const setParams = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value === null) params.delete(key)
      else params.set(key, value)
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }
  const setTab = (next: ContractsTab) => setParams({ tab: next === "requests" ? null : next, contract: null })
  const openContract = (id: string) => setParams({ contract: id })
  const closeSheet = () => setParams({ contract: null })

  return (
    <div className={PAGE_TABS_SPACE}>
      <h1 className="text-[28px] font-bold tracking-tight">Contracts</h1>

      <PageTabs
        label="Contract lists"
        className="mt-5"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "requests", label: "Requests", count: requests.length },
          { value: "prepared", label: "Prepared", count: prepared.length },
        ]}
      />

      {tab === "requests" ? (
        requests.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-border px-5 py-10 text-center text-[13px] text-muted-foreground">
            {viewer === "kam"
              ? "No agreed deals are waiting on a term sheet right now."
              : "Once you and your counterparty agree a deal, request a term sheet and it'll show up here."}
          </p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {requests.map((deal) => (
              <li key={deal.id}>
                {viewer === "kam" ? (
                  <KamRequestRow deal={deal} contracts={contracts} me={identity} />
                ) : (
                  <TraderRequestRow deal={deal} viewer={viewer as "buyer" | "seller"} identity={identity} />
                )}
              </li>
            ))}
          </ul>
        )
      ) : prepared.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-border px-5 py-10 text-center text-[13px] text-muted-foreground">
          {viewer === "kam"
            ? "Open a contract from an agreed deal on the Deals page and it'll appear here."
            : "Once your account manager opens a contract, it shows up here."}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {prepared.map((contract) => (
            <li key={contract.id}>
              <ContractRow contract={contract} viewer={viewer} onSelect={() => openContract(contract.id)} />
            </li>
          ))}
        </ul>
      )}

      <Sheet open={selected !== null} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent side="responsive" className="overflow-y-auto">
          {/* <SheetCloseButton /> */}
          {selected ? <ContractDetail contract={selected} viewer={viewer} identity={identity} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}

/** Same multicolumn "excel sheet" row shape used across Shipments and
 *  Orders — identity and stage on the left, two label/value reference
 *  columns in the middle, a right-aligned headline value with its own
 *  progress readout beneath it. */
function ContractRow({
  contract,
  viewer,
  onSelect,
}: {
  contract: Contract
  viewer: ChatParty
  onSelect: () => void
}) {
  const stageIndex = CONTRACT_STAGE_ORDER.indexOf(contract.stage)
  const total = CONTRACT_STAGE_ORDER.length
  const disputed = contract.clauses.some((clause) => clause.status === "disputed")
  const counterparty = viewer === "buyer" ? contract.sellerName : viewer === "seller" ? contract.buyerName : `${contract.buyerName} ↔ ${contract.sellerName}`

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group grid w-full grid-cols-1 items-center gap-3 bg-white px-4 py-4 text-start transition-colors hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:grid-cols-[1.3fr_0.85fr_0.85fr_1fr]"
    >
      {/* Col 1: Identity & Stage */}
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[13px] font-semibold text-foreground">{contract.listingTitle}</p>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
              disputed ? "bg-destructive/10 text-destructive" : "bg-amama-subtle text-amama-deep"
            )}
          >
            <span aria-hidden className={cn("size-1.5 rounded-full", disputed ? "bg-destructive" : "bg-amama-deep")} />
            {CONTRACT_STAGE_LABELS[contract.stage]}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className="font-medium text-foreground/80">{contract.reference}</span>
        </div>
        <p className="truncate text-[12px] text-muted-foreground">
          {contract.buyerName} ↔ {contract.sellerName} · managed by{" "}
          <span className="font-medium text-foreground">{contract.kamName}</span>
        </p>
      </div>

      {/* Col 2: Counterparty */}
      <div className="hidden min-w-0 flex-col justify-center text-[12px] sm:flex">
        <span className="text-muted-foreground">Counterparty</span>
        <span className="truncate font-semibold text-foreground">{counterparty}</span>
      </div>

      {/* Col 3: KAM */}
      <div className="hidden min-w-0 flex-col justify-center text-[12px] sm:flex">
        <span className="text-muted-foreground">KAM</span>
        <span className="truncate font-semibold text-foreground">{contract.kamName}</span>
      </div>

      {/* Col 4: Contract value + stage progress */}
      <div className="flex w-full items-center justify-between gap-3 tabular-nums sm:w-auto sm:flex-col sm:items-end sm:gap-1">
        <span className="text-[14px] font-semibold tracking-tight text-foreground sm:text-[18px]">
          {formatInr(contract.terms.pricePerTonneUsd * contract.terms.quantityMt)}
        </span>
        <div className="flex items-center gap-2 sm:w-32 sm:justify-end">
          <span className="text-[11px] font-medium text-muted-foreground">
            {stageIndex + 1}/{total}
          </span>
          <div className="w-20">
            <StageDots total={total} currentIndex={stageIndex} />
          </div>
        </div>
      </div>
    </button>
  )
}

/** An action row, not a navigable one — there's nothing to open yet, just
 *  a nudge to raise (or wait on) a term sheet request. Same column shape
 *  as `ContractRow` so the two tabs read as one list pattern, but a plain
 *  `div` rather than a `button`, since it holds its own button/select. */
function TraderRequestRow({
  deal,
  viewer,
  identity,
}: {
  deal: Deal
  viewer: "buyer" | "seller"
  identity: { id: string; name: string }
}) {
  const counterparty = viewer === "buyer" ? deal.sellerName : deal.buyerName

  return (
    <div className="grid w-full grid-cols-1 items-center gap-3 bg-white px-4 py-4 sm:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.7fr]">
      <div className="min-w-0 space-y-1">
        <p className="truncate text-[13px] font-semibold text-foreground">{deal.listingTitle}</p>
        <p className="text-[12px] text-muted-foreground">{deal.agreedQuantityMt} MT</p>
      </div>

      <div className="hidden min-w-0 flex-col justify-center text-[12px] sm:flex">
        <span className="text-muted-foreground">Counterparty</span>
        <span className="truncate font-semibold text-foreground">{counterparty}</span>
      </div>

      <div className="hidden min-w-0 flex-col justify-center text-[12px] sm:flex">
        <span className="text-muted-foreground">Requested</span>
        <span className="truncate font-semibold text-foreground">
          {deal.contractRequestedAt ? formatDate(deal.contractRequestedAt) : "Not yet"}
        </span>
      </div>

      <div className="hidden min-w-0 flex-col justify-center text-[12px] tabular-nums sm:flex">
        <span className="text-muted-foreground">Value</span>
        <span className="truncate font-semibold text-foreground">
          {formatInr(deal.agreedPricePerTonneUsd * deal.agreedQuantityMt)}
        </span>
      </div>

      <div className="flex w-full items-center justify-end">
        {deal.contractRequestedAt ? (
          <span className="shrink-0 rounded-full bg-status-warning/10 px-3 py-1 text-[11px] font-semibold text-status-warning">
            Requested
          </span>
        ) : (
          <Button size="sm" onClick={() => requestContract(deal.id, viewer, identity.name)}>
            Request
          </Button>
        )}
      </div>
    </div>
  )
}

/** The KAM side of the same row shape — self-claim needs no special grant
 *  (see the identical reasoning on `assignKam` in `deals-view.tsx`);
 *  handing it to someone else does, and shows what everyone's already
 *  carrying so a Master KAM isn't reassigning blind. */
function KamRequestRow({
  deal,
  contracts,
  me,
}: {
  deal: Deal
  contracts: Contract[]
  me: { id: string; name: string }
}) {
  const admin = useCurrentAdmin()
  const users = useUsers()
  if (!admin) return null

  const workload = (userId: string) => contracts.filter((contract) => contract.kamId === userId).length

  return (
    <div className="grid w-full grid-cols-1 items-center gap-3 bg-white px-4 py-4 sm:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_1.1fr]">
      <div className="min-w-0 space-y-1">
        <p className="truncate text-[13px] font-semibold text-foreground">{deal.listingTitle}</p>
        <p className="text-[12px] text-muted-foreground">{deal.agreedQuantityMt} MT</p>
      </div>

      <div className="hidden min-w-0 flex-col justify-center text-[12px] sm:flex">
        <span className="text-muted-foreground">Counterparty</span>
        <span className="truncate font-semibold text-foreground">
          {deal.buyerName} ↔ {deal.sellerName}
        </span>
      </div>

      <div className="hidden min-w-0 flex-col justify-center text-[12px] sm:flex">
        <span className="text-muted-foreground">Requested</span>
        <span className="truncate font-semibold text-foreground">
          {deal.contractRequestedBy === "seller" ? deal.sellerName : deal.buyerName} ·{" "}
          {deal.contractRequestedAt ? formatDate(deal.contractRequestedAt) : "—"}
        </span>
      </div>

      <div className="hidden min-w-0 flex-col justify-center text-[12px] tabular-nums sm:flex">
        <span className="text-muted-foreground">Value</span>
        <span className="truncate font-semibold text-foreground">
          {formatInr(deal.agreedPricePerTonneUsd * deal.agreedQuantityMt)}
        </span>
      </div>

      <div className="flex w-full flex-wrap items-center justify-end gap-2">
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
    </div>
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
  if (items.length === 0) return null

  return (
    <div className="border-b border-slate-200 py-2 text-[12px]">
      <div className="flex items-baseline justify-between gap-2 pb-1">
        <span className="font-semibold text-slate-900">Needs attention</span>
      </div>
      <div className="space-y-0.5 text-slate-700 leading-normal">
        {items.map((item, idx) => (
          <div key={item} className="flex items-baseline gap-1.5 break-words">
            <span className="select-none text-slate-400">·</span>
            <span className="flex-1">{item}</span>
          </div>
        ))}
      </div>
    </div>
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
  const disputed = contract.clauses.some((clause) => clause.status === "disputed")

  return (
    <div className="flex flex-col gap-4 pb-2">
      {/* Header — the reference is a lookup key, so it stays small; the
          product itself is the real headline. */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[12px] text-muted-foreground">{contract.reference}</p>
          <h2 className="mt-0.5 truncate text-[19px] font-semibold tracking-tight text-foreground">
            {contract.listingTitle}
          </h2>
        </div>
        <br />
        <span
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
            disputed ? "bg-destructive/10 text-destructive" : "bg-amama-subtle text-amama-deep"
          )}
        >
          <span aria-hidden className={cn("size-1.5 rounded-full", disputed ? "bg-destructive" : "bg-amama-deep")} />
          {CONTRACT_STAGE_LABELS[contract.stage]}
        </span>
      </div>

      {/* Who's actually party to this — the identifiable info a reader
          scans for first, given its own big, legible name each rather
          than folded into one small sentence. */}
      <div className="my-4 flex w-full items-center justify-between text-[18px] font-bold tracking-tight text-slate-900">
        <span className="flex-1 leading-4 text-left">{contract.buyerName}</span>
        
        {/* Center exchange bridge aligned horizontally across baseline */}
        <div className="flex shrink-0 items-center gap-3 px-6">
          <div className="flex w-16 items-center justify-between select-none">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="size-1.5 rounded-full bg-slate-300" />
            ))}
          </div>

          {/* KAM metadata stacked cleanly without squeezing vertical space */}
          <div className="flex flex-col text-center">
            <span className="text-[12px] font-semibold text-slate-700 leading-none">
              {contract.kamName}
            </span>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 leading-none">
              KAM
            </span>
          </div>

          <div className="flex w-16 items-center justify-between select-none">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="size-1.5 rounded-full bg-slate-300" />
            ))}
          </div>
        </div>

        <span className="flex-1 text-right leading-4">{contract.sellerName}</span>
      </div>

      {/* What to do next, if anything — answered before any of the detail
          sections that explain *why*. */}
      {actionItems.length > 0 ? <ActionItemsBanner items={actionItems} /> : null}

      {/* Where things stand, and what was actually agreed — one card,
          since the stage rail and the terms it produced are one story. */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <StageRail stage={contract.stage} />
        <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-1">
          <Term label="Price" value={`${formatInr(contract.terms.pricePerTonneUsd)}/t`} />
          <Term label="Quantity" value={`${contract.terms.quantityMt} MT`} />
          <Term label="Total value" value={formatInr(contract.terms.pricePerTonneUsd * contract.terms.quantityMt)} />
          <Term label="Incoterm" value={contract.terms.incoterm ?? "—"} labelExtra={<IncotermInfoButton />} />
          <Term label="Payment" value={contract.terms.paymentTerm ?? "—"} />
          <Term label="Origin" value={contract.terms.originPort ?? "—"} />
          <Term label="Destination" value={contract.terms.destinationPort ?? "—"} />
          <Term label="Quality" value={contract.terms.qualitySpec ?? "—"} />
        </dl>
      </section>

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
          against it — again one story rather than a draft card followed
          by a separate amendments card that only makes sense next to it. */}
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

      {/* Its own distinct, dashed-border callout already — no need for a
          second wrapping card around it. */}
      {viewer === "kam" ? <ContractAuthoring contract={contract} kamName={identity.name} /> : null}

      {/* History — how the price was actually agreed. Real and worth
          keeping, but it's the past, not something to act on, so it's
          collapsed by default rather than competing with everything above
          it for the same amount of attention. Already its own single
          disclosure — no need to wrap it in a second one. */}
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

function StageRail({ stage }: { stage: Contract["stage"] }) {
  const currentIndex = CONTRACT_STAGE_ORDER.indexOf(stage)

  return (
    <div className="grid grid-cols-2 overflow-hidden text-[12px]">
      {CONTRACT_STAGE_ORDER.map((entry, index) => {
        const done = index < currentIndex
        const current = index === currentIndex

        return (
          <div
            key={entry}
            className={cn(
              "flex items-center justify-between px-2.5 py-1.5 transition-colors",
              current
                ? "bg-amber-50/90 font-semibold text-slate-900"
                : done
                  ? "bg-slate-100/70 text-slate-700"
                  : "bg-transparent text-slate-400"
            )}
          >
            <span className="truncate">{CONTRACT_STAGE_LABELS[entry]}</span>
            <span
              className={cn(
                "shrink-0 pl-2 font-mono text-[11px] select-none",
                current
                  ? "font-bold text-amber-600"
                  : done
                    ? "text-emerald-600"
                    : "text-slate-300"
              )}
            >
              {done ? "✓" : current ? "●" : "·"}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function Term({ label, value, labelExtra }: { label: string; value: string; labelExtra?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
        {labelExtra}
      </dt>
      <dd className="truncate text-[14px] font-semibold text-foreground">{value}</dd>
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
  const isSubmitted = request.status === "submitted"

  return (
    <>
      <li className="group flex items-center justify-between gap-4 border-b border-slate-100 py-2.5 text-start last:border-b-0 hover:bg-slate-50/60">
        {/* Left: Request Title & Metadata */}
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate text-[13px] font-semibold text-slate-900">
            {request.title}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-slate-500">
            {viewer === "kam" && (
              <>
                <span className="font-medium text-slate-700">
                  {request.party === "buyer" ? contract.buyerName : contract.sellerName}
                </span>
                <span>•</span>
              </>
            )}
            <span className="tabular-nums font-medium text-slate-700">
              {progress.done}/{progress.total}
            </span>
            <span>fields</span>
            <span>•</span>
            <span className={cn(
              "font-medium capitalize",
              isSubmitted ? "text-emerald-600" : "text-amber-600"
            )}>
              {request.status.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Right: Minimal inline trigger */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1 text-sm font-semibold transition-colors",
            isSubmitted
              ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              : "bg-slate-900 text-white hover:bg-slate-800"
          )}
        >
          <span>{isRecipient && !isSubmitted ? "Fill in" : "View"}</span>
        </button>
      </li>

      <TermSheetDialog
        open={open}
        onOpenChange={setOpen}
        contractId={contract.id}
        request={request}
        partyName={viewerName}
        readOnly={!isRecipient}
      />
    </>
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
