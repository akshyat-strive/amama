"use client"

import * as React from "react"
import Map, { Layer, Marker, NavigationControl, Source, type MapRef, type StyleSpecification } from "react-map-gl/maplibre"
import { SproutIcon, TruckIcon, WarehouseIcon } from "lucide-react"
import "maplibre-gl/dist/maplibre-gl.css"
import "@/features/logistics/maplibre-setup"

import { cn } from "@/lib/utils"
import { getRoutes, pointAlong, ROUTING, type RouteOption } from "@/features/logistics/routing"

/** Light raster basemap (CARTO Positron) — plain images, so it needs no
 *  glyphs, sprites or vector decoding to show up. No key, no per-tile fees. */
export const MAP_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    basemap: {
      type: "raster",
      tiles: ["a", "b", "c", "d"].map((sub) => `https://${sub}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png`),
      tileSize: 256,
      maxzoom: 19,
      attribution: "© OpenStreetMap contributors © CARTO",
    },
  },
  layers: [{ id: "basemap", type: "raster", source: "basemap" }],
}

type Place = { name: string; detail: string; gps: [number, number] }

function boundsOf(points: [number, number][]): [[number, number], [number, number]] {
  const lngs = points.map((point) => point[0])
  const lats = points.map((point) => point[1])
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ]
}

/**
 * One leg on a real road map: the route the router recommends (green),
 * its alternatives (grey, pick one to compare), the farm and the
 * warehouse, and the truck placed by `progress`. "Live" is simulated —
 * the truck creeps forward on a timer; nothing is streamed yet.
 */
function RouteMap({ from, to, progress, className }: { from: Place; to: Place; progress: number; className?: string }) {
  const mapRef = React.useRef<MapRef>(null)
  const [routes, setRoutes] = React.useState<RouteOption[] | null>(null)
  const [chosen, setChosen] = React.useState(0)
  const [drift, setDrift] = React.useState(0)

  React.useEffect(() => {
    let cancelled = false
    void getRoutes(from.gps, to.gps).then((result) => {
      if (!cancelled) setRoutes(result)
    })
    return () => {
      cancelled = true
    }
  }, [from.gps, to.gps])

  // Simulated movement while in transit: a little further every few seconds.
  const moving = progress > 0 && progress < 1
  React.useEffect(() => {
    if (!moving) return
    const timer = window.setInterval(() => setDrift((value) => (value >= 0.12 ? 0 : value + 0.004)), 3000)
    return () => window.clearInterval(timer)
  }, [moving])

  const route = routes?.[chosen] ?? routes?.[0]
  const truck = route && moving ? pointAlong(route.coordinates, Math.min(0.98, progress + drift)) : null

  React.useEffect(() => {
    if (!route || !mapRef.current) return
    mapRef.current.fitBounds(boundsOf(route.coordinates), { padding: 56, duration: 600 })
  }, [route])

  const remainingKm = route ? Math.round(route.distanceKm * (1 - Math.min(1, progress + drift))) : null

  return (
    <div className={cn("grid gap-2 lg:grid-cols-[minmax(0,1fr)_260px]", className)}>
      <div className="relative h-[340px] overflow-hidden rounded-[16px] bg-card">
        <Map
          ref={mapRef}
          mapStyle={MAP_STYLE}
          initialViewState={{ longitude: (from.gps[1] + to.gps[1]) / 2, latitude: (from.gps[0] + to.gps[0]) / 2, zoom: 4.2 }}
          attributionControl={{ compact: true }}
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl position="top-right" showCompass={false} />
          {routes?.map((option, index) =>
            index === chosen ? null : (
              <Source key={option.id} id={option.id} type="geojson" data={{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: option.coordinates } }}>
                <Layer id={`${option.id}-line`} type="line" paint={{ "line-color": "#8e8e93", "line-width": 4, "line-opacity": 0.6, "line-dasharray": [2, 1.5] }} layout={{ "line-cap": "round" }} />
              </Source>
            )
          )}
          {route ? (
            <Source id="chosen" type="geojson" data={{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: route.coordinates } }}>
              <Layer id="chosen-casing" type="line" paint={{ "line-color": "#ffffff", "line-width": 8 }} layout={{ "line-cap": "round", "line-join": "round" }} />
              <Layer id="chosen-line" type="line" paint={{ "line-color": "#0b7a43", "line-width": 5 }} layout={{ "line-cap": "round", "line-join": "round" }} />
            </Source>
          ) : null}
          <Marker longitude={from.gps[1]} latitude={from.gps[0]} anchor="center">
            <span className="grid size-8 place-items-center rounded-full bg-sun text-sun-foreground ring-2 ring-white">
              <SproutIcon className="size-4" />
            </span>
          </Marker>
          <Marker longitude={to.gps[1]} latitude={to.gps[0]} anchor="center">
            <span className="grid size-9 place-items-center rounded-full bg-amama text-white ring-2 ring-white">
              <WarehouseIcon className="size-4" />
            </span>
          </Marker>
          {truck ? (
            <Marker longitude={truck[0]} latitude={truck[1]} anchor="center">
              <span className="grid size-8 place-items-center rounded-full bg-graphite text-lime ring-2 ring-white transition-transform">
                <TruckIcon className="size-4" />
              </span>
            </Marker>
          ) : null}
        </Map>
        {!routes ? <div className="absolute inset-0 grid place-items-center bg-card/60 text-[13px] text-muted-foreground">Finding the road route…</div> : null}
      </div>

      <div className="flex flex-col gap-2 rounded-[16px] bg-background p-3">
        <div className="flex gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-sun text-sun-foreground">
            <SproutIcon className="size-4" />
          </span>
          <span className="min-w-0 text-[13px]">
            <span className="block font-semibold">{from.name}</span>
            <span className="block text-muted-foreground">{from.detail}</span>
          </span>
        </div>
        <div className="flex gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-amama text-white">
            <WarehouseIcon className="size-4" />
          </span>
          <span className="min-w-0 text-[13px]">
            <span className="block font-semibold">{to.name}</span>
            <span className="block text-muted-foreground">{to.detail}</span>
          </span>
        </div>
        {moving && remainingKm !== null ? (
          <p className="rounded-xl bg-graphite px-3 py-2 text-[13px] text-white">
            <span className="text-lime">● Live</span> · {remainingKm.toLocaleString()} km to go
          </p>
        ) : null}
        <p className="mt-1 text-[12px] font-medium text-muted-foreground">Routes · {ROUTING.provider.toUpperCase()}</p>
        <div className="flex flex-col gap-1">
          {routes?.map((option, index) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setChosen(index)}
              className={cn(
                "flex items-center justify-between rounded-xl px-3 py-2 text-start text-[13px] transition-colors",
                index === chosen ? "bg-amama text-white" : "bg-card hover:bg-muted"
              )}
            >
              <span className="font-medium">{option.estimated ? "Estimated" : index === 0 ? "Fastest" : `Alternative ${index}`}</span>
              <span className="tabular-nums">
                {option.distanceKm.toLocaleString()} km · {option.durationH} h
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export { RouteMap }
