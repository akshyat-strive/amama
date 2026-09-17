"use client"

import * as React from "react"

import { GateBar, Panel, StatusPill } from "@/features/dashboard/dashboard-ui"
import { buildOrderBook, TOTAL_GATES } from "@/features/dashboard/demo-data"
import { formatInr } from "@/features/marketplace/currency"
import { buyerIdentity, sellerIdentity } from "@/features/marketplace/identity"
import { ORDER_STAGE_LABELS, useDeals } from "@/features/marketplace/deal-store"
import { OrderJourney } from "@/features/orders/order-journey"
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

function OrdersView({ role }: { role: OnboardingRole }) {
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
          role === "buyer"
            ? draft.buyer.companyName || "Your company"
            : draft.seller.farmName || "Your farm",
      }),
    [
      role,
      draft.buyer.sourcing,
      draft.seller.produce,
      person.country,
      draft.buyer.companyName,
      draft.seller.farmName,
    ]
  )

  // Orders that came from a real agreed deal, as opposed to the synthetic
  // order book below — these are the ones with a live journey to follow.
  const identity = role === "buyer" ? buyerIdentity(draft.buyer) : sellerIdentity(draft.seller)
  const deals = useDeals()
  const liveOrders = deals.filter(
    (deal) =>
      deal.orderStage !== null &&
      (role === "buyer" ? deal.buyerId === identity.id : deal.sellerId === identity.id)
  )

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">{content.title}</h1>

      {liveOrders.length > 0 ? (
        <Panel
          title="Live orders"
          className="mt-6"
          subtitle="Agreed deals your account manager is running"
        >
          <ul className="divide-y divide-border">
            {liveOrders.map((deal) => (
              <li key={deal.id} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-[14px] font-semibold text-foreground">{deal.listingTitle}</span>
                  <span className="rounded-full bg-amama-subtle px-2 py-0.5 text-[11px] font-semibold text-amama-deep">
                    {ORDER_STAGE_LABELS[deal.orderStage!]}
                  </span>
                  <span className="ms-auto shrink-0 text-[13px] font-semibold tabular-nums text-foreground">
                    {formatInr(deal.agreedPricePerTonneUsd * deal.agreedQuantityMt)}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {role === "buyer" ? deal.sellerName : deal.buyerName} · {deal.agreedQuantityMt} MT
                  {deal.assignedKamName ? ` · ${deal.assignedKamName}` : ""}
                </p>
                <div className="mt-3.5">
                  <OrderJourney deal={deal} defaultExpanded />
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel title={`${orders.length} orders`} className="mt-6" subtitle="Newest first">
        <ul className="divide-y divide-border">
          {orders.map((order) => (
            <li key={order.id} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-semibold text-foreground">{order.id}</span>
                <StatusPill status={order.status} />
                <span className="ms-auto shrink-0 text-[12px] text-muted-foreground">
                  ETA {order.etaDays} days
                </span>
              </div>
              <p className="mt-1.5 text-[14px] text-muted-foreground">
                {order.crop} — {order.variety} · {order.tonnes} MT · {order.grade} ·{" "}
                {order.counterparty}
              </p>
              <div className="mt-3 max-w-sm">
                <GateBar cleared={order.gatesCleared} total={TOTAL_GATES} status={order.status} />
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

export { OrdersView }
