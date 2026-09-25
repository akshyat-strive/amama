"use client"

import * as React from "react"
import {
  AnchorIcon,
  Building2Icon,
  ChevronDownIcon,
  FileCheck2Icon,
  HandshakeIcon,
  ShipIcon,
  SnowflakeIcon,
  SproutIcon,
  TruckIcon,
  WarehouseIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import * as W from "@/features/tradechain/demo-world"
import { stageStateFor, type JourneyLeg } from "@/features/tradechain/trade-file"
import { CarrierLogo } from "@/features/marketplace/carrier-logo"
import { formatStamp } from "@/features/trades/trade-format"
import { Facts } from "@/features/trades/trade-ui"

type Reach = "done" | "current" | "ahead"

function Node({ icon: Icon, reach, alert }: { icon: LucideIcon; reach: Reach; alert?: boolean }) {
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full",
        reach === "current" && (alert ? "ring-4 ring-destructive/15" : "ring-4 ring-foreground/10"),
        reach === "ahead"
          ? "border border-border bg-muted text-muted-foreground"
          : alert && reach === "current"
            ? "bg-destructive text-white"
            : "bg-foreground text-background"
      )}
    >
      <Icon aria-hidden className="size-4" />
    </span>
  )
}

/** Solid behind, gradient across the segment in motion, hairline ahead —
 *  the same read as the shipment tracker's milestone stepper. */
function connectorStyle(reach: Reach, alert: boolean): React.CSSProperties {
  const tone = alert ? "var(--destructive)" : "var(--foreground)"
  return {
    background: reach === "done" ? tone : reach === "current" ? `linear-gradient(to right, ${tone}, var(--border))` : "var(--border)",
  }
}

/* ── the five phases ──────────────────────────────────────────────────── */

const PHASE_ICON: Record<W.PhaseId, LucideIcon> = {
  commercial: HandshakeIcon,
  "farm-gate": SproutIcon,
  "cold-chain": SnowflakeIcon,
  export: FileCheck2Icon,
  transit: ShipIcon,
}

const PHASE_SHORT: Record<W.PhaseId, string> = {
  commercial: "Contract",
  "farm-gate": "Farm",
  "cold-chain": "Cold chain",
  export: "Export",
  transit: "Transit",
}

function PhaseStepper({ trade, onOpenStage }: { trade: W.Trade; onOpenStage: (stage: W.StageNo) => void }) {
  const closed = trade.status === "closed"
  const current = W.PHASES.findIndex((phase) => phase.id === W.phaseForStage(trade.currentStage).id)
  const alert = trade.status === "blocked"

  return (
    <div className="flex items-start">
      {W.PHASES.map((phase, index) => {
        const reach: Reach = closed || index < current ? "done" : index === current ? "current" : "ahead"
        const stages = W.STAGES.filter((stage) => stage.phase === phase.id)
        const done = stages.filter((stage) => stageStateFor(trade, stage.n) === "complete").length
        return (
          <React.Fragment key={phase.id}>
            <button
              type="button"
              onClick={() => onOpenStage(phase.stages[0])}
              className="group flex w-16 shrink-0 flex-col items-center gap-1.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-amama-deep/40 sm:w-20"
            >
              <Node icon={PHASE_ICON[phase.id]} reach={reach} alert={alert} />
              <span className={cn("text-[11px] font-medium group-hover:underline", reach === "ahead" ? "text-muted-foreground" : "text-foreground")}>
                {PHASE_SHORT[phase.id]}
              </span>
              <span className="-mt-1 text-[10.5px] text-muted-foreground tabular-nums">
                {done}/{stages.length}
              </span>
            </button>
            {index < W.PHASES.length - 1 ? (
              <span
                aria-hidden
                className="mt-[17px] h-[3px] min-w-3 flex-1 rounded-full"
                style={connectorStyle(index < current || closed ? "done" : index === current ? "current" : "ahead", alert)}
              />
            ) : null}
          </React.Fragment>
        )
      })}
    </div>
  )
}

/* ── the legs ─────────────────────────────────────────────────────────── */

const PLACE_ICONS: LucideIcon[] = [SproutIcon, WarehouseIcon, AnchorIcon, AnchorIcon, Building2Icon]

const LEG_LABEL: Record<JourneyLeg["key"], string> = {
  pickup: "Farm pickup",
  port: "To port",
  sea: "Ocean",
  delivery: "Delivery",
}

/**
 * Five places, four legs, one line. Short by default — only the leg in
 * motion is summarised; any leg opens its own detail on click.
 */
function LegStepper({
  legs,
  harvested,
  alert = false,
}: {
  legs: JourneyLeg[]
  harvested: boolean
  alert?: boolean
}) {
  const places = [legs[0].from, ...legs.map((leg) => leg.to)]
  const currentIndex = legs.findIndex((leg) => leg.state !== "complete")
  const [open, setOpen] = React.useState<number | null>(null)
  const focus = open !== null ? legs[open] : null
  const live = currentIndex === -1 ? null : legs[currentIndex]

  const reached = places.map((_, index) =>
    index === 0 ? harvested || legs[0].state !== "pending" : legs[index - 1].state === "complete"
  )
  const lastReached = reached.lastIndexOf(true)
  // The cargo is parked at the last place it reached unless the leg out of
  // there is already moving — that is the node worth highlighting.
  const parkedAt =
    lastReached >= 0 && lastReached < legs.length && legs[lastReached].state !== "in-progress" ? lastReached : -1

  const placeReach = (index: number): Reach =>
    index === parkedAt ? "current" : reached[index] ? "done" : "ahead"

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-[520px] items-start">
          {places.map((place, index) => (
            <React.Fragment key={`${place}-${index}`}>
              <div className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 text-center">
                <Node icon={PLACE_ICONS[index]} reach={placeReach(index)} alert={alert} />
                <span
                  title={place}
                  className={cn(
                    "line-clamp-2 text-[11px] leading-tight font-medium",
                    placeReach(index) === "ahead" ? "text-muted-foreground" : "text-foreground"
                  )}
                >
                  {place}
                </span>
              </div>
              {index < legs.length ? (
                <LegConnector
                  leg={legs[index]}
                  active={open === index}
                  alert={alert}
                  onClick={() => setOpen(open === index ? null : index)}
                />
              ) : null}
            </React.Fragment>
          ))}
        </div>
      </div>

      {focus ? (
        <LegDetail leg={focus} />
      ) : live ? (
        <button
          type="button"
          onClick={() => setOpen(currentIndex)}
          className="mt-3 flex w-full items-center justify-between gap-3 rounded-[14px] bg-muted px-3.5 py-2.5 text-start transition-colors hover:bg-muted/70"
        >
          <span className="min-w-0 truncate text-[12.5px] text-foreground">
            <span className="font-semibold">
              Leg {currentIndex + 1} of {legs.length} · {LEG_LABEL[live.key]}
            </span>
            <span className="text-muted-foreground">
              {" "}
              · {live.state === "in-progress" ? "Moving" : "Next"}
              {live.etaAt ? ` · ETA ${formatStamp(live.etaAt)}` : ""}
            </span>
          </span>
          <ChevronDownIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        </button>
      ) : (
        <p className="mt-3 rounded-[14px] bg-muted px-3.5 py-2.5 text-[12.5px] font-medium text-foreground">All four legs complete</p>
      )}
    </div>
  )
}

function LegConnector({
  leg,
  active,
  alert,
  onClick,
}: {
  leg: JourneyLeg
  active: boolean
  alert: boolean
  onClick: () => void
}) {
  const Icon = leg.mode === "sea" ? ShipIcon : TruckIcon
  const reach: Reach = leg.state === "complete" ? "done" : leg.state === "in-progress" ? "current" : "ahead"
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      aria-label={`${LEG_LABEL[leg.key]}: ${leg.from} to ${leg.to}`}
      className="group relative flex min-w-12 flex-1 flex-col items-center pt-[17px] outline-none"
    >
      <span aria-hidden className="h-[3px] w-full rounded-full" style={connectorStyle(reach, alert)} />
      <span
        className={cn(
          "mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium transition-colors group-focus-visible:ring-2 group-focus-visible:ring-amama-deep/40",
          active ? "bg-foreground text-background" : "bg-muted text-muted-foreground group-hover:text-foreground"
        )}
      >
        <Icon aria-hidden className="size-3" />
        {LEG_LABEL[leg.key]}
      </span>
    </button>
  )
}

function duration(from: string | null, to: string | null): string | null {
  if (!from || !to) return null
  const hours = (new Date(to).getTime() - new Date(from).getTime()) / 3_600_000
  if (hours <= 0) return null
  return hours < 48 ? `${Math.round(hours)} h` : `${Math.round(hours / 24)} d`
}

function LegDetail({ leg }: { leg: JourneyLeg }) {
  const state = leg.state === "complete" ? "Complete" : leg.state === "in-progress" ? "Moving" : "Not started"
  return (
    <div className="mt-3 rounded-[16px] border border-border px-4 py-3.5">
      <p className="text-[13px] font-semibold text-foreground">
        {leg.from} → {leg.to}
      </p>
      <div className="mt-3">
        <Facts
          columns={3}
          rows={[
            { label: "Status", value: state },
            {
              label: "Carrier",
              value: leg.carrier ? (
                <span className="inline-flex items-center gap-1.5">
                  {leg.mode === "sea" ? <CarrierLogo carrier={leg.carrier} mode="ocean" className="size-4" /> : null}
                  {leg.carrier}
                </span>
              ) : (
                "—"
              ),
            },
            { label: leg.mode === "sea" ? "Vessel" : "Vehicle", value: leg.reference ?? "—" },
            { label: "Departed", value: formatStamp(leg.departedAt) },
            {
              label: leg.arrivedAt ? "Arrived" : "ETA",
              value: leg.arrivedAt ? formatStamp(leg.arrivedAt) : formatStamp(leg.etaAt),
            },
            { label: "Duration", value: duration(leg.departedAt, leg.arrivedAt) ?? "—" },
          ]}
        />
      </div>
    </div>
  )
}

export { LegStepper, PhaseStepper }
