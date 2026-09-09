"use client"

import * as React from "react"
import { MapPinIcon, MinusIcon, PlusIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { countries, countryCodeToFlag } from "@/features/onboarding/countries"
import { countryCentroids } from "@/features/onboarding/country-centroids"

const TILE_SIZE = 256
// Wider than it is tall, like the container itself (a video aspect, not a
// square) — enough tiles in each direction (2×HALF+1) to cover a wide
// dashboard panel with room to pan before running out of map.
const HALF_X = 3
const HALF_Y = 2
const MIN_ZOOM = 4
const MAX_ZOOM = 9
const DEFAULT_ZOOM = 6

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

function centerTile(country: string, region: string, zoom: number) {
  const [baseLat, baseLon] = countryCentroids[country] ?? [20, 0]
  const seed = hashString(region || country)
  const jitterLat = ((seed % 300) - 150) / 100
  const jitterLon = (((seed >> 8) % 300) - 150) / 100
  const lat = Math.max(-85, Math.min(85, baseLat + jitterLat))
  const lon = baseLon + jitterLon
  return { x: lonToTileX(lon, zoom), y: latToTileY(lat, zoom) }
}

/**
 * The seller-facing map picker — drag to pan, buttons to zoom, click to
 * drop the pin. Still capped well short of street level (max zoom 9, a
 * town/district at best): the seller gets real control over roughly where
 * they land, but never enough precision for the pin itself to double as a
 * meeting point, which is the one property `ProximityMap` (the read-only
 * display version everyone else sees) depends on.
 */
function LocationPicker({
  country,
  region,
  pinX = 50,
  pinY = 50,
  onPick,
  className,
}: {
  country: string
  region: string
  pinX?: number
  pinY?: number
  onPick: (x: number, y: number) => void
  className?: string
}) {
  const [zoom, setZoom] = React.useState(DEFAULT_ZOOM)
  const [pan, setPan] = React.useState({ x: 0, y: 0 })
  const containerRef = React.useRef<HTMLDivElement>(null)
  const dragRef = React.useRef<{ startX: number; startY: number; panX: number; panY: number; moved: boolean } | null>(
    null
  )

  // A new zoom level re-centres the grid — panning is relative to whichever
  // zoom is active, so the zoom buttons reset it directly rather than
  // reacting to the zoom change after the fact via an effect.
  const changeZoom = (next: number) => {
    setZoom(next)
    setPan({ x: 0, y: 0 })
  }

  const center = centerTile(country, region, zoom)
  const tiles: { x: number; y: number }[] = []
  for (let dy = -HALF_Y; dy <= HALF_Y; dy += 1) {
    for (let dx = -HALF_X; dx <= HALF_X; dx += 1) {
      tiles.push({ x: center.x + dx, y: center.y + dy })
    }
  }

  const maxPanX = TILE_SIZE * HALF_X
  const maxPanY = TILE_SIZE * HALF_Y

  const handlePointerDown = (event: React.PointerEvent) => {
    dragRef.current = { startX: event.clientX, startY: event.clientY, panX: pan.x, panY: pan.y, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current
    if (!drag) return
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true
    setPan({
      x: Math.min(maxPanX, Math.max(-maxPanX, drag.panX + dx)),
      y: Math.min(maxPanY, Math.max(-maxPanY, drag.panY + dy)),
    })
  }

  const handlePointerUp = (event: React.PointerEvent) => {
    const drag = dragRef.current
    dragRef.current = null
    if (drag && !drag.moved && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 100
      const y = ((event.clientY - rect.top) / rect.height) * 100
      onPick(Math.min(100, Math.max(0, x)), Math.min(100, Math.max(0, y)))
    }
  }

  const countryEntry = countries.find((entry) => entry.code === country)
  const label = [region, countryEntry?.name].filter(Boolean).join(", ")

  return (
    <div className={cn("relative overflow-hidden bg-muted select-none", className)}>
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => {
          dragRef.current = null
        }}
        className="absolute inset-0 touch-none cursor-grab active:cursor-grabbing"
      >
        <div
          className="absolute top-1/2 left-1/2 grid"
          style={{
            gridTemplateColumns: `repeat(${HALF_X * 2 + 1}, ${TILE_SIZE}px)`,
            gridTemplateRows: `repeat(${HALF_Y * 2 + 1}, ${TILE_SIZE}px)`,
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`,
          }}
        >
          {tiles.map((tile) => (
            // A third-party map tile, not a Next-optimizable asset.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${tile.x}-${tile.y}`}
              src={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`}
              alt=""
              draggable={false}
              className="size-[256px] object-cover grayscale-[15%]"
            />
          ))}
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
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

      <div className="absolute top-2 right-2 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => changeZoom(Math.min(MAX_ZOOM, zoom + 1))}
          disabled={zoom >= MAX_ZOOM}
          aria-label="Zoom in"
          className="grid size-7 place-items-center rounded-full bg-white/90 text-foreground shadow-sm backdrop-blur-sm transition-opacity disabled:opacity-40"
        >
          <PlusIcon className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => changeZoom(Math.max(MIN_ZOOM, zoom - 1))}
          disabled={zoom <= MIN_ZOOM}
          aria-label="Zoom out"
          className="grid size-7 place-items-center rounded-full bg-white/90 text-foreground shadow-sm backdrop-blur-sm transition-opacity disabled:opacity-40"
        >
          <MinusIcon className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

export { LocationPicker }
