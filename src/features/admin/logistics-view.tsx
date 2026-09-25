"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, ArrowRightIcon, ShipIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { AdminEmptyState, AdminPanel, AdminStatCard } from "@/features/admin/admin-ui"
import { formatInr } from "@/features/marketplace/currency"
import {
  formatShortDate,
  modeIcons,
  ShipmentTracker,
  statusStyles,
} from "@/features/marketplace/shipment-tracker"
import {
  LOGISTICS_MODE_LABELS,
  LOGISTICS_STAGE_LABELS,
  useDeals,
  type Deal,
  type Shipment,
  type ShipmentStatus,
} from "@/features/marketplace/deal-store"
import { shelfLifeRemaining, soonestCutoff } from "@/features/marketplace/logistics"

type Row = { deal: Deal; shipment: Shipment }

/** Board order — booked comes first, but delayed sits ahead of in-transit
 *  so the column someone actually needs to look at isn't buried third. */
const COLUMNS: { status: ShipmentStatus; label: string }[] = [
  { status: "booked", label: "Booked" },
  { status: "delayed", label: "Delayed" },
  { status: "in-transit", label: "In transit" },
  { status: "arrived", label: "Arrived" },
]

const cutoffDotStyles: Record<"ok" | "soon" | "overdue", string> = {
  ok: "bg-amama-deep",
  soon: "bg-status-warning",
  overdue: "bg-destructive",
}

/** An open claim is one that still needs someone's attention — settled or
 *  rejected claims are closed business, not work in progress. */
function isOpenClaim(shipment: Shipment): boolean {
  return shipment.claim !== null && (shipment.claim.status === "open" || shipment.claim.status === "under-review")
}

/**
 * The control tower: every shipment across every deal, full-width until
 * one is opened, then a narrow rail beside its full detail — same
 * transition shape as Contracts (`ContractGalleryCard`/`CompactContractRow`),
 * so a KAM working across Deals, Contracts and Logistics gets one
 * consistent "browse, then open" pattern instead of three different ones.
 */
function LogisticsView() {
  const deals = useDeals()
  const rows: Row[] = deals.flatMap((deal) => deal.shipments.map((shipment) => ({ deal, shipment })))
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const selected = rows.find((row) => row.shipment.id === selectedId) ?? null

  if (rows.length === 0) {
    return (
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Logistics</h1>
        <div className="mt-6">
          <AdminEmptyState icon={ShipIcon} title="No shipments logged yet" />
        </div>
      </div>
    )
  }

  const inTransit = rows.filter((row) => row.shipment.status === "in-transit").length
  const delayed = rows.filter((row) => row.shipment.status === "delayed").length
  const openClaims = rows.filter((row) => isOpenClaim(row.shipment))
  const demurrageTotal = rows.reduce((sum, row) => sum + (row.shipment.demurrageUsd ?? 0), 0)

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Logistics</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AdminStatCard label="Shipments" value={String(rows.length)} />
        <AdminStatCard label="In transit" value={String(inTransit)} tone={inTransit > 0 ? "brand" : "plain"} />
        <AdminStatCard
          label="Delayed"
          value={String(delayed)}
          tone={delayed > 0 ? "warning" : "plain"}
          caption={delayed > 0 ? "Needs a look" : "Nothing stuck"}
        />
        <AdminStatCard
          label="Open claims"
          value={String(openClaims.length)}
          tone={openClaims.length > 0 ? "warning" : "plain"}
          caption={demurrageTotal > 0 ? `+ ${formatInr(demurrageTotal)} demurrage` : undefined}
        />
      </div>

      {!selected ? (
        <div className="mt-8 grid gap-4 lg:grid-cols-4">
          {COLUMNS.map((column) => {
            const items = rows.filter((row) => row.shipment.status === column.status)
            return (
              <AdminPanel
                key={column.status}
                title={column.label}
                subtitle={`${items.length} shipment${items.length === 1 ? "" : "s"}`}
              >
                <div className="flex flex-col divide-y divide-border">
                  {items.length === 0 ? (
                    <p className="px-5 py-6 text-[13px] text-muted-foreground">Nothing here right now.</p>
                  ) : (
                    items.map(({ deal, shipment }) => (
                      <ShipmentRow key={shipment.id} deal={deal} shipment={shipment} onOpen={() => setSelectedId(shipment.id)} />
                    ))
                  )}
                </div>
              </AdminPanel>
            )
          })}
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-start">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground lg:hidden"
          >
            <ArrowLeftIcon className="size-4" />
            All shipments
          </button>
          <ul className="hidden flex-col gap-2 lg:flex lg:w-[280px] lg:shrink-0">
            {rows.map(({ deal, shipment }) => (
              <li key={shipment.id}>
                <CompactShipmentRow
                  deal={deal}
                  shipment={shipment}
                  active={shipment.id === selected.shipment.id}
                  onSelect={() => setSelectedId(shipment.id)}
                />
              </li>
            ))}
          </ul>
          <div className="min-w-0 flex-1">
            <ShipmentDetail deal={selected.deal} shipment={selected.shipment} />
          </div>
        </div>
      )}

      {openClaims.length > 0 && !selected ? (
        <div className="mt-8">
          <h2 className="text-[17px] font-bold tracking-tight">Open claims</h2>
          <div className="mt-3 flex flex-col gap-3">
            {openClaims.map(({ deal, shipment }) => (
              <ClaimRow key={shipment.id} deal={deal} shipment={shipment} onOpen={() => setSelectedId(shipment.id)} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** One shipment, compact enough that a whole column of them is still a
 *  glance rather than a scroll — clicking opens its own tracker in place,
 *  the same "here's the one thing you asked about" answer a shipment
 *  deserves, rather than the whole owning deal (stage history,
 *  negotiation, everything) it has no reason to need. */
function ShipmentRow({ deal, shipment, onOpen }: { deal: Deal; shipment: Shipment; onOpen: () => void }) {
  const ModeIcon = modeIcons[shipment.mode]
  const status = statusStyles[shipment.status]
  const cutoff = soonestCutoff(shipment)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-start gap-3 px-5 py-3.5 text-start transition-colors hover:bg-muted"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-foreground">
        <ModeIcon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-foreground">{deal.listingTitle}</p>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{LOGISTICS_STAGE_LABELS[shipment.stage]}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {shipment.carrier} · {LOGISTICS_MODE_LABELS[shipment.mode]}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span aria-hidden className={cn("size-2 rounded-full", status.dot)} />
        {cutoff ? (
          <span aria-hidden title={`${cutoff.label} cut-off`} className={cn("size-2 rounded-full", cutoffDotStyles[cutoff.state])} />
        ) : null}
        {shipment.eta ? (
          <span className="text-[10px] text-muted-foreground">ETA {formatShortDate(shipment.eta)}</span>
        ) : null}
        {shipment.demurrageUsd ? (
          <span className="text-[10px] font-semibold text-status-warning">{formatInr(shipment.demurrageUsd)}</span>
        ) : null}
      </div>
    </button>
  )
}

/** The narrow-rail row, once something's selected. */
function CompactShipmentRow({
  deal,
  shipment,
  active,
  onSelect,
}: {
  deal: Deal
  shipment: Shipment
  active: boolean
  onSelect: () => void
}) {
  const cutoff = soonestCutoff(shipment)
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
      {cutoff ? (
        <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", cutoffDotStyles[cutoff.state])} />
      ) : (
        <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-border" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold text-foreground">{deal.listingTitle}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{deal.buyerName} ↔ {deal.sellerName}</p>
        <p className="mt-1.5 inline-flex rounded-full bg-card px-2 py-0.5 text-[11px] font-semibold text-amama-deep">
          {LOGISTICS_STAGE_LABELS[shipment.stage]}
        </p>
      </div>
    </button>
  )
}

function ClaimRow({ deal, shipment, onOpen }: { deal: Deal; shipment: Shipment; onOpen: () => void }) {
  const claim = shipment.claim
  if (!claim) return null
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full flex-wrap items-start justify-between gap-3 rounded-[20px] border border-border bg-card p-4 text-start transition-colors hover:bg-muted"
    >
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-destructive">{formatInr(claim.amountUsd)}</p>
        <p className="mt-1 text-[13px] text-foreground">{claim.reason}</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          <span className="font-medium text-foreground">{deal.listingTitle}</span> · raised by{" "}
          {claim.raisedBy === "buyer" ? deal.buyerName : deal.sellerName} on {formatShortDate(claim.raisedAt)}
        </p>
      </div>
    </button>
  )
}

/** Three clocks on one line — shelf life, the soonest cut-off, and the
 *  payment term the deal was struck on — the actual job of a control
 *  tower per the reference this pipeline is built from: winning the
 *  sailing while losing track of working capital is still a loss. A
 *  plain row, not its own bordered card — it reads as a subheading for
 *  the tracker beneath it, not a second, competing block. */
function ThreeClocksLine({ deal, shipment }: { deal: Deal; shipment: Shipment }) {
  const shelfLife = shelfLifeRemaining(shipment)
  const cutoff = soonestCutoff(shipment)
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div>
        <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Shelf life</p>
        <p className="mt-0.5 text-[14px] font-bold text-foreground">
          {shelfLife ? `${shelfLife.remainingDays}d left of ${shelfLife.budgetDays}` : "Not tracked"}
        </p>
      </div>
      <div>
        <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Next cut-off</p>
        <p className={cn("mt-0.5 text-[14px] font-bold", cutoff ? cutoffTextStyles[cutoff.state] : "text-foreground")}>
          {cutoff ? `${cutoff.label} · ${cutoff.state === "overdue" ? "passed" : formatShortDate(cutoff.at)}` : "None set"}
        </p>
      </div>
      <div>
        <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Payment</p>
        <p className="mt-0.5 text-[14px] font-bold text-foreground">
          {deal.payment.settled ? "Settled" : deal.costing.paymentTerm ?? "Not agreed yet"}
        </p>
      </div>
    </div>
  )
}

const cutoffTextStyles: Record<"ok" | "soon" | "overdue", string> = {
  ok: "text-foreground",
  soon: "text-status-warning",
  overdue: "text-destructive",
}

/** The document register — every document this shipment needs, mandatory
 *  or not, with the stage each one gates, in one table — the extra
 *  column an ops read needs over the tracker's own plain name/status
 *  list in its "Show details" disclosure. A plain section under a small
 *  heading, not another bordered card next to the tracker. */
function DocumentRegister({ shipment }: { shipment: Shipment }) {
  if (shipment.documents.length === 0) return null
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Document register</p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[520px] text-[13px]">
          <thead>
            <tr className="text-left text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              <th className="pb-2 pr-3">Document</th>
              <th className="pb-2 pr-3">Stage</th>
              <th className="pb-2 pr-3">Req.</th>
              <th className="pb-2 pr-3">Status</th>
              <th className="pb-2">Issuer</th>
            </tr>
          </thead>
          <tbody>
            {shipment.documents.map((doc) => (
              <tr key={doc.id} className="border-t border-border">
                <td className="py-2 pr-3 font-medium text-foreground">{doc.name}</td>
                <td className="py-2 pr-3 text-muted-foreground">{LOGISTICS_STAGE_LABELS[doc.stage]}</td>
                <td className="py-2 pr-3 text-muted-foreground">{doc.mandatory ? "Mandatory" : "Optional"}</td>
                <td className="py-2 pr-3">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      doc.status === "verified"
                        ? "bg-amama-subtle text-amama-deep"
                        : doc.status === "missing"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-status-warning/10 text-status-warning"
                    )}
                  >
                    {doc.status}
                  </span>
                </td>
                <td className="py-2 text-muted-foreground">{doc.issuer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** The full detail pane — a plain header and three-clock summary, then
 *  the shared tracker as the one bordered "card" on the page (it already
 *  carries the stage rail, cutoff chip, blocking documents, cold-chain
 *  strip and claim behind its own "Show details"), and the fuller
 *  document register underneath as a plain section — not another card
 *  wrapping a card. */
function ShipmentDetail({ deal, shipment }: { deal: Deal; shipment: Shipment }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[17px] font-bold tracking-tight text-foreground">{deal.listingTitle}</p>
          <p className="truncate text-[13px] text-muted-foreground">
            {deal.buyerName} ↔ {deal.sellerName}
          </p>
        </div>
        <Link
          href={`/internal/deals?deal=${deal.id}`}
          className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-amama-deep hover:underline"
        >
          Open deal
          <ArrowRightIcon className="size-3" />
        </Link>
      </div>
      <ThreeClocksLine deal={deal} shipment={shipment} />
      <ShipmentTracker shipment={shipment} />
      <DocumentRegister shipment={shipment} />
    </div>
  )
}

export { LogisticsView }
