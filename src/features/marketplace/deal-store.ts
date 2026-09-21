"use client"

import * as React from "react"

import { logSystemMessageForConversation, postCard } from "@/features/marketplace/conversation-store"
import type { ChatParty } from "@/features/marketplace/conversation-store"
import { formatInr } from "@/features/marketplace/currency"
import type { TradeStatus } from "@/features/dashboard/dashboard-ui"

const STORAGE_KEY = "amama.marketplace.deals"

export type DealStatus = "proposed" | "declined" | "active"

/** What became of one offer. `countered` is its own outcome rather than a
 *  flavour of `declined`: a counter keeps the negotiation alive and is the
 *  normal path to agreement, while a decline ends this deal outright. */
export type RoundOutcome = "pending" | "accepted" | "declined" | "countered"

export type RoundComment = {
  id: string
  by: ChatParty
  byName: string
  text: string
  at: string
}

/**
 * One offer on the table. A negotiation is the ordered list of these, each
 * one either answering the last or being answered — so "what did we agree,
 * and how did we get there" is readable off the deal itself rather than
 * reconstructed from chat.
 *
 * Questions about an offer attach to the round as `comments` instead of
 * becoming their own round: asking "does that include freight?" is not a
 * new offer, and treating it as one would bury the actual numbers.
 */
export type NegotiationRound = {
  id: string
  by: "buyer" | "seller"
  byName: string
  pricePerTonneUsd: number
  quantityMt: number
  incoterm: string | null
  deliveryWindow: string | null
  note: string | null
  at: string
  outcome: RoundOutcome
  outcomeBy: string | null
  outcomeAt: string | null
  outcomeNote: string | null
  comments: RoundComment[]
}

/** Fixed, forward-only pipeline a deal moves through once both sides have
 *  confirmed it — no sub-state-machine per stage, no skipping. QC, customs,
 *  and freight booking are folded into one `compliance` stage rather than
 *  three, since a KAM works them as one bundle of pre-shipment prep, not
 *  three separately-tracked handoffs. */
export type DealStage =
  | "costing"
  | "contracting"
  | "compliance"
  | "shipping"
  | "delivered"
  | "paid"

export const DEAL_STAGE_ORDER: DealStage[] = [
  "costing",
  "contracting",
  "compliance",
  "shipping",
  "delivered",
  "paid",
]

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  costing: "Costing & Invoicing",
  contracting: "Contracting",
  compliance: "Compliance, QC & Logistics",
  shipping: "Shipment tracking",
  delivered: "Delivered",
  paid: "Paid",
}

/** One line per stage advance — "which KAM handled this, and when" is the
 *  audit trail a master admin actually needs, not just the deal's current
 *  state. */
export type DealStageHistoryEntry = {
  stage: DealStage
  at: string
  by: string
  note: string | null
}

export type DealAssignmentEntry = {
  kamId: string
  kamName: string
  assignedBy: string
  at: string
}

/**
 * What the two trading parties see once the paperwork is done — the plain
 * "where is my order" journey, deliberately separate from `DealStage`.
 *
 * `DealStage` is the desk's internal pipeline (costing, contracting,
 * compliance…); this is the customer-facing one, and they move at
 * different speeds — a KAM can still be chasing a certificate while the
 * order legitimately reads "Processing" to the buyer.
 */
export type OrderStage = "confirmed" | "processing" | "ready-to-ship" | "in-transit" | "completed"

export const ORDER_STAGE_ORDER: OrderStage[] = [
  "confirmed",
  "processing",
  "ready-to-ship",
  "in-transit",
  "completed",
]

export const ORDER_STAGE_LABELS: Record<OrderStage, string> = {
  confirmed: "Confirmed",
  processing: "Processing",
  "ready-to-ship": "Ready to ship",
  "in-transit": "In transit",
  completed: "Completed",
}

/** How a given leg of the journey actually moves. Consolidation isn't
 *  transport at all — it's the pause where a buyer's several orders are
 *  merged into one onward shipment — but it sits in the same sequence, so
 *  it belongs in the same list. */
export type LogisticsMode = "trucking" | "ocean" | "air" | "consolidation"

export const LOGISTICS_MODE_LABELS: Record<LogisticsMode, string> = {
  trucking: "Trucking",
  ocean: "Ocean freight",
  air: "Air freight",
  consolidation: "Buyer consolidation",
}

export type ShipmentStatus = "booked" | "in-transit" | "arrived" | "delayed"

/** The full farm-to-delivery pipeline a shipment actually moves through —
 *  not just "booked/in-transit/arrived", but the eleven stages that
 *  precede and surround a container's own booking: dispatch off the farm,
 *  through the warehouse and cold store, packed and export-QC'd, booked,
 *  stuffed, documented, cleared, gated in, sailed, and delivered. `stage`
 *  is the canonical "where is this right now"; `ShipmentStatus` stays a
 *  coarser derived read of it for the board's own grouping. */
export type LogisticsStage =
  | "farm-pickup"
  | "warehouse-inbound"
  | "cold-storage"
  | "packing-export-qc"
  | "container-booked"
  | "stuffing"
  | "documentation"
  | "customs"
  | "gate-in"
  | "vessel-transit"
  | "arrived-delivered"

export const LOGISTICS_STAGE_ORDER: LogisticsStage[] = [
  "farm-pickup",
  "warehouse-inbound",
  "cold-storage",
  "packing-export-qc",
  "container-booked",
  "stuffing",
  "documentation",
  "customs",
  "gate-in",
  "vessel-transit",
  "arrived-delivered",
]

export const LOGISTICS_STAGE_LABELS: Record<LogisticsStage, string> = {
  "farm-pickup": "Farm pickup",
  "warehouse-inbound": "Warehouse inbound",
  "cold-storage": "Cold storage",
  "packing-export-qc": "Packing & export QC",
  "container-booked": "Container booked",
  stuffing: "Stuffing",
  documentation: "Documentation",
  customs: "Customs",
  "gate-in": "Terminal gate-in",
  "vessel-transit": "Vessel transit",
  "arrived-delivered": "Arrived & delivered",
}

/** Whose job it is to move a shipment on while it sits at this stage — a
 *  seller dispatches and preps the cargo, a KAM runs the booking-through-
 *  gate-in export machinery, and delivery/claims are the buyer's to
 *  confirm. Drives which role's screen surfaces a given shipment as
 *  "yours to act on" rather than just "yours to watch." */
export const LOGISTICS_STAGE_OWNER: Record<LogisticsStage, "seller" | "kam" | "buyer"> = {
  "farm-pickup": "seller",
  "warehouse-inbound": "seller",
  "cold-storage": "seller",
  "packing-export-qc": "seller",
  "container-booked": "kam",
  stuffing: "kam",
  documentation: "kam",
  customs: "kam",
  "gate-in": "kam",
  "vessel-transit": "kam",
  "arrived-delivered": "buyer",
}

/** Real, named checkpoints a shipment actually passes through — "where it
 *  is, everything," not just a 4-value status flag. Ordered loosely by
 *  when they'd typically happen, though nothing enforces that order; a
 *  KAM logs whatever actually occurred. Each type that marks entry into a
 *  `LogisticsStage` is named to match — see `STAGE_BY_EVENT` in
 *  `logistics.ts`. */
export type ShipmentEventType =
  | "farm-pickup"
  | "warehouse-inbound"
  | "cold-storage-in"
  | "export-qc-pass"
  | "booked"
  | "gate-in"
  | "loaded"
  | "departed"
  | "in-transit"
  | "arrived-port"
  | "documentation"
  | "customs"
  | "vgm-filed"
  | "leo-issued"
  | "out-for-delivery"
  | "delivered"
  | "delayed"

export type ShipmentEvent = {
  id: string
  type: ShipmentEventType
  label: string
  location: string | null
  at: string
  note: string | null
}

/** Which `LogisticsStage` a given event type marks entry into — only the
 *  types that actually represent a stage transition appear here; a mid-
 *  stage checkpoint (a `delayed` note, an extra `in-transit` ping) doesn't
 *  need its own entry, since `addShipmentEvent` falls back to leaving
 *  `stage` unchanged for anything not listed. */
const STAGE_BY_EVENT: Partial<Record<ShipmentEventType, LogisticsStage>> = {
  "farm-pickup": "farm-pickup",
  "warehouse-inbound": "warehouse-inbound",
  "cold-storage-in": "cold-storage",
  "export-qc-pass": "packing-export-qc",
  booked: "container-booked",
  loaded: "stuffing",
  "vgm-filed": "stuffing",
  documentation: "documentation",
  customs: "customs",
  "leo-issued": "customs",
  "gate-in": "gate-in",
  departed: "vessel-transit",
  "in-transit": "vessel-transit",
  "arrived-port": "vessel-transit",
  "out-for-delivery": "arrived-delivered",
  delivered: "arrived-delivered",
}

export type LogisticsDocumentStatus = "pending" | "submitted" | "verified" | "missing"

/** One document gate at one stage — the reference this pipeline is built
 *  from calls a document a *gate*, not an attachment: a missing mandatory
 *  one is a literal blocker on the shipment, not a to-do. */
export type LogisticsDocument = {
  id: string
  stage: LogisticsStage
  name: string
  mandatory: boolean
  status: LogisticsDocumentStatus
  issuer: string
  note: string | null
}

/** One reading in a temperature time-series — a stream, not an attribute.
 *  `leg` is free text ("orchard", "road", "cold store"…) rather than a
 *  closed enum, since it's just a label on the chart, never branched on. */
export type TemperatureSample = {
  id: string
  at: string
  tempC: number
  leg: string
}

export type ColdChainLog = {
  setpointC: number
  samples: TemperatureSample[]
}

export type ClaimStatus = "open" | "under-review" | "settled" | "rejected"

/** A cargo claim — damage, shortage, quality dispute — raised against a
 *  shipment once it's landed. Its own record rather than a shipment note,
 *  because a claim has a party who raised it, a status that moves on its
 *  own timeline, and (usually) money attached that Finance has to track
 *  separately from the freight cost. */
export type ShipmentClaim = {
  reason: string
  amountUsd: number
  status: ClaimStatus
  raisedBy: "buyer" | "seller"
  raisedAt: string
  resolvedAt: string | null
  resolutionNote: string | null
}

export type Shipment = {
  id: string
  /** Which leg of the journey this is. Ocean is the default for anything
   *  stored before legs existed — it's what every seeded shipment is. */
  mode: LogisticsMode
  carrier: string
  documentNumber: string
  /** The booking confirmation number a forwarder issues at container-booked
   *  time — distinct from the container itself, which doesn't exist yet.
   *  `null` until a container's actually booked. */
  bookingReference: string | null
  /** The physical container's own number (e.g. `MSKU7788123`) once it's
   *  been assigned — `null` before stuffing, and always `null` for a
   *  trucking-only leg that never gets its own container. */
  containerId: string | null
  status: ShipmentStatus
  /** Canonical current position in the full pipeline — see
   *  `LOGISTICS_STAGE_ORDER`. Updated alongside `status` by whatever call
   *  appends the event that moved it here. */
  stage: LogisticsStage
  origin: string | null
  destination: string | null
  /** The one line a non-technical buyer/seller actually wants an answer
   *  to: "where is it right now." Kept alongside `events` (not derived
   *  from it on every read) so it's always a plain, cheap-to-render field. */
  currentLocation: string | null
  eta: string | null
  note: string | null
  /** Oldest → newest. The tracker's own timeline reads straight off this. */
  events: ShipmentEvent[]
  /** The three hard, non-negotiable export deadlines a booking carries —
   *  miss any one and the container rolls to the next sailing. `null`
   *  fields simply haven't been booked/filed yet. */
  cutoffs: { gateIn: string | null; vgm: string | null; shippingInstruction: string | null }
  /** Every document gate this shipment needs, mandatory or not — a
   *  mandatory one still `pending`/`missing` is a literal blocker, not
   *  paperwork housekeeping. */
  documents: LogisticsDocument[]
  /** `null` for a leg that was never temperature-controlled (a document
   *  courier run, an air-freight hop). Present only for cold-chain legs —
   *  the set point plus the actual reading stream against it. */
  coldChain: ColdChainLog | null
  /** When the shelf-life clock actually started — harvest, not pickup —
   *  and the budget it started with, for `shelfLifeRemaining()` in
   *  `logistics.ts`. `null` for non-perishable or not-yet-known legs. */
  harvestAt: string | null
  shelfLifeBudgetDays: number | null
  /** Container/port waiting charges — a cost line, not a workflow, so it's
   *  just an amount rather than its own status machine. `null` until one's
   *  actually been billed. */
  demurrageUsd: number | null
  /** `null` for the overwhelming majority of shipments — most cargo just
   *  arrives. Set only when someone's actually disputing what showed up. */
  claim: ShipmentClaim | null
  createdAt: string
  updatedAt: string
}

/** Backfills a `Shipment` stored before the event-timeline fields existed
 *  — same convention as `listing-store.ts`'s `normalize`. Without this, a
 *  browser with old-shaped data in `localStorage` would crash the first
 *  time the tracker reads `shipment.events`. A shipment saved before the
 *  full pipeline existed only ever carried the four-value `status`, so
 *  `stage` backfills from that rather than assuming stage one. */
function normalizeShipment(raw: Partial<Shipment>): Shipment {
  const stageFromStatus: Record<ShipmentStatus, LogisticsStage> = {
    booked: "container-booked",
    "in-transit": "vessel-transit",
    arrived: "arrived-delivered",
    delayed: "gate-in",
  }
  return {
    mode: "ocean",
    origin: null,
    destination: null,
    currentLocation: null,
    bookingReference: null,
    containerId: null,
    events: [],
    stage: raw.status ? stageFromStatus[raw.status] : "container-booked",
    cutoffs: { gateIn: null, vgm: null, shippingInstruction: null },
    documents: [],
    coldChain: null,
    harvestAt: null,
    shelfLifeBudgetDays: null,
    demurrageUsd: null,
    claim: null,
    ...raw,
  } as Shipment
}

/** Rebuilds the opening round for a deal stored (or seeded) before
 *  negotiation rounds existed, from the headline terms it already carries.
 *  Without this those deals would render a proposal widget with nothing in
 *  it; with it, every deal in the system has a readable first offer. */
function syntheticRound(deal: Deal): NegotiationRound {
  const outcome: RoundOutcome =
    deal.status === "active" ? "accepted" : deal.status === "declined" ? "declined" : "pending"
  return {
    id: `${deal.id}-round-1`,
    by: deal.proposedBy,
    byName: deal.proposedBy === "buyer" ? deal.buyerName : deal.sellerName,
    pricePerTonneUsd: deal.agreedPricePerTonneUsd,
    quantityMt: deal.agreedQuantityMt,
    incoterm: deal.costing?.incoterm ?? null,
    deliveryWindow: null,
    note: null,
    at: deal.proposedAt,
    outcome,
    outcomeBy: outcome === "pending" ? null : deal.proposedBy === "buyer" ? deal.sellerName : deal.buyerName,
    outcomeAt: deal.respondedAt,
    outcomeNote: deal.declineReason,
    comments: [],
  }
}

/** Where the customer-facing journey has got to, for a deal stored before
 *  it was tracked separately — read off the desk pipeline it used to be
 *  the only view of. */
function derivedOrderStage(deal: Deal): OrderStage | null {
  if (deal.status !== "active" || !deal.stage) return null
  switch (deal.stage) {
    case "costing":
    case "contracting":
      return "confirmed"
    case "compliance":
      return "processing"
    case "shipping":
      return "in-transit"
    default:
      return "completed"
  }
}

function normalizeDeal(raw: Partial<Deal> | DealSeed): Deal {
  const deal = {
    ...raw,
    rounds: raw.rounds ?? [],
    shipments: (raw.shipments ?? []).map((shipment) => normalizeShipment(shipment as Partial<Shipment>)),
    contractRequestedAt: raw.contractRequestedAt ?? null,
    contractRequestedBy: raw.contractRequestedBy ?? null,
  } as Deal
  if (deal.rounds.length === 0) deal.rounds = [syntheticRound(deal)]
  if (deal.orderStage === undefined) deal.orderStage = derivedOrderStage(deal)
  return deal
}

export type Deal = {
  id: string
  conversationId: string
  listingId: string
  listingTitle: string
  buyerId: string
  buyerName: string
  sellerId: string
  sellerName: string

  status: DealStatus
  proposedBy: "buyer" | "seller"
  /** The terms currently on the table — the newest round's numbers. Kept
   *  as plain fields (rather than read off `rounds` at every call site)
   *  because most of the app only ever wants "what is this deal worth". */
  agreedPricePerTonneUsd: number
  agreedQuantityMt: number
  proposedAt: string
  respondedAt: string | null
  declineReason: string | null

  /** Oldest → newest. Always at least one entry. */
  rounds: NegotiationRound[]

  /** The buyer/seller-facing journey. `null` until the deal is agreed. */
  orderStage: OrderStage | null

  /** `null` until `status === "active"` — nothing to stage before both
   *  sides have actually confirmed. */
  stage: DealStage | null
  stageHistory: DealStageHistoryEntry[]

  assignedKamId: string | null
  assignedKamName: string | null
  assignmentHistory: DealAssignmentEntry[]

  /** Set the moment a buyer or seller asks for this deal to be turned into
   *  a contract — before any KAM owns it. `null` once nobody's asked, or
   *  forever if a KAM opened the contract off their own back the old way
   *  (see `DealContractAction` in `admin/deals-view.tsx`). This is the
   *  queue `requestContract`/the "Term sheet requests" section reads. */
  contractRequestedAt: string | null
  contractRequestedBy: "buyer" | "seller" | null

  costing: {
    incoterm: string | null
    paymentTerm: string | null
    proformaInvoiceNo: string | null
    notes: string | null
  }
  contracting: {
    contractRef: string | null
    signedOff: boolean
    notes: string | null
  }
  compliance: {
    phytosanitaryCert: boolean
    labReport: boolean
    certificateOfOrigin: boolean
    customsDocs: boolean
    freightBooked: boolean
    notes: string | null
  }
  shipments: Shipment[]
  payment: {
    settled: boolean
    settledAt: string | null
    notes: string | null
  }

  createdAt: string
  updatedAt: string
}

/*
 * Same external-store shape as every other feature store here (see
 * `conversation-store.ts`, `listing-store.ts`). A `Deal` lives beside those
 * two rather than under the admin module: it's created and mutated
 * (propose/confirm/decline) from the buyer/seller product pages, which
 * only ever import from `marketplace/` for cross-role concepts — the same
 * reason `kam-thread-store.ts` lives here despite being read almost
 * entirely by KAM screens.
 */
let snapshot: Deal[] = []
let restored = false
const listeners = new Set<() => void>()
const emptyDeals: Deal[] = []

function restoreOnce() {
  if (restored || typeof window === "undefined") return
  restored = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) snapshot = (JSON.parse(raw) as Partial<Deal>[]).map(normalizeDeal)
  } catch {
    // Private mode or blocked storage — carry on with nothing proposed yet.
  }
}

/** A seed row may leave `rounds` and `orderStage` out: `normalizeDeal`
 *  reconstructs the opening round from the headline terms the row already
 *  carries, and derives the order stage from the pipeline stage — so seed
 *  data doesn't have to state the same facts twice and drift. */
export type DealSeed = Omit<
  Deal,
  "rounds" | "orderStage" | "contractRequestedAt" | "contractRequestedBy" | "shipments"
> & {
  rounds?: NegotiationRound[]
  orderStage?: OrderStage | null
  contractRequestedAt?: string | null
  contractRequestedBy?: "buyer" | "seller" | null
  /** `normalizeShipment` backfills whatever a seed row leaves out (same as
   *  every real shipment saved before `demurrageUsd`/`claim` existed) — so
   *  a seed shipment only needs to state what's actually notable about it. */
  shipments?: Partial<Shipment>[]
}

/** Seeds a fixed batch of deals straight into the store, but only if it's
 *  genuinely empty — belt-and-suspenders alongside `seed-data.ts`'s own
 *  version flag, so this is safe to call more than once. */
function seedDealsIfEmpty(deals: DealSeed[]) {
  restoreOnce()
  if (snapshot.length > 0) return
  write(deals.map((deal) => normalizeDeal(deal)))
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
  return emptyDeals
}

function write(next: Deal[]) {
  snapshot = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Persistence is best-effort.
  }
  listeners.forEach((listener) => listener())
}

function useDeals(): Deal[] {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

function dealsForConversation(deals: Deal[], conversationId: string): Deal[] {
  return deals.filter((deal) => deal.conversationId === conversationId)
}

/** The one deal a product/conversation page actually cares about — the
 *  newest attempt, whatever its status. `proposeDeal` never edits an old
 *  row in place (see below), so after a decline-and-re-propose this is
 *  simply the most recent of possibly several rows for the same
 *  conversation. */
function latestDealForConversation(deals: Deal[], conversationId: string): Deal | null {
  const candidates = dealsForConversation(deals, conversationId)
  if (candidates.length === 0) return null
  return candidates.reduce((newest, candidate) =>
    candidate.createdAt > newest.createdAt ? candidate : newest
  )
}

function findDeal(id: string): Deal | undefined {
  return snapshot.find((deal) => deal.id === id)
}

function updateDeal(id: string, patch: Partial<Deal>) {
  write(snapshot.map((deal) => (deal.id === id ? { ...deal, ...patch, updatedAt: new Date().toISOString() } : deal)))
}

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Always creates a **new** row, never edits an existing one — a decline
 * doesn't block trying again, it just leaves the old attempt as history
 * and `latestDealForConversation` picks up the new one.
 */
function proposeDeal(input: {
  conversationId: string
  listingId: string
  listingTitle: string
  buyerId: string
  buyerName: string
  sellerId: string
  sellerName: string
  proposedBy: "buyer" | "seller"
  proposerName: string
  agreedPricePerTonneUsd: number
  agreedQuantityMt: number
  incoterm?: string | null
  deliveryWindow?: string | null
  note?: string | null
}): Deal {
  restoreOnce()
  const now = new Date().toISOString()
  const openingRound: NegotiationRound = {
    id: generateId("round"),
    by: input.proposedBy,
    byName: input.proposerName,
    pricePerTonneUsd: input.agreedPricePerTonneUsd,
    quantityMt: input.agreedQuantityMt,
    incoterm: input.incoterm ?? null,
    deliveryWindow: input.deliveryWindow ?? null,
    note: input.note ?? null,
    at: now,
    outcome: "pending",
    outcomeBy: null,
    outcomeAt: null,
    outcomeNote: null,
    comments: [],
  }
  const deal: Deal = {
    id: generateId("deal"),
    conversationId: input.conversationId,
    listingId: input.listingId,
    listingTitle: input.listingTitle,
    buyerId: input.buyerId,
    buyerName: input.buyerName,
    sellerId: input.sellerId,
    sellerName: input.sellerName,

    status: "proposed",
    proposedBy: input.proposedBy,
    agreedPricePerTonneUsd: input.agreedPricePerTonneUsd,
    agreedQuantityMt: input.agreedQuantityMt,
    proposedAt: now,
    respondedAt: null,
    declineReason: null,

    rounds: [openingRound],
    orderStage: null,

    stage: null,
    stageHistory: [],

    assignedKamId: null,
    assignedKamName: null,
    assignmentHistory: [],

    contractRequestedAt: null,
    contractRequestedBy: null,

    costing: { incoterm: null, paymentTerm: null, proformaInvoiceNo: null, notes: null },
    contracting: { contractRef: null, signedOff: false, notes: null },
    compliance: {
      phytosanitaryCert: false,
      labReport: false,
      certificateOfOrigin: false,
      customsDocs: false,
      freightBooked: false,
      notes: null,
    },
    shipments: [],
    payment: { settled: false, settledAt: null, notes: null },

    createdAt: now,
    updatedAt: now,
  }
  write([deal, ...snapshot])
  postCard({
    conversationId: input.conversationId,
    from: input.proposedBy,
    text: `${input.proposerName} proposed a deal: ${formatInr(input.agreedPricePerTonneUsd)}/t × ${input.agreedQuantityMt} MT.`,
    card: { kind: "proposal", dealId: deal.id, roundId: openingRound.id },
  })
  return deal
}

/** The newest offer — the only one either side can act on. */
function latestRound(deal: Deal): NegotiationRound {
  return deal.rounds[deal.rounds.length - 1]
}

/** Whether `party` is the one being asked to respond: you answer the other
 *  side's offer, never your own. */
function awaitingResponseFrom(deal: Deal): "buyer" | "seller" | null {
  if (deal.status !== "proposed") return null
  const round = latestRound(deal)
  if (round.outcome !== "pending") return null
  return round.by === "buyer" ? "seller" : "buyer"
}

function setRoundOutcome(
  deal: Deal,
  roundId: string,
  outcome: RoundOutcome,
  by: string,
  note: string | null
): NegotiationRound[] {
  const at = new Date().toISOString()
  return deal.rounds.map((round) =>
    round.id === roundId
      ? { ...round, outcome, outcomeBy: by, outcomeAt: at, outcomeNote: note }
      : round
  )
}

/**
 * Answers the standing offer with a different one. The old round closes as
 * `countered` rather than declined, a new round opens with the other side
 * now waiting, and the deal's headline terms move to the new numbers — so
 * a deal that changes hands five times is still one deal with one history,
 * not five abandoned rows.
 */
function counterProposal(
  dealId: string,
  by: "buyer" | "seller",
  byName: string,
  terms: {
    pricePerTonneUsd: number
    quantityMt: number
    incoterm?: string | null
    deliveryWindow?: string | null
    note?: string | null
  }
) {
  restoreOnce()
  const deal = findDeal(dealId)
  if (!deal || deal.status !== "proposed") return
  const current = latestRound(deal)
  if (current.outcome !== "pending" || current.by === by) return

  const now = new Date().toISOString()
  const round: NegotiationRound = {
    id: generateId("round"),
    by,
    byName,
    pricePerTonneUsd: terms.pricePerTonneUsd,
    quantityMt: terms.quantityMt,
    incoterm: terms.incoterm ?? current.incoterm,
    deliveryWindow: terms.deliveryWindow ?? current.deliveryWindow,
    note: terms.note ?? null,
    at: now,
    outcome: "pending",
    outcomeBy: null,
    outcomeAt: null,
    outcomeNote: null,
    comments: [],
  }
  updateDeal(dealId, {
    rounds: [...setRoundOutcome(deal, current.id, "countered", byName, null), round],
    agreedPricePerTonneUsd: terms.pricePerTonneUsd,
    agreedQuantityMt: terms.quantityMt,
    proposedBy: by,
  })
  postCard({
    conversationId: deal.conversationId,
    from: by,
    text: `${byName} countered: ${formatInr(terms.pricePerTonneUsd)}/t × ${terms.quantityMt} MT.`,
    card: { kind: "proposal", dealId, roundId: round.id },
  })
}

/** A question about an offer, kept on the offer itself. Doesn't move the
 *  negotiation on — it just means somebody needs an answer before they can
 *  say yes. */
function commentOnRound(
  dealId: string,
  roundId: string,
  by: ChatParty,
  byName: string,
  text: string
) {
  restoreOnce()
  const deal = findDeal(dealId)
  if (!deal) return
  const comment: RoundComment = {
    id: generateId("comment"),
    by,
    byName,
    text,
    at: new Date().toISOString(),
  }
  updateDeal(dealId, {
    rounds: deal.rounds.map((round) =>
      round.id === roundId ? { ...round, comments: [...round.comments, comment] } : round
    ),
  })
}

/** Accepting the standing offer. This is the moment the deal becomes real:
 *  it starts the pipeline and, critically, is what makes the thread
 *  visible to a KAM at all (see `conversationIsAgreed`). */
function confirmDeal(dealId: string, confirmedBy: "buyer" | "seller", confirmerName: string) {
  restoreOnce()
  const deal = findDeal(dealId)
  if (!deal || deal.status !== "proposed") return
  const round = latestRound(deal)
  if (round.outcome !== "pending" || round.by === confirmedBy) return
  const now = new Date().toISOString()
  updateDeal(dealId, {
    status: "active",
    respondedAt: now,
    rounds: setRoundOutcome(deal, round.id, "accepted", confirmerName, null),
    agreedPricePerTonneUsd: round.pricePerTonneUsd,
    agreedQuantityMt: round.quantityMt,
    orderStage: "confirmed",
    stage: "costing",
    stageHistory: [
      { stage: "costing", at: now, by: "System", note: "Deal finalized — pipeline started" },
    ],
  })
  logSystemMessageForConversation(
    deal.conversationId,
    `${confirmerName} accepted the deal — both sides are agreed at ${formatInr(round.pricePerTonneUsd)}/t × ${round.quantityMt} MT. An account manager will take it from here.`
  )
}

function declineDeal(
  dealId: string,
  declinedBy: "buyer" | "seller",
  declinerName: string,
  reason: string | null = null
) {
  restoreOnce()
  const deal = findDeal(dealId)
  if (!deal || deal.status !== "proposed") return
  const round = latestRound(deal)
  if (round.outcome !== "pending" || round.by === declinedBy) return
  updateDeal(dealId, {
    status: "declined",
    respondedAt: new Date().toISOString(),
    declineReason: reason,
    rounds: setRoundOutcome(deal, round.id, "declined", declinerName, reason),
  })
  logSystemMessageForConversation(
    deal.conversationId,
    `${declinerName} declined the deal${reason ? `: ${reason}` : "."}`
  )
}

/**
 * The privacy gate the whole KAM handoff turns on: a KAM has no business
 * reading two parties' price haggling, so a conversation only opens to
 * them once those parties have actually shaken hands on it.
 *
 * Deliberately keyed off deal status rather than off KAM assignment — an
 * agreed deal is visible to the KAM desk as a whole so somebody can pick
 * it up, which wouldn't be possible if visibility required an assignment
 * that hasn't happened yet.
 */
function conversationIsAgreed(deals: Deal[], conversationId: string): boolean {
  const deal = latestDealForConversation(deals, conversationId)
  return deal?.status === "active"
}

/** Assignment and everything past it is admin-only detail — it does not
 *  narrate into the buyer/seller conversation the way propose/confirm/
 *  decline do. It's fully audited instead via `assignmentHistory`/
 *  `stageHistory`, which is what Master Admin's oversight actually reads. */
function assignKam(dealId: string, kam: { id: string; name: string }, assignedBy: string) {
  restoreOnce()
  const deal = findDeal(dealId)
  if (!deal) return
  const entry: DealAssignmentEntry = { kamId: kam.id, kamName: kam.name, assignedBy, at: new Date().toISOString() }
  updateDeal(dealId, {
    assignedKamId: kam.id,
    assignedKamName: kam.name,
    assignmentHistory: [...deal.assignmentHistory, entry],
  })
}

/**
 * The trader-side kickoff: "we're agreed, please turn this into a
 * contract." Posts a card into the same conversation so a KAM sees it
 * exactly where the negotiation happened, rather than only in a separate
 * queue screen — `ContractRequestCard` reads this same field live, so the
 * card and the queue never disagree about whether this is still open.
 * A no-op if someone's already asked, or if the deal isn't agreed yet.
 */
function requestContract(dealId: string, party: "buyer" | "seller", partyName: string) {
  restoreOnce()
  const deal = findDeal(dealId)
  if (!deal || deal.status !== "active" || deal.contractRequestedAt) return
  const at = new Date().toISOString()
  updateDeal(dealId, { contractRequestedAt: at, contractRequestedBy: party })
  postCard({
    conversationId: deal.conversationId,
    from: party,
    fromName: partyName,
    text: `${partyName} asked for this deal to be turned into a contract.`,
    card: { kind: "contract-request", dealId },
  })
}

function advanceStage(dealId: string, by: string, note: string | null = null) {
  restoreOnce()
  const deal = findDeal(dealId)
  if (!deal || deal.status !== "active" || !deal.stage) return
  const index = DEAL_STAGE_ORDER.indexOf(deal.stage)
  if (index === -1 || index === DEAL_STAGE_ORDER.length - 1) return
  const nextStage = DEAL_STAGE_ORDER[index + 1]
  const entry: DealStageHistoryEntry = { stage: nextStage, at: new Date().toISOString(), by, note }
  updateDeal(dealId, { stage: nextStage, stageHistory: [...deal.stageHistory, entry] })
}

/**
 * Moves the customer-facing journey and tells both sides it moved. Unlike
 * `advanceStage`, this one narrates into the conversation: "where is my
 * order" is exactly the question a buyer would otherwise message to ask.
 */
function setOrderStage(dealId: string, stage: OrderStage, by: string) {
  restoreOnce()
  const deal = findDeal(dealId)
  if (!deal || deal.orderStage === stage) return
  updateDeal(dealId, { orderStage: stage })
  logSystemMessageForConversation(
    deal.conversationId,
    `Order update: ${ORDER_STAGE_LABELS[stage].toLowerCase()}. — ${by}`
  )
}

function updateCosting(dealId: string, patch: Partial<Deal["costing"]>) {
  restoreOnce()
  const deal = findDeal(dealId)
  if (!deal) return
  updateDeal(dealId, { costing: { ...deal.costing, ...patch } })
}

function updateContracting(dealId: string, patch: Partial<Deal["contracting"]>) {
  restoreOnce()
  const deal = findDeal(dealId)
  if (!deal) return
  updateDeal(dealId, { contracting: { ...deal.contracting, ...patch } })
}

function updateCompliance(dealId: string, patch: Partial<Deal["compliance"]>) {
  restoreOnce()
  const deal = findDeal(dealId)
  if (!deal) return
  updateDeal(dealId, { compliance: { ...deal.compliance, ...patch } })
}

function updatePayment(dealId: string, patch: Partial<Deal["payment"]>) {
  restoreOnce()
  const deal = findDeal(dealId)
  if (!deal) return
  updateDeal(dealId, { payment: { ...deal.payment, ...patch } })
}

/** Shipment CRUD works any time a deal is active, not gated to
 *  `stage === "shipping"` — freight is often booked well ahead of the
 *  pipeline visually reaching that stage, and this is the "major thing"
 *  a KAM needs to be able to track regardless of where the rest of the
 *  paperwork stands. */
type OptionalShipmentField =
  | "demurrageUsd"
  | "claim"
  | "stage"
  | "cutoffs"
  | "documents"
  | "coldChain"
  | "harvestAt"
  | "shelfLifeBudgetDays"
  | "bookingReference"
  | "containerId"

function addShipment(
  dealId: string,
  input: Omit<Shipment, "id" | "createdAt" | "updatedAt" | OptionalShipmentField> &
    Partial<Pick<Shipment, OptionalShipmentField>>
): Shipment {
  restoreOnce()
  const deal = findDeal(dealId)
  if (!deal) throw new Error(`No deal ${dealId}`)
  const now = new Date().toISOString()
  const shipment: Shipment = {
    demurrageUsd: null,
    claim: null,
    stage: "container-booked",
    cutoffs: { gateIn: null, vgm: null, shippingInstruction: null },
    documents: [],
    coldChain: null,
    harvestAt: null,
    shelfLifeBudgetDays: null,
    bookingReference: null,
    containerId: null,
    ...input,
    id: generateId("ship"),
    createdAt: now,
    updatedAt: now,
  }
  updateDeal(dealId, { shipments: [...deal.shipments, shipment] })
  return shipment
}

function updateShipment(dealId: string, shipmentId: string, patch: Partial<Omit<Shipment, "id" | "createdAt">>) {
  restoreOnce()
  const deal = findDeal(dealId)
  if (!deal) return
  const now = new Date().toISOString()
  updateDeal(dealId, {
    shipments: deal.shipments.map((shipment) =>
      shipment.id === shipmentId ? { ...shipment, ...patch, updatedAt: now } : shipment
    ),
  })
}

/** Logs one real tracking checkpoint and keeps the shipment's own summary
 *  fields (`status`/`currentLocation`/`eta`) in step with it — a single
 *  form submission ("we departed Nhava Sheva, ETA the 12th") updates
 *  everything the tracker reads, rather than needing three separate edits
 *  that could drift out of sync. */
function addShipmentEvent(
  dealId: string,
  shipmentId: string,
  input: { type: ShipmentEventType; label: string; location: string | null; note: string | null },
  derived: { status?: ShipmentStatus; currentLocation?: string | null; eta?: string | null } = {}
): ShipmentEvent {
  restoreOnce()
  const deal = findDeal(dealId)
  if (!deal) throw new Error(`No deal ${dealId}`)
  const shipment = deal.shipments.find((entry) => entry.id === shipmentId)
  if (!shipment) throw new Error(`No shipment ${shipmentId} on deal ${dealId}`)
  const now = new Date().toISOString()
  const event: ShipmentEvent = { ...input, id: generateId("event"), at: now }
  updateShipment(dealId, shipmentId, {
    events: [...shipment.events, event],
    status: derived.status ?? shipment.status,
    stage: STAGE_BY_EVENT[input.type] ?? shipment.stage,
    currentLocation: derived.currentLocation ?? input.location ?? shipment.currentLocation,
    eta: derived.eta ?? shipment.eta,
  })
  return event
}

/** A fresh temperature/humidity reading on a shipment's cold-chain log —
 *  appended, never edited, so a claim or an audit can trust the record
 *  reflects what a sensor actually reported at the time. No-op on a
 *  shipment with no `coldChain` set (a leg that was never temperature-
 *  controlled has nothing to log). */
function addTemperatureSample(
  dealId: string,
  shipmentId: string,
  input: { tempC: number; leg: string }
): void {
  restoreOnce()
  const deal = findDeal(dealId)
  const shipment = deal?.shipments.find((entry) => entry.id === shipmentId)
  if (!shipment?.coldChain) return
  const sample: TemperatureSample = { ...input, id: generateId("temp"), at: new Date().toISOString() }
  updateShipment(dealId, shipmentId, {
    coldChain: { ...shipment.coldChain, samples: [...shipment.coldChain.samples, sample] },
  })
}

/** Moves one document gate along — submitted, verified, or (rarely) back
 *  to missing if something was rejected. The single mutation the reference
 *  this pipeline is built from calls the whole job of a "document control"
 *  stage: nothing here blocks anything by itself, `documentBlockers()` in
 *  `logistics.ts` is what reads this list back as gates. */
function setDocumentStatus(
  dealId: string,
  shipmentId: string,
  documentId: string,
  status: LogisticsDocumentStatus
) {
  restoreOnce()
  const deal = findDeal(dealId)
  const shipment = deal?.shipments.find((entry) => entry.id === shipmentId)
  if (!shipment) return
  updateShipment(dealId, shipmentId, {
    documents: shipment.documents.map((doc) => (doc.id === documentId ? { ...doc, status } : doc)),
  })
}

/** The buyer's (or, rarer, the seller's) dispute once cargo has actually
 *  landed — a shipment can only ever carry one live claim at a time, same
 *  as the seeded data already assumes. */
function raiseClaim(
  dealId: string,
  shipmentId: string,
  input: { reason: string; amountUsd: number; raisedBy: "buyer" | "seller" }
) {
  restoreOnce()
  const deal = findDeal(dealId)
  const shipment = deal?.shipments.find((entry) => entry.id === shipmentId)
  if (!shipment || shipment.claim) return
  const claim: ShipmentClaim = {
    ...input,
    status: "open",
    raisedAt: new Date().toISOString(),
    resolvedAt: null,
    resolutionNote: null,
  }
  updateShipment(dealId, shipmentId, { claim })
}

/** `GateBar`-ready progress: how many of the fixed stages are behind this
 *  deal, out of the total, plus a `TradeStatus` for its color — `paid` is
 *  on-track/done, everything else in flight is on-track too since there's
 *  no real "at risk" signal to derive here yet; only a declined deal (which
 *  never reaches this function's caller, since it has no `stage`) would
 *  read as anything else. */
function dealStageProgress(deal: Deal): { cleared: number; total: number; status: TradeStatus } {
  const total = DEAL_STAGE_ORDER.length
  if (!deal.stage) return { cleared: 0, total, status: "watch" }
  const cleared = DEAL_STAGE_ORDER.indexOf(deal.stage) + 1
  return { cleared, total, status: "on-track" }
}

export {
  useDeals,
  dealsForConversation,
  latestDealForConversation,
  conversationIsAgreed,
  proposeDeal,
  counterProposal,
  commentOnRound,
  latestRound,
  awaitingResponseFrom,
  confirmDeal,
  declineDeal,
  assignKam,
  requestContract,
  advanceStage,
  setOrderStage,
  updateCosting,
  updateContracting,
  updateCompliance,
  updatePayment,
  addShipment,
  updateShipment,
  addShipmentEvent,
  addTemperatureSample,
  setDocumentStatus,
  raiseClaim,
  dealStageProgress,
  seedDealsIfEmpty,
}
