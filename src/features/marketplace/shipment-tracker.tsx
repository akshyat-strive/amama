"use client"

import * as React from "react"
import {
  AlertTriangleIcon,
  AnchorIcon,
  ArrowRightIcon,
  BadgeCheckIcon,
  BoxesIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  DoorOpenIcon,
  FileCheckIcon,
  FileTextIcon,
  MapPinIcon,
  NavigationIcon,
  PackageCheckIcon,
  PackageIcon,
  PlaneIcon,
  ScaleIcon,
  ShipIcon,
  SnowflakeIcon,
  StampIcon,
  ThermometerIcon,
  TruckIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  type ClaimStatus,
  type LogisticsMode,
  type LogisticsStage,
  type Shipment,
  type ShipmentEvent,
  type ShipmentEventType,
  type ShipmentStatus,
} from "@/features/marketplace/deal-store"
import { CarrierLogo } from "@/features/marketplace/carrier-logo"
import { formatInr } from "@/features/marketplace/currency"
import { LogisticsStageRail } from "@/features/marketplace/logistics-stage-rail"
import { LOGISTICS_STAGE_ORDER, detectExcursions, documentBlockers, soonestCutoff } from "@/features/marketplace/logistics"

const modeIcons: Record<LogisticsMode, LucideIcon> = {
  trucking: TruckIcon,
  ocean: ShipIcon,
  air: PlaneIcon,
  consolidation: BoxesIcon,
}

const eventIcons: Record<ShipmentEventType, LucideIcon> = {
  "farm-pickup": TruckIcon,
  "warehouse-inbound": PackageIcon,
  "cold-storage-in": SnowflakeIcon,
  "export-qc-pass": BadgeCheckIcon,
  booked: PackageIcon,
  "gate-in": DoorOpenIcon,
  loaded: PackageCheckIcon,
  departed: ShipIcon,
  "in-transit": NavigationIcon,
  "arrived-port": AnchorIcon,
  documentation: FileTextIcon,
  customs: FileCheckIcon,
  "vgm-filed": ScaleIcon,
  "leo-issued": StampIcon,
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

const claimStatusStyles: Record<ClaimStatus, { label: string; pill: string }> = {
  open: { label: "Open", pill: "bg-destructive/10 text-destructive" },
  "under-review": { label: "Under review", pill: "bg-status-warning/10 text-status-warning" },
  settled: { label: "Settled", pill: "bg-amama-subtle text-amama-deep" },
  rejected: { label: "Rejected", pill: "bg-muted text-muted-foreground" },
}

const alertPillStyles: Record<"ok" | "warning" | "critical", string> = {
  ok: "bg-muted text-muted-foreground",
  warning: "bg-status-warning/10 text-status-warning",
  critical: "bg-destructive/10 text-destructive",
}

/** How far along the route to draw the mode icon — a semantic read of the
 *  latest checkpoint, not a literal distance calculation (nobody's giving
 *  this component real GPS). "Delayed" deliberately doesn't advance past
 *  where the shipment actually stalled. */
const PROGRESS_BY_EVENT: Record<ShipmentEventType, number> = {
  "farm-pickup": 2,
  "warehouse-inbound": 4,
  "cold-storage-in": 6,
  "export-qc-pass": 8,
  booked: 10,
  loaded: 20,
  "vgm-filed": 24,
  documentation: 30,
  customs: 34,
  "leo-issued": 38,
  "gate-in": 42,
  departed: 55,
  "in-transit": 68,
  "arrived-port": 84,
  "out-for-delivery": 95,
  delivered: 100,
  delayed: 48,
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

function daysBetween(fromIso: string, toIso: string): number {
  return Math.max(0, Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000))
}

/** The four checkpoints `MilestoneStepper` collapses the eleven real
 *  stages down to — the big, glanceable read; `LogisticsStageRail`
 *  (inside "Show details") still carries the stage-by-stage detail. */
const MILESTONES: { label: string; icon: LucideIcon; throughStage: LogisticsStage }[] = [
  { label: "Booked", icon: PackageIcon, throughStage: "container-booked" },
  { label: "Dispatched", icon: BoxesIcon, throughStage: "gate-in" },
  { label: "In transit", icon: ShipIcon, throughStage: "vessel-transit" },
  { label: "Delivered", icon: MapPinIcon, throughStage: "arrived-delivered" },
]

/** Four big circular icons connected by a line that's solid dark behind
 *  the shipment, solid light ahead of it, and a dark-to-light gradient
 *  only across the one segment it's currently crossing — the "boarding
 *  pass" read from the reference this card's layout follows, sized up
 *  from the compact per-stage rail so it reads at a glance. */
function MilestoneStepper({ stage, isDelayed }: { stage: LogisticsStage; isDelayed: boolean }) {
  const stageIndex = LOGISTICS_STAGE_ORDER.indexOf(stage)
  const rawIndex = MILESTONES.findIndex((milestone) => stageIndex <= LOGISTICS_STAGE_ORDER.indexOf(milestone.throughStage))
  const currentMilestone = rawIndex === -1 ? MILESTONES.length - 1 : rawIndex
  const tone = isDelayed ? "var(--destructive)" : "var(--foreground)"

  return (
    <div className="flex items-start">
      {MILESTONES.map((milestone, index) => {
        const done = index < currentMilestone
        const current = index === currentMilestone
        const Icon = milestone.icon
        return (
          <React.Fragment key={milestone.label}>
            <div className="flex shrink-0 flex-col items-center gap-1.5">
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full",
                  done || current
                    ? current && isDelayed
                      ? "bg-destructive text-white"
                      : "bg-foreground text-background"
                    : "border border-border bg-muted text-muted-foreground"
                )}
              >
                <Icon className="size-4" />
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  done || current ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {milestone.label}
              </span>
            </div>
            {index < MILESTONES.length - 1 ? (
              <span
                aria-hidden
                className="mx-1 mt-[18px] h-[3px] flex-1 rounded-full"
                style={{
                  background:
                    index < currentMilestone
                      ? tone
                      : index === currentMilestone
                        ? `linear-gradient(to right, ${tone}, var(--border))`
                        : "var(--border)",
                }}
              />
            ) : null}
          </React.Fragment>
        )
      })}
    </div>
  )
}

function ShipmentStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-bold text-foreground">{value}</p>
    </div>
  )
}

/**
 * The one visual this whole feature hinges on: a non-technical buyer or
 * seller has to glance at it and immediately understand where their
 * shipment actually is. One plain surface, not a colored header band
 * sitting over a white body. The shipment's own reference number leads
 * as the title (the thing everyone actually calls it by), with a small
 * origin→destination-plus-progress block sitting right underneath it at
 * a compact width rather than stretched across the card. Full width —
 * whatever container it's placed in decides its actual size, not an
 * artificial cap of its own. A big four-checkpoint stepper with a
 * gradient-marked current segment gives the same "where is it" answer
 * a second, more visual way, and a plain three-stat footer (total time /
 * departure / arrival) closes it out the same way a boarding pass would.
 *
 * Everything past that — the full eleven-stage rail, the document
 * register, the cold-chain readout, the event-by-event log — is real,
 * but nobody needs all of it open just to see where a shipment is. It
 * lives behind one "Details" disclosure instead of several separately-
 * bordered sections, so a list of these never reads as cards stacked
 * inside cards.
 *
 * Deliberately dependency-free of both `admin-ui.tsx` (admin-only) and
 * `dashboard-ui.tsx` (buyer/seller-only): this is the one component both
 * sides share, so it can't lean on either. `actions` is an optional slot
 * for whatever's actually actionable from here — the caller decides what,
 * since that's role- and stage-specific, not something this shared
 * component should know about.
 */
function ShipmentTracker({ shipment, actions }: { shipment: Shipment; actions?: React.ReactNode }) {
  const [detailsOpen, setDetailsOpen] = React.useState(true)
  const status = statusStyles[shipment.status]
  const events = [...shipment.events].reverse()
  const latestEvent = events[0]
  const isDelayed = shipment.status === "delayed"
  const cutoff = soonestCutoff(shipment)
  const blockers = documentBlockers(shipment)

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
  const whenLine = arrivedEvent
    ? `Arrived ${formatShortDate(arrivedEvent.at)}`
    : departedEvent
      ? `Departed ${formatShortDate(departedEvent.at)}${shipment.eta ? ` · ETA ${formatShortDate(shipment.eta)}` : ""}`
      : bookedEvent
        ? `Booked ${formatShortDate(bookedEvent.at)}`
        : "Not yet booked"

  const firstEventAt = shipment.events[0]?.at ?? null
  const totalTimeLabel = firstEventAt
    ? arrivedEvent
      ? `${daysBetween(firstEventAt, arrivedEvent.at)}d`
      : `${daysBetween(firstEventAt, new Date().toISOString())}d so far`
    : "—"
  const departureLabel = departedEvent
    ? formatShortDate(departedEvent.at)
    : bookedEvent
      ? formatShortDate(bookedEvent.at)
      : "—"
  const arrivalLabel = arrivedEvent ? formatShortDate(arrivedEvent.at) : shipment.eta ? formatShortDate(shipment.eta) : "—"

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-4 sm:p-5">
      {/* Header — the shipment's own reference number as the title, its
          live status (and delay flag) at the end. */}
      <div className="space-y-3">
        {/* Top Row: Identity paired tightly with status pill */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2">
            <h3 className="truncate text-[16px] font-bold tabular-nums text-foreground">
              {shipment.documentNumber || "Not booked yet"}
            </h3>
            <span className="text-muted-foreground/40">•</span>
            <span className="inline-flex items-center gap-1.5 truncate text-[12px] text-muted-foreground">
              <CarrierLogo carrier={shipment.carrier} mode={shipment.mode} className="size-3.5 shrink-0 text-foreground/80" />
              <span className="truncate">{shipment.carrier}</span>
            </span>
          </div>

          <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", status.pill)}>
            <span aria-hidden className={cn("size-1.5 rounded-full", status.dot)} />
            {status.label}
          </span>
        </div>

        {/* Hero Corridor Block: Centered priority SRC → DES + wider matching progress bar */}
        <div className="flex flex-col items-center py-1 tabular-nums">
          <div className="flex items-center gap-2 text-[22px] font-semibold tracking-tight text-foreground">
            <span>{portCode(shipment.origin)}</span>
            <span className="text-muted-foreground/50 text-[18px]">→</span>
            <span>{portCode(shipment.destination)}</span>
          </div>

          <p className="mt-0.5 text-[11px] text-muted-foreground">{whenLine}</p>

          {/* Centered track matching route footprint width */}
          <div className="mt-2 flex w-full max-w-[200px] flex-col items-center gap-1">
            <div aria-hidden className="h-1 w-full overflow-hidden rounded-full bg-slate-200/80">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isDelayed ? "bg-destructive/85" : "bg-amama-deep/85"
                )}
                style={{ width: `${Math.max(4, progress)}%` }}
              />
            </div>
            <span className="text-[10px] tabular-nums font-medium text-muted-foreground">{progress}%</span>
          </div>
        </div>
      </div>

      {(cutoff || blockers.length > 0 || shipment.demurrageUsd || shipment.note) && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {cutoff ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                alertPillStyles[cutoff.state === "ok" ? "ok" : cutoff.state === "soon" ? "warning" : "critical"]
              )}
            >
              <ClockIcon className="size-3" />
              {cutoff.label} {cutoff.state === "overdue" ? "passed" : formatShortDate(cutoff.at)}
            </span>
          ) : null}
          {blockers.length > 0 ? (
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", alertPillStyles.warning)}>
              <FileTextIcon className="size-3" />
              {blockers.length} document{blockers.length === 1 ? "" : "s"} blocking
            </span>
          ) : null}
          {shipment.demurrageUsd ? (
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", alertPillStyles.warning)}>
              {formatInr(shipment.demurrageUsd)} demurrage
            </span>
          ) : null}
          {shipment.note ? <span className="truncate text-[11px] text-muted-foreground">{shipment.note}</span> : null}
        </div>
      )}

      {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}

      {/* The route, spelled out, with who's carrying it — a light gray
          surface rather than another bordered card. */}
      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-muted/60 p-3">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center gap-2 text-[12px]">
            <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-foreground" />
            <span className="truncate font-medium text-foreground">{shipment.origin ?? "Origin pending"}</span>
          </div>
          <span aria-hidden className="ms-[3px] h-3 w-px bg-border" />
          <div className="flex items-center gap-2 text-[12px]">
            <span aria-hidden className="size-1.5 shrink-0 rounded-full border border-foreground" />
            <span className="truncate font-medium text-foreground">{shipment.destination ?? "Destination pending"}</span>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground shadow-sm">
          <CarrierLogo carrier={shipment.carrier} mode={shipment.mode} />
          {shipment.carrier}
        </span>
      </div>

      {/* The big four-checkpoint stepper — the glanceable read; the full
          eleven-stage rail still lives in "Show details" below. */}
      <div className="mt-4 overflow-x-auto pb-1">
        <MilestoneStepper stage={shipment.stage} isDelayed={isDelayed} />
      </div>

      {/* Total time / departure / arrival — closing the card out the same
          way a boarding pass would. */}
      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3">
        <ShipmentStat label="Total time" value={totalTimeLabel} />
        <ShipmentStat label="Departure" value={departureLabel} />
        <ShipmentStat label={arrivedEvent ? "Arrived" : "Arrival"} value={arrivalLabel} />
      </div>

      {/* A claim gets the same alarm treatment as "delayed" — solid red
          text, not a filled banner block — because it's the one state
          here that means someone's money is actually in dispute, and it
          still shouldn't need its own boxed section to say so. */}
      {shipment.claim ? (
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-destructive">
              <AlertTriangleIcon className="size-4 shrink-0" />
              Claim raised — {formatInr(shipment.claim.amountUsd)}
            </p>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", claimStatusStyles[shipment.claim.status].pill)}>
              {claimStatusStyles[shipment.claim.status].label}
            </span>
          </div>
          <p className="mt-1.5 text-[13px] text-foreground">{shipment.claim.reason}</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Raised by {shipment.claim.raisedBy === "buyer" ? "the buyer" : "the seller"} on{" "}
            {formatShortDate(shipment.claim.raisedAt)}
          </p>
          {shipment.claim.resolutionNote ? (
            <p className="mt-1.5 rounded-[10px] bg-muted px-2.5 py-2 text-[12px] text-foreground">
              {shipment.claim.resolutionNote}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* One disclosure for everything else — the full stage pipeline,
          cold-chain readout, complete document list and event-by-event
          log all live inside this single expand instead of each being
          its own always-open, separately-bordered block. */}
      <div className="mt-3 border-t border-border pt-3">
        <button
          type="button"
          onClick={() => setDetailsOpen((open) => !open)}
          aria-expanded={detailsOpen}
          className="flex w-full items-center justify-between text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          {detailsOpen ? "Hide details" : "Show details"}
          <ChevronDownIcon className={cn("size-4 shrink-0 transition-transform", detailsOpen && "rotate-180")} />
        </button>

        {detailsOpen ? (
          <div className="mt-3 flex flex-col gap-4">
            <LogisticsStageRail stage={shipment.stage} compact />
            <ShipmentColdChainStrip shipment={shipment} />
            <ShipmentFullDocuments shipment={shipment} />
            <ShipmentEventHistory events={events} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

/** Every document this shipment carries, not just its current blockers —
 *  a plain list, shown only inside the details disclosure. */
function ShipmentFullDocuments({ shipment }: { shipment: Shipment }) {
  if (shipment.documents.length === 0) return null
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Documents</p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {shipment.documents.map((doc) => (
          <li key={doc.id} className="flex items-center justify-between gap-2 text-[12px]">
            <span className="truncate text-foreground">{doc.name}</span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                doc.status === "verified"
                  ? "bg-amama-subtle text-amama-deep"
                  : doc.status === "missing"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-status-warning/10 text-status-warning"
              )}
            >
              {doc.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** A plain bar series, no charting library — one bar per reading, its
 *  height read against the set point, red once it crosses the same +2°C
 *  threshold `detectExcursions` uses. Only ever rendered for a leg that
 *  actually carries a cold-chain log. */
function ShipmentColdChainStrip({ shipment }: { shipment: Shipment }) {
  const coldChain = shipment.coldChain
  if (!coldChain || coldChain.samples.length === 0) return null
  const excursions = detectExcursions(coldChain.samples, coldChain.setpointC)
  const maxTemp = Math.max(coldChain.setpointC + 4, ...coldChain.samples.map((sample) => sample.tempC))

  return (
    <div>
      <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        <ThermometerIcon className="size-3.5" />
        Cold chain · set point {coldChain.setpointC}°C
      </p>
      <div className="mt-2 flex h-10 items-end gap-0.5">
        {coldChain.samples.map((sample) => {
          const excursion = sample.tempC > coldChain.setpointC + 2
          return (
            <span
              key={sample.id}
              title={`${sample.tempC}°C · ${sample.leg} · ${formatEventDate(sample.at)}`}
              className={cn("min-w-[3px] flex-1 rounded-t-sm", excursion ? "bg-destructive" : "bg-amama-deep/70")}
              style={{ height: `${Math.max(8, (sample.tempC / maxTemp) * 100)}%` }}
            />
          )
        })}
      </div>
      {excursions.length > 0 ? (
        <div className="mt-3 flex flex-col gap-1.5">
          {excursions.map((excursion) => (
            <p key={excursion.startAt} className="flex items-start gap-1.5 text-[12px] text-destructive">
              <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />
              {excursion.durationHrs}h at up to {excursion.peakTempC}°C — ~{excursion.shelfLifeDebitDays}d shelf life
              debited
            </p>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ShipmentEventHistory({ events }: { events: ShipmentEvent[] }) {
  if (events.length === 0) {
    return <p className="text-[13px] text-muted-foreground">No tracking updates logged yet.</p>
  }
  return (
    <div>
      <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Tracking history</p>
      <ul className="mt-2 flex flex-col">
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
                <p className={cn("pt-1.5 text-[13px] font-semibold", isLatest ? "text-foreground" : "text-foreground/80")}>
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
    </div>
  )
}

/** One row in a `divide-y` list — no border, no card, just the same
 *  "ID as title, small route-plus-progress block underneath" shape as the
 *  full tracker's own header, sized down for scanning a list. Meant to
 *  open a `Sheet` containing the full `ShipmentTracker` on click, so a
 *  list of shipments never has to render eleven stages' worth of card
 *  per row just to be clickable. */
function ShipmentRow({ shipment, onSelect }: { shipment: Shipment; onSelect: () => void }) {
  const status = statusStyles[shipment.status]
  const isDelayed = shipment.status === "delayed"
  const latestEvent = [...shipment.events].reverse()[0]
  const progress = latestEvent ? PROGRESS_BY_EVENT[latestEvent.type] : 0

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group grid w-full grid-cols-1 items-center gap-3 bg-white px-4 py-3.5 text-start transition-colors hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:grid-cols-[1.2fr_1fr_1.1fr]"
    >
      {/* Col 1: Identity & Status/Carrier */}
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[18px] font-semibold tabular-nums text-foreground">
            {shipment.documentNumber || "Not booked yet"}
          </p>
          <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", status.pill)}>
            <span aria-hidden className={cn("size-1.5 rounded-full", status.dot)} />
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <CarrierLogo carrier={shipment.carrier} mode={shipment.mode} className="size-3.5 shrink-0 text-foreground/80" />
          <span className="capitalize font-medium text-foreground/80">{shipment.mode}</span>
          <span>•</span>
          <span className="truncate">{shipment.carrier}</span>
        </div>
      </div>

      {/* Col 2: Reference / Container ID */}
      <div className="hidden min-w-0 flex-col justify-center text-[12px] sm:flex">
        <span className="text-muted-foreground">Reference / Container</span>
        <span className="truncate font-semibold tabular-nums text-foreground">
          {shipment.bookingReference ?? "—"}
          {shipment.containerId ? ` / ${shipment.containerId}` : ""}
        </span>
      </div>

      {/* Col 3: Right-aligned SRC -> DES + integrated telemetry rail */}
      <div className="flex w-full items-center justify-between gap-3 tabular-nums sm:w-auto sm:flex-col sm:items-end sm:gap-1">
        {/* SRC → DES (smaller size on mobile: text-[14px], scaling back to text-[20px] on desktop) */}
        <div className="flex items-center gap-1.5 text-[14px] font-semibold tracking-tight text-foreground sm:text-[20px]">
          <span>{portCode(shipment.origin)}</span>
          <span className="text-xs font-normal text-muted-foreground/50 sm:text-[14px]">→</span>
          <span>{portCode(shipment.destination)}</span>
        </div>

        {/* Micro-telemetry row: numeric percentage + slim track */}
        <div className="flex items-center gap-2 sm:w-32 sm:justify-end">
          <span className="text-[11px] tabular-nums font-medium text-muted-foreground">
            {progress}%
          </span>
          <div aria-hidden className="relative h-1 w-20 overflow-hidden rounded-full bg-slate-100 sm:w-20">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isDelayed ? "bg-destructive" : "bg-amama-deep"
              )}
              style={{ width: `${Math.max(4, progress)}%` }}
            />
          </div>
        </div>
      </div>
    </button>
  )
}

export { ShipmentTracker, ShipmentRow, modeIcons, portCode, formatShortDate, statusStyles, claimStatusStyles }
