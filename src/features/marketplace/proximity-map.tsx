import { MapPinIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { countries, countryCodeToFlag } from "@/features/onboarding/countries"
import { countryCentroids } from "@/features/onboarding/country-centroids"

/** Low enough zoom that one tile spans hundreds of kilometres — a country
 *  or a large region, not a neighbourhood. That's the actual point: it has
 *  to be too coarse to double as a meeting point. */
const ZOOM = 6

function hashString(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function lonToTileX(lon: number, zoom: number) {
  return Math.floor(((lon + 180) / 360) * 2 ** zoom)
}

function latToTileY(lat: number, zoom: number) {
  const rad = (lat * Math.PI) / 180
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom
  )
}

/** Nudges the centroid by up to ~1.5° so two listings in the same country
 *  but different regions don't render the identical tile — still nowhere
 *  near precise enough to be an address, just enough to not look like a
 *  single hard-coded pin per country. */
function approximateTile(country: string, region: string) {
  const [baseLat, baseLon] = countryCentroids[country] ?? [20, 0]
  const seed = hashString(region || country)
  const jitterLat = (((seed % 300) - 150) / 100) * 1
  const jitterLon = ((((seed >> 8) % 300) - 150) / 100) * 1
  const lat = Math.max(-85, Math.min(85, baseLat + jitterLat))
  const lon = baseLon + jitterLon
  return { x: lonToTileX(lon, ZOOM), y: latToTileY(lat, ZOOM), z: ZOOM }
}

/**
 * A general-area map, not a pin on an address — a single low-zoom OpenStreetMap
 * tile with a fuzzed marker in the middle. Deliberately imprecise: a seller's
 * exact coordinates would let a buyer find them outside the marketplace
 * entirely, which is exactly the trade the platform's KAM-mediated model is
 * built to route through itself instead.
 */
function ProximityMap({
  country,
  region,
  pinX = 50,
  pinY = 50,
  onPick,
  className,
}: {
  country: string
  region: string
  /** Where the pin sits within the tile, as a 0–100 percentage of its
   *  width/height — cosmetic only, never real coordinates, so a seller can
   *  "place" themselves on the map without the platform ever storing
   *  anything precise enough to be an address. */
  pinX?: number
  pinY?: number
  /** When given, the tile becomes clickable and reports the click as the
   *  same 0–100 percentages — this is what turns the read-only map into
   *  the seller's placement picker. */
  onPick?: (x: number, y: number) => void
  className?: string
}) {
  const countryEntry = countries.find((entry) => entry.code === country)
  const tile = approximateTile(country, region)
  const tileUrl = `https://tile.openstreetmap.org/${tile.z}/${tile.x}/${tile.y}.png`
  const label = [region, countryEntry?.name].filter(Boolean).join(", ")

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        onPick && "cursor-crosshair",
        className
      )}
      onClick={
        onPick
          ? (event) => {
              const rect = event.currentTarget.getBoundingClientRect()
              const x = ((event.clientX - rect.left) / rect.width) * 100
              const y = ((event.clientY - rect.top) / rect.height) * 100
              onPick(Math.min(100, Math.max(0, x)), Math.min(100, Math.max(0, y)))
            }
          : undefined
      }
    >
      {/* A third-party map tile, not a Next-optimizable asset — plain
          `<img>` on purpose. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={tileUrl}
        alt=""
        aria-hidden
        className="size-full object-cover opacity-95 grayscale-[15%]"
        loading="lazy"
        draggable={false}
      />
      <div
        className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
        style={{ left: `${pinX}%`, top: `${pinY}%` }}
      >
        <span className="relative flex size-3">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-amama-deep/50" />
          <span className="relative inline-flex size-3 rounded-full border-2 border-white bg-amama-deep shadow" />
        </span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 via-black/10 to-transparent px-2.5 pt-5 pb-1.5">
        <p className="flex items-center gap-1 text-[11px] font-medium text-white">
          <MapPinIcon className="size-3 shrink-0" />
          <span className="truncate">
            {countryEntry ? countryCodeToFlag(countryEntry.code) : null} {label || "Location on file"}
          </span>
        </p>
      </div>
    </div>
  )
}

export { ProximityMap }
