"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AlertTriangleIcon, CheckIcon, ShipIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetCloseButton } from "@/components/ui/sheet"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import { buyerIdentity } from "@/features/marketplace/identity"
import { raiseClaim, useDeals, type Deal, type Shipment } from "@/features/marketplace/deal-store"
import { ShipmentTracker, ShipmentRow } from "@/features/marketplace/shipment-tracker"

/** Once a shipment has actually landed, the buyer's own next move —
 *  confirm it's clean, or raise a dispute against what showed up. Reuses
 *  the existing `ShipmentClaim` model (already fully built for KAM/seller
 *  triage on the Logistics side) rather than a new claims flow. */
function ArrivalConfirmation({ deal, shipment }: { deal: Deal; shipment: Shipment }) {
  const [raising, setRaising] = React.useState(false)
  const [confirmed, setConfirmed] = React.useState(false)
  const [reason, setReason] = React.useState("")
  const [amount, setAmount] = React.useState("")

  if (shipment.claim) return null

  if (confirmed) {
    return (
      <p className="flex items-center gap-1.5 rounded-2xl border border-border bg-card px-4 py-3 text-[13px] font-medium text-amama-deep">
        <CheckIcon className="size-4 shrink-0" />
        Delivery confirmed for {deal.listingTitle}
      </p>
    )
  }

  if (raising) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
        <p className="text-[13px] font-bold text-foreground">Raise a claim — {deal.listingTitle}</p>
        <Textarea
          placeholder="What's wrong with the delivered cargo?"
          rows={2}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <Input
          type="number"
          placeholder="Claim amount (₹)"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          className="max-w-[180px]"
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            disabled={!reason.trim() || !(Number(amount) > 0)}
            onClick={() => {
              raiseClaim(deal.id, shipment.id, { reason: reason.trim(), amountUsd: Number(amount), raisedBy: "buyer" })
              setRaising(false)
            }}
          >
            Submit claim
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRaising(false)}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-bold text-foreground">{deal.listingTitle}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">Delivered — confirm it arrived as expected.</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" onClick={() => setConfirmed(true)}>
          <CheckIcon />
          Confirm delivery
        </Button>
        <Button size="sm" variant="outline" onClick={() => setRaising(true)}>
          <AlertTriangleIcon />
          Raise a claim
        </Button>
      </div>
    </div>
  )
}

/** The tracker's own detail, opened from a list row into a sheet — a
 *  bottom sheet on a phone, a side sheet from `sm` up — rather than shown
 *  full-size inline in the list. */
function ShipmentDetailSheet({
  pair,
  onOpenChange,
}: {
  pair: { deal: Deal; shipment: Shipment } | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={pair !== null} onOpenChange={onOpenChange}>
      <SheetContent side="responsive" className="overflow-y-auto">
        <SheetCloseButton />
        {pair ? <ShipmentTracker shipment={pair.shipment} /> : null}
      </SheetContent>
    </Sheet>
  )
}

/** `useSearchParams` opts a route out of static rendering unless it sits
 *  under a boundary — same fix already applied elsewhere in this app. */
function ShipmentsView() {
  return (
    <React.Suspense fallback={<ShipmentsSkeleton />}>
      <ShipmentsWorkspace />
    </React.Suspense>
  )
}

function ShipmentsSkeleton() {
  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Shipments</h1>
      <div className="mt-6 h-40 animate-pulse rounded-3xl bg-muted" />
    </div>
  )
}

function ShipmentsWorkspace() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { draft } = useOnboarding()
  const buyer = buyerIdentity(draft.buyer)
  const deals = useDeals()

  const myDeals = React.useMemo(() => deals.filter((deal) => deal.buyerId === buyer.id), [deals, buyer.id])
  const trackedShipments = React.useMemo(
    () => myDeals.flatMap((deal) => deal.shipments.map((shipment) => ({ deal, shipment }))),
    [myDeals]
  )
  const arrived = trackedShipments.filter(({ shipment }) => shipment.stage === "arrived-delivered")

  const selectedId = searchParams.get("shipment")
  const selectedPair = trackedShipments.find(({ shipment }) => shipment.id === selectedId) ?? null

  const setParams = (next: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value === null) params.delete(key)
      else params.set(key, value)
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const openShipment = (id: string) => setParams({ shipment: id })
  const closeSheet = () => setParams({ shipment: null })

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Shipments</h1>

      {trackedShipments.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-5 py-16 text-center">
          <ShipIcon aria-hidden className="size-6 text-muted-foreground" />
          <p className="text-[15px] font-semibold">No shipments yet</p>
          <p className="max-w-sm text-[13px] text-muted-foreground">
            Once your deal reaches shipping and a shipment is booked, it&apos;ll show up here.
          </p>
        </div>
      ) : (
        <>
          {arrived.length > 0 ? (
            <section className="mt-6">
              <h2 className="text-[15px] font-bold text-foreground">Arrived</h2>
              <p className="mt-0.5 text-[13px] text-muted-foreground">Confirm delivery, or raise a claim if something&apos;s wrong.</p>
              <div className="mt-3 flex flex-col gap-3">
                {arrived.map(({ deal, shipment }) => (
                  <ArrivalConfirmation key={shipment.id} deal={deal} shipment={shipment} />
                ))}
              </div>
            </section>
          ) : null}

          <section className={arrived.length > 0 ? "mt-8" : "mt-6"}>
            <h2 className="text-[15px] font-bold text-foreground">Your tracked shipments</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Real-time updates from the team handling your deal.</p>
            <ul className="mt-3 flex flex-col divide-y divide-border rounded-2xl border border-border bg-card px-3">
              {trackedShipments.map(({ shipment }) => (
                <li key={shipment.id}>
                  <ShipmentRow shipment={shipment} onSelect={() => openShipment(shipment.id)} />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <ShipmentDetailSheet pair={selectedPair} onOpenChange={(open) => !open && closeSheet()} />
    </div>
  )
}

export { ShipmentsView }
