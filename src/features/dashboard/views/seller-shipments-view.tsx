"use client"

import * as React from "react"
import { ShipIcon } from "lucide-react"

import { Panel } from "@/features/dashboard/dashboard-ui"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import { sellerIdentity } from "@/features/marketplace/identity"
import { useDeals } from "@/features/marketplace/deal-store"
import { ShipmentTracker } from "@/features/marketplace/shipment-tracker"

/** Sellers had no Shipments page at all before this — buyers' existing
 *  synthetic demo content had nothing seller-shaped to mirror, so this is
 *  just the real tracker half of that page, not a full synthetic rebuild. */
function SellerShipmentsView() {
  const { draft } = useOnboarding()
  const deals = useDeals()

  const myId = sellerIdentity(draft.seller).id
  const trackedShipments = React.useMemo(
    () => deals.filter((deal) => deal.sellerId === myId).flatMap((deal) => deal.shipments),
    [deals, myId]
  )

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Shipments</h1>

      {trackedShipments.length > 0 ? (
        <Panel title="Your tracked shipments" subtitle="Real-time updates from the team handling your deal" className="mt-6">
          <div className="flex flex-col gap-3 p-5">
            {trackedShipments.map((shipment) => (
              <ShipmentTracker key={shipment.id} shipment={shipment} />
            ))}
          </div>
        </Panel>
      ) : (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-5 py-16 text-center">
          <ShipIcon aria-hidden className="size-6 text-muted-foreground" />
          <p className="text-[15px] font-semibold">No shipments yet</p>
          <p className="max-w-sm text-[13px] text-muted-foreground">
            Once a deal of yours reaches shipping and a shipment is booked, it&apos;ll show up here.
          </p>
        </div>
      )}
    </div>
  )
}

export { SellerShipmentsView }
