"use client"

import * as React from "react"
import { ChevronDownIcon, ShipIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { ShipmentTracker } from "@/features/marketplace/shipment-tracker"
import {
  LOGISTICS_MODE_LABELS,
  ORDER_STAGE_LABELS,
  ORDER_STAGE_ORDER,
  type Deal,
  type Shipment,
} from "@/features/marketplace/deal-store"

/**
 * "Where is my order", answered in one glance and then in as much detail
 * as you want.
 *
 * Five stages run left to right. Only `in-transit` opens up, because it's
 * the only one that is really several things happening in sequence — a
 * truck to the port, a vessel, sometimes a consolidation stop, sometimes
 * a plane. The other four are single events and pretending otherwise
 * would be padding.
 */
function OrderJourney({
  deal,
  defaultExpanded = false,
}: {
  deal: Deal
  /** Buyer/seller order pages open the detail straight away — they came
   *  here to see it. The KAM console keeps it collapsed, since it lists
   *  many deals at once. */
  defaultExpanded?: boolean
}) {
  const stage = deal.orderStage
  const [expanded, setExpanded] = React.useState(defaultExpanded)

  if (!stage) return null

  const currentIndex = ORDER_STAGE_ORDER.indexOf(stage)
  const reached = currentIndex >= ORDER_STAGE_ORDER.indexOf("in-transit")
  const hasLegs = deal.shipments.length > 0

  return (
    <div className="flex flex-col gap-3">
      {/* A thin line and a dot, not a row of thick colored bars — the
          bars read as a generic dashboard progress meter; a stepper
          where only the current stop actually stands out reads as
          considered instead. */}
      <ol className="flex items-stretch gap-1">
        {ORDER_STAGE_ORDER.map((entry, index) => {
          const done = index < currentIndex
          const current = index === currentIndex
          return (
            <li key={entry} className="min-w-0 flex-1">
              <div className="relative h-2.5">
                <div
                  aria-hidden
                  className={cn("absolute inset-x-0 top-1/2 h-px -translate-y-1/2", done ? "bg-amama-deep" : "bg-border")}
                />
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all",
                    current
                      ? "size-2.5 bg-amama-deep ring-[3px] ring-amama-subtle"
                      : done
                        ? "size-2 bg-amama-deep"
                        : "size-2 border-2 border-border bg-card"
                  )}
                />
              </div>
              <p
                className={cn(
                  "mt-2.5 truncate tracking-tight",
                  current
                    ? "text-[12px] font-bold text-amama-deep"
                    : done
                      ? "text-[11px] font-semibold text-foreground"
                      : "text-[11px] font-medium text-muted-foreground"
                )}
              >
                {ORDER_STAGE_LABELS[entry]}
              </p>
            </li>
          )
        })}
      </ol>

      {/* The sub-journey only earns its space once the order is actually
          moving and there's a leg to show. */}
      {reached && hasLegs ? (
        <div className="rounded-[18px] border border-border bg-muted">
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={expanded}
            className="flex w-full items-center gap-2.5 px-4 py-3 text-start"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-amama-deep text-white">
              <ShipIcon className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-bold text-foreground">Tracking &amp; logistics</span>
              <span className="block truncate text-[12px] text-muted-foreground">
                {deal.shipments.map((shipment) => LOGISTICS_MODE_LABELS[shipment.mode]).join(" → ")}
              </span>
            </span>
            <ChevronDownIcon
              aria-hidden
              className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
            />
          </button>

          {expanded ? (
            <div className="flex flex-col gap-3 border-t border-border p-4">
              {deal.shipments.map((shipment, index) => (
                <LegPanel key={shipment.id} shipment={shipment} index={index} total={deal.shipments.length} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/** One leg. The ticket itself already leads with its own mode/carrier —
 *  this only adds what it can't know on its own: which leg, out of how
 *  many, this is. */
function LegPanel({ shipment, index, total }: { shipment: Shipment; index: number; total: number }) {
  return (
    <div>
      {total > 1 ? (
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Leg {index + 1} of {total}
        </p>
      ) : null}
      <ShipmentTracker shipment={shipment} />
    </div>
  )
}

export { OrderJourney }
