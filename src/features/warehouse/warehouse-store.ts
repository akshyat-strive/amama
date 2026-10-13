"use client"

import * as W from "@/features/tradechain/demo-world"
import { createPersistentStore } from "@/features/local-db/persistent-store"

/**
 * amama's warehouses — one today (Mumbai), modelled as a list so a second
 * site is a seed entry, not a schema change — and what moves through
 * them: inbound lots from growers (with the grower's own QC and ours on
 * arrival) and outbound dispatches to the port.
 */

export type Warehouse = { id: string; name: string; city: string; address: string; gps: [number, number]; capacityMt: number }

export type QcCheck = { label: string; value: string; ok: boolean }

export type QcReport = {
  by: string
  at: string
  verdict: "passed" | "hold" | "rejected" | "pending"
  checks: QcCheck[]
  note: string | null
}

export type Inbound = {
  id: string
  warehouseId: string
  grn: string | null
  tradeId: string
  sellerId: string
  productId: string
  lot: string
  expectedMt: number
  receivedMt: number | null
  vehicle: string
  eta: string
  arrivedAt: string | null
  status: "in-transit" | "arrived" | "stored" | "rejected"
  farmQc: QcReport
  amamaQc: QcReport
  bay: string | null
}

export type Outbound = {
  id: string
  warehouseId: string
  tradeId: string
  buyerId: string
  productId: string
  qtyMt: number
  container: string
  port: string
  scheduledAt: string
  dispatchedAt: string | null
  status: "scheduled" | "loading" | "dispatched"
}

export const WAREHOUSES: Warehouse[] = [
  {
    id: "wh-mumbai",
    name: "amama Mumbai DC",
    city: "Mumbai",
    address: "Bhiwandi logistics park, Thane, Maharashtra",
    gps: [19.2967, 73.0631],
    capacityMt: 2400,
  },
]

const day = (base: string, offset: number) => new Date(new Date(base).getTime() + offset * 86_400_000).toISOString()
const pick = <T,>(list: readonly T[], seed: number) => list[Math.abs(seed) % list.length]
const hash = (text: string) => [...text].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7)

const FARM_CHECKS: Record<string, [string, (seed: number) => string][]> = {
  default: [
    ["Moisture", (seed) => `${(8 + (seed % 30) / 10).toFixed(1)}%`],
    ["Foreign matter", (seed) => `${((seed % 9) / 10).toFixed(1)}%`],
    ["Size / count", (seed) => pick(["Within spec", "Within spec", "Slightly mixed"], seed)],
  ],
  apple: [
    ["Firmness", (seed) => `${(15 + (seed % 40) / 10).toFixed(1)} lb`],
    ["Brix", (seed) => `${(12 + (seed % 25) / 10).toFixed(1)}°`],
    ["Colour cover", (seed) => `${70 + (seed % 25)}%`],
  ],
}

function qc(productId: string, seed: number, by: string, at: string, verdict: QcReport["verdict"]): QcReport {
  const checks = (FARM_CHECKS[productId] ?? FARM_CHECKS.default).map(([label, value], index) => ({
    label,
    value: verdict === "pending" ? "—" : value(seed + index * 13),
    ok: verdict !== "rejected" || index !== 0,
  }))
  return { by, at, verdict, checks, note: verdict === "hold" ? "Moisture at the top of the band — re-test after 24 h drying." : verdict === "rejected" ? "Mould on 3 of 20 sampled bags." : null }
}

const VEHICLES = ["MH-04-KT-2281", "MH-12-QJ-0458", "HP-09-B-7714", "KA-19-MN-3320", "KL-07-CF-1192", "GJ-06-ZX-5501", "MH-15-EK-8842", "RJ-14-GT-6630"]
const INSPECTORS = ["Arun Das", "Pradeep Rao"]

function seedInbound(): Inbound[] {
  const rows: Inbound[] = []
  for (const trade of W.TRADES) {
    if (trade.currentStage < 3) continue
    trade.sellerIds.forEach((sellerId, sellerIndex) => {
      const seller = W.sellerById(sellerId)
      const lots = 2 + (hash(trade.id + sellerId) % 2)
      for (let lot = 0; lot < lots; lot++) {
        const seed = hash(`${trade.id}-${sellerId}-${lot}`)
        const expected = Math.max(4, Math.round(trade.qtyContractedMt / trade.sellerIds.length / lots))
        const arrived = trade.currentStage >= 5 || (trade.currentStage === 4 && lot === 0)
        const stored = trade.currentStage >= 6
        const rejected = !stored && arrived && seed % 11 === 0
        const eta = day(trade.contractSignedAt, 6 + lot * 2 + sellerIndex)
        const verdict: QcReport["verdict"] = !arrived ? "pending" : rejected ? "rejected" : stored ? "passed" : seed % 4 === 0 ? "hold" : "pending"
        rows.push({
          id: `in-${trade.id}-${sellerId}-${lot}`,
          warehouseId: "wh-mumbai",
          grn: arrived ? `GRN-MUM-${String(seed % 90000 + 10000)}` : null,
          tradeId: trade.id,
          sellerId,
          productId: trade.productId,
          lot: `LOT-${trade.id.slice(-4)}-${String.fromCharCode(65 + sellerIndex)}${lot + 1}`,
          expectedMt: expected,
          receivedMt: arrived ? Math.max(1, expected - (seed % 3) * 0.5) : null,
          vehicle: pick(VEHICLES, seed),
          eta,
          arrivedAt: arrived ? day(eta, seed % 2) : null,
          status: rejected ? "rejected" : stored ? "stored" : arrived ? "arrived" : "in-transit",
          farmQc: qc(trade.productId, seed, seller?.entity ?? "Grower", day(eta, -2), "passed"),
          amamaQc: qc(trade.productId, seed + 5, pick(INSPECTORS, seed), day(eta, 1), verdict),
          bay: stored ? `${pick(["CR", "DR", "AM"], seed)}-${String((seed % 18) + 1).padStart(2, "0")}` : null,
        })
      }
    })
  }
  return rows.sort((a, b) => b.eta.localeCompare(a.eta))
}

const PORTS = ["Nhava Sheva (JNPT)", "Mundra", "Mumbai Port"]

function seedOutbound(): Outbound[] {
  return W.TRADES.filter((trade) => trade.currentStage >= 9)
    .flatMap((trade) => {
      const containers = Math.max(1, Math.round(trade.qtyContractedMt / 20))
      return Array.from({ length: Math.min(containers, 3) }, (_, index) => {
        const seed = hash(`${trade.id}-out-${index}`)
        const dispatched = trade.currentStage >= 11
        return {
          id: `out-${trade.id}-${index}`,
          warehouseId: "wh-mumbai",
          tradeId: trade.id,
          buyerId: trade.buyerId,
          productId: trade.productId,
          qtyMt: Math.round(trade.qtyContractedMt / Math.min(containers, 3)),
          container: `${pick(["MSKU", "MSCU", "CMAU", "HLBU"], seed)}${String(seed % 9000000 + 1000000)}`,
          port: pick(PORTS, seed),
          scheduledAt: day(trade.contractSignedAt, 18 + index),
          dispatchedAt: dispatched ? day(trade.contractSignedAt, 18 + index) : null,
          status: dispatched ? ("dispatched" as const) : trade.currentStage === 10 ? ("loading" as const) : ("scheduled" as const),
        }
      })
    })
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
}

const inboundStore = createPersistentStore<Inbound[]>("amama.warehouse.inbound", seedInbound, [])
const outboundStore = createPersistentStore<Outbound[]>("amama.warehouse.outbound", seedOutbound, [])

function recordAmamaQc(id: string, verdict: "passed" | "hold" | "rejected", by: string, note: string | null) {
  inboundStore.set((rows) =>
    rows.map((row) => {
      if (row.id !== id) return row
      const report = qc(row.productId, hash(row.id) + 5, by, new Date().toISOString(), verdict)
      return {
        ...row,
        amamaQc: { ...report, note: note ?? report.note },
        status: verdict === "rejected" ? "rejected" : verdict === "passed" ? "stored" : "arrived",
        bay: verdict === "passed" ? row.bay ?? `CR-${String((hash(row.id) % 18) + 1).padStart(2, "0")}` : null,
      }
    })
  )
}

function markArrived(id: string) {
  inboundStore.set((rows) =>
    rows.map((row) =>
      row.id === id
        ? { ...row, status: "arrived", arrivedAt: new Date().toISOString(), receivedMt: row.expectedMt, grn: row.grn ?? `GRN-MUM-${String((hash(row.id) % 90000) + 10000)}` }
        : row
    )
  )
}

function markDispatched(id: string) {
  outboundStore.set((rows) => rows.map((row) => (row.id === id ? { ...row, status: "dispatched", dispatchedAt: new Date().toISOString() } : row)))
}

const useInbound = () => inboundStore.use()
const useOutbound = () => outboundStore.use()

export { useInbound, useOutbound, recordAmamaQc, markArrived, markDispatched }
