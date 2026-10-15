"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  AlertTriangleIcon,
  CalendarDaysIcon,
  ChevronDownIcon,
  CheckIcon,
  ClipboardCheckIcon,
  ClockIcon,
  FileCheck2Icon,
  HandshakeIcon,
  MessageSquareIcon,
  PenLineIcon,
  ReceiptIcon,
  RotateCcwIcon,
  FileTextIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { ColumnCard } from "@/components/ui/column-card"
import { DetailPage, useDetailRoute } from "@/components/ui/detail-page"
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
import { PAGE_TABS_SPACE, PageTabs } from "@/features/dashboard/page-tabs"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import {
  ApproveButton,
  RequestAgainButton,
  RequestNote,
  ReviewGroup,
  StatusPill,
} from "@/features/admin/review-ui"
import { TooltipProvider } from "@/components/ui/tooltip"
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
  raiseAmendment,
  requestsForParty,
  signContract,
  useContracts,
  type ClauseKey,
  type ClauseStatus,
  type Contract,
} from "@/features/contracts/contract-store"
import { ContractRequirements } from "@/features/contracts/contract-requirements"
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
    <ColumnCard title="Contracts">
      <div className="h-40 animate-pulse rounded-[16px] bg-muted" />
    </ColumnCard>
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
  const detail = useDetailRoute({ segment: "contractId", query: "contract" })
  const selectedId = detail.selectedId
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
  const openContract = detail.open

  if (selected) {
    return (
      <DetailPage
        backLabel="Contracts"
        onBack={detail.close}
        trail={["Contracts", selected.listingTitle]}
        meta={selected.reference}
        status={<ContractStagePill contract={selected} />}
      >
        <ContractDetail contract={selected} viewer={viewer} identity={identity} />
      </DetailPage>
    )
  }

  return (
    <ColumnCard title="Contracts">
      <div className={PAGE_TABS_SPACE}>
        <PageTabs
          label="Contract lists"
          className="px-1.5"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "requests", label: "Requests", count: requests.length },
            { value: "prepared", label: "Prepared", count: prepared.length },
          ]}
        />

        {tab === "requests" ? (
          requests.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-card px-5 py-10 text-center text-[13px] text-muted-foreground">
              {viewer === "kam"
                ? "No agreed deals are waiting on a term sheet right now."
                : "Once you and your counterparty agree a deal, request a term sheet and it'll show up here."}
            </p>
          ) : (
            <ReviewGroup
              className="mt-4"
              header={
                <ListHeader
                  count={requests.length}
                  noun={viewer === "kam" ? "deal waiting on a term sheet" : "agreed deal"}
                  nounPlural={viewer === "kam" ? "deals waiting on a term sheet" : "agreed deals"}
                />
              }
            >
              {requests.map((deal) =>
                viewer === "kam" ? (
                  <KamRequestRow key={deal.id} deal={deal} contracts={contracts} me={identity} />
                ) : (
                  <TraderRequestRow key={deal.id} deal={deal} viewer={viewer as "buyer" | "seller"} identity={identity} />
                )
              )}
            </ReviewGroup>
          )
        ) : prepared.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-card px-5 py-10 text-center text-[13px] text-muted-foreground">
            {viewer === "kam"
              ? "Open a contract from an agreed deal on the Deals page and it'll appear here."
              : "Once your account manager opens a contract, it shows up here."}
          </p>
        ) : (
          <ReviewGroup className="mt-4" header={<ListHeader count={prepared.length} noun="contract" nounPlural="contracts" />}>
            {prepared.map((contract) => (
              <ContractRow key={contract.id} contract={contract} viewer={viewer} onSelect={() => openContract(contract.id)} />
            ))}
          </ReviewGroup>
        )}
      </div>
    </ColumnCard>
  )
}

function ListHeader({ count, noun, nounPlural }: { count: number; noun: string; nounPlural: string }) {
  return (
    <p className="text-[12.5px] text-muted-foreground">
      <span className="font-semibold text-foreground tabular-nums">{count}</span> {count === 1 ? noun : nounPlural}
    </p>
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
      className="group grid w-full grid-cols-1 items-center gap-3 px-4 py-3.5 text-start transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:grid-cols-[1.3fr_0.85fr_0.85fr_1fr]"
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
    <div className="grid w-full grid-cols-1 items-center gap-3 px-4 py-3.5 sm:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.7fr]">
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
          <StatusPill tone="warning">Requested</StatusPill>
        ) : (
          <button
            type="button"
            onClick={() => requestContract(deal.id, viewer, identity.name)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-graphite px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-black"
          >
            <FileTextIcon aria-hidden className="size-3.5" />
            Request term sheet
          </button>
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
    <div className="grid w-full grid-cols-1 items-center gap-3 px-4 py-3.5 sm:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_1.1fr]">
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
          <button
            type="button"
            onClick={() => createContract(deal, me)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-graphite px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-black"
          >
            <PenLineIcon aria-hidden className="size-3.5" />
            Start term sheet
          </button>
        ) : null}
        {admin.can("deals.assign") ? (
          <Select
            onValueChange={(value) => {
              const user = users.find((entry) => entry.id === value)
              if (user) createContract(deal, user)
            }}
          >
            <SelectTrigger size="sm" className="rounded-full">
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
    <div className="rounded-2xl bg-status-warning/8 px-4 py-3 text-[12px]">
      <div className="flex items-baseline justify-between gap-2 pb-1">
        <span className="font-semibold text-foreground">Needs attention</span>
      </div>
      <div className="space-y-0.5 leading-normal text-foreground/80">
        {items.map((item, idx) => (
          <div key={item} className="flex items-baseline gap-1.5 break-words">
            <span className="text-muted-foreground select-none">·</span>
            <span className="flex-1">{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** The contract's stage as a dot pill — red once any clause is disputed.
 *  Sits in the record page's header, beside the product name. */
function ContractStagePill({ contract }: { contract: Contract }) {
  const disputed = contract.clauses.some((clause) => clause.status === "disputed")
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        disputed ? "bg-destructive/10 text-destructive" : "bg-amama-subtle text-amama-deep"
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", disputed ? "bg-destructive" : "bg-amama-deep")} />
      {CONTRACT_STAGE_LABELS[contract.stage]}
    </span>
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
  const actionItems = actionItemsFor(contract, viewer)

  return (
    <div className="flex flex-col gap-4 pb-2">
      {/* Who's actually party to this — the identifiable info a reader
          scans for first, given its own big, legible name each rather
          than folded into one small sentence. */}
      <div className="my-2 flex w-full items-center justify-between text-[18px] font-semibold tracking-tight text-foreground">
        <span className="flex-1 leading-4 text-left">{contract.buyerName}</span>
        
        {/* Center exchange bridge aligned horizontally across baseline */}
        <div className="flex shrink-0 items-center gap-3 px-6">
          <div className="flex w-16 items-center justify-between select-none">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="size-1.5 rounded-full bg-border" />
            ))}
          </div>

          {/* KAM metadata stacked cleanly without squeezing vertical space */}
          <div className="flex flex-col text-center">
            <span className="text-[12px] leading-none font-semibold text-foreground/80">
              {contract.kamName}
            </span>
            <span className="mt-1 text-[10px] leading-none font-medium tracking-wider text-muted-foreground uppercase">
              KAM
            </span>
          </div>

          <div className="flex w-16 items-center justify-between select-none">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className="size-1.5 rounded-full bg-border" />
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
      <section className="rounded-2xl bg-card p-5">
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

      <ContractRequirements contract={contract} viewer={viewer} viewerName={identity.name} />

      {/* Draft, its approvals or signatures, and any changes raised
          against it — again one story rather than a draft card followed
          by a separate amendments card that only makes sense next to it. */}
      {contract.draftBody ? (
        <DraftSection contract={contract} viewer={viewer} viewerName={identity.name} />
      ) : null}

      {contract.shipmentDates ? (
        <section className="rounded-2xl bg-card p-5">
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
    <section className="rounded-2xl bg-card p-5">
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
                ? "bg-status-warning/10 font-semibold text-foreground"
                : done
                  ? "bg-background text-foreground/80"
                  : "bg-transparent text-muted-foreground"
            )}
          >
            <span className="truncate">{CONTRACT_STAGE_LABELS[entry]}</span>
            <span
              className={cn(
                "shrink-0 pl-2 font-mono text-[11px] select-none",
                current
                  ? "font-bold text-status-warning"
                  : done
                    ? "text-amama-deep"
                    : "text-muted-foreground/50"
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

function DraftSection({
  contract,
  viewer,
  viewerName,
}: {
  contract: Contract
  viewer: ChatParty
  viewerName: string
}) {
  const [requesting, setRequesting] = React.useState(false)
  const isTrader = viewer === "buyer" || viewer === "seller"
  const signing = contract.stage === "signatures" || contract.stage === "final"
  const state = signing ? contract.signatures : contract.approvals
  const mine = isTrader ? state[viewer] : null
  const openAmendments = contract.amendments.filter((amendment) => !amendment.resolved).length

  return (
    <TooltipProvider delay={300}>
      <ReviewGroup
        header={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h3 className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
              <PenLineIcon className="size-4 text-muted-foreground" />
              Draft v{contract.draftVersion}
            </h3>
            <StatusPill tone={openAmendments > 0 ? "warning" : signing ? "info" : "neutral"}>
              {openAmendments > 0 ? `${openAmendments} change${openAmendments === 1 ? "" : "s"} requested` : signing ? "Signing" : "For approval"}
            </StatusPill>
            {isTrader ? (
              <div className="ms-auto flex items-center gap-2">
                <ApproveButton
                  label={signing ? "Sign contract" : "Agree to this draft"}
                  done={!!mine?.agreed}
                  onClick={() =>
                    signing ? signContract(contract.id, viewer, viewerName) : approveDraft(contract.id, viewer, viewerName)
                  }
                />
                <RequestAgainButton
                  active={requesting}
                  disabled={contract.stage === "final"}
                  onClick={() => setRequesting((value) => !value)}
                />
              </div>
            ) : null}
          </div>
        }
      >
        {requesting && isTrader ? (
          <RequestNote
            id={`amend-${contract.id}`}
            prompt="What should change in this draft?"
            placeholder="Clause 4 should say 30 days after B/L, not 15."
            submitLabel="Request changes"
            onCancel={() => setRequesting(false)}
            onSubmit={(note) => {
              raiseAmendment(contract.id, viewer, viewerName, note)
              setRequesting(false)
            }}
          />
        ) : null}

        <ApprovalLine name={contract.buyerName} label="Buyer" approval={state.buyer} signing={signing} />
        <ApprovalLine name={contract.sellerName} label="Seller" approval={state.seller} signing={signing} />

        <div className="px-4 py-3">
          <pre className="max-h-64 overflow-y-auto rounded-[14px] bg-muted/60 p-4 font-sans text-[13px] leading-relaxed whitespace-pre-wrap text-foreground">
            {contract.draftBody}
          </pre>
        </div>

        {/* Changes requested against this draft — kept with the draft they're
            about rather than as a card of their own. */}
        {contract.amendments.map((amendment) => (
          <div
            key={amendment.id}
            className={cn("flex items-start gap-2.5 px-4 py-2.5 text-[13px]", amendment.resolved ? "text-muted-foreground" : "bg-status-warning/[0.06]")}
          >
            <RotateCcwIcon aria-hidden className={cn("mt-0.5 size-3.5 shrink-0", amendment.resolved ? "" : "text-status-warning")} />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] text-muted-foreground">
                <span className="font-semibold text-foreground">{amendment.raisedByName}</span> · {formatDate(amendment.at)}
                {amendment.resolved ? " · resolved" : ""}
              </p>
              <p className={cn("mt-0.5", !amendment.resolved && "text-foreground")}>{amendment.text}</p>
            </div>
          </div>
        ))}
      </ReviewGroup>
    </TooltipProvider>
  )
}

function ApprovalLine({
  name,
  label,
  approval,
  signing,
}: {
  name: string
  label: string
  approval: { agreed: boolean; at: string | null }
  signing: boolean
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 text-[13px]">
      <span
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full",
          approval.agreed ? "bg-amama-deep text-white" : "border border-dashed border-foreground/25 text-muted-foreground"
        )}
      >
        {approval.agreed ? <CheckIcon className="size-3.5" strokeWidth={2.75} /> : <ClockIcon className="size-3" />}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">
        {name} <span className="font-normal text-muted-foreground">· {label}</span>
      </span>
      <span className={cn("shrink-0 text-[12px]", approval.agreed ? "text-amama-deep" : "text-muted-foreground")}>
        {approval.agreed && approval.at ? `${signing ? "Signed" : "Agreed"} ${formatDate(approval.at)}` : "Waiting"}
      </span>
    </div>
  )
}

export { ContractsView }
