import Image from "next/image"
import { BoxesIcon, PlaneIcon, ShipIcon, TruckIcon, type LucideIcon } from "lucide-react"

import type { LogisticsMode } from "@/features/marketplace/deal-store"

// A second, tiny copy of `shipment-tracker.tsx`'s own `modeIcons` map —
// importing that module's export here would import this one back into
// it (every carrier-name call site lives in that same file), so this
// four-entry fallback stays local rather than fighting the cycle.
const FALLBACK_MODE_ICONS: Record<LogisticsMode, LucideIcon> = {
  trucking: TruckIcon,
  ocean: ShipIcon,
  air: PlaneIcon,
  consolidation: BoxesIcon,
}

/**
 * Real carrier logos, downloaded once via Brandfetch's Logo API into
 * `public/carrier-logos/` (see that folder's own note) — keyed on a
 * lowercase substring of `Shipment.carrier`, since the stored name is
 * sometimes decorated ("ONE (Ocean Network Express)") rather than the
 * bare brand name. Only real, recognizable carriers get an entry; this
 * app's fictional local truckers/consolidators (Nilgiri Road Freight,
 * Kerala Cold Logistics, the Meridian LCL program) have no real logo to
 * fetch, so they fall through to the generic mode icon on purpose.
 *
 * Two assets per carrier: `icon` is the compact, roughly-square mark for
 * sitting inline next to text at small sizes; `wordmark` is the full
 * lockup (mark plus brand name, sometimes a tagline) for anywhere a
 * carrier is the headline rather than a detail — an empty state, a
 * bigger card. Same two-asset split for every carrier so a caller never
 * has to know which ones do or don't have a distinct wordmark (MSC's
 * "wordmark" is its icon — the brand only ever draws itself one way).
 */
const CARRIER_LOGOS: { match: string; icon: string; wordmark: string }[] = [
  { match: "maersk", icon: "/carrier-logos/maersk.webp", wordmark: "/carrier-logos/maersk-wordmark.webp" },
  { match: "cma cgm", icon: "/carrier-logos/cma-cgm.webp", wordmark: "/carrier-logos/cma-cgm-wordmark.webp" },
  { match: "ocean network express", icon: "/carrier-logos/one-line.webp", wordmark: "/carrier-logos/one-line-wordmark.webp" },
  { match: "hapag-lloyd", icon: "/carrier-logos/hapag-lloyd.webp", wordmark: "/carrier-logos/hapag-lloyd-wordmark.webp" },
  { match: "cathay", icon: "/carrier-logos/cathay-cargo.webp", wordmark: "/carrier-logos/cathay-cargo-wordmark.webp" },
  { match: "msc", icon: "/carrier-logos/msc.webp", wordmark: "/carrier-logos/msc-wordmark.webp" },
]

function carrierLogoEntry(carrier: string): { icon: string; wordmark: string } | null {
  const lower = carrier.toLowerCase()
  return CARRIER_LOGOS.find((entry) => lower.includes(entry.match)) ?? null
}

/** Drop-in replacement for a bare `modeIcons[mode]` render wherever a
 *  shipment's carrier name appears inline — the real icon mark when this
 *  app knows one, the same generic mode icon as before when it doesn't. */
function CarrierLogo({
  carrier,
  mode,
  className = "size-3.5",
}: {
  carrier: string
  mode: LogisticsMode
  className?: string
}) {
  const entry = carrierLogoEntry(carrier)
  if (!entry) {
    const ModeIcon = FALLBACK_MODE_ICONS[mode]
    return <ModeIcon aria-hidden className={className} />
  }
  return (
    <Image
      src={entry.icon}
      alt=""
      aria-hidden
      width={32}
      height={32}
      unoptimized
      className={`${className} shrink-0 rounded-[3px] object-contain`}
    />
  )
}

/** The full brand lockup — mark plus name — for wherever a carrier is
 *  the headline rather than a small detail. Falls back to the generic
 *  mode icon plus the plain carrier name text (the caller's own text,
 *  not rendered here) when this app has no logo for it. */
function CarrierWordmark({
  carrier,
  mode,
  className = "h-6 w-auto",
  fallbackIconClassName = "size-5",
}: {
  carrier: string
  mode: LogisticsMode
  className?: string
  fallbackIconClassName?: string
}) {
  const entry = carrierLogoEntry(carrier)
  if (!entry) {
    const ModeIcon = FALLBACK_MODE_ICONS[mode]
    return <ModeIcon aria-hidden className={fallbackIconClassName} />
  }
  return (
    <Image
      src={entry.wordmark}
      alt={carrier}
      width={320}
      height={80}
      unoptimized
      className={`${className} object-contain object-left`}
    />
  )
}

export { CarrierLogo, CarrierWordmark, carrierLogoEntry }
