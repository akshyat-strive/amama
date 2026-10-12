"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeftIcon, CheckIcon, PackageIcon, SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import * as W from "@/features/tradechain/demo-world"
import { documentRegister, isColdChain, paymentClock, temperatureTrace } from "@/features/tradechain/trade-file"
import { useLiveWorld } from "@/features/tradechain/live-world"
import { CarrierLogo } from "@/features/marketplace/carrier-logo"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import { PAGE_TABS_SPACE, PageTabs } from "@/features/dashboard/page-tabs"
import { canView, partyIdsFor, tradesFor } from "@/features/trades/trade-access"
import { ClaimsPanel, StageActionsPanel } from "@/features/trades/trade-actions"
import { ChangesTab } from "@/features/trades/trade-changes"
import { TemperatureChart } from "@/features/trades/temperature-chart"
import { formatStamp, portName } from "@/features/trades/trade-format"
import { EmptyNote, Facts, Mono, Panel, Pill, Status, TEXT_TONE } from "@/features/trades/trade-ui"
import {
  BUYER_DOCUMENTS,
  ORDER_STEPS,
  day,
  orderHeadline,
  orderPhoto,
  orderShipments,
  orderStepIndex,
  orderTotal,
  type OrderShipment,
} from "@/features/orders/buyer-order-model"

const BASE = "/buyer/dashboard/orders"
const usd = (value: number) => `USD ${Math.round(value).toLocaleString("en-US")}`

function productTitle(trade: W.Trade): string {
  return `${W.productById(trade.productId)?.label ?? "Product"} · ${W.variantById(trade.variantId)?.label ?? ""}`
}

function useBuyer() {
  const { draft } = useOnboarding()
  return draft.buyer.email
}

/* ── list ──────────────────────────────────────────────────────────── */

type Tab = "open" | "completed"

function BuyerOrdersPage() {
  useLiveWorld()
  const email = useBuyer()
  const [tab, setTab] = React.useState<Tab>("open")
  const [query, setQuery] = React.useState("")
  const orders = tradesFor("buyer", email).sort((a, b) => b.contractSignedAt.localeCompare(a.contractSignedAt))
  const needle = query.trim().toLowerCase()
  const matching = orders.filter((trade) => !needle || [trade.id, productTitle(trade), trade.destination].join(" ").toLowerCase().includes(needle))
  const open = matching.filter((trade) => trade.status !== "closed")
  const completed = matching.filter((trade) => trade.status === "closed")
  const visible = tab === "open" ? open : completed

  return (
    <div className={PAGE_TABS_SPACE}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-bold tracking-tight">Orders</h1>
        <div className="relative w-full sm:w-72">
          <SearchIcon aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search orders" aria-label="Search orders" className="h-9 rounded-full ps-9" />
        </div>
      </div>

      <PageTabs
        label="Order lists"
        className="mt-5"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "open", label: "Open", count: open.length },
          { value: "completed", label: "Completed", count: completed.length },
        ]}
      />

      {visible.length === 0 ? (
        <div className="mt-6">
          <EmptyNote>
            <PackageIcon aria-hidden className="mx-auto mb-2 size-5" />
            {tab === "open" ? "No open orders" : "No completed orders yet"}
          </EmptyNote>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {visible.map((trade) => (
            <li key={trade.id}>
              <OrderCard trade={trade} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function OrderCard({ trade }: { trade: W.Trade }) {
  const headline = orderHeadline(trade)
  const shipments = orderShipments(trade)
  const buyer = W.buyerById(trade.buyerId)
  const href = `${BASE}/${trade.id}`
  const needsYou = trade.currentStage === 15 && trade.status !== "closed"

  return (
    <article className="overflow-hidden rounded-[20px] border border-border bg-card">
      <header className="grid grid-cols-2 gap-x-6 gap-y-2 border-b border-border bg-muted/50 px-5 py-3 text-[12px] sm:grid-cols-[auto_auto_minmax(0,1fr)_auto]">
        <div>
          <p className="text-muted-foreground">Order placed</p>
          <p className="font-medium text-foreground">{day(trade.contractSignedAt)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Total</p>
          <p className="font-medium text-foreground tabular-nums">{usd(orderTotal(trade))}</p>
        </div>
        <div className="min-w-0">
          <p className="text-muted-foreground">Ship to</p>
          <p className="truncate font-medium text-foreground">{buyer?.city ?? trade.destination}</p>
        </div>
        <div className="min-w-0 sm:text-end">
          <p className="text-muted-foreground">
            Order <Mono className="text-[12px] text-foreground">{trade.id}</Mono>
          </p>
          <Link href={href} className="font-medium text-amama-deep hover:underline">
            View order details
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start">
        <Image src={orderPhoto(trade)} alt="" width={80} height={80} className="size-20 shrink-0 rounded-2xl object-cover" />
        <div className="min-w-0 flex-1">
          <p className={cn("text-[17px] font-semibold tracking-tight", TEXT_TONE[headline.tone])}>{headline.text}</p>
          <p className="text-[13px] text-muted-foreground">{headline.detail}</p>
          <Link href={href} className="mt-2 block truncate text-[14px] font-medium text-foreground hover:text-amama-deep hover:underline">
            {productTitle(trade)} · {trade.qtyContractedMt} MT
          </Link>
          <p className="text-[12.5px] text-muted-foreground">
            {portName(trade.portOfLoading)} → {portName(trade.portOfDischarge)} · {trade.incoterm}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:w-44 sm:flex-col">
          <Link
            href={href}
            className={cn(
              "inline-flex h-9 items-center justify-center rounded-full px-4 text-[13px] font-semibold transition-colors",
              needsYou ? "bg-primary text-primary-foreground hover:bg-amama-deep-hover" : "border border-border bg-card text-foreground hover:bg-muted"
            )}
          >
            {needsYou ? "Confirm delivery" : shipments.some((entry) => entry.shipment) ? "Track shipments" : "View order"}
          </Link>
        </div>
      </div>

      {shipments.length > 0 ? (
        <ul className="divide-y divide-border border-t border-border">
          {shipments.map((entry) => (
            <li key={entry.id}>
              <Link href={`${href}#${entry.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5 text-[12.5px] transition-colors hover:bg-muted/50">
                <span className="font-medium text-foreground">
                  {entry.total > 1 ? `Shipment ${entry.index} of ${entry.total}` : entry.shipment ? "Shipment" : "Not shipped yet"}
                </span>
                {entry.shipment ? (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <CarrierLogo carrier={entry.shipment.carrier} mode="ocean" className="size-3.5" />
                    {entry.shipment.vessel}
                  </span>
                ) : null}
                <span className="text-muted-foreground">
                  {entry.lots.length} {entry.lots.length === 1 ? "lot" : "lots"}
                </span>
                <span className="ms-auto text-muted-foreground">{shipmentWhen(entry)}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}

function shipmentWhen(entry: OrderShipment): string {
  const shipment = entry.shipment
  if (!shipment) return "Packing at origin"
  if (shipment.status === "delivered") {
    const pod = shipment.milestones.find((milestone) => milestone.key === "pod")?.actualAt
    return `Delivered ${day(pod ?? shipment.ata)}`
  }
  if (shipment.ata) return `Arrived ${day(shipment.ata)}`
  if (shipment.atd) return `Arriving ${day(shipment.eta)}`
  return `Ships ${day(shipment.etd)}`
}

/* ── detail ────────────────────────────────────────────────────────── */

function BuyerOrderPage({ orderId }: { orderId: string }) {
  useLiveWorld()
  const email = useBuyer()
  const trade = canView("buyer", email, orderId) ? W.tradeById(orderId) : undefined

  if (!trade) {
    return (
      <div>
        <BackLink />
        <div className="mt-6">
          <EmptyNote>
            <PackageIcon aria-hidden className="mx-auto mb-2 size-5" />
            Order not found
          </EmptyNote>
        </div>
      </div>
    )
  }
  return <OrderDetail trade={trade} partyIds={partyIdsFor("buyer", email)} />
}

function BackLink() {
  return (
    <Link href={BASE} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground">
      <ArrowLeftIcon aria-hidden className="size-4" />
      Orders
    </Link>
  )
}

function OrderDetail({ trade, partyIds }: { trade: W.Trade; partyIds: string[] }) {
  const headline = orderHeadline(trade)
  const shipments = orderShipments(trade)
  const trace = isColdChain(trade) ? temperatureTrace(trade) : null

  return (
    <div className="pb-16">
      <BackLink />
      <div className="mt-2 flex flex-wrap items-start gap-4">
        <Image src={orderPhoto(trade, 200)} alt="" width={64} height={64} className="size-16 shrink-0 rounded-2xl object-cover" />
        <div className="min-w-0 flex-1">
          <h1 className="text-[26px] leading-tight font-bold tracking-tight">{productTitle(trade)}</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Order <Mono className="text-[12.5px] text-foreground">{trade.id}</Mono> · placed {day(trade.contractSignedAt)} · {trade.qtyContractedMt} MT
          </p>
        </div>
      </div>

      <section className="mt-5 rounded-[20px] border border-border bg-card px-5 py-4" aria-label="Order progress">
        <p className={cn("text-[18px] font-semibold tracking-tight", TEXT_TONE[headline.tone])}>{headline.text}</p>
        <p className="text-[13px] text-muted-foreground">{headline.detail}</p>
        <OrderProgress index={orderStepIndex(trade)} />
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          {trade.currentStage === 15 && trade.status !== "closed" ? (
            <>
              <StageActionsPanel trade={trade} stageNo={15} perspective="buyer" partyIds={partyIds} />
              <ClaimsPanel trade={trade} perspective="buyer" />
            </>
          ) : null}

          {shipments.length === 0 ? (
            <Panel title="Shipments">
              <p className="text-[13px] text-muted-foreground">Lots are created after the field quality check. They show up here, grouped by shipment.</p>
            </Panel>
          ) : (
            shipments.map((entry) => <ShipmentPanel key={entry.id} entry={entry} />)
          )}

          {trace ? (
            <Panel title="Temperature">
              <TemperatureChart points={trace} />
            </Panel>
          ) : null}

          <ChangesTab trade={trade} perspective="buyer" partyIds={partyIds} />
        </div>

        <aside className="flex flex-col gap-4">
          <OrderSummary trade={trade} />
          <PaymentPanel trade={trade} />
          <DocumentsPanel trade={trade} />
        </aside>
      </div>
    </div>
  )
}

function OrderProgress({ index }: { index: number }) {
  return (
    <ol className="mt-4 grid grid-cols-5 gap-2">
      {ORDER_STEPS.map((step, position) => {
        const done = position < index
        const current = position === index
        return (
          <li key={step.id} className="flex flex-col gap-2">
            <span aria-hidden className={cn("h-1.5 rounded-full", done ? "bg-amama-deep" : current ? "bg-amama/50" : "bg-border")} />
            <span className={cn("flex items-center gap-1 text-[12.5px]", done || current ? "font-medium text-foreground" : "text-muted-foreground")}>
              {done ? <CheckIcon aria-hidden className="size-3.5 text-amama-deep" strokeWidth={3} /> : null}
              {step.label}
              {current ? <span className="sr-only"> (current)</span> : null}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

const MILESTONE_TONE: Record<W.ShipmentMilestone["state"], string> = {
  complete: "bg-amama-deep",
  due: "bg-status-warning",
  late: "bg-destructive",
  pending: "bg-border",
}

function ShipmentPanel({ entry }: { entry: OrderShipment }) {
  const { shipment, container, lots } = entry
  const title = entry.total > 1 ? `Shipment ${entry.index} of ${entry.total}` : shipment ? "Shipment" : "Not shipped yet"

  return (
    <section id={entry.id} className="scroll-mt-24">
      <Panel
        title={title}
        action={
          shipment ? (
            <span className="inline-flex items-center gap-2 text-[12.5px] text-muted-foreground">
              <CarrierLogo carrier={shipment.carrier} mode="ocean" className="size-4" />
              {shipmentWhen(entry)}
            </span>
          ) : (
            <span className="text-[12.5px] text-muted-foreground">Packing at origin</span>
          )
        }
      >
        {shipment ? (
          <>
            <Facts
              columns={3}
              rows={[
                { label: "Vessel", value: `${shipment.vessel} ${shipment.voyage}` },
                { label: "Container", value: container ? <Mono>{container.id}</Mono> : "—" },
                { label: "Bill of lading", value: shipment.blNo ? <Mono>{shipment.blNo}</Mono> : "After sailing" },
                { label: "Departs", value: formatStamp(shipment.atd ?? shipment.etd) },
                { label: shipment.ata ? "Arrived" : "Arrives", value: formatStamp(shipment.ata ?? shipment.eta) },
                { label: "Route", value: `${portName(shipment.portOfLoading)} → ${portName(shipment.portOfDischarge)}` },
              ]}
            />
            <ol className="mt-5 flex flex-col border-t border-border pt-4">
              {shipment.milestones.map((milestone, index) => (
                <li key={milestone.key} className="relative flex gap-3 pb-3 last:pb-0">
                  {index < shipment.milestones.length - 1 ? <span aria-hidden className="absolute start-[4px] top-3 h-full w-px bg-border" /> : null}
                  <span aria-hidden className={cn("relative mt-1 size-2.5 shrink-0 rounded-full", MILESTONE_TONE[milestone.state])} />
                  <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
                    <span className={cn("text-[13px]", milestone.state === "pending" ? "text-muted-foreground" : "font-medium text-foreground")}>{milestone.label}</span>
                    <span className="text-[12px] text-muted-foreground tabular-nums">
                      {milestone.actualAt ? formatStamp(milestone.actualAt) : `Planned ${formatStamp(milestone.plannedAt)}`}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </>
        ) : null}

        {lots.length > 0 ? (
          <div className={cn(shipment && "mt-5 border-t border-border pt-4")}>
            <p className="mb-2 text-[13px] font-medium text-foreground">
              {lots.length} {lots.length === 1 ? "lot" : "lots"} · {(lots.reduce((sum, lot) => sum + lot.qtyAcceptedKg, 0) / 1000).toFixed(1)} MT
            </p>
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
              {lots.map((lot) => (
                <li key={lot.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1">
                    <Mono className="block truncate text-[12px] font-semibold text-foreground">{lot.id}</Mono>
                    <span className="block truncate text-[12px] text-muted-foreground">
                      {W.sellerById(lot.sellerId)?.entity} · {lot.grade} · {(lot.qtyAcceptedKg / 1000).toFixed(1)} MT
                    </span>
                  </span>
                  <Status tone={lot.qcDecision === "PASS" ? "ok" : lot.qcDecision === "REJECT" ? "crit" : "warn"} className="shrink-0">
                    {lot.qcDecision === "PASS" ? "QC passed" : lot.qcDecision === "CONDITIONAL" ? "Conditional" : lot.qcDecision === "HOLD" ? "On hold" : "Rejected"}
                  </Status>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Panel>
    </section>
  )
}

function OrderSummary({ trade }: { trade: W.Trade }) {
  const buyer = W.buyerById(trade.buyerId)
  const kam = W.userById(trade.kamId)
  return (
    <Panel title="Order summary">
      <dl className="flex flex-col gap-2.5 text-[13px]">
        <Row label="Quantity" value={`${trade.qtyContractedMt} MT`} />
        <Row label="Price" value={`${usd(trade.priceUsdPerMt)} / MT`} />
        <Row label="Incoterm" value={trade.incoterm} />
        <Row label="Ship to" value={`${buyer?.company ?? ""}, ${buyer?.city ?? trade.destination}`} />
        <Row label="Delivery window" value={`${day(trade.deliveryWindow[0])} – ${day(trade.deliveryWindow[1])}`} />
        <Row label="Your contact" value={kam ? `${kam.name}` : "—"} />
        <div className="mt-1 flex items-baseline justify-between border-t border-border pt-3">
          <dt className="font-semibold text-foreground">Order total</dt>
          <dd className="text-[16px] font-semibold text-foreground tabular-nums">{usd(orderTotal(trade))}</dd>
        </div>
      </dl>
    </Panel>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-end font-medium text-foreground">{value}</dd>
    </div>
  )
}

function PaymentPanel({ trade }: { trade: W.Trade }) {
  const fulfilment = W.fulfilmentForTrade(trade.id)
  const clock = paymentClock(trade)
  return (
    <Panel title="Payment" action={<Pill tone={clock.tone === "muted" ? "muted" : clock.tone}>{clock.value}</Pill>}>
      <dl className="flex flex-col gap-2.5 text-[13px]">
        <Row label="Terms" value={trade.paymentTerms} />
        <Row label="Advance" value={fulfilment?.advanceReceivedUsd ? `${usd(fulfilment.advanceReceivedUsd)} · paid ${day(fulfilment.advanceReceivedAt)}` : "—"} />
        <Row
          label="Balance"
          value={
            fulfilment
              ? `${usd(fulfilment.balanceDueUsd)}${fulfilment.balanceReceivedAt ? ` · paid ${day(fulfilment.balanceReceivedAt)}` : fulfilment.balanceDueAt ? ` · due ${day(fulfilment.balanceDueAt)}` : ""}`
              : "—"
          }
        />
      </dl>
    </Panel>
  )
}

function DocumentsPanel({ trade }: { trade: W.Trade }) {
  const register = documentRegister(trade)
  const rows = BUYER_DOCUMENTS.map((name) => ({ name, document: register.find((entry) => entry.name === name) }))
  return (
    <Panel title="Documents" flush>
      <ul className="divide-y divide-border">
        {rows.map(({ name, document }) => {
          const ready = document?.status === "VERIFIED"
          const blocked = document?.status === "MISSING" || document?.status === "REJECTED"
          return (
            <li key={name} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <span className={cn("min-w-0 truncate text-[13px]", ready ? "font-medium text-foreground" : "text-muted-foreground")}>{name}</span>
              <Status tone={ready ? "ok" : blocked ? "warn" : "muted"}>{ready ? "Ready" : document ? "In progress" : "Later"}</Status>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}

export { BuyerOrderPage, BuyerOrdersPage }
