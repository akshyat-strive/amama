import type { TradeStatus } from "@/features/dashboard/dashboard-ui"
import { countries } from "@/features/onboarding/countries"

/**
 * Stand-in trade data for the dashboard until a backend exists.
 *
 * It's derived from what the person actually answered during onboarding —
 * their crops, their country — rather than a fixed fixture, so the screen
 * reads as *their* account instead of a screenshot. Everything is a pure
 * function of that input: no `Math.random`, no `Date.now`, because a
 * server render and the hydration that follows have to agree.
 */

export type DemoOrder = {
  id: string
  crop: string
  variety: string
  tonnes: number
  grade: string
  counterparty: string
  destination: string
  status: TradeStatus
  gatesCleared: number
  etaDays: number
  lots: string[]
}

export const cropVarieties: Record<string, { variety: string; grade: string }> = {
  coffee: { variety: "Arabica Plantation A", grade: "Grade A+" },
  cocoa: { variety: "Forastero", grade: "Grade A" },
  cashew: { variety: "W-240", grade: "Grade A+" },
  sesame: { variety: "Natural White", grade: "Grade A" },
  spices: { variety: "Alleppey Turmeric", grade: "Grade A+" },
  tea: { variety: "Nilgiri Orthodox", grade: "Grade A" },
  grains: { variety: "Sona Masoori", grade: "Grade A" },
  pulses: { variety: "Toor Dal", grade: "Grade B" },
  "fresh-fruit": { variety: "Bhagwa Pomegranate", grade: "Grade A+" },
  "dried-fruit": { variety: "Anjeer", grade: "Grade A" },
  vegetables: { variety: "Nashik Red Onion", grade: "Grade B" },
  nuts: { variety: "Almond NP-24", grade: "Grade A" },
  cotton: { variety: "Shankar-6", grade: "Grade A" },
  sugar: { variety: "Jaggery Block", grade: "Grade A" },
  oils: { variety: "Cold-pressed Groundnut", grade: "Grade A" },
}

export const cropLabels: Record<string, string> = {
  coffee: "Coffee",
  cocoa: "Cocoa",
  cashew: "Cashew",
  sesame: "Sesame",
  spices: "Spices",
  tea: "Tea",
  grains: "Grains",
  pulses: "Pulses",
  "fresh-fruit": "Fresh fruit",
  "dried-fruit": "Dried fruit",
  vegetables: "Vegetables",
  nuts: "Tree nuts",
  cotton: "Cotton",
  sugar: "Sugar",
  oils: "Edible oils",
}

/** Ports the deck ships to, used when the counterparty's own country
 *  doesn't tell us anything (a seller exports to several at once). */
const exportMarkets = [
  { code: "DXB", port: "Jebel Ali, UAE", buyer: "Al Maha Fresh FZC" },
  { code: "AMS", port: "Rotterdam, NL", buyer: "Vanderveen Produce BV" },
  { code: "SIN", port: "Singapore", buyer: "Sembawang Fruits Pte" },
  { code: "JED", port: "Jeddah, KSA", buyer: "Reef Al Sharq Co." },
  { code: "LGP", port: "Colombo, LK", buyer: "Ceylon Agri Imports" },
]

const statusCycle: TradeStatus[] = ["on-track", "watch", "on-track", "critical", "on-track"]
const gateCycle = [3, 2, 4, 1, 5]
const etaCycle = [9, 7, 11, 16, 21]
const tonnesCycle = [20, 16, 24, 9, 27]

function code(crop: string) {
  return crop.replace("-", "").slice(0, 3).toUpperCase()
}

export const TOTAL_GATES = 5

export function buildOrderBook({
  crops,
  country,
  role,
  counterparty,
}: {
  crops: readonly string[]
  country: string
  role: "buyer" | "seller"
  counterparty: string
}): DemoOrder[] {
  const picked = (crops.length > 0 ? crops : ["fresh-fruit", "spices", "cashew"]).slice(0, 5)
  const home = countries.find((entry) => entry.code === country)

  return picked.map((crop, index) => {
    const market = exportMarkets[index % exportMarkets.length]
    const detail = cropVarieties[crop] ?? { variety: "Standard", grade: "Grade A" }
    // A buyer's shipments all land in the buyer's own country; a seller's
    // fan out across the export markets they sell into.
    const destination =
      role === "buyer" && home ? `${home.name}` : market.port
    const partner = role === "buyer" ? counterparty : market.buyer

    return {
      id: `EXP-${market.code}-${code(crop)}-2026-${String(87 + index * 2).padStart(4, "0")}`,
      crop: cropLabels[crop] ?? crop,
      variety: detail.variety,
      grade: detail.grade,
      tonnes: tonnesCycle[index % tonnesCycle.length],
      counterparty: partner,
      destination,
      status: statusCycle[index % statusCycle.length],
      gatesCleared: gateCycle[index % gateCycle.length],
      etaDays: etaCycle[index % etaCycle.length],
      lots: [
        `AMAMA-${code(crop)}-MH-2026-${String(127 + index * 4).padStart(6, "0")}`,
      ],
    }
  })
}

const seasonMonths = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"]
// A season ramps up, it doesn't jump straight to full volume — these are
// the fraction of the final total each month represents, not a random
// walk, so the chart is identical on every render of the same order book.
const rampShape = [0.22, 0.38, 0.55, 0.7, 0.85, 1]

export type VolumePoint = { month: string; volume: number }

/** A deterministic season-to-date volume curve, scaled to the order book's
 *  actual total tonnage — no `Math.random`, so server and client render
 *  the same chart on the same data. */
export function buildVolumeSeries(orders: DemoOrder[]): VolumePoint[] {
  const total = orders.reduce((sum, order) => sum + order.tonnes, 0)
  return seasonMonths.map((month, index) => ({
    month,
    volume: Math.round(total * rampShape[index]),
  }))
}

export type StatusBreakdown = { status: TradeStatus; count: number }

export function buildStatusBreakdown(orders: DemoOrder[]): StatusBreakdown[] {
  const counts: Record<TradeStatus, number> = { "on-track": 0, watch: 0, critical: 0 }
  for (const order of orders) counts[order.status] += 1
  return (Object.keys(counts) as TradeStatus[])
    .map((status) => ({ status, count: counts[status] }))
    .filter((entry) => entry.count > 0)
}

const vesselCycle = [
  "MSC Aurora",
  "Maersk Cape Coral",
  "CMA CGM Dutch Mate",
  "ONE Harbour",
  "COSCO Fortune",
]

export type DemoShipment = DemoOrder & {
  vessel: string
  containers: number
  incoterm: string
}

/** The same order book, reframed around the physical move rather than the
 *  commercial one — which vessel, how many boxes, whose Incoterm — since
 *  that's what the shipments view is actually for. */
export function buildShipments(orders: DemoOrder[]): DemoShipment[] {
  const incoterms = ["FOB", "CIF", "CFR", "EXW", "DAP"]
  return orders.map((order, index) => ({
    ...order,
    vessel: vesselCycle[index % vesselCycle.length],
    containers: Math.max(1, Math.ceil(order.tonnes / 20)),
    incoterm: incoterms[index % incoterms.length],
  }))
}

export type PaymentStatus = "paid" | "processing" | "pending"

export type DemoPayment = {
  orderId: string
  counterparty: string
  amountUsd: number
  status: PaymentStatus
  crop: string
}

// A rough, deterministic per-tonne rate by crop so amounts feel like they
// belong to the commodity rather than being uniformly scaled.
const rateUsdPerTonne: Record<string, number> = {
  coffee: 4200,
  cocoa: 2600,
  cashew: 5400,
  sesame: 1500,
  spices: 3200,
  tea: 2900,
  grains: 320,
  pulses: 900,
  "fresh-fruit": 800,
  "dried-fruit": 3400,
  vegetables: 400,
  nuts: 6200,
  cotton: 1700,
  sugar: 480,
  oils: 1100,
}

const paymentStatusCycle: PaymentStatus[] = ["paid", "processing", "pending", "paid", "paid"]

export function buildPayments(orders: DemoOrder[]): DemoPayment[] {
  return orders.map((order, index) => {
    const cropId = Object.keys(cropLabels).find((id) => cropLabels[id] === order.crop)
    const rate = (cropId && rateUsdPerTonne[cropId]) || 1000
    return {
      orderId: order.id,
      counterparty: order.counterparty,
      amountUsd: Math.round(order.tonnes * rate),
      status: paymentStatusCycle[index % paymentStatusCycle.length],
      crop: order.crop,
    }
  })
}

export type DemoMessage = { from: "them" | "me"; text: string }
export type DemoThread = {
  id: string
  name: string
  role: "kam" | "counterparty"
  preview: string
  messages: DemoMessage[]
}

/** Every account gets a KAM thread — that relationship starts at
 *  onboarding review and doesn't end once it's approved. */
export function buildMessageThreads(
  role: "buyer" | "seller",
  counterpartyName: string = role === "buyer" ? "Your grower" : "Your buyer"
): DemoThread[] {
  return [
    {
      id: "kam",
      name: "Priya Nair — Key Account Manager",
      role: "kam",
      preview: "Happy to help with anything on your account — just ask.",
      messages: [
        {
          from: "them",
          text:
            role === "buyer"
              ? "Welcome aboard! I'm your account manager for anything from documents to order questions."
              : "Welcome aboard! I'm your account manager — reach out any time you need a hand with an order or a document.",
        },
        { from: "them", text: "Happy to help with anything on your account — just ask." },
      ],
    },
    {
      id: "counterparty",
      name: counterpartyName,
      role: "counterparty",
      preview:
        role === "buyer"
          ? "Confirming the grade and dispatch window for your next order."
          : "Confirming the grade and delivery window for the next order.",
      messages: [
        {
          from: "them",
          text:
            role === "buyer"
              ? "Confirming Grade A+ on the next lot — dispatch window looks good for the 18th."
              : "Confirming Grade A+ works for us — can you dispatch by the 18th?",
        },
      ],
    },
  ]
}

export type TraceEntry = { stage: string; detail: string; done: boolean }

/** The lot record behind the QR on a carton — the full chain from the
 *  farmer to the destination, which is the trust mechanism the whole
 *  platform is built to produce. */
export function buildLotTrace(order: DemoOrder, growerName: string): TraceEntry[] {
  const cleared = order.gatesCleared
  return [
    {
      stage: "Farmer",
      detail: `${growerName} · F-001 · Dindori, Nashik, Maharashtra`,
      done: true,
    },
    {
      stage: "Harvest",
      detail: "10 September 2026 · hand-picked, morning window",
      done: true,
    },
    {
      stage: "Field QC",
      detail: `${order.grade} · 9/9 parameters cleared · 4 sample photos on file`,
      done: cleared >= 1,
    },
    {
      stage: "Collection",
      detail: "Dindori centre · weighbridge slip #WB-40218 · e-way bill raised",
      done: cleared >= 1,
    },
    {
      stage: "Transit",
      detail: "Reefer MH-15-EK-8842 · 5.2–5.6 °C held · door sealed, 0 openings",
      done: cleared >= 2,
    },
    {
      stage: "Hub intake",
      detail: "Mumbai hub · dock QC cleared · pre-cooled to core 5 °C in 6 h 40 m",
      done: cleared >= 2,
    },
    {
      stage: "Storage",
      detail: "CR-01 · 5 °C / 92% RH · 148 pallets · 31 h dwell",
      done: cleared >= 3,
    },
    {
      stage: "Export QC",
      detail: "Residue panel cleared · pre-shipment inspection certificate issued",
      done: cleared >= 3,
    },
    {
      stage: "Container",
      detail: "2 × 40'RH · PTI passed · set point 5 °C · logger armed",
      done: cleared >= 4,
    },
    {
      stage: "Vessel",
      detail: "MSC Aurora 2609E · ex JNPA",
      done: cleared >= 5,
    },
    {
      stage: "Destination",
      detail: `${order.destination} · ${order.counterparty}`,
      done: cleared >= 5,
    },
  ]
}
