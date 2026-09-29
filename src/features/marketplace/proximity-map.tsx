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
/** Rough state centres, so an Indian listing lands in its own state rather
 *  than the middle of the country — still state-level, never a place. */
const STATE_CENTROIDS: Record<string, [number, number]> = {
  "Andhra Pradesh": [15.9, 79.7],
  Assam: [26.2, 92.9],
  Gujarat: [22.3, 71.2],
  Haryana: [29.1, 76.1],
  "Himachal Pradesh": [31.8, 77.2],
  "Jammu & Kashmir": [33.8, 75.0],
  Karnataka: [15.3, 75.7],
  Kerala: [10.3, 76.5],
  "Madhya Pradesh": [23.5, 78.5],
  Maharashtra: [19.6, 75.5],
  Punjab: [31.1, 75.3],
  Rajasthan: [26.9, 73.8],
  "Tamil Nadu": [11.1, 78.4],
  Telangana: [17.9, 79.0],
  "Uttar Pradesh": [26.8, 80.9],
  "West Bengal": [22.9, 87.9],
}

function baseCentroid(country: string, region: string): [number, number] {
  if (country === "IN") {
    const state = Object.keys(STATE_CENTROIDS).find((name) => region.includes(name))
    if (state) return STATE_CENTROIDS[state]
  }
  return countryCentroids[country] ?? [20, 0]
}

function approximateTile(country: string, region: string) {
  const [baseLat, baseLon] = baseCentroid(country, region)
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
  showLabel = true,
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
  /** Off when the caller prints the location beneath the map itself. */
  showLabel?: boolean
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
      {showLabel ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/60 via-black/10 to-transparent px-2.5 pt-5 pb-1.5">
          <p className="flex items-center gap-1 text-[11px] font-medium text-white">
            <MapPinIcon className="size-3 shrink-0" />
            <span className="truncate">
              {countryEntry ? countryCodeToFlag(countryEntry.code) : null} {label || "Location on file"}
            </span>
          </p>
        </div>
      ) : null}
    </div>
  )
}

export { ProximityMap }
