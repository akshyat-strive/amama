"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ClockIcon,
  FileSignatureIcon,
  HandshakeIcon,
  PlusIcon,
  ShipIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { GateBar } from "@/features/dashboard/dashboard-ui"
import { ADMIN_SELECTED_CLASS, AdminEmptyState, AdminPanel, AdminStatCard } from "@/features/admin/admin-ui"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import { useUsers, type AdminUser } from "@/features/admin/user-store"
import { contractForDeal, createContract, useContracts } from "@/features/contracts/contract-store"
import { formatInr } from "@/features/marketplace/currency"
import { ShipmentTracker } from "@/features/marketplace/shipment-tracker"
import { OrderJourney } from "@/features/orders/order-journey"
import {
  DEAL_STAGE_LABELS,
  DEAL_STAGE_ORDER,
  LOGISTICS_MODE_LABELS,
  ORDER_STAGE_LABELS,
  ORDER_STAGE_ORDER,
  setOrderStage,
  type LogisticsMode,
  addShipment,
  addShipmentEvent,
  advanceStage,
  assignKam,
  dealStageProgress,
  updateCompliance,
  updateContracting,
  updateCosting,
  updatePayment,
  useDeals,
  type Deal,
  type DealStatus,
  type ShipmentEventType,
  type ShipmentStatus,
} from "@/features/marketplace/deal-store"

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(iso))
}

function dealValue(deal: Deal) {
  return deal.agreedPricePerTonneUsd * deal.agreedQuantityMt
}

/** How long a deal has actually sat in its current stage — the one thing
 *  a flat progress bar can't say on its own, and the difference between
 *  "just moved" and "stuck for two weeks" that decides whether someone
 *  needs to go chase it. */
function daysInStage(deal: Deal) {
  const since = deal.stageHistory.at(-1)?.at ?? deal.createdAt
  const ms = Date.now() - new Date(since).getTime()
  return Math.max(0, Math.floor(ms / 86_400_000))
}

/** Only the counterparty can accept or decline a proposal — the proposer
 *  can't respond to their own offer — so "who's on the other end of this"
 *  is always just the opposite of `proposedBy`, with nothing extra to
 *  store on the deal itself. */
function proposerName(deal: Deal) {
  return deal.proposedBy === "buyer" ? deal.buyerName : deal.sellerName
}
function counterpartyName(deal: Deal) {
  return deal.proposedBy === "buyer" ? deal.sellerName : deal.buyerName
}

/**
 * One page now, not two — which of its two sections render is decided by
 * permission, not by which of the old two consoles you were in.
 * `deals.viewAll` (+ `deals.assign` for the reassign control itself) gets
 * the cross-team oversight section; `deals.work` gets "my deals." Someone
 * with both (Master Admin holds every permission) sees both — including,
 * now, the ability to personally drive a deal's own stage forward if one's
 * ever assigned to them. That's a real behavior change from the old hard
 * split, and an intentional one: permissions decide capability, not which
 * fixed identity you happen to be.
 */
function DealsView() {
  const admin = useCurrentAdmin()
  if (!admin) return null

  const canViewAll = admin.can("deals.viewAll")
  const canWork = admin.can("deals.work")

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Deals</h1>

      <div className="mt-6 flex flex-col gap-8">
        {canViewAll ? (
          // `EveryDealSection` reads `useSearchParams` (for the Home page's
          // deep-linked filter) — that opts the route out of static
          // rendering unless it sits under a boundary.
          <React.Suspense fallback={<div className="h-40 animate-pulse rounded-3xl bg-muted" />}>
            <EveryDealSection
              canAssign={admin.can("deals.assign")}
              canWork={canWork}
              me={{ id: admin.user.id, name: admin.user.name }}
              assignedBy={admin.user.name}
            />
          </React.Suspense>
        ) : null}
        {canWork ? <MyDealsSection myUserId={admin.user.id} myUserName={admin.user.name} /> : null}
        {!canViewAll && !canWork ? (
          <AdminEmptyState icon={HandshakeIcon} title="No deal permissions on your role" />
        ) : null}
      </div>
    </div>
  )
}

type Filter = "needs-a-team-member" | DealStatus

const filters: { id: Filter; label: string }[] = [
  { id: "needs-a-team-member", label: "Assign a team member" },
  { id: "active", label: "Active" },
  { id: "proposed", label: "Proposed" },
  { id: "declined", label: "Declined" },
]

const statusStyles: Record<DealStatus, { label: string; className: string }> = {
  proposed: { label: "Proposed", className: "bg-status-warning/15 text-status-warning" },
  active: { label: "Active", className: "bg-amama-subtle text-amama-deep" },
  declined: { label: "Declined", className: "bg-destructive/10 text-destructive" },
}

/** Oversight, and the pool work gets claimed from. Reassigning someone
 *  else is gated on `deals.assign` (the Master KAM's job); claiming an
 *  unassigned deal for yourself only needs `deals.work`, so any KAM can
 *  pick up work without waiting to be handed it. */
function EveryDealSection({
  canAssign,
  canWork,
  me,
  assignedBy,
}: {
  canAssign: boolean
  canWork: boolean
  me: { id: string; name: string }
  assignedBy: string
}) {
  const deals = useDeals()
  const users = useUsers()
  // Lets a link (the Home page's own deal preview cards, say) land
  // straight on a specific filter — `?filter=active` — rather than
  // always opening on the default "needs a team member" one. `?deal=`
  // (the Logistics board's own shipment links) goes one step further:
  // it opens on whichever filter actually contains that deal and starts
  // it already expanded, so a link to a specific shipment doesn't dump
  // someone on a list they still have to search.
  const searchParams = useSearchParams()
  const requestedFilter = searchParams.get("filter")
  const requestedDealId = searchParams.get("deal")
  const requestedDeal = requestedDealId ? deals.find((deal) => deal.id === requestedDealId) : null
  const [filter, setFilter] = React.useState<Filter>(() => {
    if (requestedDeal) {
      return requestedDeal.status === "active" && requestedDeal.assignedKamId === null
        ? "needs-a-team-member"
        : (requestedDeal.status as Filter)
    }
    return filters.some((entry) => entry.id === requestedFilter) ? (requestedFilter as Filter) : "needs-a-team-member"
  })
  const [expandedId, setExpandedId] = React.useState<string | null>(requestedDealId)

  const activeDeals = deals.filter((deal) => deal.status === "active")
  const needsTeamMember = activeDeals.filter((deal) => deal.assignedKamId === null)
  const proposedDeals = deals.filter((deal) => deal.status === "proposed")
  const declinedDeals = deals.filter((deal) => deal.status === "declined")
  const pipelineValue = activeDeals.reduce((sum, deal) => sum + dealValue(deal), 0)

  const counts: Record<Filter, number> = {
    "needs-a-team-member": needsTeamMember.length,
    active: activeDeals.length,
    proposed: proposedDeals.length,
    declined: declinedDeals.length,
  }

  const visible = deals.filter((deal) =>
    filter === "needs-a-team-member"
      ? deal.status === "active" && deal.assignedKamId === null
      : deal.status === filter
  )

  return (
    <div>
      <h2 className="text-[15px] font-semibold text-foreground">Every deal</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">Across every team member — assign who&apos;s driving each one.</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AdminStatCard
          label="Active deals"
          value={String(activeDeals.length)}
          caption={`${proposedDeals.length} proposed, awaiting response`}
        />
        <AdminStatCard
          label="Pipeline value"
          value={formatInr(pipelineValue)}
          tone="brand"
          caption="Across every active deal"
        />
        <AdminStatCard
          label="Assign a team member"
          value={String(needsTeamMember.length)}
          tone={needsTeamMember.length > 0 ? "warning" : "plain"}
          caption={needsTeamMember.length > 0 ? "Waiting to be assigned" : "Nothing waiting"}
        />
        <AdminStatCard
          label="Declined"
          value={String(declinedDeals.length)}
          caption="Didn't make it past proposal"
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {filters.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              filter === id ? ADMIN_SELECTED_CLASS : "border-border text-foreground hover:bg-muted"
            )}
          >
            {label} ({counts[id]})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <AdminEmptyState icon={HandshakeIcon} title="Nothing here" />
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {visible.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              users={users}
              canAssign={canAssign}
              canWork={canWork}
              me={me}
              assignedBy={assignedBy}
              expanded={expandedId === deal.id}
              onToggle={() => setExpandedId((id) => (id === deal.id ? null : deal.id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * The bridge from an agreed deal to its paperwork. Shown only to the KAM
 * who owns the deal: a contract is drafted by the person accountable for
 * it, not by whoever happens to be looking at the pipeline.
 */
function DealContractAction({ deal, me }: { deal: Deal; me: { id: string; name: string } }) {
  const contracts = useContracts()
  const contract = contractForDeal(contracts, deal.id)

  if (contract) {
    return (
      <Link
        href={`/internal/contracts?contract=${contract.id}`}
        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted"
      >
        <FileSignatureIcon className="size-3.5" />
        Open {contract.reference}
      </Link>
    )
  }

  return (
    <Button size="sm" onClick={() => createContract(deal, me)}>
      <FileSignatureIcon className="size-4" />
      Create contract
    </Button>
  )
}

function DealCard({
  deal,
  users,
  canAssign,
  canWork,
  me,
  assignedBy,
  expanded,
  onToggle,
}: {
  deal: Deal
  users: AdminUser[]
  canAssign: boolean
  canWork: boolean
  me: { id: string; name: string }
  assignedBy: string
  expanded: boolean
  onToggle: () => void
}) {
  const status = statusStyles[deal.status]
  const progress = deal.status === "active" ? dealStageProgress(deal) : null
  const hasHistory = deal.stageHistory.length > 0 || deal.assignmentHistory.length > 0 || deal.shipments.length > 0

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[15px] font-bold tracking-tight">{deal.listingTitle}</h2>
        <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
          {deal.buyerName} ↔ {deal.sellerName}
        </p>
        <p className="mt-1 text-[13px] font-semibold tracking-tight text-foreground tabular-nums">
          {formatInr(deal.agreedPricePerTonneUsd)}/t × {deal.agreedQuantityMt} MT
          <span className="ms-1.5 font-normal text-muted-foreground">— {formatInr(dealValue(deal))} total</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge className={status.className}>{status.label}</Badge>
        {hasHistory ? (
          <ChevronDownIcon
            aria-hidden
            className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-180")}
          />
        ) : null}
      </div>
    </div>
  )

  return (
    <article className="overflow-hidden rounded-[20px] border border-border bg-muted">
      {hasHistory ? (
        <button type="button" onClick={onToggle} className="w-full text-start">
          {header}
        </button>
      ) : (
        header
      )}

      <div className="flex flex-col gap-4 border-t border-border bg-card p-5">
        {deal.status === "proposed" ? (
          <p className="text-[13px] text-muted-foreground">
            Proposed by <span className="font-medium text-foreground">{proposerName(deal)}</span> on{" "}
            {formatDate(deal.proposedAt)} — awaiting {counterpartyName(deal)}&apos;s response.
          </p>
        ) : null}

        {deal.status === "declined" ? (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] text-muted-foreground">
              Declined by <span className="font-medium text-foreground">{counterpartyName(deal)}</span> on{" "}
              {formatDate(deal.respondedAt)}.
            </p>
            {deal.declineReason ? (
              <p className="rounded-[14px] bg-destructive/10 px-3 py-2.5 text-[13px] text-destructive">
                {deal.declineReason}
              </p>
            ) : null}
          </div>
        ) : null}

        {progress ? (
          <div>
            <div className="flex items-center justify-between text-[12px] font-medium text-muted-foreground">
              <span>{deal.stage ? DEAL_STAGE_LABELS[deal.stage] : "Starting"}</span>
              <span className="flex items-center gap-1">
                <ClockIcon className="size-3" aria-hidden />
                {daysInStage(deal) === 0 ? "Moved today" : `${daysInStage(deal)}d in this stage`}
              </span>
            </div>
            <div className="mt-1.5">
              <GateBar cleared={progress.cleared} total={progress.total} status={progress.status} />
            </div>
          </div>
        ) : null}

        {deal.status === "active" ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[13px] font-medium text-muted-foreground">
              {deal.assignedKamName ? `Owner: ${deal.assignedKamName}` : "Unassigned"}
            </span>
            {/* Claiming is not assigning: it needs no `deals.assign`,
                because taking work off an open pile isn't the same
                authority as handing it to someone else. */}
            {canWork && deal.assignedKamId !== me.id ? (
              <Button size="sm" variant="outline" onClick={() => assignKam(deal.id, me, me.name)}>
                {deal.assignedKamId ? "Take over" : "Assign to me"}
              </Button>
            ) : null}
            {deal.assignedKamId === me.id ? <DealContractAction deal={deal} me={me} /> : null}
            {canAssign ? (
              <Select
                value={deal.assignedKamId ?? undefined}
                onValueChange={(value) => {
                  const user = users.find((entry) => entry.id === value)
                  if (user) assignKam(deal.id, user, assignedBy)
                }}
              >
                <SelectTrigger size="sm">
                  {/* Users are keyed by email, which is not what anyone
                      wants to read back as the current owner. */}
                  <SelectValue placeholder={deal.assignedKamId ? "Reassign" : "Assign someone"}>
                    {(value) => users.find((user) => user.id === value)?.name ?? "Assign someone"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {users.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Nobody has signed in yet
                    </SelectItem>
                  ) : (
                    users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            ) : null}
          </div>
        ) : null}

        {expanded && hasHistory ? (
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            {deal.stageHistory.length > 0 ? (
              <div>
                <p className="text-[12px] font-semibold text-foreground">Stage history</p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {deal.stageHistory.map((entry, index) => (
                    <li key={index} className="text-[12px] text-muted-foreground">
                      {DEAL_STAGE_LABELS[entry.stage]} — {entry.by} · {formatDate(entry.at)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {deal.assignmentHistory.length > 0 ? (
              <div>
                <p className="text-[12px] font-semibold text-foreground">Assignment history</p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {deal.assignmentHistory.map((entry, index) => (
                    <li key={index} className="text-[12px] text-muted-foreground">
                      {entry.kamName}, by {entry.assignedBy} · {formatDate(entry.at)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {deal.shipments.length > 0 ? (
              <div>
                <p className="text-[12px] font-semibold text-foreground">Shipments</p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {deal.shipments.map((shipment) => (
                    <li key={shipment.id} className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                      <ShipIcon className="size-3.5 shrink-0" />
                      {shipment.carrier} · {shipment.status}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}

// Deliberately not every `ShipmentEventType`: the farm-pickup → export-QC
// leg of the pipeline is the seller's own checklist on their Shipments
// page (see `seller-shipments-view.tsx`), not something a KAM quick-logs
// from here. This stays the coarser in-flight/export subset it always was.
const shipmentEventLabels: Partial<Record<ShipmentEventType, string>> = {
  booked: "Booked",
  "gate-in": "Gate-in at origin",
  loaded: "Loaded on vessel",
  departed: "Departed origin",
  "in-transit": "In transit",
  "arrived-port": "Arrived at destination port",
  documentation: "Documents filed",
  customs: "Customs cleared",
  "vgm-filed": "VGM filed",
  "leo-issued": "Let Export Order issued",
  "out-for-delivery": "Out for delivery",
  delivered: "Delivered",
  delayed: "Delayed",
}

/** What logging a given checkpoint implies for the shipment's own summary
 *  status — so "we cleared customs" also flips the badge to "in transit"
 *  without a second, separate edit. */
const statusForEvent: Partial<Record<ShipmentEventType, ShipmentStatus>> = {
  booked: "booked",
  "gate-in": "in-transit",
  loaded: "in-transit",
  departed: "in-transit",
  "in-transit": "in-transit",
  "arrived-port": "in-transit",
  documentation: "booked",
  customs: "in-transit",
  "vgm-filed": "booked",
  "leo-issued": "booked",
  "out-for-delivery": "in-transit",
  delivered: "arrived",
  delayed: "delayed",
}

/** The signed-in team member's own queue — every active deal assigned to
 *  *them*, and nothing else. Assignment itself happens in `EveryDealSection`
 *  above; this is where a deal actually gets driven forward once it lands
 *  on someone's desk. */
function MyDealsSection({ myUserId, myUserName }: { myUserId: string; myUserName: string }) {
  const deals = useDeals()
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const myDeals = React.useMemo(
    () => deals.filter((deal) => deal.status === "active" && deal.assignedKamId === myUserId),
    [deals, myUserId]
  )
  const selected = myDeals.find((deal) => deal.id === selectedId) ?? null

  return (
    <div>
      {myDeals.length === 0 ? (
        <AdminEmptyState
          icon={HandshakeIcon}
          title="No deals assigned to you yet"
          description="Claim an agreed deal from Every deal above, or wait to be given one — either way it shows up here."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <ul className="flex flex-col gap-2">
            {myDeals.map((deal) => {
              const progress = dealStageProgress(deal)
              const active = deal.id === selectedId
              return (
                <li key={deal.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(deal.id)}
                    className={cn(
                      "w-full rounded-[16px] border px-4 py-3 text-start transition-colors",
                      active ? ADMIN_SELECTED_CLASS : "border-border bg-card hover:bg-muted/50"
                    )}
                  >
                    <p className="truncate text-[13px] font-semibold">
                      {deal.buyerName} ↔ {deal.sellerName}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 truncate text-[12px]",
                        active ? "text-amama-foreground/80" : "text-muted-foreground"
                      )}
                    >
                      {deal.listingTitle}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-[12px] font-semibold tabular-nums",
                        active ? "text-amama-foreground" : "text-foreground"
                      )}
                    >
                      {formatInr(dealValue(deal))}
                    </p>
                    <p
                      className={cn(
                        "mt-2 flex items-center justify-between text-[11px] font-medium",
                        active ? "text-amama-foreground/80" : "text-muted-foreground"
                      )}
                    >
                      <span>{deal.stage ? DEAL_STAGE_LABELS[deal.stage] : "Starting"}</span>
                      <span>{daysInStage(deal) === 0 ? "Moved today" : `${daysInStage(deal)}d`}</span>
                    </p>
                    <div className="mt-1.5">
                      <GateBar cleared={progress.cleared} total={progress.total} status={progress.status} />
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>

          {selected ? (
            <DealDetail deal={selected} myUserName={myUserName} />
          ) : (
            <div className="flex items-center justify-center rounded-[20px] border border-dashed border-border py-16 text-center text-[13px] text-muted-foreground">
              Pick a deal to manage it.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function DealDetail({ deal, myUserName }: { deal: Deal; myUserName: string }) {
  const progress = dealStageProgress(deal)
  const [advancing, setAdvancing] = React.useState(false)
  const [note, setNote] = React.useState("")

  const advance = () => {
    advanceStage(deal.id, myUserName, note.trim() || null)
    setAdvancing(false)
    setNote("")
  }

  const isLastStage = deal.stage === DEAL_STAGE_ORDER[DEAL_STAGE_ORDER.length - 1]

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[20px] border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-[16px] font-bold tracking-tight">{deal.listingTitle}</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {deal.buyerName} (buyer) ↔ {deal.sellerName} (seller)
            </p>
          </div>
          <div className="shrink-0 text-end">
            <p className="text-[15px] font-extrabold tabular-nums text-foreground">
              {formatInr(deal.agreedPricePerTonneUsd)}/t × {deal.agreedQuantityMt} MT
            </p>
            <p className="mt-0.5 text-[13px] font-semibold tabular-nums text-amama-deep">
              {formatInr(dealValue(deal))} total
            </p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-[12px] font-medium text-muted-foreground">
            <span>{deal.stage ? DEAL_STAGE_LABELS[deal.stage] : "Starting"}</span>
            <span className="flex items-center gap-1">
              <ClockIcon className="size-3" aria-hidden />
              {daysInStage(deal) === 0 ? "Moved today" : `${daysInStage(deal)}d in this stage`}
            </span>
          </div>
          <div className="mt-1.5">
            <GateBar cleared={progress.cleared} total={progress.total} status={progress.status} />
          </div>
        </div>
      </div>

      <OrderJourneyPanel deal={deal} myUserName={myUserName} />

      {deal.stage === "costing" ? <CostingForm deal={deal} /> : null}
      {deal.stage === "contracting" ? <ContractingForm deal={deal} /> : null}
      {deal.stage === "compliance" ? <ComplianceForm deal={deal} /> : null}
      {deal.stage === "delivered" || deal.stage === "paid" ? <PaymentForm deal={deal} /> : null}

      {/* Shipments live outside the stage switch on purpose — freight often
          gets booked well before the pipeline visually reaches "Shipment
          tracking", so a team member needs to log it any time the deal is
          active. */}
      <ShipmentsPanel deal={deal} />

      <AdminPanel
        title="Advance the pipeline"
        action={
          !isLastStage ? (
            <Button size="sm" onClick={() => setAdvancing((value) => !value)}>
              Advance to next stage
              <ArrowRightIcon />
            </Button>
          ) : (
            <span className="text-[13px] font-medium text-amama-deep">Final stage reached</span>
          )
        }
      >
        <div className="flex flex-col gap-4 p-5">
          {advancing ? (
            <div className="flex flex-col gap-2">
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Anything worth logging about this handoff? (optional)"
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={advance}>
                  Confirm advance
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAdvancing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          {deal.stageHistory.length > 0 ? (
            <ul className={cn("flex flex-col gap-1.5", advancing && "border-t border-border pt-3")}>
              {[...deal.stageHistory].reverse().map((entry, index) => (
                <li key={index} className="text-[12px] text-muted-foreground">
                  <span className="font-medium text-foreground">{DEAL_STAGE_LABELS[entry.stage]}</span> — {entry.by}{" "}
                  ·{" "}
                  {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(
                    new Date(entry.at)
                  )}
                  {entry.note ? <span className="block">{entry.note}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </AdminPanel>
    </div>
  )
}

function StageCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <AdminPanel title={title}>
      <div className="flex flex-col gap-3 p-5">{children}</div>
    </AdminPanel>
  )
}

const incotermOptions = ["FOB", "CIF", "CFR", "EXW", "DAP"]
const paymentTermOptions = ["Escrow", "Letter of Credit", "Advance payment", "Open account"]

function CostingForm({ deal }: { deal: Deal }) {
  return (
    <StageCard title="Costing & Invoicing">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
          Incoterm
          <Select
            value={deal.costing.incoterm ?? undefined}
            onValueChange={(value) => updateCosting(deal.id, { incoterm: value as string })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {incotermOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
          Payment term
          <Select
            value={deal.costing.paymentTerm ?? undefined}
            onValueChange={(value) => updateCosting(deal.id, { paymentTerm: value as string })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {paymentTermOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
        Proforma invoice no.
        <Input
          value={deal.costing.proformaInvoiceNo ?? ""}
          onChange={(event) => updateCosting(deal.id, { proformaInvoiceNo: event.target.value })}
          placeholder="PI-2026-0451"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
        Notes
        <Textarea
          value={deal.costing.notes ?? ""}
          onChange={(event) => updateCosting(deal.id, { notes: event.target.value })}
          rows={2}
        />
      </label>
    </StageCard>
  )
}

function ContractingForm({ deal }: { deal: Deal }) {
  return (
    <StageCard title="Contracting">
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
        Contract reference
        <Input
          value={deal.contracting.contractRef ?? ""}
          onChange={(event) => updateContracting(deal.id, { contractRef: event.target.value })}
          placeholder="CTR-2026-0451"
        />
      </label>
      <label className="flex items-center gap-2.5 text-[13px] font-medium text-foreground">
        <Checkbox
          checked={deal.contracting.signedOff}
          onCheckedChange={(checked) => updateContracting(deal.id, { signedOff: checked === true })}
        />
        Compliance sign-off received
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
        Notes
        <Textarea
          value={deal.contracting.notes ?? ""}
          onChange={(event) => updateContracting(deal.id, { notes: event.target.value })}
          rows={2}
        />
      </label>
    </StageCard>
  )
}

function ComplianceForm({ deal }: { deal: Deal }) {
  const items: { key: keyof Deal["compliance"]; label: string }[] = [
    { key: "phytosanitaryCert", label: "Phytosanitary certificate" },
    { key: "labReport", label: "Lab analysis report" },
    { key: "certificateOfOrigin", label: "Certificate of Origin" },
    { key: "customsDocs", label: "Customs documentation" },
    { key: "freightBooked", label: "Freight booked" },
  ]
  return (
    <StageCard title="Compliance, QC & Logistics">
      <div className="flex flex-col gap-2">
        {items.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2.5 text-[13px] font-medium text-foreground">
            <Checkbox
              checked={deal.compliance[key] === true}
              onCheckedChange={(checked) => updateCompliance(deal.id, { [key]: checked === true })}
            />
            {label}
          </label>
        ))}
      </div>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
        Notes
        <Textarea
          value={deal.compliance.notes ?? ""}
          onChange={(event) => updateCompliance(deal.id, { notes: event.target.value })}
          rows={2}
        />
      </label>
    </StageCard>
  )
}

function PaymentForm({ deal }: { deal: Deal }) {
  return (
    <StageCard title="Payment">
      <label className="flex items-center gap-2.5 text-[13px] font-medium text-foreground">
        <Checkbox
          checked={deal.payment.settled}
          onCheckedChange={(checked) =>
            updatePayment(deal.id, {
              settled: checked === true,
              settledAt: checked === true ? new Date().toISOString() : null,
            })
          }
        />
        Payment settled
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
        Notes
        <Textarea
          value={deal.payment.notes ?? ""}
          onChange={(event) => updatePayment(deal.id, { notes: event.target.value })}
          rows={2}
        />
      </label>
    </StageCard>
  )
}

/**
 * The journey as the buyer and seller see it, plus the buttons that move
 * it. Kept separate from "Advance the pipeline" because the two genuinely
 * are separate: the desk's internal stage and the customer-facing one move
 * on different beats, and conflating them is how a buyer ends up told
 * their order shipped because a KAM ticked off some paperwork.
 */
function OrderJourneyPanel({ deal, myUserName }: { deal: Deal; myUserName: string }) {
  if (!deal.orderStage) return null

  return (
    <AdminPanel title="Order journey" subtitle="What the buyer and seller see">
      <div className="flex flex-col gap-4 p-5">
        <OrderJourney deal={deal} />
        <div className="flex flex-wrap gap-1.5">
          {ORDER_STAGE_ORDER.map((stage) => (
            <Button
              key={stage}
              size="sm"
              variant={stage === deal.orderStage ? "default" : "outline"}
              onClick={() => setOrderStage(deal.id, stage, myUserName)}
            >
              {ORDER_STAGE_LABELS[stage]}
            </Button>
          ))}
        </div>
      </div>
    </AdminPanel>
  )
}

function ShipmentsPanel({ deal }: { deal: Deal }) {
  const [adding, setAdding] = React.useState(false)
  const [mode, setMode] = React.useState<LogisticsMode>("ocean")
  const [carrier, setCarrier] = React.useState("")
  const [documentNumber, setDocumentNumber] = React.useState("")
  const [origin, setOrigin] = React.useState("")
  const [destination, setDestination] = React.useState("")
  const [eta, setEta] = React.useState("")

  const submit = () => {
    if (!carrier.trim()) return
    addShipment(deal.id, {
      mode,
      carrier: carrier.trim(),
      documentNumber: documentNumber.trim(),
      status: "booked",
      eta: eta || null,
      note: null,
      origin: origin.trim() || null,
      destination: destination.trim() || null,
      currentLocation: null,
      events: [],
    })
    setMode("ocean")
    setCarrier("")
    setDocumentNumber("")
    setOrigin("")
    setDestination("")
    setEta("")
    setAdding(false)
  }

  return (
    <AdminPanel
      title="Shipments"
      action={
        <Button size="sm" variant="outline" onClick={() => setAdding((value) => !value)}>
          <PlusIcon />
          Add shipment
        </Button>
      }
    >
      <div className="flex flex-col gap-4 p-5">
        {adding ? (
          <div className="grid grid-cols-1 gap-2 rounded-[14px] border border-dashed border-border p-3 sm:grid-cols-3">
            <Select value={mode} onValueChange={(value) => setMode((value as LogisticsMode) ?? "ocean")}>
              <SelectTrigger>
                <SelectValue>{(value) => LOGISTICS_MODE_LABELS[value as LogisticsMode]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LOGISTICS_MODE_LABELS) as LogisticsMode[]).map((entry) => (
                  <SelectItem key={entry} value={entry}>
                    {LOGISTICS_MODE_LABELS[entry]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Carrier" value={carrier} onChange={(event) => setCarrier(event.target.value)} />
            <Input
              placeholder="BL / AWB no."
              value={documentNumber}
              onChange={(event) => setDocumentNumber(event.target.value)}
            />
            <Input type="date" value={eta} onChange={(event) => setEta(event.target.value)} />
            <Input placeholder="Origin" value={origin} onChange={(event) => setOrigin(event.target.value)} />
            <Input
              placeholder="Destination"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
            />
            <Button size="sm" onClick={submit}>
              Save shipment
            </Button>
          </div>
        ) : null}

        {deal.shipments.length === 0 ? (
          <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <ShipIcon className="size-4" />
            Nothing booked yet.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {deal.shipments.map((shipment) => (
              <div key={shipment.id} className="flex flex-col gap-3">
                <ShipmentTracker shipment={shipment} />
                <ShipmentLogForm dealId={deal.id} shipmentId={shipment.id} />
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminPanel>
  )
}

function ShipmentLogForm({ dealId, shipmentId }: { dealId: string; shipmentId: string }) {
  const [open, setOpen] = React.useState(false)
  const [type, setType] = React.useState<ShipmentEventType>("in-transit")
  const [location, setLocation] = React.useState("")
  const [note, setNote] = React.useState("")

  const submit = () => {
    addShipmentEvent(
      dealId,
      shipmentId,
      { type, label: shipmentEventLabels[type] ?? type, location: location.trim() || null, note: note.trim() || null },
      { status: statusForEvent[type] }
    )
    setLocation("")
    setNote("")
    setOpen(false)
  }

  if (!open) {
    return (
      <Button size="sm" variant="ghost" className="w-fit" onClick={() => setOpen(true)}>
        <ShipIcon />
        Log a tracking update
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-dashed border-border p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Select value={type} onValueChange={(value) => value && setType(value as ShipmentEventType)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(shipmentEventLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder="Location (optional)" value={location} onChange={(event) => setLocation(event.target.value)} />
      </div>
      <Textarea placeholder="Note (optional)" rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" onClick={submit}>
          Log update
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

export { DealsView }
