"use client"

import * as React from "react"
import Image from "next/image"
import { CheckIcon, PackageIcon, SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { ButtonGroup } from "@/components/ui/button-group"
import { ControlsSheet, SHEET_GROUP } from "@/components/ui/controls-sheet"
import { ColumnCard, DetailColumnCard } from "@/components/ui/column-card"
import { Input } from "@/components/ui/input"
import * as W from "@/features/tradechain/demo-world"
import { documentRegister, paymentClock } from "@/features/tradechain/trade-file"
import { useLiveWorld } from "@/features/tradechain/live-world"
import { CarrierLogo } from "@/features/marketplace/carrier-logo"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import { OrderRow, OrderRows } from "@/features/orders/order-row"
import { canView, partyIdsFor, tradesFor } from "@/features/trades/trade-access"
import { ClaimsPanel, StageActionsPanel } from "@/features/trades/trade-actions"
import { ChangesTab } from "@/features/trades/trade-changes"
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

/** Who grows it — the first grower, and how many more. */
function growers(trade: W.Trade): string {
  const names = trade.sellerIds.map((id) => W.sellerById(id)?.entity).filter(Boolean)
  return names.length > 1 ? `${names[0]} +${names.length - 1}` : (names[0] ?? "—")
}

function BuyerOrdersPage() {
  useLiveWorld()
  const email = useBuyer()
  const [tab, setTab] = React.useState<Tab>("open")
  const [query, setQuery] = React.useState("")
  const orders = tradesFor("buyer", email).sort((a, b) => b.contractSignedAt.localeCompare(a.contractSignedAt))
  const needle = query.trim().toLowerCase()
  const matching = orders.filter((trade) => !needle || [trade.id, productTitle(trade), trade.destination, growers(trade)].join(" ").toLowerCase().includes(needle))
  const open = matching.filter((trade) => trade.status !== "closed")
  const completed = matching.filter((trade) => trade.status === "closed")
  const visible = tab === "open" ? open : completed

  return (
    <ColumnCard
      title="Orders"
      action={
        <ControlsSheet
          title="Orders"
          active={tab !== "open"}
          controls={[
            {
              label: "Show",
              render: (inSheet) => (
                <ButtonGroup
                  label="Order lists"
                  size="sm"
                  className={inSheet ? SHEET_GROUP : undefined}
                  value={tab}
                  onChange={setTab}
                  options={[
                    { value: "open", label: `Open · ${open.length}` },
                    { value: "completed", label: `Completed · ${completed.length}` },
                  ]}
                />
              ),
            },
          ]}
        />
      }
      toolbar={
        <div className="relative w-full sm:w-72">
          <SearchIcon aria-hidden className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search orders"
            aria-label="Search orders"
            className="h-9 rounded-full border-transparent bg-card ps-9"
          />
        </div>
      }
    >
      {visible.length === 0 ? (
        <EmptyNote>
          <PackageIcon aria-hidden className="mx-auto mb-2 size-5" />
          {tab === "open" ? "No open orders" : "No completed orders yet"}
        </EmptyNote>
      ) : (
        <OrderRows counterparty="Grower">
          {visible.map((trade) => (
            <BuyerOrderRow key={trade.id} trade={trade} />
          ))}
        </OrderRows>
      )}
    </ColumnCard>
  )
}

function BuyerOrderRow({ trade }: { trade: W.Trade }) {
  const headline = orderHeadline(trade)
  const step = ORDER_STEPS[orderStepIndex(trade)]
  const latest = orderShipments(trade).at(-1)

  return (
    <OrderRow
      href={`${BASE}/${trade.id}`}
      title={productTitle(trade)}
      orderId={trade.id}
      counterparty={growers(trade)}
      quantity={`${trade.qtyContractedMt} MT`}
      status={<Pill tone={headline.tone}>{step ? step.label : "Completed"}</Pill>}
      stage={headline.text}
      when={latest ? shipmentWhen(latest) : `Placed ${day(trade.contractSignedAt)}`}
    />
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
      <DetailColumnCard backHref={BASE} backLabel="Orders" title="Not found">
        <EmptyNote>
          <PackageIcon aria-hidden className="mx-auto mb-2 size-5" />
          Order not found
        </EmptyNote>
      </DetailColumnCard>
    )
  }
  return <OrderDetail trade={trade} partyIds={partyIdsFor("buyer", email)} />
}

function OrderDetail({ trade, partyIds }: { trade: W.Trade; partyIds: string[] }) {
  const headline = orderHeadline(trade)
  const shipments = orderShipments(trade)
  const step = ORDER_STEPS[orderStepIndex(trade)]

  return (
    <DetailColumnCard
      backHref={BASE}
      backLabel="Orders"
      title={`${W.productById(trade.productId)?.label ?? "Product"} · ${trade.id}`}
      meta={`${W.variantById(trade.variantId)?.label ?? ""} · placed ${day(trade.contractSignedAt)} · ${trade.qtyContractedMt} MT`}
      status={<Pill tone={headline.tone}>{step ? step.label : "Completed"}</Pill>}
    >
      <section className="flex min-w-0 gap-4 rounded-[20px] bg-card px-5 py-4" aria-label="Order progress">
        <Image src={orderPhoto(trade, 200)} alt="" width={64} height={64} className="hidden size-16 shrink-0 rounded-2xl object-cover sm:block" />
        <div className="min-w-0 flex-1">
          <p className={cn("text-[18px] font-semibold tracking-tight", TEXT_TONE[headline.tone])}>{headline.text}</p>
          <p className="text-[13px] text-muted-foreground">{headline.detail}</p>
          <OrderProgress index={orderStepIndex(trade)} />
        </div>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
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

          <ChangesTab trade={trade} perspective="buyer" partyIds={partyIds} />
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <OrderSummary trade={trade} />
          <PaymentPanel trade={trade} />
          <DocumentsPanel trade={trade} />
        </aside>
      </div>
    </DetailColumnCard>
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
            <ul className="-mx-4 divide-inset">
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
      <dl className="-mx-4 -my-1.5 divide-inset text-[13px]">
        <Row label="Quantity" value={`${trade.qtyContractedMt} MT`} />
        <Row label="Price" value={`${usd(trade.priceUsdPerMt)} / MT`} />
        <Row label="Incoterm" value={trade.incoterm} />
        <Row label="Ship to" value={`${buyer?.company ?? ""}, ${buyer?.city ?? trade.destination}`} />
        <Row label="Delivery window" value={`${day(trade.deliveryWindow[0])} – ${day(trade.deliveryWindow[1])}`} />
        <Row label="Your contact" value={kam ? `${kam.name}` : "—"} />
        <div className="flex items-baseline justify-between px-4 py-2.5">
          <dt className="font-semibold text-foreground">Order total</dt>
          <dd className="text-[16px] font-semibold text-foreground tabular-nums">{usd(orderTotal(trade))}</dd>
        </div>
      </dl>
    </Panel>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
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
      <dl className="-mx-4 -my-1.5 divide-inset text-[13px]">
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
      <ul className="divide-inset">
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
