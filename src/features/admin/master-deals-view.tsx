"use client"

import * as React from "react"
import { HandshakeIcon, ShipIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GateBar } from "@/features/dashboard/dashboard-ui"
import { useKamRoster } from "@/features/admin/kam-roster-store"
import {
  DEAL_STAGE_LABELS,
  assignKam,
  dealStageProgress,
  useDeals,
  type Deal,
  type DealStatus,
} from "@/features/marketplace/deal-store"

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)
}

type Filter = "needs-kam" | DealStatus

const filters: { id: Filter; label: string }[] = [
  { id: "needs-kam", label: "Needs a KAM" },
  { id: "active", label: "Active" },
  { id: "proposed", label: "Proposed" },
  { id: "declined", label: "Declined" },
]

const statusStyles: Record<DealStatus, { label: string; className: string }> = {
  proposed: { label: "Proposed", className: "bg-status-warning/15 text-status-warning" },
  active: { label: "Active", className: "bg-amama-subtle text-amama-deep" },
  declined: { label: "Declined", className: "bg-destructive/10 text-destructive" },
}

/**
 * Oversight, not execution — a master admin sees every deal across every
 * KAM and assigns/reassigns who's driving it, but never edits a stage's
 * own detail fields. That stays the assigned KAM's job (see
 * `KamDealsView`), the same "assign vs. do the work" split the KAM console
 * itself draws around listing moderation vs. onboarding review.
 */
function MasterDealsView() {
  const deals = useDeals()
  const roster = useKamRoster()
  const [filter, setFilter] = React.useState<Filter>("needs-kam")
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  const visible = deals.filter((deal) =>
    filter === "needs-kam" ? deal.status === "active" && deal.assignedKamId === null : deal.status === filter
  )

  return (
    <div>
      <h1 className="text-[19px] font-bold tracking-tight">Deals</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Every deal across every KAM — assign who&apos;s driving each one.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
              filter === id
                ? "border-transparent bg-amama-deep text-white"
                : "border-border text-foreground hover:bg-muted"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-5 py-16 text-center">
          <HandshakeIcon aria-hidden className="size-6 text-muted-foreground" />
          <p className="text-[15px] font-semibold">Nothing here</p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {visible.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              roster={roster}
              expanded={expandedId === deal.id}
              onToggle={() => setExpandedId((id) => (id === deal.id ? null : deal.id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DealCard({
  deal,
  roster,
  expanded,
  onToggle,
}: {
  deal: Deal
  roster: ReturnType<typeof useKamRoster>
  expanded: boolean
  onToggle: () => void
}) {
  const status = statusStyles[deal.status]
  const progress = deal.status === "active" ? dealStageProgress(deal) : null

  return (
    <article className="rounded-3xl border border-border bg-card p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-start">
          <h2 className="truncate text-[15px] font-bold tracking-tight">{deal.listingTitle}</h2>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
            {deal.buyerName} ↔ {deal.sellerName} · {formatUsd(deal.agreedPricePerTonneUsd)}/t × {deal.agreedQuantityMt}{" "}
            MT
          </p>
        </button>
        <Badge className={cn("shrink-0", status.className)}>{status.label}</Badge>
      </header>

      {progress ? (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[12px] font-medium text-muted-foreground">
            <span>{deal.stage ? DEAL_STAGE_LABELS[deal.stage] : "Starting"}</span>
            <span>
              {progress.cleared}/{progress.total}
            </span>
          </div>
          <div className="mt-1.5">
            <GateBar cleared={progress.cleared} total={progress.total} status={progress.status} />
          </div>
        </div>
      ) : null}

      {deal.status === "active" ? (
        <div className="mt-4 flex items-center gap-2.5">
          <span className="text-[13px] font-medium text-muted-foreground">
            {deal.assignedKamName ? `Assigned to ${deal.assignedKamName}` : "Unassigned"}
          </span>
          <Select
            value={deal.assignedKamId ?? undefined}
            onValueChange={(value) => {
              const kam = roster.find((entry) => entry.id === value)
              if (kam) assignKam(deal.id, kam, "Master Admin")
            }}
          >
            <SelectTrigger size="sm">
              <SelectValue placeholder={deal.assignedKamId ? "Reassign" : "Assign a KAM"} />
            </SelectTrigger>
            <SelectContent>
              {roster.length === 0 ? (
                <SelectItem value="none" disabled>
                  No KAM has signed in yet
                </SelectItem>
              ) : (
                roster.map((kam) => (
                  <SelectItem key={kam.id} value={kam.id}>
                    {kam.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {expanded ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
          {deal.stageHistory.length > 0 ? (
            <div>
              <p className="text-[12px] font-semibold text-foreground">Stage history</p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {deal.stageHistory.map((entry, index) => (
                  <li key={index} className="text-[12px] text-muted-foreground">
                    {DEAL_STAGE_LABELS[entry.stage]} — {entry.by} ·{" "}
                    {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(entry.at))}
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
                    {entry.kamName}, by {entry.assignedBy} ·{" "}
                    {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(entry.at))}
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
    </article>
  )
}

export { MasterDealsView }
