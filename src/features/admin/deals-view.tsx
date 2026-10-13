"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  ArrowLeftRightIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ClockIcon,
  FileSignatureIcon,
  HandIcon,
  HandshakeIcon,
  PlusIcon,
  ShipIcon,
  UserRoundIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
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
import { AdminEmptyState, AdminPanel, AdminStatCard } from "@/features/admin/admin-ui"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import { Initials, ReviewGroup, RowNote, StatusPill, type Tone } from "@/features/admin/review-ui"
import { useUsers, type AdminUser } from "@/features/admin/user-store"
import { contractForDeal, createContract, useContracts } from "@/features/contracts/contract-store"
import { formatInr } from "@/features/marketplace/currency"
import { IncotermInfoButton, IncotermSelect } from "@/features/marketplace/incoterm-picker"
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
      <h1 className="text-[34px] font-semibold tracking-[-0.03em]">Deals</h1>

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

const statusStyles: Record<DealStatus, { label: string; className: string; tone: Tone }> = {
  proposed: { label: "Proposed", className: "bg-status-warning/15 text-status-warning", tone: "warning" },
  active: { label: "Active", className: "bg-amama-subtle text-amama-deep", tone: "success" },
  declined: { label: "Declined", className: "bg-destructive/10 text-destructive", tone: "danger" },
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

      <div
        role="tablist"
        aria-label="Filter deals"
        className="mt-6 flex w-fit max-w-full gap-0.5 overflow-x-auto rounded-full border border-border bg-card p-1 [scrollbar-width:none]"
      >
        {filters.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            onClick={() => setFilter(id)}
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold whitespace-nowrap transition-colors",
              filter === id ? "bg-foreground text-background" : "text-foreground/70 hover:bg-muted hover:text-foreground"
            )}
          >
            {label}
            <span
              className={cn(
                "rounded-full px-1.5 text-[11px] tabular-nums",
                filter === id ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
              )}
            >
              {counts[id]}
            </span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <AdminEmptyState icon={HandshakeIcon} title="Nothing here" />
      ) : (
        <div className="mt-4 flex flex-col gap-3">
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
        href={`/internal/contracts/${contract.id}`}
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
  const days = daysInStage(deal)

  return (
    <ReviewGroup
      header={
        <div className="flex items-start gap-3">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground">
            <HandshakeIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="truncate text-[15px] font-semibold tracking-tight text-foreground">{deal.listingTitle}</h2>
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
            </div>
            <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[12.5px] text-muted-foreground">
              <span className="truncate font-medium text-foreground/80">{deal.buyerName}</span>
              <ArrowLeftRightIcon aria-hidden className="size-3 shrink-0" />
              <span className="truncate font-medium text-foreground/80">{deal.sellerName}</span>
            </p>
          </div>
          <div className="shrink-0 text-end tabular-nums">
            <p className="text-[16px] leading-tight font-bold tracking-tight text-foreground">{formatInr(dealValue(deal))}</p>
            <p className="text-[11.5px] text-muted-foreground">
              {formatInr(deal.agreedPricePerTonneUsd)}/t × {deal.agreedQuantityMt} MT
            </p>
          </div>
        </div>
      }
    >
      {deal.status === "proposed" ? (
        <DealRow icon={ClockIcon}>
          Proposed by <span className="font-semibold text-foreground">{proposerName(deal)}</span> on {formatDate(deal.proposedAt)} —
          awaiting {counterpartyName(deal)}&apos;s response.
        </DealRow>
      ) : null}

      {deal.status === "declined" ? (
        <>
          <DealRow icon={XIcon}>
            Declined by <span className="font-semibold text-foreground">{counterpartyName(deal)}</span> on{" "}
            {formatDate(deal.respondedAt)}.
          </DealRow>
          {deal.declineReason ? <RowNote>{deal.declineReason}</RowNote> : null}
        </>
      ) : null}

      {progress ? (
        <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 items-center justify-between gap-3 sm:w-56 sm:shrink-0 sm:flex-col sm:items-start sm:justify-center sm:gap-0">
            <span className="truncate text-[13px] font-semibold text-foreground">
              {deal.stage ? DEAL_STAGE_LABELS[deal.stage] : "Starting"}
            </span>
            <span className="flex shrink-0 items-center gap-1 text-[11.5px] text-muted-foreground">
              <ClockIcon aria-hidden className="size-3" />
              {days === 0 ? "Moved today" : `${days}d in this stage`}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <GateBar cleared={progress.cleared} total={progress.total} status={progress.status} />
          </div>
        </div>
      ) : null}

      {deal.status === "active" ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {deal.assignedKamName ? (
              <Initials name={deal.assignedKamName} className="size-8 text-[11px]" />
            ) : (
              <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full border border-dashed border-foreground/25 text-muted-foreground">
                <UserRoundIcon className="size-3.5" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">Owner</p>
              <p className={cn("truncate text-[13px] font-semibold", deal.assignedKamName ? "text-foreground" : "text-status-warning")}>
                {deal.assignedKamName ?? "Unassigned"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 max-sm:w-full">
            {/* Claiming is not assigning: it needs no `deals.assign`,
                because taking work off an open pile isn't the same
                authority as handing it to someone else. */}
            {canWork && deal.assignedKamId !== me.id ? (
              <button
                type="button"
                onClick={() => assignKam(deal.id, me, me.name)}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-muted"
              >
                <HandIcon aria-hidden className="size-3.5" />
                {deal.assignedKamId ? "Take over" : "Assign to me"}
              </button>
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
                <SelectTrigger size="sm" className="rounded-full">
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
        </div>
      ) : null}

      {hasHistory ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          <span>
            History
            <span className="ms-1.5 text-muted-foreground/70 tabular-nums">
              {deal.stageHistory.length + deal.assignmentHistory.length + deal.shipments.length}
            </span>
          </span>
          <ChevronDownIcon aria-hidden className={cn("size-4 transition-transform", expanded && "rotate-180")} />
        </button>
      ) : null}

      {expanded && hasHistory ? (
        <div className="grid gap-4 bg-muted/30 px-4 py-3.5 sm:grid-cols-3">
          <HistoryList
            title="Stage"
            items={deal.stageHistory.map((entry) => ({
              key: `${entry.stage}-${entry.at}`,
              primary: DEAL_STAGE_LABELS[entry.stage],
              secondary: `${entry.by} · ${formatDate(entry.at)}`,
            }))}
          />
          <HistoryList
            title="Assignment"
            items={deal.assignmentHistory.map((entry) => ({
              key: `${entry.kamName}-${entry.at}`,
              primary: entry.kamName,
              secondary: `by ${entry.assignedBy} · ${formatDate(entry.at)}`,
            }))}
          />
          <HistoryList
            title="Shipments"
            items={deal.shipments.map((shipment) => ({
              key: shipment.id,
              primary: shipment.carrier,
              secondary: shipment.status,
              icon: ShipIcon,
            }))}
          />
        </div>
      ) : null}
    </ReviewGroup>
  )
}

function DealRow({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2.5 px-4 py-3 text-[13px] text-muted-foreground">
      <Icon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

function HistoryList({
  title,
  items,
}: {
  title: string
  items: { key: string; primary: string; secondary: string; icon?: LucideIcon }[]
}) {
  if (items.length === 0) return null
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      <ol className="mt-2 flex flex-col gap-2 border-s border-border ps-3">
        {items.map((item) => (
          <li key={item.key} className="relative min-w-0">
            <span aria-hidden className="absolute top-1.5 -start-[15.5px] size-1.5 rounded-full bg-foreground/30" />
            <p className="flex items-center gap-1.5 truncate text-[12.5px] font-medium text-foreground">
              {item.icon ? <item.icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" /> : null}
              {item.primary}
            </p>
            <p className="truncate text-[11.5px] text-muted-foreground">{item.secondary}</p>
          </li>
        ))}
      </ol>
    </div>
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
          <ReviewGroup
            className="self-start"
            header={
              <p className="flex items-center justify-between text-[13px] font-semibold text-foreground">
                My deals
                <span className="rounded-full bg-card px-2 py-0.5 text-[11px] text-muted-foreground tabular-nums">{myDeals.length}</span>
              </p>
            }
          >
            {myDeals.map((deal) => {
              const progress = dealStageProgress(deal)
              const active = deal.id === selectedId
              const days = daysInStage(deal)
              return (
                <button
                  key={deal.id}
                  type="button"
                  onClick={() => setSelectedId(deal.id)}
                  aria-current={active || undefined}
                  className={cn(
                    "relative block w-full px-4 py-3 text-start transition-colors",
                    active ? "bg-amama-subtle/70" : "hover:bg-muted/50"
                  )}
                >
                  {active ? <span aria-hidden className="absolute inset-y-2 start-0 w-[3px] rounded-e-full bg-amama-deep" /> : null}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-foreground">{deal.listingTitle}</p>
                      <p className="truncate text-[12px] text-muted-foreground">
                        {deal.buyerName} ↔ {deal.sellerName}
                      </p>
                    </div>
                    <p className="shrink-0 text-[12.5px] font-bold text-foreground tabular-nums">{formatInr(dealValue(deal))}</p>
                  </div>
                  <p className="mt-2 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                    <span className="truncate">{deal.stage ? DEAL_STAGE_LABELS[deal.stage] : "Starting"}</span>
                    <span className="shrink-0">{days === 0 ? "Moved today" : `${days}d`}</span>
                  </p>
                  <div className="mt-1.5">
                    <GateBar cleared={progress.cleared} total={progress.total} status={progress.status} />
                  </div>
                </button>
              )
            })}
          </ReviewGroup>

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
            <h2 className="truncate text-[16px] font-semibold tracking-tight">{deal.listingTitle}</h2>
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

const paymentTermOptions = ["Escrow", "Letter of Credit", "Advance payment", "Open account"]

function CostingForm({ deal }: { deal: Deal }) {
  return (
    <StageCard title="Costing & Invoicing">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-foreground">
          <span className="flex items-center gap-1.5">
            Incoterm
            <IncotermInfoButton />
          </span>
          <IncotermSelect
            value={deal.costing.incoterm}
            onValueChange={(value) => updateCosting(deal.id, { incoterm: value ?? "" })}
          />
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
