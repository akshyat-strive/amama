"use client"

/**
 * Road routing without per-request fees: OSRM (Open Source Routing
 * Machine) by default, Valhalla as the alternative — both open source and
 * self-hostable. The demo uses their public servers; production points
 * `ROUTING` at our own instance.
 *
 * Coordinates are [lat, lng] in, GeoJSON [lng, lat] out.
 */

export type RouteOption = {
  id: string
  /** Road distance in km. */
  distanceKm: number
  /** Drive time in hours. */
  durationH: number
  /** GeoJSON LineString coordinates, [lng, lat]. */
  coordinates: [number, number][]
  /** True when no router answered and this is an estimated line. */
  estimated: boolean
}

type Provider = "osrm" | "valhalla"

const ROUTING: { provider: Provider; osrm: string; valhalla: string } = {
  provider: "osrm",
  osrm: "https://router.project-osrm.org",
  valhalla: "https://valhalla1.openstreetmap.de",
}

const cache = new Map<string, Promise<RouteOption[]>>()

async function fromOsrm(from: [number, number], to: [number, number]): Promise<RouteOption[]> {
  const url = `${ROUTING.osrm}/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?alternatives=3&overview=full&geometries=geojson`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`OSRM ${response.status}`)
  const data = (await response.json()) as { routes: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[] }
  return data.routes.map((route, index) => ({
    id: `osrm-${index}`,
    distanceKm: Math.round(route.distance / 1000),
    durationH: Math.round((route.duration / 3600) * 10) / 10,
    coordinates: route.geometry.coordinates,
    estimated: false,
  }))
}

/** Valhalla returns an encoded polyline (precision 6). */
function decodePolyline6(encoded: string): [number, number][] {
  const points: [number, number][] = []
  let index = 0
  let lat = 0
  let lng = 0
  while (index < encoded.length) {
    for (const axis of [0, 1]) {
      let result = 0
      let shift = 0
      let byte: number
      do {
        byte = encoded.charCodeAt(index++) - 63
        result |= (byte & 0x1f) << shift
        shift += 5
      } while (byte >= 0x20)
      const delta = result & 1 ? ~(result >> 1) : result >> 1
      if (axis === 0) lat += delta
      else lng += delta
    }
    points.push([lng / 1e6, lat / 1e6])
  }
  return points
}

async function fromValhalla(from: [number, number], to: [number, number]): Promise<RouteOption[]> {
  const body = { locations: [{ lat: from[0], lon: from[1] }, { lat: to[0], lon: to[1] }], costing: "truck", alternates: 2 }
  const response = await fetch(`${ROUTING.valhalla}/route?json=${encodeURIComponent(JSON.stringify(body))}`)
  if (!response.ok) throw new Error(`Valhalla ${response.status}`)
  type Trip = { summary: { length: number; time: number }; legs: { shape: string }[] }
  const data = (await response.json()) as { trip: Trip; alternates?: { trip: Trip }[] }
  return [data.trip, ...(data.alternates ?? []).map((alternate) => alternate.trip)].map((trip, index) => ({
    id: `valhalla-${index}`,
    distanceKm: Math.round(trip.summary.length),
    durationH: Math.round((trip.summary.time / 3600) * 10) / 10,
    coordinates: trip.legs.flatMap((leg) => decodePolyline6(leg.shape)),
    estimated: false,
  }))
}

/** A curved line with a road-ish distance — shown when no router answers
 *  (offline demo), clearly marked as estimated. */
function estimate(from: [number, number], to: [number, number]): RouteOption[] {
  const rad = (degrees: number) => (degrees * Math.PI) / 180
  const a = Math.sin(rad(to[0] - from[0]) / 2) ** 2 + Math.cos(rad(from[0])) * Math.cos(rad(to[0])) * Math.sin(rad(to[1] - from[1]) / 2) ** 2
  const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.25
  const mid: [number, number] = [(from[0] + to[0]) / 2 + (to[1] - from[1]) * 0.12, (from[1] + to[1]) / 2 - (to[0] - from[0]) * 0.12]
  const coordinates = Array.from({ length: 48 }, (_, step) => {
    const t = step / 47
    const lat = (1 - t) ** 2 * from[0] + 2 * (1 - t) * t * mid[0] + t ** 2 * to[0]
    const lng = (1 - t) ** 2 * from[1] + 2 * (1 - t) * t * mid[1] + t ** 2 * to[1]
    return [lng, lat] as [number, number]
  })
  return [{ id: "estimate", distanceKm: Math.round(km), durationH: Math.round((km / 45) * 10) / 10, coordinates, estimated: true }]
}

/** Routes from → to, best first, with alternatives when the router has
 *  them. Results are cached per pair for the session. */
function getRoutes(from: [number, number], to: [number, number]): Promise<RouteOption[]> {
  const key = `${ROUTING.provider}:${from.join(",")}>${to.join(",")}`
  let pending = cache.get(key)
  if (!pending) {
    pending = (ROUTING.provider === "osrm" ? fromOsrm(from, to) : fromValhalla(from, to)).then((routes) => (routes.length ? routes : estimate(from, to))).catch(() => estimate(from, to))
    cache.set(key, pending)
  }
  return pending
}

/** The point `t` (0–1) of the way along a line, by distance. */
function pointAlong(coordinates: [number, number][], t: number): [number, number] {
  if (coordinates.length < 2) return coordinates[0] ?? [0, 0]
  const segments = coordinates.slice(1).map((point, index) => Math.hypot(point[0] - coordinates[index][0], point[1] - coordinates[index][1]))
  const total = segments.reduce((sum, length) => sum + length, 0)
  let remaining = Math.min(1, Math.max(0, t)) * total
  for (let index = 0; index < segments.length; index++) {
    if (remaining <= segments[index]) {
      const ratio = segments[index] === 0 ? 0 : remaining / segments[index]
      const [x1, y1] = coordinates[index]
      const [x2, y2] = coordinates[index + 1]
      return [x1 + (x2 - x1) * ratio, y1 + (y2 - y1) * ratio]
    }
    remaining -= segments[index]
  }
  return coordinates[coordinates.length - 1]
}

export { getRoutes, pointAlong, ROUTING }
