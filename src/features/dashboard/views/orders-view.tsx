"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetCloseButton } from "@/components/ui/sheet"
import { StatusPill } from "@/features/dashboard/dashboard-ui"
import { buildOrderBook, TOTAL_GATES, type DemoOrder } from "@/features/dashboard/demo-data"
import { formatInr } from "@/features/marketplace/currency"
import { buyerIdentity, sellerIdentity } from "@/features/marketplace/identity"
import { ORDER_STAGE_LABELS, ORDER_STAGE_ORDER, useDeals, type Deal } from "@/features/marketplace/deal-store"
import { OrderJourney, StageDots } from "@/features/orders/order-journey"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import type { OnboardingRole } from "@/features/onboarding/types"

const copy: Record<OnboardingRole, { title: string; description: string }> = {
  buyer: {
    title: "Orders",
    description: "Every purchase order you've placed, and where it stands.",
  },
  seller: {
    title: "Orders",
    description: "Every buyer order placed against what you supply.",
  },
}

type OrdersTab = "live" | "eta"

/** `useSearchParams` opts a route out of static rendering unless it sits
 *  under a boundary — same fix already applied elsewhere in this app. */
function OrdersView({ role }: { role: OnboardingRole }) {
  return (
    <React.Suspense fallback={<OrdersSkeleton />}>
      <OrdersWorkspace role={role} />
    </React.Suspense>
  )
}

function OrdersSkeleton() {
  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Orders</h1>
      <div className="mt-6 h-40 animate-pulse rounded-3xl bg-muted" />
    </div>
  )
}

/**
 * Two tabs, not two stacked panels — a buyer or seller is either
 * checking on a real, KAM-run deal or skimming the wider order book, not
 * usually both at once, so the page shows one list at a time instead of
 * scrolling past the first to reach the second. Neither list renders a
 * shipment's full detail inline: a row answers "what is this and where's
 * it standing", a click opens the rest in a drawer — the same pattern
 * the RFQ list uses, so this app has one idea of "browse, then open",
 * not a different one per page.
 */
function OrdersWorkspace({ role }: { role: OnboardingRole }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { draft } = useOnboarding()
  const person = role === "buyer" ? draft.buyer : draft.seller
  const content = copy[role]

  const orders = React.useMemo(
    () =>
      buildOrderBook({
        crops: role === "buyer" ? draft.buyer.sourcing : draft.seller.produce,
        country: person.country,
        role,
        counterparty:
          role === "buyer" ? draft.buyer.companyName || "Your company" : draft.seller.farmName || "Your farm",
      }),
    [role, draft.buyer.sourcing, draft.seller.produce, person.country, draft.buyer.companyName, draft.seller.farmName]
  )

  // Orders that came from a real agreed deal, as opposed to the synthetic
  // order book above — these are the ones with a live journey to follow.
  const identity = role === "buyer" ? buyerIdentity(draft.buyer) : sellerIdentity(draft.seller)
  const deals = useDeals()
  const liveOrders = deals.filter(
    (deal) => deal.orderStage !== null && (role === "buyer" ? deal.buyerId === identity.id : deal.sellerId === identity.id)
  )

  const tab: OrdersTab = searchParams.get("tab") === "eta" ? "eta" : "live"
  const openId = searchParams.get("order")
  const selectedLive = openId ? (liveOrders.find((deal) => deal.id === openId) ?? null) : null
  const selectedEta = openId ? (orders.find((order) => order.id === openId) ?? null) : null

  const setParams = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value === null) params.delete(key)
      else params.set(key, value)
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }
  const setTab = (next: OrdersTab) => setParams({ tab: next === "live" ? null : next, order: null })
  const openOrder = (id: string) => setParams({ order: id })
  const closeSheet = () => setParams({ order: null })

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">{content.title}</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">{content.description}</p>

      <div role="tablist" aria-label="Order lists" className="mt-5 flex w-fit gap-1 rounded-full bg-muted p-1">
        <OrdersTabButton label="Live Orders" count={liveOrders.length} active={tab === "live"} onClick={() => setTab("live")} />
        <OrdersTabButton label="ETA Orders" count={orders.length} active={tab === "eta"} onClick={() => setTab("eta")} />
      </div>

      {tab === "live" ? (
        liveOrders.length === 0 ? (
          <EmptyRow text="No agreed deals are being run as orders yet." />
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
            {liveOrders.map((deal) => (
              <li key={deal.id}>
                <LiveOrderRow deal={deal} role={role} onSelect={() => openOrder(deal.id)} />
              </li>
            ))}
          </ul>
        )
      ) : orders.length === 0 ? (
        <EmptyRow text="No orders yet." />
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
          {orders.map((order) => (
            <li key={order.id}>
              <EtaOrderRow order={order} onSelect={() => openOrder(order.id)} />
            </li>
          ))}
        </ul>
      )}

      <Sheet open={selectedLive !== null} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent side="responsive" className="overflow-y-auto">
          <SheetCloseButton />
          {selectedLive ? <LiveOrderDetail deal={selectedLive} role={role} /> : null}
        </SheetContent>
      </Sheet>

      <Sheet open={selectedEta !== null} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent side="responsive" className="overflow-y-auto">
          <SheetCloseButton />
          {selectedEta ? <EtaOrderDetail order={selectedEta} /> : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function OrdersTabButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {label} <span className="tabular-nums text-muted-foreground/80">{count}</span>
    </button>
  )
}

function EmptyRow({ text }: { text: string }) {
  return (
    <p className="mt-6 rounded-2xl border border-dashed border-border px-5 py-10 text-center text-[13px] text-muted-foreground">
      {text}
    </p>
  )
}

function LiveOrderRow({ deal, role, onSelect }: { deal: Deal; role: OnboardingRole; onSelect: () => void }) {
  const currentIndex = deal.orderStage ? ORDER_STAGE_ORDER.indexOf(deal.orderStage) : 0
  return (
    <button type="button" onClick={onSelect} className="flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors hover:bg-muted">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="truncate text-[14px] font-semibold text-foreground">{deal.listingTitle}</span>
          <span className="rounded-full bg-amama-subtle px-2 py-0.5 text-[11px] font-semibold text-amama-deep">
            {deal.orderStage ? ORDER_STAGE_LABELS[deal.orderStage] : ""}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
          {role === "buyer" ? deal.sellerName : deal.buyerName} · {deal.agreedQuantityMt} MT
          {deal.assignedKamName ? ` · ${deal.assignedKamName}` : ""}
        </p>
        <div className="mt-2 max-w-[220px]">
          <StageDots total={ORDER_STAGE_ORDER.length} currentIndex={currentIndex} />
        </div>
      </div>
      <span className="shrink-0 text-[13px] font-semibold tabular-nums text-foreground">
        {formatInr(deal.agreedPricePerTonneUsd * deal.agreedQuantityMt)}
      </span>
    </button>
  )
}

function EtaOrderRow({ order, onSelect }: { order: DemoOrder; onSelect: () => void }) {
  return (
    <button type="button" onClick={onSelect} className="flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors hover:bg-muted">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[14px] font-semibold text-foreground">
            {order.crop} — {order.variety}
          </span>
          <StatusPill status={order.status} />
        </div>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
          {order.tonnes} MT · {order.grade} · {order.counterparty}
        </p>
        <div className="mt-2 max-w-[220px]">
          <StageDots total={TOTAL_GATES} currentIndex={order.gatesCleared} />
        </div>
      </div>
      <span className="shrink-0 text-[12px] font-medium text-muted-foreground">ETA {order.etaDays}d</span>
    </button>
  )
}

function LiveOrderDetail({ deal, role }: { deal: Deal; role: OnboardingRole }) {
  return (
    <div className="flex flex-col gap-4 pb-2">
      <div>
        <h2 className="text-[17px] font-bold tracking-tight text-foreground">{deal.listingTitle}</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {role === "buyer" ? deal.sellerName : deal.buyerName}
          {deal.assignedKamName ? ` · Managed by ${deal.assignedKamName}` : ""}
        </p>
      </div>
      <div className="flex items-baseline justify-between rounded-2xl bg-muted px-4 py-3">
        <span className="text-[12px] font-medium text-muted-foreground">Order value</span>
        <span className="text-[18px] font-bold text-amama-deep">
          {formatInr(deal.agreedPricePerTonneUsd * deal.agreedQuantityMt)}
        </span>
      </div>
      <OrderJourney deal={deal} defaultExpanded />
    </div>
  )
}

function EtaOrderDetail({ order }: { order: DemoOrder }) {
  return (
    <div className="flex flex-col gap-4 pb-2">
      <div>
        <h2 className="text-[17px] font-bold tracking-tight text-foreground">
          {order.crop} — {order.variety}
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">{order.id}</p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-muted p-4 text-[13px]">
        <div>
          <dt className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Quantity</dt>
          <dd className="mt-0.5 font-medium text-foreground">{order.tonnes} MT</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Grade</dt>
          <dd className="mt-0.5 font-medium text-foreground">{order.grade}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Counterparty</dt>
          <dd className="mt-0.5 font-medium text-foreground">{order.counterparty}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Destination</dt>
          <dd className="mt-0.5 font-medium text-foreground">{order.destination}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">ETA</dt>
          <dd className="mt-0.5 font-medium text-foreground">{order.etaDays} days</dd>
        </div>
        <div>
          <dt className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Lot</dt>
          <dd className="mt-0.5 truncate font-medium text-foreground">{order.lots[0]}</dd>
        </div>
      </dl>

      <div className="flex items-center gap-3">
        <StatusPill status={order.status} />
        <span className="text-[12px] text-muted-foreground">
          {order.gatesCleared} of {TOTAL_GATES} gates cleared
        </span>
      </div>
      <StageDots total={TOTAL_GATES} currentIndex={order.gatesCleared} />
    </div>
  )
}

export { OrdersView }
