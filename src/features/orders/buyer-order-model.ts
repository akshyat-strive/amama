import * as W from "@/features/tradechain/demo-world"
import { cropImageUrl, crops } from "@/features/onboarding/steps"

/**
 * A trade, seen the way a buyer thinks about it: an order. The sixteen
 * internal stages collapse into five steps a buyer cares about, and the
 * physical chain — lots, containers, sailings — becomes shipments inside
 * the order, the way a marketplace order holds its parcels.
 */

type OrderStep = "confirmed" | "preparing" | "shipped" | "delivered" | "paid"

const ORDER_STEPS: { id: OrderStep; label: string }[] = [
  { id: "confirmed", label: "Confirmed" },
  { id: "preparing", label: "Preparing" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "paid", label: "Paid" },
]

/** Index into `ORDER_STEPS` of the step currently in progress; 5 when done. */
function orderStepIndex(trade: W.Trade): number {
  if (trade.status === "closed") return 5
  const stage = trade.currentStage
  if (stage === 1) return 0
  if (stage <= 13) return 1
  if (stage === 14) return 2
  if (stage === 15) return 3
  return 4
}

const day = (iso: string | null | undefined) =>
  iso ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso)) : "—"

type Headline = { text: string; tone: "ok" | "warn" | "crit" | "brand" | "muted"; detail: string }

/** The one line that answers "where is my order", Amazon-style. */
function orderHeadline(trade: W.Trade): Headline {
  const shipments = W.SHIPMENTS.filter((shipment) => shipment.tradeId === trade.id)
  const record = W.stageRecord(trade.id, trade.currentStage)
  const claim = W.claimsForTrade(trade.id).find((entry) => entry.status === "open" || entry.status === "under-review")
  if (claim) return { text: "Claim under review", tone: "crit", detail: `${claim.affectedMt} MT · ${claim.reason}` }
  if (trade.status === "closed") {
    const delivered = W.stageRecord(trade.id, 15)?.completedAt
    return { text: "Completed", tone: "muted", detail: delivered ? `Delivered ${day(delivered)}` : "Delivered and paid" }
  }
  if (trade.currentStage === 16) return { text: "Delivered", tone: "ok", detail: "Payment being settled" }
  if (trade.currentStage === 15) {
    return { text: "Delivered — please confirm", tone: "warn", detail: `Arrived ${day(record?.startedAt)} · sign the POD and confirm quality` }
  }
  if (trade.currentStage === 14) {
    const eta = shipments.map((shipment) => shipment.eta).sort().at(-1)
    return { text: `Arriving ${day(eta)}`, tone: "brand", detail: "On the water" }
  }
  if (trade.currentStage >= 9) {
    const etd = shipments.map((shipment) => shipment.etd).sort()[0]
    return {
      text: etd ? `Ships ${day(etd)}` : "Booking a sailing",
      tone: trade.status === "active" ? "brand" : "warn",
      detail: "Packed and cleared for export",
    }
  }
  if (trade.currentStage >= 3) return { text: "Preparing your order", tone: trade.status === "active" ? "brand" : "warn", detail: "Quality checks and packing at origin" }
  return { text: "Order confirmed", tone: "brand", detail: `Delivery window ${day(trade.deliveryWindow[0])} – ${day(trade.deliveryWindow[1])}` }
}

type OrderShipment = {
  id: string
  index: number
  total: number
  shipment: W.Shipment | null
  container: W.Container | undefined
  lots: W.Lot[]
}

/** The order's parcels. Before anything has shipped, the lots already
 *  packed sit in one group waiting to be loaded. */
function orderShipments(trade: W.Trade): OrderShipment[] {
  const shipments = W.SHIPMENTS.filter((shipment) => shipment.tradeId === trade.id)
  const lots = W.lotsForTrade(trade.id)
  if (shipments.length === 0) {
    return lots.length > 0 ? [{ id: `${trade.id}-unshipped`, index: 1, total: 1, shipment: null, container: undefined, lots }] : []
  }
  return shipments.map((shipment, index) => ({
    id: shipment.id,
    index: index + 1,
    total: shipments.length,
    shipment,
    container: W.CONTAINERS.find((container) => container.id === shipment.containerId),
    lots: shipment.lotIds ? lots.filter((lot) => shipment.lotIds?.includes(lot.id)) : lots,
  }))
}

/** A product photo from the onboarding crop catalog, matched by product
 *  or category — the trade book itself carries no imagery. */
const PHOTO_BY_PRODUCT: Record<string, string> = {
  apple: "apple",
  "black-tea": "tea",
  "green-tea": "tea",
  "arabica-coffee": "coffee",
  "robusta-coffee": "coffee",
  cashew: "cashew",
}
const PHOTO_BY_CATEGORY: Record<string, string> = {
  fruits: "fresh-fruit",
  vegetables: "vegetables",
  grains: "grains",
  spices: "spices",
  pulses: "pulses",
  "tea-coffee": "tea",
  "dry-fruits": "nuts",
  processed: "oils",
}

function orderPhoto(trade: W.Trade, width = 160): string {
  const product = W.productById(trade.productId)
  const cropId = PHOTO_BY_PRODUCT[trade.productId] ?? PHOTO_BY_CATEGORY[product?.categoryId ?? ""] ?? "grains"
  const crop = crops.find((entry) => entry.id === cropId) ?? crops[0]
  return cropImageUrl(crop.photo, width)
}

/** Documents a buyer actually receives or signs — the rest of the
 *  sixteen-stage paperwork is AMAMA's to manage. */
const BUYER_DOCUMENTS = [
  "Sales Contract",
  "Commercial Invoice",
  "Packing List (final)",
  "Certificate of Origin",
  "Phytosanitary Certificate",
  "Insurance Certificate",
  "Bill of Lading (final)",
  "Proof of Delivery (POD)",
]

const orderTotal = (trade: W.Trade) => trade.qtyContractedMt * trade.priceUsdPerMt

export { BUYER_DOCUMENTS, ORDER_STEPS, day, orderHeadline, orderPhoto, orderShipments, orderStepIndex, orderTotal }
export type { Headline, OrderShipment, OrderStep }
