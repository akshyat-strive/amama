"use client"

import * as React from "react"
import {
  AlertTriangleIcon,
  AnchorIcon,
  BoxesIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  DoorOpenIcon,
  FileCheckIcon,
  HashIcon,
  NavigationIcon,
  PackageCheckIcon,
  PackageIcon,
  PlaneIcon,
  ShipIcon,
  TruckIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  LOGISTICS_MODE_LABELS,
  type LogisticsMode,
  type Shipment,
  type ShipmentEventType,
  type ShipmentStatus,
} from "@/features/marketplace/deal-store"

const modeIcons: Record<LogisticsMode, LucideIcon> = {
  trucking: TruckIcon,
  ocean: ShipIcon,
  air: PlaneIcon,
  consolidation: BoxesIcon,
}

const eventIcons: Record<ShipmentEventType, LucideIcon> = {
  booked: PackageIcon,
  "gate-in": DoorOpenIcon,
  loaded: PackageCheckIcon,
  departed: ShipIcon,
  "in-transit": NavigationIcon,
  "arrived-port": AnchorIcon,
  customs: FileCheckIcon,
  "out-for-delivery": TruckIcon,
  delivered: CheckCircleIcon,
  delayed: AlertTriangleIcon,
}

const statusStyles: Record<ShipmentStatus, { label: string; dot: string; pill: string }> = {
  booked: { label: "Booked", dot: "bg-muted-foreground", pill: "bg-muted text-muted-foreground" },
  "in-transit": { label: "In transit", dot: "bg-amama-deep", pill: "bg-amama-subtle text-amama-deep" },
  arrived: { label: "Arrived", dot: "bg-amama-deep", pill: "bg-amama-subtle text-amama-deep" },
  delayed: { label: "Delayed", dot: "bg-destructive", pill: "bg-destructive/10 text-destructive" },
}

/** How far along the route to draw the mode icon — a semantic read of the
 *  latest checkpoint, not a literal distance calculation (nobody's giving
 *  this component real GPS). "Delayed" deliberately doesn't advance past
 *  where the shipment actually stalled. */
const PROGRESS_BY_EVENT: Record<ShipmentEventType, number> = {
  booked: 6,
  "gate-in": 16,
  loaded: 26,
  departed: 38,
  "in-transit": 58,
  "arrived-port": 82,
  customs: 90,
  "out-for-delivery": 95,
  delivered: 100,
  delayed: 45,
}

/** Real-world seaport/airport codes for the handful of places this app's
 *  own seed data actually names — falls back to a plausible three-letter
 *  derivation (first word, first three letters) for anything else, since
 *  a demo needs *a* code on every card, not just the ones we happened to
 *  hardcode. Visual authenticity, not a real routing database. */
const KNOWN_PORT_CODES: Record<string, string> = {
  kochi: "COK",
  rotterdam: "RTM",
  hamburg: "HAM",
  dubai: "DXB",
  "jebel ali": "JEA",
  chennai: "MAA",
  mumbai: "BOM",
  "new york": "JFK",
  tema: "TEM",
  "nhava sheva": "NSA",
  singapore: "SIN",
  bangkok: "BKK",
  coonoor: "COO",
}

function portCode(location: string | null): string {
  if (!location) return "···"
  const firstSegment = location.split(",")[0].trim().toLowerCase()
  const known = KNOWN_PORT_CODES[firstSegment]
  if (known) return known
  const firstWord = firstSegment.split(" ")[0] ?? firstSegment
  return firstWord.slice(0, 3).toUpperCase().padEnd(3, firstWord.length ? firstWord.slice(-1).toUpperCase() : "X")
}

function formatEventDate(at: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(at))
}

function formatShortDate(at: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(at))
}

/**
 * The one visual this whole feature hinges on: a non-technical buyer or
 * seller has to glance at it and immediately understand where their
 * shipment actually is. Styled as a boarding pass on purpose — a big
 * three-letter code on either end, a dashed route line with the mode's
 * own icon riding along it at roughly how far the shipment has actually
 * gotten, and a reference/details strip below, the same shape as a
 * flight or train ticket rather than a generic status card. The full
 * event-by-event history still exists underneath, just collapsed by
 * default — the ticket is the answer, the log is the proof.
 * Deliberately dependency-free of both `admin-ui.tsx` (admin-only) and
 * `dashboard-ui.tsx` (buyer/seller-only): this is the one component both
 * sides share, so it can't lean on either.
 */
function ShipmentTracker({ shipment }: { shipment: Shipment }) {
  const [historyOpen, setHistoryOpen] = React.useState(false)
  const status = statusStyles[shipment.status]
  const ModeIcon = modeIcons[shipment.mode]
  const events = [...shipment.events].reverse()
  const latestEvent = events[0]
  const isDelayed = shipment.status === "delayed"

  const progress = latestEvent ? PROGRESS_BY_EVENT[latestEvent.type] : 0
  // Not every mode's checkpoint vocabulary includes a literal "departed"
  // type (trucking often goes straight from "loaded" to "delivered") — so
  // "has this leg actually left origin" is really just "is there any
  // checkpoint after the first one", named generically as departure.
  const bookedEvent = shipment.events.find((event) => event.type === "booked") ?? shipment.events[0] ?? null
  const departedEvent =
    shipment.events.find((event) => event.type === "departed") ??
    shipment.events.find((event) => event !== bookedEvent) ??
    null
  const arrivedEvent = shipment.events.find((event) => event.type === "delivered" || event.type === "arrived-port")

  return (
    <div className="overflow-hidden rounded-[24px] border border-border bg-card">
      {/* Header strip — carrier + mode on the left, live status on the right. */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-background">
            <ModeIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold tracking-tight text-foreground">{shipment.carrier}</p>
            <p className="truncate text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              {LOGISTICS_MODE_LABELS[shipment.mode]}
            </p>
          </div>
        </div>
        <span className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium", status.pill)}>
          <span aria-hidden className={cn("size-1.5 rounded-full", status.dot)} />
          {status.label}
        </span>
      </div>

      {/* The ticket's route hero — codes and the dashed route line share
          one row (the line rides in the space already sitting between
          MUM and DEL, not a separate row underneath), with the mode icon
          bare and sized up rather than boxed in its own circle. */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <p className="shrink-0 text-[26px] font-extrabold tracking-tight text-foreground tabular-nums">
            {portCode(shipment.origin)}
          </p>

          <div className="relative h-6 min-w-[64px] flex-1">
            <div aria-hidden className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-border" />
            <span aria-hidden className="absolute top-1/2 left-0 size-1.5 -translate-y-1/2 rounded-full bg-foreground" />
            <span
              aria-hidden
              className="absolute top-1/2 right-0 size-1.5 -translate-y-1/2 rounded-full border border-foreground bg-card"
            />
            <ModeIcon
              aria-hidden
              className={cn(
                "absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-500",
                isDelayed ? "text-destructive" : "text-amama-deep"
              )}
              style={{ left: `${Math.min(96, Math.max(4, progress))}%` }}
            />
          </div>

          <p className="shrink-0 text-[26px] font-extrabold tracking-tight text-foreground tabular-nums">
            {portCode(shipment.destination)}
          </p>
        </div>

        <div className="mt-1.5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="max-w-[130px] truncate text-[12px] text-muted-foreground">
              {shipment.origin ?? "Origin TBD"}
            </p>
            <p className="mt-1 text-[11px] font-medium text-muted-foreground">
              {departedEvent
                ? `Departed ${formatShortDate(departedEvent.at)}`
                : bookedEvent
                  ? `Booked ${formatShortDate(bookedEvent.at)}`
                  : "Not yet booked"}
            </p>
          </div>
          <div className="min-w-0 text-end">
            <p className="max-w-[130px] truncate text-[12px] text-muted-foreground">
              {shipment.destination ?? "Destination TBD"}
            </p>
            <p className="mt-1 text-[11px] font-medium text-muted-foreground">
              {arrivedEvent
                ? `Arrived ${formatShortDate(arrivedEvent.at)}`
                : shipment.eta
                  ? `ETA ${formatShortDate(shipment.eta)}`
                  : "ETA TBD"}
            </p>
          </div>
        </div>
      </div>

      {/* Ticket-stub divider — a dashed seam, the way a boarding pass
          separates its route half from its details half. */}
      <div aria-hidden className="border-t border-dashed border-border" />

      <div className="grid grid-cols-2 gap-3 px-5 py-4 sm:grid-cols-3">
        <div>
          <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Currently</p>
          <p className="mt-0.5 truncate text-[13px] font-semibold text-foreground">
            {shipment.currentLocation ?? "Not yet picked up"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Reference</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] font-semibold text-foreground">
            <HashIcon className="size-3 shrink-0 text-muted-foreground" />
            {shipment.documentNumber || "Not booked yet"}
          </p>
        </div>
        {shipment.note ? (
          <div className="col-span-2 sm:col-span-1">
            <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Note</p>
            <p className="mt-0.5 truncate text-[13px] font-semibold text-foreground">{shipment.note}</p>
          </div>
        ) : null}
      </div>

      {events.length > 0 ? (
        <div className="border-t border-border">
          <button
            type="button"
            onClick={() => setHistoryOpen((open) => !open)}
            aria-expanded={historyOpen}
            className="flex w-full items-center justify-between px-5 py-3 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            {historyOpen ? "Hide full tracking history" : `Show full tracking history (${events.length})`}
            <ChevronDownIcon className={cn("size-4 shrink-0 transition-transform", historyOpen && "rotate-180")} />
          </button>

          {historyOpen ? (
            <ul className="flex flex-col px-5 pb-5">
              {events.map((event, index) => {
                const Icon = eventIcons[event.type]
                const isLatest = index === 0
                const isLast = index === events.length - 1
                const isTrouble = event.type === "delayed"
                return (
                  <li key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "grid size-8 shrink-0 place-items-center rounded-full",
                          isTrouble
                            ? "bg-destructive text-white"
                            : isLatest
                              ? "bg-amama-deep text-white"
                              : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      {!isLast ? <span aria-hidden className="my-0.5 w-px flex-1 bg-border" /> : null}
                    </div>
                    <div className={cn("min-w-0", isLast ? "pb-0" : "pb-5")}>
                      <p
                        className={cn(
                          "pt-1.5 text-[13px] font-semibold",
                          isLatest ? "text-foreground" : "text-foreground/80"
                        )}
                      >
                        {event.label}
                      </p>
                      <p className="text-[12px] text-muted-foreground">
                        {formatEventDate(event.at)}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                      {event.note ? <p className="mt-0.5 text-[12px] text-muted-foreground">{event.note}</p> : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="border-t border-border px-5 py-3 text-[13px] text-muted-foreground">
          No tracking updates logged yet.
        </p>
      )}
    </div>
  )
}

export { ShipmentTracker }
