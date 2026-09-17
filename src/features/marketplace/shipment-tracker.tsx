"use client"

import {
  AlertTriangleIcon,
  AnchorIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  DoorOpenIcon,
  FileCheckIcon,
  MapPinIcon,
  NavigationIcon,
  PackageCheckIcon,
  PackageIcon,
  ShipIcon,
  TruckIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { Shipment, ShipmentEventType, ShipmentStatus } from "@/features/marketplace/deal-store"

const eventIcons: Record<ShipmentEventType, LucideIcon> = {
  booked: PackageIcon,
  "gate-in": DoorOpenIcon,
  loaded: PackageCheckIcon,
  departed: ShipIcon,
  "in-transit": NavigationIcon,
  "arrived-port": AnchorIcon,
  customs: FileCheckIcon,
  "out-for-delivery": TruckIcon,
  delivered: CheckCircleIcon,
  delayed: AlertTriangleIcon,
}

const statusStyles: Record<ShipmentStatus, { label: string; className: string }> = {
  booked: { label: "Booked", className: "bg-muted text-muted-foreground" },
  "in-transit": { label: "In transit", className: "bg-amama-subtle text-amama-deep" },
  arrived: { label: "Arrived", className: "bg-amama-subtle text-amama-deep" },
  delayed: { label: "Delayed", className: "bg-destructive/10 text-destructive" },
}

function formatEventDate(at: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(at))
}

function formatEta(eta: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(eta))
}

/**
 * The one visual this whole feature hinges on: a non-technical buyer or
 * seller has to glance at it and immediately understand where their
 * shipment actually is. Carrier, current location, and ETA sit up top in
 * plain language; below that is a real timeline of what's happened, most
 * recent first — the same order a courier tracking page reads in — not a
 * bare status enum. Deliberately dependency-free of both `admin-ui.tsx`
 * (admin-only) and `dashboard-ui.tsx` (buyer/seller-only): this is the one
 * component both sides share, so it can't lean on either.
 */
function ShipmentTracker({ shipment }: { shipment: Shipment }) {
  const status = statusStyles[shipment.status]
  const events = [...shipment.events].reverse()

  return (
    <div className="overflow-hidden rounded-[20px] border border-border bg-muted">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold tracking-tight text-foreground">{shipment.carrier}</p>
          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
            {shipment.documentNumber || "No tracking number yet"}
          </p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium", status.className)}>
          {status.label}
        </span>
      </div>

      <div className="flex flex-col gap-4 border-t border-border bg-card p-5">
        {shipment.origin || shipment.destination ? (
          <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium text-foreground">
            <span>{shipment.origin ?? "Origin TBD"}</span>
            <ArrowRightIcon className="size-3.5 shrink-0 text-muted-foreground rtl:-scale-x-100" />
            <span>{shipment.destination ?? "Destination TBD"}</span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-5 rounded-[14px] bg-muted px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-amama-deep text-white">
              <MapPinIcon className="size-4" />
            </span>
            <div>
              <p className="text-[11px] text-muted-foreground">Currently</p>
              <p className="text-[13px] font-semibold text-foreground">
                {shipment.currentLocation ?? "Not yet picked up"}
              </p>
            </div>
          </div>
          {shipment.eta ? (
            <div>
              <p className="text-[11px] text-muted-foreground">ETA</p>
              <p className="text-[13px] font-semibold text-foreground">{formatEta(shipment.eta)}</p>
            </div>
          ) : null}
        </div>

        {events.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No tracking updates logged yet.</p>
        ) : (
          <ul className="flex flex-col">
            {events.map((event, index) => {
              const Icon = eventIcons[event.type]
              const isLatest = index === 0
              const isLast = index === events.length - 1
              const isTrouble = event.type === "delayed"
              return (
                <li key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "grid size-8 shrink-0 place-items-center rounded-full",
                        isTrouble
                          ? "bg-destructive text-white"
                          : isLatest
                            ? "bg-amama-deep text-white"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    {!isLast ? <span aria-hidden className="my-0.5 w-px flex-1 bg-border" /> : null}
                  </div>
                  <div className={cn("min-w-0", isLast ? "pb-0" : "pb-5")}>
                    <p
                      className={cn(
                        "pt-1.5 text-[13px] font-semibold",
                        isLatest ? "text-foreground" : "text-foreground/80"
                      )}
                    >
                      {event.label}
                    </p>
                    <p className="text-[12px] text-muted-foreground">
                      {formatEventDate(event.at)}
                      {event.location ? ` · ${event.location}` : ""}
                    </p>
                    {event.note ? <p className="mt-0.5 text-[12px] text-muted-foreground">{event.note}</p> : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

export { ShipmentTracker }
