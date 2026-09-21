"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRightIcon, PlaneIcon, ShipIcon, TrainFrontIcon, TruckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { EntityLink } from "@/features/internal/entity-link"
import {
  Dot,
  EmptyState,
  Eyebrow,
  Facts,
  Group,
  Island,
  Metric,
  Metrics,
  Mono,
  PageHead,
  Pill,
  Row,
  Rows,
  Timeline,
  type Tone,
} from "@/features/internal/tower-ui"
import * as W from "@/features/tradechain/demo-world"

/**
 * Shipments — the physical half of a trade, and the half governed by
 * deadlines nobody here controls.
 *
 * Three cut-offs run the whole of this screen: shipping instructions,
 * VGM, and terminal gate-in. Miss one and the box rolls to the next
 * sailing, which on perishable cargo is a week of shelf life, so the
 * countdown is given more weight than anything else on the page. Freight
 * charges sit in their own group because they are read by Finance, not by
 * the person watching the clock.
 */

const STATUS_TONE: Record<W.ShipmentStatus, Tone> = {
  planning: "muted",
  booked: "brand",
  stuffing: "warn",
  "at-terminal": "warn",
  "in-transit": "brand",
  arrived: "ok",
  delivered: "ok",
}

const MODE_ICON = { road: TruckIcon, sea: ShipIcon, rail: TrainFrontIcon } as const

const LEG_TONE = { complete: "ok", "in-progress": "brand", pending: "muted" } as const

const MILESTONE_TONE: Record<W.ShipmentMilestone["state"], Tone> = {
  complete: "ok",
  due: "warn",
  late: "crit",
  pending: "muted",
}

const CHARGE_TONE = { paid: "ok", invoiced: "brand", accrued: "muted" } as const

const day = (value: string | null): string =>
  value
    ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value))
    : "—"

const stamp = (value: string | null): string =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Kolkata",
      }).format(new Date(value))
    : "—"

const usd = (value: number): string => `USD ${value.toLocaleString("en-US")}`

const hoursLeft = (iso: string): number =>
  (new Date(iso).getTime() - new Date(W.NOW).getTime()) / 3_600_000

/** A cut-off, expressed the way the person watching it thinks about it. */
function countdown(iso: string, done: boolean): { text: string; tone: Tone } {
  if (done) return { text: "Cleared", tone: "ok" }
  const hours = hoursLeft(iso)
  if (hours < 0) return { text: `Missed by ${Math.abs(Math.round(hours))}h`, tone: "crit" }
  if (hours < 2) return { text: `${Math.round(hours * 60)} min left`, tone: "crit" }
  if (hours < 12) return { text: `${hours.toFixed(1)}h left`, tone: "crit" }
  if (hours < 48) return { text: `${Math.round(hours)}h left`, tone: "warn" }
  return { text: `${Math.round(hours / 24)}d left`, tone: "muted" }
}

/* ══════════════════════════════════════════════════════════════════════
   LIST
   ══════════════════════════════════════════════════════════════════════ */

function ShipmentsView() {
  const shipments = React.useMemo(() => [...W.SHIPMENTS].sort((a, b) => a.etd.localeCompare(b.etd)), [])

  const moving = shipments.filter((shipment) => shipment.status !== "delivered")
  const delivered = shipments.filter((shipment) => shipment.status === "delivered")
  const atRisk = shipments.filter((shipment) =>
    shipment.milestones.some((milestone) => milestone.state === "late" || (milestone.state === "due" && hoursLeft(milestone.plannedAt) < 4))
  ).length
  const freight = shipments.reduce(
    (sum, shipment) =>
      sum + shipment.charges.filter((charge) => charge.payer === "AMAMA").reduce((a, charge) => a + charge.amountUsd, 0),
    0
  )

  return (
    <>
      <PageHead title="Shipments" />

      <Metrics>
        <Metric label="In motion" value={moving.length} tone="brand" />
        <Metric label="Deadline at risk" value={atRisk} tone={atRisk > 0 ? "crit" : "plain"} />
        <Metric label="Delivered" value={delivered.length} />
        <Metric label="Freight cost" value={`$${(freight / 1000).toFixed(1)}k`} foot="AMAMA's account" />
      </Metrics>

      <Group label="In motion" count={moving.length} pad="tight">
        <Rows>
          {moving.map((shipment) => (
            <ShipmentRow key={shipment.id} shipment={shipment} />
          ))}
        </Rows>
      </Group>

      {delivered.length > 0 ? (
        <Group label="Delivered" count={delivered.length} pad="tight">
          <Rows>
            {delivered.map((shipment) => (
              <ShipmentRow key={shipment.id} shipment={shipment} />
            ))}
          </Rows>
        </Group>
      ) : null}
    </>
  )
}

function ShipmentRow({ shipment }: { shipment: W.Shipment }) {
  const next = shipment.milestones.find((milestone) => milestone.actualAt === null)
  const clock = next ? countdown(next.plannedAt, false) : { text: "Complete", tone: "ok" as Tone }

  return (
    <Link
      href={`/internal/shipments/${shipment.id}`}
      className="flex items-center gap-3 rounded-[18px] px-3 py-2.5 transition-colors hover:bg-muted"
    >
      <Dot tone={STATUS_TONE[shipment.status]} />

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Mono className="font-semibold">{shipment.id}</Mono>
          <span className="truncate text-[13px]">
            {shipment.carrier} · {shipment.vessel} {shipment.voyage}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
          {shipment.portOfLoading.split(" — ")[1]} → {shipment.portOfDischarge.split(" — ")[1]} · ETD{" "}
          {day(shipment.etd)} · ETA {day(shipment.eta)}
          {shipment.etaVarianceHrs > 0 ? ` · +${shipment.etaVarianceHrs}h` : ""}
        </span>
      </span>

      <span className="hidden w-32 shrink-0 text-end sm:block">
        <span className="block truncate text-[11.5px] text-muted-foreground">{next?.label ?? "All milestones met"}</span>
      </span>

      <Pill tone={clock.tone}>{clock.text}</Pill>
      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   DETAIL
   ══════════════════════════════════════════════════════════════════════ */

function ShipmentDetailView({ shipmentId }: { shipmentId: string }) {
  const shipment = W.shipmentById(shipmentId)

  if (!shipment) {
    return (
      <Island>
        <EmptyState icon={ShipIcon} title="Shipment not found" />
      </Island>
    )
  }

  const trade = W.tradeById(shipment.tradeId)
  const container = shipment.containerId ? W.containerById(shipment.containerId) : null
  const ourCharges = shipment.charges.filter((charge) => charge.payer === "AMAMA")
  const buyerCharges = shipment.charges.filter((charge) => charge.payer === "Buyer")
  const ourTotal = ourCharges.reduce((sum, charge) => sum + charge.amountUsd, 0)
  const buyerTotal = buyerCharges.reduce((sum, charge) => sum + charge.amountUsd, 0)
  const next = shipment.milestones.find((milestone) => milestone.actualAt === null)

  return (
    <>
      <div className="px-1">
        <Link href="/internal/shipments" className="text-[12px] text-muted-foreground hover:text-foreground">
          Shipments
        </Link>
      </div>

      <PageHead
        title={shipment.id}
        meta={
          <>
            <Pill tone={STATUS_TONE[shipment.status]}>{shipment.status.replace(/-/g, " ")}</Pill>
            {shipment.etaVarianceHrs > 0 ? <Pill tone="warn">ETA +{shipment.etaVarianceHrs}h</Pill> : null}
          </>
        }
      />

      <Metrics>
        <Metric label="Transit" value={shipment.transitDays} unit="days" />
        <Metric label="ETD" value={day(shipment.etd)} foot={shipment.atd ? `Sailed ${stamp(shipment.atd)}` : "Not sailed"} />
        <Metric
          label="ETA"
          value={day(shipment.eta)}
          tone={shipment.etaVarianceHrs > 0 ? "warn" : "plain"}
          foot={shipment.etaVarianceHrs > 0 ? `${shipment.etaVarianceHrs}h behind schedule` : "On schedule"}
        />
        {shipment.remainingShelfLifeDays !== null ? (
          <Metric
            label="Shelf life at arrival"
            value={shipment.remainingShelfLifeDays}
            unit="days"
            tone={shipment.remainingShelfLifeDays < 20 ? "crit" : "brand"}
          />
        ) : null}
        <Metric label="Freight on us" value={`$${(ourTotal / 1000).toFixed(1)}k`} />
      </Metrics>

      {container ? (
        <Group label="Cut-offs" count="3 hard deadlines">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Shipping instructions", at: container.cutoffSi, done: Boolean(shipment.milestones.find((m) => m.key === "si")?.actualAt) },
              { label: "VGM filed", at: container.cutoffVgm, done: Boolean(shipment.milestones.find((m) => m.key === "vgm")?.actualAt) },
              { label: "Terminal gate-in", at: container.cutoffGateIn, done: Boolean(container.gateInAt) },
            ].map((cutoff) => {
              const clock = countdown(cutoff.at, cutoff.done)
              return (
                <div key={cutoff.label} className="min-w-0">
                  <Eyebrow>{cutoff.label}</Eyebrow>
                  <p
                    className={cn(
                      "mt-1 text-[18px] leading-none font-semibold tracking-tight tabular-nums",
                      clock.tone === "crit" && "text-destructive",
                      clock.tone === "warn" && "text-status-warning",
                      clock.tone === "ok" && "text-status-success",
                      clock.tone === "muted" && "text-foreground"
                    )}
                  >
                    {clock.text}
                  </p>
                  <p className="mt-1 text-[11.5px] text-muted-foreground">{stamp(cutoff.at)}</p>
                </div>
              )
            })}
          </div>
        </Group>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Group label="Carriage">
          <Facts
            columns={1}
            rows={[
              { label: "Carrier", value: shipment.carrier },
              { label: "Vessel / voyage", value: `${shipment.vessel} ${shipment.voyage}` },
              { label: "Booking", value: <Mono>{shipment.bookingRef}</Mono> },
              { label: "Port of loading", value: shipment.portOfLoading },
              { label: "Port of discharge", value: shipment.portOfDischarge },
              { label: "Bill of lading", value: shipment.blNo ? <Mono>{shipment.blNo}</Mono> : "Not released" },
              { label: "B/L released", value: stamp(shipment.blReleasedAt) },
            ]}
          />
        </Group>

        <Group label="Commercial">
          <Facts
            columns={1}
            rows={[
              { label: "Trade", value: <EntityLink kind="trade" id={shipment.tradeId} /> },
              { label: "Buyer", value: trade ? <EntityLink kind="buyer" id={trade.buyerId} mono={false} /> : "—" },
              { label: "Container", value: container ? <EntityLink kind="container" id={container.id} /> : "Not allocated" },
              { label: "Incoterm", value: shipment.incoterm },
              { label: "Freight terms", value: shipment.freightTerms },
              {
                label: "Who insures",
                value: shipment.incoterm.startsWith("CIF") ? "AMAMA — CIF" : "Buyer — freight only under CFR",
              },
            ]}
          />
        </Group>
      </div>

      <Group label="Route" count={`${shipment.legs.length} legs`} pad="tight">
        <Rows>
          {shipment.legs.map((leg) => {
            const Icon = MODE_ICON[leg.mode] ?? PlaneIcon
            return (
              <Row key={leg.id}>
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full",
                    leg.state === "complete"
                      ? "bg-status-success/12 text-status-success"
                      : leg.state === "in-progress"
                        ? "bg-amama-subtle text-amama-deep"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">
                    {leg.from} → {leg.to}
                  </span>
                  <span className="block truncate text-[11.5px] text-muted-foreground">
                    {leg.carrier} · {leg.reference}
                    {leg.departedAt ? ` · departed ${stamp(leg.departedAt)}` : ""}
                    {leg.arrivedAt ? ` · arrived ${stamp(leg.arrivedAt)}` : ""}
                  </span>
                </span>
                <Pill tone={LEG_TONE[leg.state]}>{leg.state.replace("-", " ")}</Pill>
              </Row>
            )
          })}
        </Rows>
      </Group>

      <Group
        label="Milestones"
        count={`${shipment.milestones.filter((m) => m.actualAt).length} of ${shipment.milestones.length}`}
      >
        <Timeline
          items={shipment.milestones.map((milestone) => ({
            id: milestone.key,
            tone: MILESTONE_TONE[milestone.state],
            title: milestone.label,
            meta:
              milestone.actualAt !== null
                ? stamp(milestone.actualAt)
                : `planned ${stamp(milestone.plannedAt)}`,
            body:
              milestone.actualAt === null && milestone === next ? (
                <span className={cn(countdown(milestone.plannedAt, false).tone === "crit" && "text-destructive")}>
                  {countdown(milestone.plannedAt, false).text}
                </span>
              ) : undefined,
          }))}
        />
      </Group>

      <Group label="Freight charges" count={usd(ourTotal + buyerTotal)} pad="tight">
        <Rows>
          {shipment.charges.map((charge) => (
            <Row key={charge.code}>
              <Mono className="w-16 shrink-0 text-muted-foreground">{charge.code}</Mono>
              <span className="min-w-0 flex-1 truncate text-[13px]">{charge.label}</span>
              <Pill tone={charge.payer === "AMAMA" ? "brand" : "muted"}>{charge.payer}</Pill>
              <Pill tone={CHARGE_TONE[charge.status]}>{charge.status}</Pill>
              <span className="w-20 shrink-0 text-end text-[13px] font-semibold tabular-nums">
                {charge.amountUsd === 0 ? "—" : usd(charge.amountUsd)}
              </span>
            </Row>
          ))}
        </Rows>
        <div className="mt-2 flex justify-end gap-6 border-t border-border px-3 pt-3">
          <span className="text-[12px] text-muted-foreground">
            On AMAMA <span className="ms-1 font-semibold text-foreground tabular-nums">{usd(ourTotal)}</span>
          </span>
          <span className="text-[12px] text-muted-foreground">
            On buyer <span className="ms-1 font-semibold text-foreground tabular-nums">{usd(buyerTotal)}</span>
          </span>
        </div>
      </Group>
    </>
  )
}

export { ShipmentsView, ShipmentDetailView }
