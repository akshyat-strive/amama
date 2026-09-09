"use client"

import * as React from "react"

import { GateBar, Panel, StatusPill } from "@/features/dashboard/dashboard-ui"
import { buildOrderBook, TOTAL_GATES } from "@/features/dashboard/demo-data"
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

  return (
    <div>
      <h1 className="text-[24px] font-bold tracking-tight">{content.title}</h1>
      <p className="mt-1 text-[15px] text-muted-foreground">{content.description}</p>

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
