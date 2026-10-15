"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeftRightIcon,
  ArrowRightIcon,
  ChevronRightIcon,
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
import { ColumnCard } from "@/components/ui/column-card"
import { DetailPage, useDetailRoute } from "@/components/ui/detail-page"
import { Input } from "@/components/ui/input"
import { FilterSheet, ListHeading, SheetChoice, StickyBar } from "@/components/ui/list-header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { GateBar } from "@/features/dashboard/dashboard-ui"
import { AdminEmptyState, AdminPanel } from "@/features/admin/admin-ui"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import { Initials, ReviewGroup, RowNote, StatusPill, type Tone } from "@/features/admin/review-ui"
import { useUsers, type AdminUser } from "@/features/admin/user-store"
import { contractForDeal, createContract, useContracts } from "@/features/contracts/contract-store"
import { formatInr } from "@/features/marketplace/currency"
import { IncotermInfoButton, IncotermSelect } from "@/features/marketplace/incoterm-picker"
import { CategoryTabs } from "@/features/marketplace/marketplace-ui"
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

type Scope = "mine" | "needs-a-team-member" | DealStatus
type Sort = "newest" | "value" | "stuck"

const SCOPE_LABELS: Record<Scope, string> = {
  mine: "Mine",
  "needs-a-team-member": "Unassigned",
  active: "Active",
  proposed: "Proposed",
  declined: "Declined",
}

const statusStyles: Record<DealStatus, { label: string; tone: Tone }> = {
  proposed: { label: "Proposed", tone: "warning" },
  active: { label: "Active", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
}

function inScope(deal: Deal, scope: Scope, myId: string) {
  if (scope === "mine") return deal.status === "active" && deal.assignedKamId === myId
  if (scope === "needs-a-team-member") return deal.status === "active" && deal.assignedKamId === null
  return deal.status === scope
}

/**
 * Every deal this role can see, as one list. Which scopes show is
 * decided by permission: `deals.work` gets "Mine" — the deals on your
 * desk — and `deals.viewAll` gets the oversight scopes (unassigned,
 * active, proposed, declined). A deal opens as its own page, where it's
 * assigned and, by its owner, driven forward.
 */
function DealsView() {
  // `useSearchParams` (deep links like `?filter=active` and `?deal=`)
  // needs a boundary to keep the route statically renderable.
  return (
    <React.Suspense fallback={null}>
      <DealsWorkspace />
    </React.Suspense>
  )
}

function DealsWorkspace() {
  const admin = useCurrentAdmin()
  const deals = useDeals()
  const users = useUsers()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const detail = useDetailRoute({ query: "deal" })
  const [query, setQuery] = React.useState("")
  const [filtersOpen, setFiltersOpen] = React.useState(false)
  const [sort, setSort] = React.useState<Sort>("newest")

  if (!admin) return null
  const canViewAll = admin.can("deals.viewAll")
  const canWork = admin.can("deals.work")
  const me = { id: admin.user.id, name: admin.user.name }

  if (!canViewAll && !canWork) {
    return (
      <ColumnCard title="Deals">
        <AdminEmptyState icon={HandshakeIcon} title="No deal permissions on your role" />
      </ColumnCard>
    )
  }

  const scopes: Scope[] = [...(canWork ? (["mine"] as const) : []), ...(canViewAll ? (["needs-a-team-member", "active", "proposed", "declined"] as const) : [])]
  const requested = searchParams.get("filter") as Scope | null
  const scope: Scope = requested && scopes.includes(requested) ? requested : scopes[0]
  const setScope = (next: Scope) => {
    const params = new URLSearchParams(searchParams.toString())
    if (next === scopes[0]) params.delete("filter")
    else params.set("filter", next)
    const text = params.toString()
    router.replace(text ? `${pathname}?${text}` : pathname, { scroll: false })
  }

  const selected = detail.selectedId ? (deals.find((deal) => deal.id === detail.selectedId) ?? null) : null
  if (selected) {
    const status = statusStyles[selected.status]
    const drives = canWork && selected.status === "active" && selected.assignedKamId === me.id
    return (
      <DetailPage
        backLabel="Deals"
        onBack={detail.close}
        trail={["Deals", selected.listingTitle]}
        status={<StatusPill tone={status.tone}>{status.label}</StatusPill>}
      >
        <div className="flex flex-col gap-3">
          <DealOverview deal={selected} users={users} canAssign={admin.can("deals.assign")} canWork={canWork} me={me} assignedBy={admin.user.name} />
          {drives ? <DealDetail deal={selected} myUserName={admin.user.name} /> : null}
        </div>
      </DetailPage>
    )
  }

  const needle = query.trim().toLowerCase()
  const matching = deals
    .filter((deal) => !needle || [deal.listingTitle, deal.buyerName, deal.sellerName, deal.assignedKamName ?? ""].join(" ").toLowerCase().includes(needle))
    .sort((a, b) => (sort === "value" ? dealValue(b) - dealValue(a) : sort === "stuck" ? daysInStage(b) - daysInStage(a) : b.createdAt.localeCompare(a.createdAt)))
  const visible = matching.filter((deal) => inScope(deal, scope, me.id))

  return (
    <>
      <ColumnCard
        title="Deals"
        heading={
          <ListHeading
            title="Deals"
            query={query}
            onQueryChange={setQuery}
            placeholder="Product, buyer, seller or KAM"
            filterCount={sort !== "newest" ? 1 : 0}
            onFilters={() => setFiltersOpen(true)}
          />
        }
      >
        <StickyBar>
          <CategoryTabs
            label="Deal scope"
            items={scopes.map((id) => ({ id, label: SCOPE_LABELS[id], count: matching.filter((deal) => inScope(deal, id, me.id)).length }))}
            selectedId={scope}
            onSelect={(next) => setScope(next as Scope)}
          />
        </StickyBar>

        {visible.length === 0 ? (
          <AdminEmptyState
            icon={HandshakeIcon}
            title={needle ? "No deals match" : scope === "mine" ? "No deals assigned to you yet" : "Nothing here"}
            description={!needle && scope === "mine" ? "Claim an agreed deal from Unassigned, or wait to be given one." : undefined}
          />
        ) : (
          <ul className="divide-inset pt-1">
            {visible.map((deal) => (
              <li key={deal.id}>
                <DealListRow deal={deal} onOpen={() => detail.open(deal.id)} />
              </li>
            ))}
          </ul>
        )}
      </ColumnCard>

      <FilterSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        footer={
          <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
            Show {visible.length} deal{visible.length === 1 ? "" : "s"}
          </Button>
        }
      >
        <SheetChoice
          legend="Sort by"
          value={sort}
          onChange={setSort}
          options={[
            { value: "newest", label: "Newest" },
            { value: "value", label: "Value" },
            { value: "stuck", label: "Longest in stage" },
          ]}
        />
      </FilterSheet>
    </>
  )
}

/** One deal in the list: what and who, where it stands, who owns it, and
 *  what it's worth. */
function DealListRow({ deal, onOpen }: { deal: Deal; onOpen: () => void }) {
  const status = statusStyles[deal.status]
  const progress = deal.status === "active" ? dealStageProgress(deal) : null
  const days = daysInStage(deal)
  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-xl px-3 py-3 text-start transition-colors hover:bg-card/70 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_8rem_7.5rem_auto_1rem]"
    >
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-semibold text-foreground">{deal.listingTitle}</span>
        <span className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-muted-foreground">
          <span className="truncate">{deal.buyerName}</span>
          <ArrowLeftRightIcon aria-hidden className="size-3 shrink-0" />
          <span className="truncate">{deal.sellerName}</span>
        </span>
      </span>
      <span className="text-end tabular-nums md:hidden">
        <span className="block text-[14px] font-semibold text-foreground">{formatInr(dealValue(deal))}</span>
        <span className="block text-[11.5px] text-muted-foreground">{deal.agreedQuantityMt} MT</span>
      </span>
      <span className="col-span-2 min-w-0 md:col-span-1">
        {progress ? (
          <>
            <span className="flex items-center justify-between gap-2 text-[12px]">
              <span className="truncate font-medium text-foreground">{deal.stage ? DEAL_STAGE_LABELS[deal.stage] : "Starting"}</span>
              <span className="shrink-0 text-muted-foreground tabular-nums">{days === 0 ? "Today" : `${days}d`}</span>
            </span>
            <span className="mt-1 block">
              <GateBar cleared={progress.cleared} total={progress.total} status={progress.status} />
            </span>
          </>
        ) : (
          <span className="text-[12.5px] text-muted-foreground">
            {deal.status === "proposed" ? `Awaiting ${counterpartyName(deal)}` : `Declined ${formatDate(deal.respondedAt)}`}
          </span>
        )}
      </span>
      <span className={cn("hidden truncate text-[12.5px] md:block", deal.assignedKamName ? "text-foreground" : "text-muted-foreground")}>
        {deal.status === "active" ? (deal.assignedKamName ?? "Unassigned") : "—"}
      </span>
      <span className="hidden text-end tabular-nums md:block">
        <span className="block text-[14px] font-semibold text-foreground">{formatInr(dealValue(deal))}</span>
        <span className="block text-[11.5px] text-muted-foreground">{deal.agreedQuantityMt} MT</span>
      </span>
      <span className="hidden md:block">
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </span>
      <ChevronRightIcon aria-hidden className="hidden size-4 text-muted-foreground md:block rtl:-scale-x-100" />
    </button>
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
        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-card px-3 text-[13px] font-semibold text-foreground transition-colors hover:bg-muted"
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

/** A deal's standing, at the top of its page: the terms, where it is,
 *  who owns it (and the controls to change that), and its history. */
function DealOverview({
  deal,
  users,
  canAssign,
  canWork,
  me,
  assignedBy,
}: {
  deal: Deal
  users: AdminUser[]
  canAssign: boolean
  canWork: boolean
  me: { id: string; name: string }
  assignedBy: string
}) {
  const progress = deal.status === "active" ? dealStageProgress(deal) : null
  const hasHistory = deal.stageHistory.length > 0 || deal.assignmentHistory.length > 0 || deal.shipments.length > 0
  const days = daysInStage(deal)

  return (
    <ReviewGroup
      header={
        <div className="flex items-start gap-3">
          <p className="flex min-w-0 flex-1 items-center gap-1.5 text-[14px]">
            <span className="truncate font-semibold text-foreground">{deal.buyerName}</span>
            <ArrowLeftRightIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate font-semibold text-foreground">{deal.sellerName}</span>
          </p>
          <div className="shrink-0 text-end tabular-nums">
            <p className="text-[16px] leading-tight font-semibold tracking-tight text-foreground">{formatInr(dealValue(deal))}</p>
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
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-card px-3 text-[12.5px] font-semibold text-foreground transition-colors hover:bg-muted"
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
        <div className="grid gap-4 px-4 py-3.5 sm:grid-cols-3">
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
      <p className="text-[12px] font-medium text-muted-foreground">{title}</p>
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

function DealDetail({ deal, myUserName }: { deal: Deal; myUserName: string }) {
  const [advancing, setAdvancing] = React.useState(false)
  const [note, setNote] = React.useState("")

  const advance = () => {
    advanceStage(deal.id, myUserName, note.trim() || null)
    setAdvancing(false)
    setNote("")
  }

  const isLastStage = deal.stage === DEAL_STAGE_ORDER[DEAL_STAGE_ORDER.length - 1]

  return (
    <div className="flex flex-col gap-3">
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
