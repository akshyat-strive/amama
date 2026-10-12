"use client"

import * as React from "react"

import * as W from "@/features/tradechain/demo-world"

/**
 * The demo world is static seed. This module is what lets people act on
 * it: every click on a trade screen becomes an entry in an action log,
 * kept in this browser's localStorage, and the log is replayed on top of a
 * pristine copy of the seed — so the board, the stage rail, the documents
 * and the clocks all move together, the same way a backend would move them.
 *
 * Nothing leaves the browser. Replaying from the seed (rather than mutating
 * forward) is what makes Reset exact and keeps two tabs consistent.
 */

const STORAGE_KEY = "amama.tradechain.actions.v1"

type Actor = { party: W.PartyKind; id: string }

type LiveAction =
  | { kind: "task"; tradeId: string; stage: W.StageNo; taskId: string; label: string; done: boolean }
  | { kind: "document"; tradeId: string; stage: W.StageNo; name: string; status: W.DocStatus; note?: string }
  | { kind: "complete-stage"; tradeId: string; stage: W.StageNo; note?: string }
  | { kind: "flag"; tradeId: string; stage: W.StageNo; scenario: "B" | "C" | "D"; note: string }
  | { kind: "resolve"; tradeId: string; stage: W.StageNo; note: string }
  | { kind: "note"; tradeId: string; stage: W.StageNo; summary: string }
  | { kind: "raise-change"; request: Omit<W.ChangeRequest, "id" | "raisedAt" | "raisedBy" | "status" | "decidedBy" | "decidedAt" | "decisionNote" | "revisedPlan"> }
  | { kind: "decide-change"; id: string; status: "approved" | "rejected" | "withdrawn"; note: string }
  | { kind: "raise-claim"; claim: Pick<W.Claim, "tradeId" | "reason" | "detail" | "affectedMt" | "claimedUsd" | "photos"> }
  | { kind: "decide-claim"; id: string; resolution: "credit" | "replacement" | "rejected"; settledUsd: number; note: string }

type LogEntry = LiveAction & { seq: number; at: string; actor: Actor }

/* ── the clock ──────────────────────────────────────────────────────── */

/** Actions happen just after the demo's frozen NOW, a few minutes apart,
 *  so every countdown on screen stays coherent with them. */
const NOW_MS = new Date(W.NOW).getTime()
const stampFor = (seq: number) => new Date(NOW_MS + seq * 3 * 60_000).toISOString()

/* ── seed snapshot ──────────────────────────────────────────────────── */

const TABLES = {
  trades: W.TRADES,
  records: W.STAGE_RECORDS,
  documents: W.DOCUMENTS,
  events: W.EVENTS,
  notifications: W.NOTIFICATIONS,
  containers: W.CONTAINERS,
  shipments: W.SHIPMENTS,
  fulfilment: W.ORDER_FULFILMENT,
  changes: W.CHANGE_REQUESTS,
  claims: W.CLAIMS,
}

type Tables = typeof TABLES

let snapshot: { [K in keyof Tables]: Tables[K] } | null = null

function takeSnapshot() {
  if (snapshot) return
  snapshot = structuredClone(TABLES)
}

function restoreSnapshot() {
  if (!snapshot) return
  for (const key of Object.keys(TABLES) as (keyof Tables)[]) {
    const table = TABLES[key] as unknown[]
    table.splice(0, table.length, ...(structuredClone(snapshot[key]) as unknown[]))
  }
}

/* ── helpers the replay uses ────────────────────────────────────────── */

function ownerFor(stage: W.StageNo, tradeId: string): string {
  const record = W.stageRecord(tradeId, stage)
  if (record) return record.ownerId
  const role = W.stageByNo(stage).ownerRole
  return W.INTERNAL_USERS.find((user) => user.role === role)?.id ?? "u-vikram"
}

function actorName(actor: Actor): string {
  if (actor.party === "internal") return W.userById(actor.id)?.name ?? "AMAMA"
  if (actor.party === "buyer") return W.buyerById(actor.id)?.company ?? "Buyer"
  return W.sellerById(actor.id)?.entity ?? "Grower"
}

function pushEvent(entry: LogEntry, tradeId: string, kind: W.EventKind, summary: string, stage?: W.StageNo, subject?: W.EntityRef) {
  W.EVENTS.push({
    id: `ev-live-${entry.seq}`,
    at: entry.at,
    kind,
    tradeId,
    actorId: entry.actor.id,
    summary,
    subject: subject ?? { kind: "trade", id: tradeId },
    stage,
  })
}

function pushNotification(
  entry: LogEntry,
  level: W.Severity,
  title: string,
  body: string,
  tradeId: string,
  ownerRole: W.InternalRoleId,
  stage: W.StageNo | null
) {
  W.NOTIFICATIONS.push({
    id: `nt-live-${entry.seq}`,
    level,
    title,
    body,
    at: entry.at,
    tradeId,
    ownerRole,
    read: false,
    subject: { kind: "trade", id: tradeId },
    stage,
  })
}

function ensureRecord(trade: W.Trade, stage: W.StageNo): W.StageRecord {
  const existing = W.stageRecord(trade.id, stage)
  if (existing) return existing
  const record: W.StageRecord = {
    id: `SR-${trade.id.split("-").pop()}-${String(stage).padStart(2, "0")}`,
    tradeId: trade.id,
    stage,
    state: "pending",
    ownerId: ownerFor(stage, trade.id),
    startedAt: null,
    completedAt: null,
    scenario: "A",
    outcome: "Not reached.",
    slaMet: null,
    documentIds: [],
  }
  W.STAGE_RECORDS.push(record)
  return record
}

function upsertDocument(trade: W.Trade, stage: W.StageNo, name: string): W.TradeDocument | null {
  const existing = W.DOCUMENTS.find((document) => document.tradeId === trade.id && document.stage === stage && document.name === name)
  if (existing) return existing
  const spec = W.stageByNo(stage).docs.find((doc) => doc.name === name)
  if (!spec) return null
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  const document: W.TradeDocument = {
    id: `${trade.id}-${stage}-${slug}`,
    tradeId: trade.id,
    stage,
    name,
    requirement: spec.requirement,
    issuer: spec.issuer,
    why: spec.why,
    status: "PENDING",
    issuedOn: null,
    expiresOn: null,
    verifiedBy: null,
    verifiedAt: null,
    blocks: [],
    attachedTo: null,
    note: null,
  }
  W.DOCUMENTS.push(document)
  return document
}

/** After a stage closes, the physical records it governs move too — the
 *  bits of the world other screens read straight from. */
function sideEffectsOfCompletion(trade: W.Trade, stage: W.StageNo, at: string) {
  const container = W.containerForTrade(trade.id)
  const shipment = W.shipmentForTrade(trade.id)
  const fulfilment = W.fulfilmentForTrade(trade.id)
  const milestone = (key: string) => shipment?.milestones.find((entry) => entry.key === key)

  if (stage === 10 && container) {
    container.stuffedAt ??= at
    container.doorCloseAt ??= at
    if (!container.vgmFiledAt) container.vgmFiledAt = at
    container.state = "sealed"
  }
  if (stage === 13) {
    if (container) {
      container.gateInAt = at
      container.state = "gated-in"
    }
    const gate = milestone("gatein")
    if (gate) {
      gate.actualAt = at
      gate.state = "complete"
    }
  }
  if (stage === 14 && shipment) {
    shipment.ata ??= at
    shipment.status = "arrived"
    const arrive = milestone("arrive")
    if (arrive) {
      arrive.actualAt = at
      arrive.state = "complete"
    }
  }
  if (stage === 15) {
    if (shipment) shipment.status = "delivered"
    if (container) container.state = "delivered"
    const pod = milestone("pod")
    if (pod) {
      pod.actualAt = at
      pod.state = "complete"
    }
  }
  if (stage === 16 && fulfilment) {
    fulfilment.balanceReceivedAt ??= at
  }
}

/* ── replay ─────────────────────────────────────────────────────────── */

function apply(entry: LogEntry) {
  const by = actorName(entry.actor)

  switch (entry.kind) {
    case "task": {
      if (entry.done) pushEvent(entry, entry.tradeId, "notification", `${entry.label} — done by ${by}`, entry.stage)
      return
    }

    case "note": {
      pushEvent(entry, entry.tradeId, "logistics", entry.summary, entry.stage)
      return
    }

    case "document": {
      const trade = W.tradeById(entry.tradeId)
      if (!trade) return
      const document = upsertDocument(trade, entry.stage, entry.name)
      if (!document) return
      document.status = entry.status
      if (entry.status === "VERIFIED") {
        document.verifiedBy = entry.actor.id
        document.verifiedAt = entry.at
        document.issuedOn ??= entry.at
        document.blocks = []
      } else {
        document.verifiedBy = null
        document.verifiedAt = null
        if (entry.status === "PENDING") document.issuedOn = entry.at
      }
      if (entry.note) document.note = entry.note
      const verb =
        entry.status === "VERIFIED" ? "verified" : entry.status === "REJECTED" ? "rejected" : entry.status === "NA" ? "marked not applicable" : "uploaded"
      pushEvent(entry, trade.id, "document", `${entry.name} ${verb} by ${by}`, entry.stage, { kind: "document", id: document.id })
      return
    }

    case "complete-stage": {
      const trade = W.tradeById(entry.tradeId)
      if (!trade) return
      const record = ensureRecord(trade, entry.stage)
      record.state = "complete"
      record.startedAt ??= entry.at
      record.completedAt = entry.at
      record.slaMet ??= true
      record.outcome = `${record.outcome}${entry.note ? ` ${entry.note}` : ""} Closed by ${by}.`
      sideEffectsOfCompletion(trade, entry.stage, entry.at)

      if (entry.stage === 16) {
        trade.status = "closed"
        trade.nextAction = { label: "Archive the trade file", ownerRole: "finance", dueAt: entry.at }
      } else if (entry.stage === trade.currentStage) {
        // Advance to the first stage after this one that is not already
        // done — booking and document control often close in parallel.
        let next = (entry.stage + 1) as W.StageNo
        while (next < 16 && W.stageRecord(trade.id, next)?.state === "complete") next = (next + 1) as W.StageNo
        const nextStage = W.stageByNo(next)
        const nextRecord = ensureRecord(trade, next)
        if (nextRecord.state === "pending") {
          nextRecord.state = "in-progress"
          nextRecord.startedAt = entry.at
          nextRecord.outcome = `Opened when stage ${String(entry.stage).padStart(2, "0")} closed. ${nextStage.trigger}.`
        }
        trade.currentStage = next
        if (trade.status !== "closed") trade.status = "active"
        trade.nextAction = {
          label: nextStage.humanAction,
          ownerRole: nextStage.ownerRole,
          dueAt: new Date(new Date(entry.at).getTime() + 24 * 3_600_000).toISOString(),
        }
      }
      pushEvent(entry, trade.id, "stage-advanced", `Stage ${String(entry.stage).padStart(2, "0")} ${W.stageByNo(entry.stage).short} complete — closed by ${by}`, entry.stage)
      return
    }

    case "flag": {
      const trade = W.tradeById(entry.tradeId)
      if (!trade) return
      const record = ensureRecord(trade, entry.stage)
      const chain = W.stageByNo(entry.stage).scenarios[entry.scenario]
      // Keep what already happened at this stage — the chain is added to it.
      record.outcome = record.state === "pending" ? `${chain.trigger}. ${entry.note}` : `${record.outcome} Then: ${entry.note}`
      record.scenario = entry.scenario
      record.state = entry.scenario === "B" ? "in-progress" : "blocked"
      record.startedAt ??= entry.at
      if (entry.scenario === "B") record.slaMet = false
      trade.status = entry.scenario === "B" ? "at-risk" : "blocked"
      trade.nextAction = { label: chain.steps[chain.steps.length - 1], ownerRole: chain.owner, dueAt: trade.nextAction.dueAt }
      const level: W.Severity = entry.scenario === "C" ? "CRITICAL" : entry.scenario === "D" ? "ACTION" : "WARNING"
      pushNotification(entry, level, `${chain.trigger} — stage ${String(entry.stage).padStart(2, "0")}`, entry.note, trade.id, chain.owner, entry.stage)
      pushEvent(entry, trade.id, "notification", `Chain ${entry.scenario} opened at stage ${String(entry.stage).padStart(2, "0")} by ${by}: ${entry.note}`, entry.stage)
      return
    }

    case "resolve": {
      const trade = W.tradeById(entry.tradeId)
      if (!trade) return
      const record = ensureRecord(trade, entry.stage)
      record.state = "in-progress"
      record.outcome = `${record.outcome} Resolved: ${entry.note}`
      trade.status = "active"
      pushEvent(entry, trade.id, "notification", `Stage ${String(entry.stage).padStart(2, "0")} issue resolved by ${by}: ${entry.note}`, entry.stage)
      return
    }

    case "raise-change": {
      const trade = W.tradeById(entry.request.tradeId)
      if (!trade) return
      const id = `CR-2026-${String(100 + entry.seq).padStart(4, "0")}`
      W.CHANGE_REQUESTS.push({
        ...entry.request,
        id,
        raisedAt: entry.at,
        raisedBy: { party: entry.actor.party, id: entry.actor.id },
        status: "awaiting-approval",
        decidedBy: null,
        decidedAt: null,
        decisionNote: null,
        revisedPlan: null,
      })
      const record = W.stageRecord(trade.id, trade.currentStage)
      if (record && record.scenario === "A" && record.state !== "complete") record.scenario = "E"
      pushNotification(
        entry,
        "ACTION",
        `Change request awaiting approval — ${entry.request.kind}`,
        `${by} asked to change ${entry.request.kind} on ${trade.id}: ${entry.request.from} → ${entry.request.to}.`,
        trade.id,
        entry.request.approverRole,
        trade.currentStage
      )
      pushEvent(entry, trade.id, "commercial", `${id} raised by ${by} — ${entry.request.kind}: ${entry.request.from} → ${entry.request.to}`, trade.currentStage)
      return
    }

    case "decide-change": {
      const request = W.changeRequestById(entry.id)
      const trade = request ? W.tradeById(request.tradeId) : undefined
      if (!request || !trade || request.status !== "awaiting-approval") return
      request.status = entry.status
      request.decidedAt = entry.at
      request.decisionNote = entry.note || null
      if (entry.status !== "withdrawn") request.decidedBy = entry.actor.id
      if (entry.status === "approved") {
        Object.assign(trade, request.patch)
        const revision = W.CHANGE_REQUESTS.filter((other) => other.tradeId === trade.id && other.status === "approved").length + 1
        const day = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(entry.at))
        request.revisedPlan = `Rev ${revision} · ${day}`
      }
      const verb = entry.status === "approved" ? "approved — revised trade plan issued" : entry.status
      pushEvent(entry, trade.id, "commercial", `${request.id} ${verb} by ${by}`, trade.currentStage)
      return
    }

    case "raise-claim": {
      const trade = W.tradeById(entry.claim.tradeId)
      if (!trade) return
      const id = `CL-2026-${String(100 + entry.seq).padStart(4, "0")}`
      W.CLAIMS.push({
        ...entry.claim,
        id,
        raisedBy: entry.actor.id,
        raisedAt: entry.at,
        rootCause: null,
        resolution: null,
        settledUsd: null,
        settledAt: null,
        status: "open",
      })
      const record = ensureRecord(trade, 15)
      record.scenario = "C"
      record.state = "blocked"
      record.outcome = `Cargo arrived with a ${entry.claim.reason} issue — ${entry.claim.detail} Claim ${id} raised by ${by}.`
      trade.status = "at-risk"
      trade.nextAction = { label: "Trace the claim through the lot chain and resolve it", ownerRole: "kam", dueAt: trade.nextAction.dueAt }
      pushNotification(entry, "CRITICAL", `Claim raised — ${entry.claim.reason}`, `${by} raised ${id} on ${trade.id}: ${entry.claim.affectedMt} MT, USD ${entry.claim.claimedUsd.toLocaleString("en-US")}.`, trade.id, "kam", 15)
      pushEvent(entry, trade.id, "qc-decision", `${id} raised by ${by} — ${entry.claim.affectedMt} MT, ${entry.claim.reason}`, 15)
      return
    }

    case "decide-claim": {
      const claim = W.CLAIMS.find((entry2) => entry2.id === entry.id)
      const trade = claim ? W.tradeById(claim.tradeId) : undefined
      if (!claim || !trade) return
      claim.resolution = entry.resolution
      claim.settledUsd = entry.settledUsd
      claim.settledAt = entry.at
      claim.status = entry.resolution === "rejected" ? "rejected" : "settled"
      claim.rootCause = entry.note || claim.rootCause
      const record = ensureRecord(trade, 15)
      if (record.state === "blocked") record.state = "in-progress"
      trade.status = "active"
      pushEvent(entry, trade.id, "commercial", `${claim.id} ${claim.status === "rejected" ? "rejected" : `settled by ${entry.resolution}`} — ${by}`, 15)
      return
    }
  }
}

/* ── store ──────────────────────────────────────────────────────────── */

let log: LogEntry[] = []
let version = 0
let hydrated = false
/** True once a saved log has been replayed over the seed on this load. */
let replayed = false
const listeners = new Set<() => void>()

function emit() {
  version += 1
  listeners.forEach((listener) => listener())
}

function replay() {
  takeSnapshot()
  restoreSnapshot()
  for (const entry of log) apply(entry)
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(log))
  } catch {
    // Storage full or blocked — the session still works, it just won't survive a reload.
  }
}

/** Loads the saved log once per page load and replays it. Returns whether
 *  anything was replayed — the boundary remounts the page only then. */
function hydrate(): boolean {
  if (hydrated || typeof window === "undefined") return false
  hydrated = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    log = raw ? (JSON.parse(raw) as LogEntry[]) : []
  } catch {
    log = []
  }
  if (log.length === 0) return false
  replay()
  replayed = true
  emit()
  return true
}

function perform(action: LiveAction, actor: Actor) {
  hydrate()
  const seq = (log[log.length - 1]?.seq ?? 0) + 1
  const entry = { ...action, seq, at: stampFor(seq), actor } as LogEntry
  log = [...log, entry]
  takeSnapshot()
  apply(entry)
  persist()
  emit()
}

function resetLiveWorld() {
  log = []
  persist()
  replay()
  emit()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Re-renders the caller whenever an action changes the world, and makes
 *  sure the saved log has been replayed. */
function useLiveWorld(): number {
  const current = React.useSyncExternalStore(subscribe, () => version, () => 0)
  React.useEffect(() => {
    hydrate()
  }, [])
  return current
}

/** 0 until a saved log has been replayed on this page load, then 1 — the
 *  key `LiveWorldBoundary` remounts its page with. */
function useReplayGeneration(): number {
  const generation = React.useSyncExternalStore(subscribe, () => (replayed ? 1 : 0), () => 0)
  React.useEffect(() => {
    hydrate()
  }, [])
  return generation
}

/** Whether a checklist task is ticked — the last toggle wins. */
function isTaskDone(tradeId: string, stage: W.StageNo, taskId: string): boolean {
  for (let index = log.length - 1; index >= 0; index -= 1) {
    const entry = log[index]
    if (entry.kind === "task" && entry.tradeId === tradeId && entry.stage === stage && entry.taskId === taskId) return entry.done
  }
  return false
}

function liveActionCount(): number {
  return log.length
}

export { actorName, isTaskDone, liveActionCount, ownerFor, perform, resetLiveWorld, useLiveWorld, useReplayGeneration }
export type { Actor, LiveAction }
