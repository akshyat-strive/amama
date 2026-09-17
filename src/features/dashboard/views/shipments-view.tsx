"use client"

import * as React from "react"
import { ShipIcon } from "lucide-react"

import { Panel, StatusPill } from "@/features/dashboard/dashboard-ui"
import { buildOrderBook, buildShipments } from "@/features/dashboard/demo-data"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import { buyerIdentity } from "@/features/marketplace/identity"
import { useDeals } from "@/features/marketplace/deal-store"
import { ShipmentTracker } from "@/features/marketplace/shipment-tracker"

function ShipmentsView() {
  const { draft } = useOnboarding()
  const buyer = draft.buyer
  const deals = useDeals()

  const shipments = React.useMemo(() => {
    const orders = buildOrderBook({
      crops: buyer.sourcing,
      country: buyer.country,
      role: "buyer",
      counterparty: buyer.companyName || "Your company",
    })
    return buildShipments(orders)
  }, [buyer.sourcing, buyer.country, buyer.companyName])

  const myId = buyerIdentity(buyer).id
  const trackedShipments = React.useMemo(
    () => deals.filter((deal) => deal.buyerId === myId).flatMap((deal) => deal.shipments),
    [deals, myId]
  )

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Shipments</h1>

      {trackedShipments.length > 0 ? (
        <Panel
          title="Your tracked shipments"
          subtitle="Real-time updates from the team handling your deal"
          className="mt-6"
        >
          <div className="flex flex-col gap-3 p-5">
            {trackedShipments.map((shipment) => (
              <ShipmentTracker key={shipment.id} shipment={shipment} />
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel title={`${shipments.length} shipments`} className="mt-6" subtitle="By nearest ETA">
        <ul className="divide-y divide-border">
          {shipments.map((shipment) => (
            <li key={shipment.id} className="flex items-start gap-3 px-5 py-4">
              <span
                aria-hidden
                className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-muted text-foreground/70"
              >
                <ShipIcon className="size-4" strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold text-foreground">
                    {shipment.id}
                  </span>
                  <StatusPill status={shipment.status} />
                </div>
                <p className="mt-1 text-[14px] text-muted-foreground">
                  {shipment.crop} · {shipment.tonnes} MT · {shipment.containers} container
                  {shipment.containers > 1 ? "s" : ""} · {shipment.incoterm}
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {shipment.vessel} → {shipment.destination}
                </p>
              </div>
              <span className="shrink-0 text-[12px] text-muted-foreground">
                ETA {shipment.etaDays}d
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  )
}

export { ShipmentsView }
