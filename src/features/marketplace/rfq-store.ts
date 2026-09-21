"use client"

import * as React from "react"

import { categoryForCropId } from "@/features/marketplace/catalog"
import {
  conversationId,
  logSystemMessageForConversation,
  postCard,
  startConversation,
  type Conversation,
} from "@/features/marketplace/conversation-store"
import { conversationIsAgreed, proposeDeal, confirmDeal, type Deal } from "@/features/marketplace/deal-store"

const STORAGE_KEY = "amama.marketplace.rfqs"

export type RfqStatus = "open" | "closed" | "cancelled"
export type QuoteStatus = "submitted" | "withdrawn" | "accepted" | "not-selected"

/** The structured brief a buyer fills in once they're ready to formalize a
 *  demand — the standard agro-export RFQ checklist (product, packaging,
 *  logistics, timing, quantity, payment) rather than a free-text ask. Every
 *  field is optional except the ones that make the RFQ legible at all
 *  (enforced in the dialog, not here) — a buyer filling this in from a
 *  mobile screen shouldn't be blocked by a field they don't have an answer
 *  for yet. */
export type RfqSpec = {
  variety: string | null
  grade: string | null
  packaging: string | null
  unitsPerCarton: number | null
  containerType: string | null
  destinationPort: string | null
  incoterm: string | null
  shippingWindowFrom: string | null
  shippingWindowTo: string | null
  splitShipment: boolean
  quantityMt: number | null
  monthlyVolumeMt: number | null
  paymentTermPreference: string | null
  notes: string | null
}

/** One seller this RFQ was sent to — carries the conversation it rode in
 *  on, so a quote or a "closed" notice always has somewhere to post. */
export type RfqTargetSeller = {
  sellerId: string
  sellerName: string
  listingId: string
  listingTitle: string
  conversationId: string
}

/**
 * A seller's formal response — a real offer with its own validity window,
 * not a chat reply. Comparable side-by-side with every other seller's quote
 * on the same RFQ, which is the entire point of publishing to several
 * sellers at once instead of negotiating with one.
 */
export type RfqQuote = {
  id: string
  rfqId: string
  sellerId: string
  sellerName: string
  pricePerTonneUsd: number
  quantityMt: number
  incoterm: string | null
  deliveryWindow: string | null
  paymentTerm: string | null
  validUntil: string | null
  note: string | null
  status: QuoteStatus
  createdAt: string
  updatedAt: string
}

export type Rfq = {
  id: string
  buyerId: string
  buyerName: string
  productCategory: string
  title: string
  spec: RfqSpec
  sellers: RfqTargetSeller[]
  quotes: RfqQuote[]
  status: RfqStatus
  /** Set by a KAM once the demand behind this RFQ has been confirmed as
   *  real — see `conversationNeedsKam` and `confirmDemand`. */
  demandConfirmed: boolean
  demandConfirmedBy: string | null
  demandConfirmedAt: string | null
  cancelledAt: string | null
  cancelledBy: string | null
  createdAt: string
  updatedAt: string
}

let snapshot: Rfq[] = []
let restored = false
const listeners = new Set<() => void>()
const emptyRfqs: Rfq[] = []

function restoreOnce() {
  if (restored || typeof window === "undefined") return
  restored = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) snapshot = JSON.parse(raw) as Rfq[]
  } catch {
    // Private mode or blocked storage — carry on with nothing published yet.
  }
}

function subscribe(listener: () => void) {
  restoreOnce()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  restoreOnce()
  return snapshot
}

function getServerSnapshot() {
  return emptyRfqs
}

function write(next: Rfq[]) {
  snapshot = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Persistence is best-effort.
  }
  listeners.forEach((listener) => listener())
}

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function useRfqs(): Rfq[] {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * Fixed demo RFQs — hand-authored, not produced via `createRfq`/`submitQuote`,
 * the same convention as `SEED_DEALS` (`deal-store.ts`) and `SEED_CONTRACTS`
 * (`contract-store.ts`). Reuses the same buyer/seller cast and listings as
 * `admin/seed-data.ts` so this reads as one continuous demo world rather than
 * a disconnected set of names, and covers the spread of states the buyer's
 * comparison view and the seller's own inbox actually need to render:
 *
 * - `rfq-1` — just published, no seller has responded yet.
 * - `rfq-2` — two quotes in at different prices, nobody's looked at it yet
 *   (`demandConfirmed: false`).
 * - `rfq-3` — three quotes, one of them withdrawn after the fact.
 * - `rfq-4` — closed and awarded: one `accepted`, the rest `not-selected`.
 * - `rfq-5` — cancelled before every invited seller even responded.
 * - `rfq-6` — a quote whose validity window has already lapsed, sitting
 *   alongside a still-current one.
 * - `rfq-7` — three genuinely different offers (price, quantity, incoterm,
 *   and payment term all vary) for a real "which is best" comparison.
 */
const SEED_RFQS: Rfq[] = [
  // 1. Open, zero quotes — just published.
  {
    id: "rfq-1",
    buyerId: "orders@northstaragro.example",
    buyerName: "Northstar Agro",
    productCategory: "cashew",
    title: "40 MT W-240/W-180 cashew kernels for European retail packs",
    spec: {
      variety: "W-240 or W-180",
      grade: "Grade A+",
      packaging: "25lb vacuum tins",
      unitsPerCarton: 20,
      containerType: "20ft dry container",
      destinationPort: "Rotterdam, Netherlands",
      incoterm: "CIF",
      shippingWindowFrom: "2026-10-15",
      shippingWindowTo: "2026-11-15",
      splitShipment: false,
      quantityMt: 40,
      monthlyVolumeMt: 40,
      paymentTermPreference: "30% advance, 70% on BL",
      notes: "First order with either of you — want aflatoxin test certificates included with the lot.",
    },
    sellers: [
      {
        sellerId: "seed-kerala-cashew",
        sellerName: "Kerala Cashew Traders",
        listingId: "seed-3",
        listingTitle: "W-240 Cashew Kernels — Grade A+",
        conversationId: conversationId("orders@northstaragro.example", "seed-kerala-cashew", "seed-3"),
      },
      {
        sellerId: "seed-w180-cashew",
        sellerName: "Kollam W-180 Cashew Exporters",
        listingId: "seed-28",
        listingTitle: "W-180 Jumbo Cashew Kernels — Grade A+",
        conversationId: conversationId("orders@northstaragro.example", "seed-w180-cashew", "seed-28"),
      },
    ],
    quotes: [],
    status: "open",
    demandConfirmed: false,
    demandConfirmedBy: null,
    demandConfirmedAt: null,
    cancelledAt: null,
    cancelledBy: null,
    createdAt: "2026-09-17T09:30:00.000Z",
    updatedAt: "2026-09-17T09:30:00.000Z",
  },
  // 2. Open, two quotes at different prices — nobody's looked at it yet.
  {
    id: "rfq-2",
    buyerId: "sourcing@everestfoodstuffs.example",
    buyerName: "Everest Foodstuffs",
    productCategory: "grains",
    title: "50 MT jasmine or Sona Masoori rice, CIF Rotterdam",
    spec: {
      variety: "Jasmine or Sona Masoori",
      grade: "Grade A",
      packaging: "25kg PP bags",
      unitsPerCarton: null,
      containerType: "20ft dry container",
      destinationPort: "Rotterdam, Netherlands",
      incoterm: "CIF",
      shippingWindowFrom: "2026-10-01",
      shippingWindowTo: "2026-11-30",
      splitShipment: true,
      quantityMt: 50,
      monthlyVolumeMt: 50,
      paymentTermPreference: "30% advance, 70% on BL",
      notes: "Recurring monthly program if this first lot lands well.",
    },
    sellers: [
      {
        sellerId: "seed-mekong-grain",
        sellerName: "Mekong Grain Traders",
        listingId: "seed-4",
        listingTitle: "Jasmine Rice — Grade A",
        conversationId: conversationId("sourcing@everestfoodstuffs.example", "seed-mekong-grain", "seed-4"),
      },
      {
        sellerId: "seed-sona-masoori",
        sellerName: "Andhra Sona Masoori Rice Mills",
        listingId: "seed-25",
        listingTitle: "Sona Masoori Rice — Grade A",
        conversationId: conversationId("sourcing@everestfoodstuffs.example", "seed-sona-masoori", "seed-25"),
      },
    ],
    quotes: [
      {
        id: "quote-rfq2-1",
        rfqId: "rfq-2",
        sellerId: "seed-mekong-grain",
        sellerName: "Mekong Grain Traders",
        pricePerTonneUsd: 340,
        quantityMt: 50,
        incoterm: "FOB",
        deliveryWindow: "Oct 2026",
        paymentTerm: "30% advance, 70% on BL",
        validUntil: "2026-10-15",
        note: "Can also do PP bag packing at no extra cost.",
        status: "submitted",
        createdAt: "2026-09-09T08:00:00.000Z",
        updatedAt: "2026-09-09T08:00:00.000Z",
      },
      {
        id: "quote-rfq2-2",
        rfqId: "rfq-2",
        sellerId: "seed-sona-masoori",
        sellerName: "Andhra Sona Masoori Rice Mills",
        pricePerTonneUsd: 500,
        quantityMt: 45,
        incoterm: "CIF",
        deliveryWindow: "Nov 2026",
        paymentTerm: "50% advance, 50% on delivery",
        validUntil: "2026-10-20",
        note: null,
        status: "submitted",
        createdAt: "2026-09-10T15:00:00.000Z",
        updatedAt: "2026-09-10T15:00:00.000Z",
      },
    ],
    status: "open",
    demandConfirmed: false,
    demandConfirmedBy: null,
    demandConfirmedAt: null,
    cancelledAt: null,
    cancelledBy: null,
    createdAt: "2026-09-08T10:00:00.000Z",
    updatedAt: "2026-09-10T15:00:00.000Z",
  },
  // 3. Open, three quotes — one of them withdrawn after the fact.
  {
    id: "rfq-3",
    buyerId: "hello@pacificrimtraders.example",
    buyerName: "Pacific Rim Traders",
    productCategory: "spices",
    title: "14 MT festive-season whole spices — cinnamon, pepper or turmeric",
    spec: {
      variety: null,
      grade: "Grade A+",
      packaging: "25kg export cartons",
      unitsPerCarton: null,
      containerType: "20ft dry container",
      destinationPort: "Port of Vancouver, Canada",
      incoterm: "CIF",
      shippingWindowFrom: "2026-11-01",
      shippingWindowTo: "2026-11-30",
      splitShipment: false,
      quantityMt: 14,
      monthlyVolumeMt: null,
      paymentTermPreference: "30% advance, 70% on BL",
      notes:
        "Open to cinnamon, pepper, or turmeric depending on price and lead time. Need phytosanitary and fumigation certificates either way.",
    },
    sellers: [
      {
        sellerId: "seed-ceylon-spice",
        sellerName: "Ceylon Spice Gardens",
        listingId: "seed-6",
        listingTitle: "Alba Cinnamon Quills — Grade A+",
        conversationId: conversationId("hello@pacificrimtraders.example", "seed-ceylon-spice", "seed-6"),
      },
      {
        sellerId: "seller@amama.in",
        sellerName: "Ravi Kumar",
        listingId: "demo-pepper-1",
        listingTitle: "Malabar Black Pepper — Grade A+",
        conversationId: conversationId("hello@pacificrimtraders.example", "seller@amama.in", "demo-pepper-1"),
      },
      {
        sellerId: "seed-alleppey-turmeric",
        sellerName: "Alleppey Turmeric Cooperative",
        listingId: "seed-22",
        listingTitle: "Alleppey Finger Turmeric — Grade A+",
        conversationId: conversationId("hello@pacificrimtraders.example", "seed-alleppey-turmeric", "seed-22"),
      },
    ],
    quotes: [
      {
        id: "quote-rfq3-1",
        rfqId: "rfq-3",
        sellerId: "seed-ceylon-spice",
        sellerName: "Ceylon Spice Gardens",
        pricePerTonneUsd: 3350,
        quantityMt: 14,
        incoterm: "CIF",
        deliveryWindow: "Nov 2026",
        paymentTerm: "30% advance, 70% on BL",
        validUntil: "2026-10-25",
        note: "Can ship Alba-grade quills, moisture-sealed for the transpacific route.",
        status: "submitted",
        createdAt: "2026-08-31T11:00:00.000Z",
        updatedAt: "2026-08-31T11:00:00.000Z",
      },
      {
        id: "quote-rfq3-2",
        rfqId: "rfq-3",
        sellerId: "seller@amama.in",
        sellerName: "Ravi Kumar",
        pricePerTonneUsd: 9200,
        quantityMt: 4,
        incoterm: "FOB",
        deliveryWindow: "Nov 2026",
        paymentTerm: "50% advance, 50% on BL",
        validUntil: "2026-10-15",
        note: "Pulled this back — committed our current pepper stock to a domestic order, can revisit next lot in December.",
        status: "withdrawn",
        createdAt: "2026-09-01T09:00:00.000Z",
        updatedAt: "2026-09-05T14:00:00.000Z",
      },
      {
        id: "quote-rfq3-3",
        rfqId: "rfq-3",
        sellerId: "seed-alleppey-turmeric",
        sellerName: "Alleppey Turmeric Cooperative",
        pricePerTonneUsd: 2250,
        quantityMt: 14,
        incoterm: "CIF",
        deliveryWindow: "Nov 2026",
        paymentTerm: "50% advance, 50% on BL",
        validUntil: "2026-10-30",
        note: null,
        status: "submitted",
        createdAt: "2026-09-03T10:00:00.000Z",
        updatedAt: "2026-09-03T10:00:00.000Z",
      },
    ],
    status: "open",
    demandConfirmed: true,
    demandConfirmedBy: "Priya Nair",
    demandConfirmedAt: "2026-09-02T09:00:00.000Z",
    cancelledAt: null,
    cancelledBy: null,
    createdAt: "2026-08-30T09:00:00.000Z",
    updatedAt: "2026-09-05T14:00:00.000Z",
  },
  // 4. Closed and awarded — one quote accepted, the rest not-selected.
  {
    id: "rfq-4",
    buyerId: "info@coastalimport.example",
    buyerName: "Coastal Import Co",
    productCategory: "apple",
    title: "25 MT export apples — Grade A+, CA storage required",
    spec: {
      variety: "Grade A+ export apples",
      grade: "Grade A+",
      packaging: "18–20kg cartons",
      unitsPerCarton: null,
      containerType: "Reefer container",
      destinationPort: "Jebel Ali, UAE",
      incoterm: "FOB",
      shippingWindowFrom: "2026-10-05",
      shippingWindowTo: "2026-10-25",
      splitShipment: false,
      quantityMt: 25,
      monthlyVolumeMt: null,
      paymentTermPreference: "50% advance, 50% on BL",
      notes: "Needs a CA-storage history — will ask for cold-chain logs before the final PO.",
    },
    sellers: [
      {
        sellerId: "kashmir@amama.in",
        sellerName: "Kashmir Valley Growers",
        listingId: "seed-9",
        listingTitle: "Kashmiri Apple — Grade A+",
        conversationId: conversationId("info@coastalimport.example", "kashmir@amama.in", "seed-9"),
      },
      {
        sellerId: "seed-shimla-orchards",
        sellerName: "Shimla Hills Orchards Cooperative",
        listingId: "seed-10",
        listingTitle: "Shimla Royal Gala Apple — Grade A",
        conversationId: conversationId("info@coastalimport.example", "seed-shimla-orchards", "seed-10"),
      },
      {
        sellerId: "seed-kinnaur-greens",
        sellerName: "Kinnaur Green Orchards",
        listingId: "seed-11",
        listingTitle: "Kinnaur Green Apple — Grade A",
        conversationId: conversationId("info@coastalimport.example", "seed-kinnaur-greens", "seed-11"),
      },
    ],
    quotes: [
      {
        id: "quote-rfq4-1",
        rfqId: "rfq-4",
        sellerId: "kashmir@amama.in",
        sellerName: "Kashmir Valley Growers",
        pricePerTonneUsd: 1010,
        quantityMt: 25,
        incoterm: "FOB",
        deliveryWindow: "Oct 2026",
        paymentTerm: "100% on BL",
        validUntil: "2026-10-05",
        note: "Grade A+ CA-stored stock ready to load within 10 days.",
        status: "accepted",
        createdAt: "2026-08-22T10:00:00.000Z",
        updatedAt: "2026-08-28T12:00:00.000Z",
      },
      {
        id: "quote-rfq4-2",
        rfqId: "rfq-4",
        sellerId: "seed-shimla-orchards",
        sellerName: "Shimla Hills Orchards Cooperative",
        pricePerTonneUsd: 960,
        quantityMt: 25,
        incoterm: "FOB",
        deliveryWindow: "Oct 2026",
        paymentTerm: "50% advance, 50% on BL",
        validUntil: "2026-10-10",
        note: null,
        status: "not-selected",
        createdAt: "2026-08-23T09:00:00.000Z",
        updatedAt: "2026-08-28T12:00:00.000Z",
      },
      {
        id: "quote-rfq4-3",
        rfqId: "rfq-4",
        sellerId: "seed-kinnaur-greens",
        sellerName: "Kinnaur Green Orchards",
        pricePerTonneUsd: 890,
        quantityMt: 22,
        incoterm: "CIF",
        deliveryWindow: "Nov 2026",
        paymentTerm: "30% advance, 70% on delivery",
        validUntil: "2026-10-08",
        note: "Can offer our green-apple variety as a substitute at this price — 3 MT short of your ask.",
        status: "not-selected",
        createdAt: "2026-08-24T09:30:00.000Z",
        updatedAt: "2026-08-28T12:00:00.000Z",
      },
    ],
    status: "closed",
    demandConfirmed: true,
    demandConfirmedBy: "Priya Nair",
    demandConfirmedAt: "2026-08-21T09:00:00.000Z",
    cancelledAt: null,
    cancelledBy: null,
    createdAt: "2026-08-20T09:00:00.000Z",
    updatedAt: "2026-08-28T12:00:00.000Z",
  },
  // 5. Cancelled before every invited seller even responded.
  {
    id: "rfq-5",
    buyerId: "trade@meridiancoffee.example",
    buyerName: "Meridian Coffee Traders",
    productCategory: "coffee",
    title: "20 MT Robusta coffee — EUDR-compliant, cup score 82+",
    spec: {
      variety: "Robusta",
      grade: "Grade A",
      packaging: "60kg jute bags",
      unitsPerCarton: null,
      containerType: "20ft dry container",
      destinationPort: "Antwerp, Belgium",
      incoterm: "FOB",
      shippingWindowFrom: "2026-10-10",
      shippingWindowTo: "2026-10-31",
      splitShipment: false,
      quantityMt: 20,
      monthlyVolumeMt: null,
      paymentTermPreference: "50% advance, 50% on BL",
      notes: "Need cup score 82+ and EUDR-compliant geolocation paperwork for this origin.",
    },
    sellers: [
      {
        sellerId: "seed-coorg-estates",
        sellerName: "Coorg Estates Coffee Growers",
        listingId: "seed-2",
        listingTitle: "Arabica Plantation A — Grade A+",
        conversationId: conversationId("trade@meridiancoffee.example", "seed-coorg-estates", "seed-2"),
      },
      {
        sellerId: "seed-chikmagalur-robusta",
        sellerName: "Chikmagalur Robusta Growers",
        listingId: "seed-20",
        listingTitle: "Chikmagalur Robusta Coffee — Grade A",
        conversationId: conversationId("trade@meridiancoffee.example", "seed-chikmagalur-robusta", "seed-20"),
      },
    ],
    quotes: [
      {
        id: "quote-rfq5-1",
        rfqId: "rfq-5",
        sellerId: "seed-chikmagalur-robusta",
        sellerName: "Chikmagalur Robusta Growers",
        pricePerTonneUsd: 2650,
        quantityMt: 20,
        incoterm: "FOB",
        deliveryWindow: "Oct 2026",
        paymentTerm: "50% advance, 50% on BL",
        validUntil: "2026-10-01",
        note: "Locking this rate for you — let us know once your import licence for this origin comes through and we can proceed.",
        status: "submitted",
        createdAt: "2026-09-11T10:00:00.000Z",
        updatedAt: "2026-09-11T10:00:00.000Z",
      },
    ],
    status: "cancelled",
    demandConfirmed: false,
    demandConfirmedBy: null,
    demandConfirmedAt: null,
    cancelledAt: "2026-09-14T11:00:00.000Z",
    cancelledBy: "Meridian Coffee Traders",
    createdAt: "2026-09-10T09:00:00.000Z",
    updatedAt: "2026-09-14T11:00:00.000Z",
  },
  // 6. Open — one quote's validity window has already lapsed.
  {
    id: "rfq-6",
    buyerId: "sourcing@sunrisewholesale.example",
    buyerName: "Sunrise Wholesale",
    productCategory: "nuts",
    title: "18 MT mixed nuts program — groundnut + almond, FOB",
    spec: {
      variety: null,
      grade: "Grade A",
      packaging: "10kg vacuum tins",
      unitsPerCarton: null,
      containerType: "20ft dry container",
      destinationPort: "Jebel Ali, UAE",
      incoterm: "FOB",
      shippingWindowFrom: "2026-10-10",
      shippingWindowTo: "2026-10-25",
      splitShipment: true,
      quantityMt: 18,
      monthlyVolumeMt: 18,
      paymentTermPreference: "50% advance, 50% on BL",
      notes: "Mixed pallet OK — groundnuts and almonds can ship together if packed separately.",
    },
    sellers: [
      {
        sellerId: "seed-savannah-nuts",
        sellerName: "Savannah Groundnut Cooperative",
        listingId: "seed-8",
        listingTitle: "Bold Groundnut — Grade A",
        conversationId: conversationId("sourcing@sunrisewholesale.example", "seed-savannah-nuts", "seed-8"),
      },
      {
        sellerId: "seed-kashmir-almond",
        sellerName: "Kashmir Almond Growers Association",
        listingId: "seed-29",
        listingTitle: "Kashmir Mamra Almond — Grade A+",
        conversationId: conversationId("sourcing@sunrisewholesale.example", "seed-kashmir-almond", "seed-29"),
      },
    ],
    quotes: [
      {
        id: "quote-rfq6-1",
        rfqId: "rfq-6",
        sellerId: "seed-savannah-nuts",
        sellerName: "Savannah Groundnut Cooperative",
        pricePerTonneUsd: 6250,
        quantityMt: 18,
        incoterm: "FOB",
        deliveryWindow: "Oct 2026",
        paymentTerm: "50% advance, 50% on BL",
        // Already in the past relative to the other dates on this RFQ — a
        // quote gone stale, still sitting there unwithdrawn.
        validUntil: "2026-09-05",
        note: "Rate held from our last conversation — let us know if you need us to refresh it.",
        status: "submitted",
        createdAt: "2026-08-26T10:00:00.000Z",
        updatedAt: "2026-08-26T10:00:00.000Z",
      },
      {
        id: "quote-rfq6-2",
        rfqId: "rfq-6",
        sellerId: "seed-kashmir-almond",
        sellerName: "Kashmir Almond Growers Association",
        pricePerTonneUsd: 8150,
        quantityMt: 10,
        incoterm: "FOB",
        deliveryWindow: "Nov 2026",
        paymentTerm: "30% advance, 70% on BL",
        validUntil: "2026-10-15",
        note: null,
        status: "submitted",
        createdAt: "2026-09-10T09:00:00.000Z",
        updatedAt: "2026-09-10T09:00:00.000Z",
      },
    ],
    status: "open",
    demandConfirmed: true,
    demandConfirmedBy: "Arjun Mehta",
    demandConfirmedAt: "2026-08-27T09:00:00.000Z",
    cancelledAt: null,
    cancelledBy: null,
    createdAt: "2026-08-25T09:00:00.000Z",
    updatedAt: "2026-09-10T09:00:00.000Z",
  },
  // 7. Open, three genuinely different offers — a real "which is best" call.
  {
    id: "rfq-7",
    buyerId: "buyer@amama.in",
    buyerName: "Vikram Shah",
    productCategory: "tea",
    title: "15 MT orthodox black tea program — Europe retail packs",
    spec: {
      variety: "Orthodox black tea",
      grade: "Grade A",
      packaging: "20kg multi-wall paper sacks",
      unitsPerCarton: null,
      containerType: "20ft dry container",
      destinationPort: "Hamburg, Germany",
      incoterm: "CIF",
      shippingWindowFrom: "2026-10-01",
      shippingWindowTo: "2026-10-31",
      splitShipment: false,
      quantityMt: 15,
      monthlyVolumeMt: null,
      paymentTermPreference: "30% advance, 70% on BL",
      notes: "Need a cupping sample before final commitment — EU pesticide-residue compliant only.",
    },
    sellers: [
      {
        sellerId: "seed-nandi-tea",
        sellerName: "Nandi Hills Tea Estate",
        listingId: "seed-7",
        listingTitle: "Nilgiri Orthodox Tea — Grade A",
        conversationId: conversationId("buyer@amama.in", "seed-nandi-tea", "seed-7"),
      },
      {
        sellerId: "seller@amama.in",
        sellerName: "Ravi Kumar",
        listingId: "demo-tea-1",
        listingTitle: "Nilgiri Orthodox Tea — Grade A",
        conversationId: conversationId("buyer@amama.in", "seller@amama.in", "demo-tea-1"),
      },
      {
        sellerId: "seed-assam-ctc",
        sellerName: "Assam Valley Tea Estate",
        listingId: "seed-21",
        listingTitle: "Assam Orthodox CTC Tea — Grade A",
        conversationId: conversationId("buyer@amama.in", "seed-assam-ctc", "seed-21"),
      },
    ],
    quotes: [
      {
        id: "quote-rfq7-1",
        rfqId: "rfq-7",
        sellerId: "seed-nandi-tea",
        sellerName: "Nandi Hills Tea Estate",
        pricePerTonneUsd: 2950,
        quantityMt: 15,
        incoterm: "CIF",
        deliveryWindow: "Oct 2026",
        paymentTerm: "30% advance, 70% on BL",
        validUntil: "2026-10-20",
        note: "Can match the full 15 MT from our current lot.",
        status: "submitted",
        createdAt: "2026-09-06T10:00:00.000Z",
        updatedAt: "2026-09-06T10:00:00.000Z",
      },
      {
        id: "quote-rfq7-2",
        rfqId: "rfq-7",
        sellerId: "seller@amama.in",
        sellerName: "Ravi Kumar",
        pricePerTonneUsd: 2880,
        quantityMt: 12,
        incoterm: "FOB",
        deliveryWindow: "Nov 2026",
        paymentTerm: "50% advance, 50% on delivery",
        validUntil: "2026-10-25",
        note: "Only have 12 MT left from this lot — can supplement from the next flush in December if you need the full 15.",
        status: "submitted",
        createdAt: "2026-09-07T09:30:00.000Z",
        updatedAt: "2026-09-07T09:30:00.000Z",
      },
      {
        id: "quote-rfq7-3",
        rfqId: "rfq-7",
        sellerId: "seed-assam-ctc",
        sellerName: "Assam Valley Tea Estate",
        pricePerTonneUsd: 2450,
        quantityMt: 18,
        incoterm: "CIF",
        deliveryWindow: "Oct 2026",
        paymentTerm: "100% on BL",
        validUntil: "2026-10-18",
        note: "This is CTC grain, not orthodox — happy to blend if that still works for your retail packs.",
        status: "submitted",
        createdAt: "2026-09-08T11:00:00.000Z",
        updatedAt: "2026-09-08T11:00:00.000Z",
      },
    ],
    status: "open",
    demandConfirmed: true,
    demandConfirmedBy: "Priya Nair",
    demandConfirmedAt: "2026-09-07T12:00:00.000Z",
    cancelledAt: null,
    cancelledBy: null,
    createdAt: "2026-09-05T09:00:00.000Z",
    updatedAt: "2026-09-08T11:00:00.000Z",
  },
]

/** Seeds a fixed batch of RFQs, but only if the store is genuinely empty —
 *  same "only if empty" idiom as `seedDealsIfEmpty`/`seedContractsIfEmpty`,
 *  see `seed-data.ts`. */
function seedRfqsIfEmpty(rfqs: Rfq[]) {
  restoreOnce()
  if (snapshot.length > 0) return
  write(rfqs)
}

function findRfq(id: string): Rfq | undefined {
  restoreOnce()
  return snapshot.find((rfq) => rfq.id === id)
}

function updateRfq(id: string, patch: Partial<Rfq>) {
  write(snapshot.map((rfq) => (rfq.id === id ? { ...rfq, ...patch, updatedAt: new Date().toISOString() } : rfq)))
}

/** Every RFQ a buyer has published, newest first. */
function rfqsForBuyer(rfqs: Rfq[], buyerId: string): Rfq[] {
  return rfqs.filter((rfq) => rfq.buyerId === buyerId).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

/** The RFQs a seller has been asked to quote on — still open ones surface
 *  as "awaiting your quote" in their own inbox. */
function rfqsForSeller(rfqs: Rfq[], sellerId: string): Rfq[] {
  return rfqs
    .filter((rfq) => rfq.sellers.some((seller) => seller.sellerId === sellerId))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

/** How closely an RFQ lines up with what a seller actually has listed —
 *  `"exact"` (same product), `"category"` (same broader catalog grouping,
 *  different product), or `"none"`. Drives both the feed's sort order and
 *  the match badge a seller sees on each card. */
type RfqMatch = "exact" | "category" | "none"

function rfqMatchForSeller(rfq: Rfq, sellerCropIds: string[]): RfqMatch {
  if (sellerCropIds.includes(rfq.productCategory)) return "exact"
  const rfqCategory = categoryForCropId(rfq.productCategory)
  if (sellerCropIds.some((cropId) => categoryForCropId(cropId) === rfqCategory)) return "category"
  return "none"
}

const MATCH_RANK: Record<RfqMatch, number> = { exact: 0, category: 1, none: 2 }

/** Every open RFQ across the whole marketplace — not just the ones this
 *  seller was personally invited to — so real demand for something they
 *  sell doesn't stay invisible just because the buyer picked a different
 *  seller to ask first. Sorted so the closest catalog match floats to the
 *  top, newest first within each match tier. */
function openRfqsForSellerFeed(rfqs: Rfq[], sellerCropIds: string[]): Rfq[] {
  return rfqs
    .filter((rfq) => rfq.status === "open")
    .sort((a, b) => {
      const rank = MATCH_RANK[rfqMatchForSeller(a, sellerCropIds)] - MATCH_RANK[rfqMatchForSeller(b, sellerCropIds)]
      return rank !== 0 ? rank : a.createdAt < b.createdAt ? 1 : -1
    })
}

/**
 * A seller responding to an RFQ they found in their own broadened feed
 * rather than one a buyer personally sent them — adds them to the target
 * list with a real conversation to quote and hear back in, the same shape
 * `createRfq` sets up for its original invitees. Idempotent: a seller
 * already on the list is returned as-is rather than starting a second
 * thread.
 */
function joinRfqAsSeller(
  rfqId: string,
  seller: { sellerId: string; sellerName: string; listingId: string; listingTitle: string }
): RfqTargetSeller | null {
  restoreOnce()
  const rfq = findRfq(rfqId)
  if (!rfq || rfq.status !== "open") return null
  const existing = rfq.sellers.find((entry) => entry.sellerId === seller.sellerId)
  if (existing) return existing

  const conversation = startConversation({
    buyerId: rfq.buyerId,
    buyerName: rfq.buyerName,
    sellerId: seller.sellerId,
    sellerName: seller.sellerName,
    listingId: seller.listingId,
    listingTitle: seller.listingTitle,
    openingMessage: `${seller.sellerName} is responding to your RFQ: "${rfq.title}".`,
  })
  const target: RfqTargetSeller = { ...seller, conversationId: conversation }
  updateRfq(rfqId, { sellers: [...rfq.sellers, target] })
  postCard({
    conversationId: conversation,
    from: "seller",
    fromName: seller.sellerName,
    text: `${seller.sellerName} is responding to your RFQ — "${rfq.title}".`,
    card: { kind: "rfq", rfqId, sellerId: seller.sellerId },
  })
  return target
}

function quoteFromSeller(rfq: Rfq, sellerId: string): RfqQuote | null {
  // Latest one wins — a seller can resubmit after withdrawing.
  const mine = rfq.quotes.filter((quote) => quote.sellerId === sellerId)
  return mine.length > 0 ? mine[mine.length - 1] : null
}

/** How many sellers have actually quoted, out of how many were asked —
 *  the same "N of M" progress every other card in the app uses. */
function rfqProgress(rfq: Rfq): { done: number; total: number } {
  const quoted = new Set(
    rfq.quotes.filter((quote) => quote.status !== "withdrawn").map((quote) => quote.sellerId)
  )
  return { done: quoted.size, total: rfq.sellers.length }
}

/**
 * Publishes the brief to every selected seller at once — each gets (or
 * reuses) their own thread with this buyer and a copy of the `rfq` card
 * lands in it. One record, many quotes, rather than one negotiation per
 * seller with no way to compare them.
 */
function createRfq(input: {
  buyerId: string
  buyerName: string
  productCategory: string
  title: string
  spec: RfqSpec
  sellers: Array<{ sellerId: string; sellerName: string; listingId: string; listingTitle: string }>
}): Rfq {
  restoreOnce()
  const now = new Date().toISOString()
  const rfqId = generateId("rfq")

  const sellers: RfqTargetSeller[] = input.sellers.map((seller) => {
    const conversationId = startConversation({
      buyerId: input.buyerId,
      buyerName: input.buyerName,
      sellerId: seller.sellerId,
      sellerName: seller.sellerName,
      listingId: seller.listingId,
      listingTitle: seller.listingTitle,
      openingMessage: `Sent an RFQ: "${input.title}".`,
    })
    return { ...seller, conversationId }
  })

  const rfq: Rfq = {
    id: rfqId,
    buyerId: input.buyerId,
    buyerName: input.buyerName,
    productCategory: input.productCategory,
    title: input.title,
    spec: input.spec,
    sellers,
    quotes: [],
    status: "open",
    demandConfirmed: false,
    demandConfirmedBy: null,
    demandConfirmedAt: null,
    cancelledAt: null,
    cancelledBy: null,
    createdAt: now,
    updatedAt: now,
  }
  write([rfq, ...snapshot])

  sellers.forEach((seller) => {
    postCard({
      conversationId: seller.conversationId,
      from: "buyer",
      fromName: input.buyerName,
      text: `${input.buyerName} sent an RFQ — "${input.title}". Tap to view the requirements and submit a quote.`,
      card: { kind: "rfq", rfqId, sellerId: seller.sellerId },
    })
  })

  return rfq
}

/** A seller's formal offer against one RFQ. Resubmitting (after a
 *  withdrawal) posts a fresh card rather than editing the old one, so the
 *  thread keeps a real history of what was actually offered and when. */
function submitQuote(
  rfqId: string,
  input: {
    sellerId: string
    sellerName: string
    pricePerTonneUsd: number
    quantityMt: number
    incoterm: string | null
    deliveryWindow: string | null
    paymentTerm: string | null
    validUntil: string | null
    note: string | null
  }
): RfqQuote | null {
  restoreOnce()
  const rfq = findRfq(rfqId)
  const seller = rfq?.sellers.find((entry) => entry.sellerId === input.sellerId)
  if (!rfq || !seller || rfq.status !== "open") return null

  const now = new Date().toISOString()
  const quote: RfqQuote = {
    id: generateId("quote"),
    rfqId,
    sellerId: input.sellerId,
    sellerName: input.sellerName,
    pricePerTonneUsd: input.pricePerTonneUsd,
    quantityMt: input.quantityMt,
    incoterm: input.incoterm,
    deliveryWindow: input.deliveryWindow,
    paymentTerm: input.paymentTerm,
    validUntil: input.validUntil,
    note: input.note,
    status: "submitted",
    createdAt: now,
    updatedAt: now,
  }
  updateRfq(rfqId, { quotes: [...rfq.quotes, quote] })
  postCard({
    conversationId: seller.conversationId,
    from: "seller",
    fromName: input.sellerName,
    text: `${input.sellerName} submitted a quote for "${rfq.title}".`,
    card: { kind: "rfq-quote", rfqId, quoteId: quote.id },
  })
  return quote
}

function withdrawQuote(rfqId: string, quoteId: string, byName: string) {
  restoreOnce()
  const rfq = findRfq(rfqId)
  const quote = rfq?.quotes.find((entry) => entry.id === quoteId)
  const seller = rfq?.sellers.find((entry) => entry.sellerId === quote?.sellerId)
  if (!rfq || !quote || quote.status !== "submitted") return
  updateRfq(rfqId, {
    quotes: rfq.quotes.map((entry) =>
      entry.id === quoteId ? { ...entry, status: "withdrawn", updatedAt: new Date().toISOString() } : entry
    ),
  })
  if (seller) logSystemMessageForConversation(seller.conversationId, `${byName} withdrew their quote.`)
}

/** Ends the RFQ without picking anyone — every seller who quoted is told
 *  it's closed. */
function cancelRfq(rfqId: string, byName: string) {
  restoreOnce()
  const rfq = findRfq(rfqId)
  if (!rfq || rfq.status !== "open") return
  const now = new Date().toISOString()
  updateRfq(rfqId, { status: "cancelled", cancelledAt: now, cancelledBy: byName })
  rfq.sellers.forEach((seller) => {
    logSystemMessageForConversation(seller.conversationId, `${byName} cancelled the RFQ "${rfq.title}".`)
  })
}

/**
 * The buyer's decision: this seller's quote wins. Every other quote is
 * marked not-selected, and the winning quote hands straight into the
 * existing deal pipeline — seeded as the seller's own proposal (that's
 * what a quote is) and immediately confirmed by the buyer, since accepting
 * an RFQ quote already *is* both sides agreeing. Everything past this
 * point (KAM contract, term sheet, PO) is the same pipeline a direct
 * negotiation would have reached via `confirmDeal`.
 */
function acceptQuote(rfqId: string, quoteId: string, buyerName: string): Deal | null {
  restoreOnce()
  const rfq = findRfq(rfqId)
  const quote = rfq?.quotes.find((entry) => entry.id === quoteId)
  const seller = rfq?.sellers.find((entry) => entry.sellerId === quote?.sellerId)
  if (!rfq || !quote || !seller || quote.status !== "submitted") return null

  updateRfq(rfqId, {
    status: "closed",
    quotes: rfq.quotes.map((entry) =>
      entry.id === quoteId
        ? { ...entry, status: "accepted" }
        : entry.status === "submitted"
          ? { ...entry, status: "not-selected" }
          : entry
    ),
  })

  rfq.sellers
    .filter((entry) => entry.sellerId !== seller.sellerId)
    .forEach((entry) => {
      if (quoteFromSeller(rfq, entry.sellerId)) {
        logSystemMessageForConversation(
          entry.conversationId,
          `${buyerName} accepted another seller's quote for "${rfq.title}" — this RFQ is now closed.`
        )
      }
    })

  const deal = proposeDeal({
    conversationId: seller.conversationId,
    listingId: seller.listingId,
    listingTitle: seller.listingTitle,
    buyerId: rfq.buyerId,
    buyerName: rfq.buyerName,
    sellerId: seller.sellerId,
    sellerName: seller.sellerName,
    proposedBy: "seller",
    proposerName: seller.sellerName,
    agreedPricePerTonneUsd: quote.pricePerTonneUsd,
    agreedQuantityMt: quote.quantityMt,
    incoterm: quote.incoterm,
    deliveryWindow: quote.deliveryWindow,
    note: quote.note,
  })
  confirmDeal(deal.id, "buyer", buyerName)
  return deal
}

function confirmDemand(rfqId: string, byName: string) {
  restoreOnce()
  const rfq = findRfq(rfqId)
  if (!rfq || rfq.demandConfirmed) return
  updateRfq(rfqId, { demandConfirmed: true, demandConfirmedBy: byName, demandConfirmedAt: new Date().toISOString() })
}

/** Whether a given RFQ fans out to this exact buyer/seller conversation —
 *  an RFQ has no single `conversationId` of its own since it targets many
 *  sellers at once. */
function rfqTouchesConversation(rfq: Rfq, conversation: Conversation): boolean {
  return (
    rfq.buyerId === conversation.buyerId &&
    rfq.sellers.some((seller) => seller.sellerId === conversation.sellerId)
  )
}

/**
 * The combined KAM-visibility gate: a deal already agreed (the original
 * rule), or an open RFQ touching this conversation — a buyer formalizing a
 * demand into an RFQ is exactly the "serious intent" signal that should
 * pull the desk in before any one seller's quote has even been accepted.
 */
function conversationNeedsKam(deals: Deal[], rfqs: Rfq[], conversation: Conversation): boolean {
  if (conversationIsAgreed(deals, conversation.id)) return true
  return rfqs.some((rfq) => rfq.status !== "cancelled" && rfqTouchesConversation(rfq, conversation))
}

export {
  SEED_RFQS,
  seedRfqsIfEmpty,
  useRfqs,
  findRfq,
  rfqsForBuyer,
  rfqsForSeller,
  openRfqsForSellerFeed,
  rfqMatchForSeller,
  joinRfqAsSeller,
  quoteFromSeller,
  rfqProgress,
  createRfq,
  submitQuote,
  withdrawQuote,
  cancelRfq,
  acceptQuote,
  confirmDemand,
  rfqTouchesConversation,
  conversationNeedsKam,
  type RfqMatch,
}
