"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRightIcon, ClipboardListIcon } from "lucide-react"

import { EntityLink } from "@/features/internal/entity-link"
import {
  Dot,
  EmptyState,
  Facts,
  Group,
  Island,
  Metric,
  Metrics,
  Meter,
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
 * An order is the PO plus everything that happened because of it. The
 * distinction this screen exists to make visible: a PO that matched the
 * agreed term sheet is an acceptance and needs nobody's signature, while
 * a PO that changed a term is a counter-offer and commits neither side
 * until it is confirmed. Those two look identical on paper and could not
 * be more different commercially, so they are never shown the same way
 * here.
 */

const PO_TONE: Record<W.PoStatus, Tone> = {
  "auto-accepted": "ok",
  confirmed: "ok",
  "pending-confirmation": "warn",
  cancelled: "muted",
}

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

const orderValue = (po: W.PurchaseOrder): number => po.qtyMt * po.priceUsdPerMt

/* ══════════════════════════════════════════════════════════════════════
   LIST
   ══════════════════════════════════════════════════════════════════════ */

function OrdersView() {
  const orders = React.useMemo(
    () => [...W.PURCHASE_ORDERS].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
    []
  )
  const pending = orders.filter((po) => po.status === "pending-confirmation")
  const settled = orders.filter((po) => {
    const fulfilment = po.tradeId ? W.fulfilmentForTrade(po.tradeId) : undefined
    return Boolean(fulfilment?.balanceReceivedAt)
  })
  const book = orders.reduce((sum, po) => sum + orderValue(po), 0)
  const shipped = orders.reduce((sum, po) => {
    const fulfilment = po.tradeId ? W.fulfilmentForTrade(po.tradeId) : undefined
    return sum + (fulfilment?.shippedMt ?? 0)
  }, 0)
  const ordered = orders.reduce((sum, po) => sum + po.qtyMt, 0)

  return (
    <>
      <PageHead title="Orders" />

      <Metrics>
        <Metric label="Order book" value={`$${(book / 1_000_000).toFixed(2)}M`} tone="brand" />
        <Metric label="Orders" value={orders.length} />
        <Metric
          label="Awaiting confirmation"
          value={pending.length}
          tone={pending.length > 0 ? "warn" : "plain"}
        />
        <Metric label="Shipped" value={`${Math.round((shipped / ordered) * 100)}%`} foot={`${shipped} of ${ordered} MT`} />
        <Metric label="Settled" value={settled.length} />
      </Metrics>

      {pending.length > 0 ? (
        <Group label="Counter-offers awaiting confirmation" count={pending.length} pad="tight">
          <Rows>
            {pending.map((po) => (
              <OrderRow key={po.id} po={po} />
            ))}
          </Rows>
        </Group>
      ) : null}

      <Group label="All orders" count={orders.length} pad="tight">
        <Rows>
          {orders
            .filter((po) => po.status !== "pending-confirmation")
            .map((po) => (
              <OrderRow key={po.id} po={po} />
            ))}
        </Rows>
      </Group>
    </>
  )
}

function OrderRow({ po }: { po: W.PurchaseOrder }) {
  const buyer = W.buyerById(po.buyerId)
  const trade = po.tradeId ? W.tradeById(po.tradeId) : null
  const fulfilment = po.tradeId ? W.fulfilmentForTrade(po.tradeId) : undefined
  const shippedPct = fulfilment && po.qtyMt > 0 ? Math.round((fulfilment.shippedMt / po.qtyMt) * 100) : 0

  return (
    <Link
      href={`/internal/orders/${po.id}`}
      className="flex items-center gap-3 rounded-[18px] px-3 py-2.5 transition-colors hover:bg-muted"
    >
      <Dot tone={PO_TONE[po.status]} />

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Mono className="font-semibold">{po.id}</Mono>
          <span className="truncate text-[13px]">{buyer?.company}</span>
          {po.deviations.length > 0 ? <Pill tone="crit">{po.deviations.length} deviations</Pill> : null}
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
          {po.qtyMt} MT · {usd(po.priceUsdPerMt)}/MT · {po.incoterm}
          {trade ? ` · stage ${String(trade.currentStage).padStart(2, "0")}` : " · not contracted"}
        </span>
      </span>

      <span className="hidden w-28 shrink-0 sm:block">
        <Meter
          segments={[
            { value: shippedPct, tone: "ok", label: "shipped" },
            { value: 100 - shippedPct, tone: "muted", label: "outstanding" },
          ]}
        />
        <span className="mt-1 block text-end text-[11px] text-muted-foreground tabular-nums">{shippedPct}% shipped</span>
      </span>

      <span className="hidden w-24 shrink-0 text-end text-[13px] font-semibold tabular-nums sm:block">
        ${Math.round(orderValue(po) / 1000)}k
      </span>

      <Pill tone={PO_TONE[po.status]}>{po.status.replace(/-/g, " ")}</Pill>
      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   DETAIL
   ══════════════════════════════════════════════════════════════════════ */

function OrderDetailView({ orderId }: { orderId: string }) {
  const po = W.poById(orderId)

  if (!po) {
    return (
      <Island>
        <EmptyState icon={ClipboardListIcon} title="Order not found" />
      </Island>
    )
  }

  const buyer = W.buyerById(po.buyerId)
  const trade = po.tradeId ? W.tradeById(po.tradeId) : null
  const termSheet = po.termSheetId ? W.termSheetById(po.termSheetId) : null
  const fulfilment = po.tradeId ? W.fulfilmentForTrade(po.tradeId) : undefined
  const shipment = po.tradeId ? W.shipmentForTrade(po.tradeId) : undefined
  const counterOffer = po.deviations.length > 0

  return (
    <>
      <div className="px-1">
        <Link href="/internal/orders" className="text-[12px] text-muted-foreground hover:text-foreground">
          Orders
        </Link>
      </div>

      <PageHead
        title={po.id}
        meta={
          <>
            <Pill tone={PO_TONE[po.status]}>{po.status.replace(/-/g, " ")}</Pill>
            {counterOffer ? <Pill tone="crit">Counter-offer</Pill> : <Pill tone="ok">Matches term sheet</Pill>}
          </>
        }
      />

      <Metrics>
        <Metric label="Quantity" value={po.qtyMt} unit="MT" />
        <Metric label="Unit price" value={po.priceUsdPerMt.toLocaleString("en-US")} unit="USD/MT" />
        <Metric label="Order value" value={`$${Math.round(orderValue(po) / 1000)}k`} tone="brand" />
        {fulfilment ? (
          <Metric
            label="Shipped"
            value={fulfilment.shippedMt}
            unit="MT"
            foot={`${po.qtyMt - fulfilment.shippedMt} MT outstanding`}
            tone={fulfilment.shippedMt >= po.qtyMt ? "plain" : "warn"}
          />
        ) : null}
        {fulfilment ? (
          <Metric
            label="Balance due"
            value={`$${Math.round(fulfilment.balanceDueUsd / 1000)}k`}
            foot={fulfilment.balanceReceivedAt ? "Received" : day(fulfilment.balanceDueAt)}
            tone={fulfilment.balanceReceivedAt ? "plain" : "warn"}
          />
        ) : null}
      </Metrics>

      {counterOffer ? (
        <Group label="Why this is a counter-offer" count={po.deviations.length}>
          <Rows>
            {po.deviations.map((deviation) => (
              <Row key={deviation}>
                <Dot tone="crit" />
                <span className="text-[13px] leading-relaxed">{deviation}</span>
              </Row>
            ))}
          </Rows>
          <p className="mt-3 border-t border-border pt-3 text-[13px] leading-relaxed text-foreground">
            Until this is confirmed or countered, neither side is committed — no procurement signal is sent and no
            allocation is held.
          </p>
        </Group>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Group label="Order">
          <Facts
            columns={1}
            rows={[
              { label: "Buyer", value: <EntityLink kind="buyer" id={po.buyerId} mono={false} /> },
              { label: "Contact", value: buyer?.contact ?? "—" },
              { label: "Account manager", value: <EntityLink kind="user" id={po.kamId} mono={false} /> },
              { label: "Issued", value: stamp(po.issuedAt) },
              { label: "Confirmed", value: po.confirmedAt ? stamp(po.confirmedAt) : "Not confirmed" },
              {
                label: "Confirmed by",
                value:
                  po.confirmedBy === "system" ? (
                    "Automatically — matched the term sheet"
                  ) : po.confirmedBy ? (
                    <EntityLink kind="user" id={po.confirmedBy} mono={false} />
                  ) : (
                    "—"
                  ),
              },
            ]}
          />
        </Group>

        <Group label="Terms">
          <Facts
            columns={1}
            rows={[
              { label: "Incoterm", value: po.incoterm },
              { label: "Payment", value: po.paymentTerms },
              { label: "Delivery window", value: `${day(po.deliveryWindow[0])} → ${day(po.deliveryWindow[1])}` },
              { label: "Term sheet", value: termSheet ? <EntityLink kind="termSheet" id={termSheet.id} /> : "Direct order — no term sheet" },
              { label: "Trade", value: trade ? <EntityLink kind="trade" id={trade.id} /> : "Not yet contracted" },
              { label: "Shipment", value: shipment ? <EntityLink kind="shipment" id={shipment.id} /> : "Not yet planned" },
            ]}
          />
        </Group>
      </div>

      {fulfilment ? (
        <Group label="Fulfilment">
          <Meter
            className="h-2"
            segments={[
              { value: fulfilment.shippedMt, tone: "ok", label: "shipped" },
              { value: Math.max(fulfilment.packedMt - fulfilment.shippedMt, 0), tone: "brand", label: "packed" },
              { value: Math.max(fulfilment.harvestedMt - fulfilment.packedMt, 0), tone: "warn", label: "harvested" },
              {
                value: Math.max(po.qtyMt - fulfilment.harvestedMt, 0),
                tone: "muted",
                label: "not yet harvested",
              },
            ]}
          />
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11.5px]">
            <span className="flex items-center gap-1.5">
              <Dot tone="ok" /> Shipped {fulfilment.shippedMt} MT
            </span>
            <span className="flex items-center gap-1.5">
              <Dot tone="brand" /> Packed {fulfilment.packedMt} MT
            </span>
            <span className="flex items-center gap-1.5">
              <Dot tone="warn" /> Harvested {fulfilment.harvestedMt} MT
            </span>
            <span className="flex items-center gap-1.5">
              <Dot tone="muted" /> Ordered {po.qtyMt} MT
            </span>
          </div>

          <Facts
            className="mt-4 border-t border-border pt-4"
            rows={[
              { label: "Allocated to growers", value: `${fulfilment.allocatedMt} MT` },
              { label: "Lots created", value: fulfilment.lotsCreated },
              { label: "Pallets packed", value: fulfilment.palletsPacked },
              {
                label: "Shortfall",
                value:
                  fulfilment.shippedMt > 0 && fulfilment.shippedMt < po.qtyMt ? (
                    <span className="text-status-warning">
                      {(po.qtyMt - fulfilment.shippedMt).toFixed(1)} MT below order
                    </span>
                  ) : (
                    "None"
                  ),
              },
            ]}
          />
        </Group>
      ) : null}

      {fulfilment ? (
        <Group label="Money">
          <Facts
            rows={[
              { label: "Order value", value: usd(orderValue(po)) },
              { label: "Advance received", value: fulfilment.advanceReceivedUsd > 0 ? usd(fulfilment.advanceReceivedUsd) : "None" },
              { label: "Advance received on", value: day(fulfilment.advanceReceivedAt) },
              { label: "Balance due", value: usd(fulfilment.balanceDueUsd) },
              { label: "Balance due on", value: day(fulfilment.balanceDueAt) },
              {
                label: "Balance received",
                value: fulfilment.balanceReceivedAt ? (
                  <span className="text-status-success">{day(fulfilment.balanceReceivedAt)}</span>
                ) : (
                  <span className="text-status-warning">Outstanding</span>
                ),
              },
            ]}
          />
        </Group>
      ) : null}

      {trade ? (
        <Group label="Execution" count={`stage ${String(trade.currentStage).padStart(2, "0")}`}>
          <Timeline
            items={W.stageRecordsForTrade(trade.id)
              .filter((record) => record.state !== "pending")
              .map((record) => ({
                id: record.id,
                tone: record.state === "complete" ? "ok" : record.state === "blocked" ? "crit" : "brand",
                title: (
                  <EntityLink kind="stage" id={String(record.stage)} mono={false} className="no-underline hover:underline">
                    {`${String(record.stage).padStart(2, "0")} · ${W.stageByNo(record.stage).name}`}
                  </EntityLink>
                ),
                meta: record.completedAt ? stamp(record.completedAt) : "in progress",
                body: record.outcome,
              }))}
          />
        </Group>
      ) : null}
    </>
  )
}

export { OrdersView, OrderDetailView }
