"use client"

import * as React from "react"
import Map, { Layer, Marker, NavigationControl, Source, type MapRef } from "react-map-gl/maplibre"
import { TruckIcon, WarehouseIcon } from "lucide-react"
import "maplibre-gl/dist/maplibre-gl.css"
import "@/features/logistics/maplibre-setup"

import { getRoutes, pointAlong, type RouteOption } from "@/features/logistics/routing"
import { MAP_STYLE } from "@/features/logistics/route-map"

export type FleetTruck = { id: string; label: string; detail: string; from: [number, number]; progress: number }

/**
 * Every truck heading into a warehouse at once — route lines in one
 * GeoJSON layer and a marker per truck, all on the GPU, so it stays smooth
 * with hundreds. Positions are simulated from each lot's ETA; nothing is
 * streamed yet.
 */
function FleetMap({ warehouse, trucks }: { warehouse: { name: string; gps: [number, number] }; trucks: FleetTruck[] }) {
  const [routes, setRoutes] = React.useState<Record<string, RouteOption>>({})
  const [selected, setSelected] = React.useState<string | null>(null)
  const [tick, setTick] = React.useState(0)
  const mapRef = React.useRef<MapRef>(null)

  // Frame every route and the warehouse once the routes are in.
  React.useEffect(() => {
    const points = [...Object.values(routes).flatMap((route) => route.coordinates), [warehouse.gps[1], warehouse.gps[0]] as [number, number]]
    if (points.length < 2 || !mapRef.current) return
    const lngs = points.map((point) => point[0])
    const lats = points.map((point) => point[1])
    mapRef.current.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 48, duration: 600 })
  }, [routes, warehouse.gps])

  React.useEffect(() => {
    let cancelled = false
    const origins = Object.values(Object.fromEntries(trucks.map((truck) => [truck.from.join(","), truck.from])))
    void Promise.all(origins.map((from) => getRoutes(from, warehouse.gps).then((result) => [from.join(","), result[0]] as const))).then((entries) => {
      if (!cancelled) setRoutes(Object.fromEntries(entries))
    })
    return () => {
      cancelled = true
    }
  }, [trucks, warehouse.gps])

  React.useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => (value + 1) % 30), 3000)
    return () => window.clearInterval(timer)
  }, [])

  const lines = {
    type: "FeatureCollection" as const,
    features: Object.values(routes).map((route) => ({ type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: route.coordinates } })),
  }
  const active = trucks.find((truck) => truck.id === selected)

  return (
    <div className="relative h-[380px] overflow-hidden rounded-[16px] bg-card">
      <Map ref={mapRef} mapStyle={MAP_STYLE} initialViewState={{ longitude: 77.5, latitude: 22.5, zoom: 3.9 }} attributionControl={{ compact: true }} style={{ width: "100%", height: "100%" }}>
        <NavigationControl position="top-right" showCompass={false} />
        <Source id="fleet-routes" type="geojson" data={lines}>
          <Layer id="fleet-routes-line" type="line" paint={{ "line-color": "#0b7a43", "line-width": 2.5, "line-opacity": 0.45 }} layout={{ "line-cap": "round", "line-join": "round" }} />
        </Source>
        <Marker longitude={warehouse.gps[1]} latitude={warehouse.gps[0]} anchor="center">
          <span className="grid size-10 place-items-center rounded-full bg-amama text-white ring-2 ring-white" title={warehouse.name}>
            <WarehouseIcon className="size-5" />
          </span>
        </Marker>
        {trucks.map((truck) => {
          const route = routes[truck.from.join(",")]
          if (!route) return null
          const [lng, lat] = pointAlong(route.coordinates, Math.min(0.97, truck.progress + tick * 0.003))
          return (
            <Marker key={truck.id} longitude={lng} latitude={lat} anchor="center" onClick={(event) => (event.originalEvent.stopPropagation(), setSelected(truck.id))}>
              <button type="button" aria-label={truck.label} className="grid size-7 place-items-center rounded-full bg-graphite text-lime ring-2 ring-white">
                <TruckIcon className="size-3.5" />
              </button>
            </Marker>
          )
        })}
      </Map>
      {active ? (
        <div className="absolute start-3 bottom-3 max-w-[260px] rounded-xl bg-background/95 px-3 py-2 text-[12.5px] backdrop-blur">
          <p className="font-semibold">{active.label}</p>
          <p className="text-muted-foreground">{active.detail}</p>
        </div>
      ) : null}
      <span className="absolute start-3 top-3 rounded-lg bg-graphite px-2.5 py-1 text-[12px] font-medium text-white">
        <span className="text-lime">●</span> {trucks.length} trucks inbound
      </span>
    </div>
  )
}

export { FleetMap }
