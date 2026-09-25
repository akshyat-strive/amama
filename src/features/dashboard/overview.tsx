"use client"

import * as React from "react"
import Link from "next/link"
import { FileTextIcon, ShipIcon, TriangleAlertIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { TradeStatus } from "@/features/dashboard/dashboard-ui"
import {
  buildLotMeta,
  buildLotTrace,
  buildOrderBook,
  buildStatusBreakdown,
  buildVolumeSeries,
  TOTAL_GATES,
  type DemoOrder,
} from "@/features/dashboard/demo-data"
import { LotInspector } from "@/features/dashboard/lot-inspector"
import { STATUS_META, SeasonVolumeChart, StatusDonut } from "@/features/dashboard/overview-charts"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import type { OnboardingRole } from "@/features/onboarding/types"

const STATUS_ORDER: TradeStatus[] = ["on-track", "watch", "critical"]

const PILL: Record<TradeStatus, string> = {
  "on-track": "bg-amama-subtle text-amama-deep",
  watch: "bg-status-warning/12 text-status-warning",
  critical: "bg-destructive/10 text-destructive",
}

const GATES = ["Booked", "Collected", "Stored", "Containerised", "Sailed"]

function StatusTag({ status }: { status: TradeStatus }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", PILL[status])}>
      <span aria-hidden className={cn("size-1.5 rounded-full", STATUS_META[status].dot)} />
      {STATUS_META[status].label}
    </span>
  )
}

function Steps({ cleared, status }: { cleared: number; status: TradeStatus }) {
  const fill = status === "critical" ? "bg-destructive" : status === "watch" ? "bg-status-warning" : "bg-amama-deep"
  return (
    <span className="flex items-center gap-2" aria-label={`${cleared} of ${TOTAL_GATES} steps`}>
      <span className="flex w-20 gap-[3px]">
        {Array.from({ length: TOTAL_GATES }).map((_, index) => (
          <span key={index} className={cn("h-1.5 flex-1 rounded-full", index < cleared ? fill : "bg-border")} />
        ))}
      </span>
      <span className="text-[11.5px] text-muted-foreground tabular-nums">
        {cleared}/{TOTAL_GATES}
      </span>
    </span>
  )
}

/* ── the metrics row ───────────────────────────────────────────────────── */

function Tile({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex min-w-0 flex-col rounded-[20px] border border-border bg-card px-4 py-3.5", className)}>{children}</div>
}

function TileLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] font-medium text-muted-foreground">{children}</p>
}

/** One number, then how it splits — the status mix as a single segmented
 *  bar rather than a second, smaller number underneath. */
function StatusMixTile({ label, orders }: { label: string; orders: DemoOrder[] }) {
  const counts = STATUS_ORDER.map((status) => ({ status, count: orders.filter((order) => order.status === status).length }))
  return (
    <Tile className="col-span-2 lg:col-span-5">
      <div className="flex items-baseline justify-between gap-3">
        <TileLabel>{label}</TileLabel>
        <span className="text-[11.5px] text-muted-foreground tabular-nums">{orders.reduce((sum, order) => sum + order.tonnes, 0)} MT booked</span>
      </div>
      <p className="mt-1 text-[32px] leading-none font-semibold tracking-tight text-foreground tabular-nums">{orders.length}</p>
      <div className="mt-3 flex h-2 gap-[3px] overflow-hidden rounded-full" aria-hidden>
        {counts
          .filter((entry) => entry.count > 0)
          .map((entry) => (
            <span key={entry.status} className={cn("rounded-full", STATUS_META[entry.status].dot)} style={{ flexGrow: entry.count }} />
          ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {counts.map((entry) => (
          <li key={entry.status} className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <span aria-hidden className={cn("size-2 rounded-full", STATUS_META[entry.status].dot)} />
            <span className="font-semibold text-foreground tabular-nums">{entry.count}</span>
            {STATUS_META[entry.status].label}
          </li>
        ))}
      </ul>
    </Tile>
  )
}

/** A value against its ceiling, drawn as an inline meter. */
function MeterTile({ label, value, max, unit, caption }: { label: string; value: number; max: number; unit: string; caption: string }) {
  const share = max > 0 ? Math.min(1, value / max) : 0
  return (
    <Tile className="col-span-2 sm:col-span-1 lg:col-span-3">
      <TileLabel>{label}</TileLabel>
      <p className="mt-1 text-[26px] leading-none font-semibold tracking-tight text-foreground tabular-nums">
        {value}
        <span className="ms-1 text-[13px] font-medium text-muted-foreground">{unit}</span>
      </p>
      <div className="mt-auto pt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-amama-deep" style={{ width: `${Math.round(share * 100)}%` }} />
        </div>
        <p className="mt-1.5 flex justify-between text-[11.5px] text-muted-foreground tabular-nums">
          <span>{caption}</span>
          <span>
            {Math.round(share * 100)}% of {max} {unit}
          </span>
        </p>
      </div>
    </Tile>
  )
}

/** The nearest arrival, with every arrival as a micro bar chart — shorter
 *  bars land sooner. */
function ArrivalTile({ label, orders }: { label: string; orders: DemoOrder[] }) {
  const sorted = [...orders].sort((a, b) => a.etaDays - b.etaDays)
  const longest = Math.max(...orders.map((order) => order.etaDays), 1)
  return (
    <Tile className="col-span-1 lg:col-span-2">
      <TileLabel>{label}</TileLabel>
      <p className="mt-1 text-[26px] leading-none font-semibold tracking-tight text-foreground tabular-nums">
        {sorted[0]?.etaDays ?? "—"}
        <span className="ms-1 text-[13px] font-medium text-muted-foreground">days</span>
      </p>
      <div className="mt-auto flex h-7 items-end gap-1 pt-3" aria-hidden>
        {sorted.map((order, index) => (
          <span
            key={order.id}
            title={`${order.id} · ${order.etaDays} days`}
            className={cn("flex-1 rounded-t-[3px]", index === 0 ? "bg-amama-deep" : "bg-muted-foreground/25")}
            style={{ height: `${Math.max(18, (order.etaDays / longest) * 100)}%` }}
          />
        ))}
      </div>
    </Tile>
  )
}

/** The one tile that should pull the eye — tinted, not just coloured text. */
function AttentionTile({ orders, href }: { orders: DemoOrder[]; href: string }) {
  const critical = orders.filter((order) => order.status === "critical").length
  const delayed = orders.filter((order) => order.status === "watch").length
  const total = critical + delayed
  return (
    <Link
      href={href}
      className={cn(
        "col-span-1 flex min-w-0 flex-col rounded-[20px] border px-4 py-3.5 transition-colors lg:col-span-2",
        total > 0
          ? "border-status-warning/30 bg-status-warning/10 hover:bg-status-warning/15"
          : "border-border bg-card hover:bg-muted/60"
      )}
    >
      <p className={cn("flex items-center gap-1.5 text-[12px] font-medium", total > 0 ? "text-status-warning" : "text-muted-foreground")}>
        {total > 0 ? <TriangleAlertIcon aria-hidden className="size-3.5" /> : null}
        Needs attention
      </p>
      <p className={cn("mt-1 text-[26px] leading-none font-semibold tracking-tight tabular-nums", total > 0 ? "text-status-warning" : "text-foreground")}>
        {total}
      </p>
      <p className="mt-auto flex flex-wrap gap-x-2 pt-3 text-[11.5px] text-foreground/70">
        <span>
          <span className="font-semibold text-destructive tabular-nums">{critical}</span> action
        </span>
        <span>
          <span className="font-semibold text-status-warning tabular-nums">{delayed}</span> delayed
        </span>
      </p>
    </Link>
  )
}

/* ── the order book ────────────────────────────────────────────────────── */

function OrderActions({ order, role }: { order: DemoOrder; role: OnboardingRole }) {
  const base = `/${role}/dashboard`
  const action = "grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
  return (
    <span className="flex items-center justify-end gap-0.5">
      <Link href={`${base}/orders?tab=eta&order=${order.id}`} onClick={(event) => event.stopPropagation()} className={action} title="Open order" aria-label={`Open order ${order.id}`}>
        <FileTextIcon aria-hidden className="size-3.5" />
      </Link>
      <Link href={`${base}/shipments`} onClick={(event) => event.stopPropagation()} className={action} title="Track shipment" aria-label={`Track shipment for ${order.id}`}>
        <ShipIcon aria-hidden className="size-3.5" />
      </Link>
    </span>
  )
}

function OrderBook({
  title,
  orders,
  selectedId,
  onSelect,
  role,
}: {
  title: string
  orders: DemoOrder[]
  selectedId: string | undefined
  onSelect: (id: string) => void
  role: OnboardingRole
}) {
  return (
    <section className="overflow-hidden rounded-[20px] border border-border bg-card">
      <header className="flex items-center justify-between gap-2 px-5 pt-4 pb-3">
        <h2 className="text-[14px] font-semibold text-foreground">{title}</h2>
        <span className="text-[12px] text-muted-foreground tabular-nums">{orders.length}</span>
      </header>

      <table className="hidden w-full border-t border-border text-[13px] md:table">
        <thead>
          <tr className="text-left text-[11px] text-muted-foreground">
            <th className="py-2 ps-5 pe-3 font-medium">File</th>
            <th className="px-3 py-2 font-medium">Quantity</th>
            <th className="px-3 py-2 font-medium">Progress</th>
            <th className="px-3 py-2 text-end font-medium">ETA</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="py-2 ps-3 pe-4">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border border-t border-border">
          {orders.map((order) => {
            const selected = order.id === selectedId
            return (
              <tr
                key={order.id}
                onClick={() => onSelect(order.id)}
                className={cn("cursor-pointer transition-colors", selected ? "bg-amama-subtle/50" : "hover:bg-muted/50")}
              >
                <td className="py-2.5 ps-5 pe-3">
                  <button type="button" aria-pressed={selected} onClick={() => onSelect(order.id)} className="block max-w-full text-start outline-none focus-visible:underline">
                    <span className="block truncate font-medium text-foreground">
                      {order.crop} · {order.variety}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">{order.id}</span>
                  </button>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <span className="block font-medium text-foreground tabular-nums">{order.tonnes} MT</span>
                  <span className="block text-[11px] text-muted-foreground">{order.grade}</span>
                </td>
                <td className="px-3 py-2.5">
                  <Steps cleared={order.gatesCleared} status={order.status} />
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">{GATES[Math.max(0, order.gatesCleared - 1)]}</span>
                </td>
                <td className="px-3 py-2.5 text-end font-medium whitespace-nowrap text-foreground tabular-nums">{order.etaDays} d</td>
                <td className="px-3 py-2.5">
                  <StatusTag status={order.status} />
                </td>
                <td className="py-2.5 ps-3 pe-4">
                  <OrderActions order={order} role={role} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <ul className="divide-y divide-border border-t border-border md:hidden">
        {orders.map((order) => {
          const selected = order.id === selectedId
          return (
            <li key={order.id} className={cn(selected && "bg-amama-subtle/50")}>
              <button type="button" aria-pressed={selected} onClick={() => onSelect(order.id)} className="flex w-full flex-col gap-2 px-5 py-3 text-start">
                <span className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-[13px] font-medium text-foreground">
                    {order.crop} · {order.variety}
                  </span>
                  <StatusTag status={order.status} />
                </span>
                <span className="flex items-center justify-between gap-2 text-[12px] text-muted-foreground tabular-nums">
                  <span>
                    {order.tonnes} MT · ETA {order.etaDays} d
                  </span>
                  <Steps cleared={order.gatesCleared} status={order.status} />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/* ── the page ──────────────────────────────────────────────────────────── */

const COPY: Record<OnboardingRole, { primary: string; volume: string; volumeCaption: string; arrival: string; book: string }> = {
  buyer: { primary: "Active orders", volume: "Volume in transit", volumeCaption: "At sea", arrival: "Next arrival", book: "Order book" },
  seller: { primary: "Live lots", volume: "Volume dispatched", volumeCaption: "Containerised", arrival: "Next delivery", book: "Consignments" },
}

/**
 * The home screen: one compact header, an asymmetric metrics row (the
 * status mix leads, supporting numbers carry their own micro-visuals, the
 * attention count is tinted), the season curve beside the status ring, and
 * a dense order book driving the lot inspector next to it.
 */
function DashboardOverview({ role }: { role: OnboardingRole }) {
  const { draft } = useOnboarding()
  const person = role === "buyer" ? draft.buyer : draft.seller
  const firstName = person.fullName.trim().split(" ")[0]
  const copy = COPY[role]

  const orders = React.useMemo(
    () =>
      buildOrderBook({
        crops: role === "buyer" ? draft.buyer.sourcing : draft.seller.produce,
        country: person.country,
        role,
        counterparty: role === "buyer" ? draft.buyer.companyName || "Your company" : draft.seller.farmName || "Your farm",
      }),
    [role, draft.buyer.sourcing, draft.seller.produce, person.country, draft.buyer.companyName, draft.seller.farmName]
  )

  const volumeSeries = React.useMemo(() => buildVolumeSeries(orders), [orders])
  const statusBreakdown = React.useMemo(() => buildStatusBreakdown(orders), [orders])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const selected = orders.find((order) => order.id === selectedId) ?? orders[0]
  const grower = draft.seller.farmName || "Sanjay Patil"

  const booked = orders.reduce((sum, order) => sum + order.tonnes, 0)
  const moving = orders.filter((order) => order.gatesCleared >= 4).reduce((sum, order) => sum + order.tonnes, 0)
  const latest = volumeSeries[volumeSeries.length - 1]
  const delta = latest && latest.lastSeason > 0 ? Math.round(((latest.volume - latest.lastSeason) / latest.lastSeason) * 100) : 0

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <p className="text-[12px] text-muted-foreground">
            Dashboard <span aria-hidden>/</span> <span className="text-foreground/80">Overview</span>
          </p>
          <h1 className="text-[22px] leading-tight font-bold tracking-tight">Overview</h1>
        </div>
        <p className="text-[12.5px] text-muted-foreground">{firstName ? `Welcome back, ${firstName}` : "Welcome back"}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-12">
        <StatusMixTile label={copy.primary} orders={orders} />
        <MeterTile label={copy.volume} value={moving} max={booked} unit="MT" caption={copy.volumeCaption} />
        <ArrivalTile label={copy.arrival} orders={orders} />
        <AttentionTile orders={orders} href={`/${role}/dashboard/orders?tab=eta`} />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-12">
        <section className="overflow-hidden rounded-[20px] border border-border bg-card lg:col-span-8">
          <header className="flex flex-wrap items-center justify-between gap-2 px-5 pt-4 pb-1">
            <h2 className="text-[14px] font-semibold text-foreground">
              Season volume <span className="font-normal text-muted-foreground">· MT</span>
            </h2>
            <div className="flex items-center gap-3 text-[12px] text-muted-foreground tabular-nums">
              <span>
                <span className="font-semibold text-foreground">{latest?.volume ?? 0} MT</span> to date
              </span>
              <span className={cn("rounded-full px-2 py-0.5 font-semibold", delta >= 0 ? "bg-amama-subtle text-amama-deep" : "bg-destructive/10 text-destructive")}>
                {delta >= 0 ? "+" : ""}
                {delta}% vs last season
              </span>
            </div>
          </header>
          <div className="px-3 pb-3">
            <SeasonVolumeChart points={volumeSeries} />
          </div>
        </section>

        <section className="flex flex-col overflow-hidden rounded-[20px] border border-border bg-card lg:col-span-4">
          <header className="px-5 pt-4 pb-2">
            <h2 className="text-[14px] font-semibold text-foreground">Shipment status</h2>
          </header>
          <div className="flex flex-1 items-center px-5 pb-5">
            <StatusDonut breakdown={statusBreakdown} />
          </div>
        </section>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-12 lg:items-start">
        <div className="lg:col-span-8">
          <OrderBook title={copy.book} orders={orders} selectedId={selected?.id} onSelect={setSelectedId} role={role} />
        </div>
        <div className="lg:col-span-4">
          {selected ? (
            <LotInspector
              key={selected.id}
              order={selected}
              meta={buildLotMeta(selected, grower)}
              trace={buildLotTrace(selected, grower)}
            />
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-[11.5px] text-muted-foreground">Demo data, derived from your onboarding answers.</p>
    </div>
  )
}

export { DashboardOverview }
