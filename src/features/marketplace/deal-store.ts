"use client"

import * as React from "react"

import { logSystemMessageForConversation } from "@/features/marketplace/conversation-store"
import type { TradeStatus } from "@/features/dashboard/dashboard-ui"

const STORAGE_KEY = "amama.marketplace.deals"

export type DealStatus = "proposed" | "declined" | "active"

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

export type ShipmentStatus = "booked" | "in-transit" | "arrived" | "delayed"

export type Shipment = {
  id: string
  carrier: string
  documentNumber: string
  status: ShipmentStatus
  eta: string | null
  note: string | null
  createdAt: string
  updatedAt: string
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
  agreedPricePerTonneUsd: number
  agreedQuantityMt: number
  proposedAt: string
  respondedAt: string | null
  declineReason: string | null

  /** `null` until `status === "active"` — nothing to stage before both
   *  sides have actually confirmed. */
  stage: DealStage | null
  stageHistory: DealStageHistoryEntry[]

  assignedKamId: string | null
  assignedKamName: string | null
  assignmentHistory: DealAssignmentEntry[]

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
    if (raw) snapshot = JSON.parse(raw)
  } catch {
    // Private mode or blocked storage — carry on with nothing proposed yet.
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

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount)
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
}): Deal {
  restoreOnce()
  const now = new Date().toISOString()
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

    stage: null,
    stageHistory: [],

    assignedKamId: null,
    assignedKamName: null,
    assignmentHistory: [],

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
  logSystemMessageForConversation(
    input.conversationId,
    `${input.proposerName} proposed a deal: ${formatUsd(input.agreedPricePerTonneUsd)}/t × ${input.agreedQuantityMt} MT.`
  )
  return deal
}

function confirmDeal(dealId: string, confirmedBy: "buyer" | "seller", confirmerName: string) {
  restoreOnce()
  const deal = findDeal(dealId)
  if (!deal || deal.status !== "proposed") return
  const now = new Date().toISOString()
  updateDeal(dealId, {
    status: "active",
    respondedAt: now,
    stage: "costing",
    stageHistory: [
      { stage: "costing", at: now, by: "System", note: "Deal finalized — pipeline started" },
    ],
  })
  logSystemMessageForConversation(deal.conversationId, `${confirmerName} confirmed the deal — it's now active.`)
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
  updateDeal(dealId, {
    status: "declined",
    respondedAt: new Date().toISOString(),
    declineReason: reason,
  })
  logSystemMessageForConversation(
    deal.conversationId,
    `${declinerName} declined the deal${reason ? `: ${reason}` : "."}`
  )
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
function addShipment(dealId: string, input: Omit<Shipment, "id" | "createdAt" | "updatedAt">): Shipment {
  restoreOnce()
  const deal = findDeal(dealId)
  if (!deal) throw new Error(`No deal ${dealId}`)
  const now = new Date().toISOString()
  const shipment: Shipment = { ...input, id: generateId("ship"), createdAt: now, updatedAt: now }
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
  proposeDeal,
  confirmDeal,
  declineDeal,
  assignKam,
  advanceStage,
  updateCosting,
  updateContracting,
  updateCompliance,
  updatePayment,
  addShipment,
  updateShipment,
  dealStageProgress,
}
