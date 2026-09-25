import * as W from "@/features/tradechain/demo-world"

/**
 * Everything a buyer, seller or internal screen needs about one trade,
 * composed from the demo world. Explicit records always win; where the
 * world holds no hand-authored row (a temperature trace for a trade other
 * than the primary one, a derived document register), the value is built
 * deterministically from the trade's own stage records, so the same trade
 * reads identically on every load and on every role's screen.
 */

const HOUR = 3_600_000
const DAY = 24 * HOUR
const NOW_MS = new Date(W.NOW).getTime()

const ms = (iso: string | null | undefined): number | null => (iso ? new Date(iso).getTime() : null)

function seeded(seed: number): () => number {
  let state = seed % 2147483647
  if (state <= 0) state += 2147483646
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

const tradeNumber = (tradeId: string): number => Number(tradeId.split("-").pop()) || 1

/* ── stage progress ──────────────────────────────────────────────────── */

function stageRecords(trade: W.Trade): W.StageRecord[] {
  return W.stageRecordsForTrade(trade.id).sort((a, b) => a.stage - b.stage)
}

function currentRecord(trade: W.Trade): W.StageRecord | undefined {
  return W.stageRecord(trade.id, trade.currentStage)
}

/** The state a stage shows on a rail, even for a trade whose records have
 *  not been authored yet — inferred from `currentStage` so the rail never
 *  renders blank. */
function stageStateFor(trade: W.Trade, stage: W.StageNo): W.StageState {
  const record = W.stageRecord(trade.id, stage)
  if (record) return record.state
  if (trade.status === "closed" || stage < trade.currentStage) return "complete"
  if (stage === trade.currentStage) return trade.status === "blocked" ? "blocked" : "in-progress"
  return "pending"
}

/** Stages that did not run the happy path — the ones worth a badge. */
function exceptionStages(trade: W.Trade): W.StageRecord[] {
  return stageRecords(trade).filter((record) => record.scenario !== "A" && record.state !== "pending")
}

/* ── cold chain ──────────────────────────────────────────────────────── */

type ColdLeg =
  | "orchard"
  | "road"
  | "pre-cool"
  | "cold-store"
  | "stuffing"
  | "port-run"
  | "terminal"
  | "sea"
  | "delivery"

const COLD_LEG_LABEL: Record<ColdLeg, string> = {
  orchard: "At farm",
  road: "Road to pack-house",
  "pre-cool": "Pre-cooling",
  "cold-store": "Cold store",
  stuffing: "Stuffing",
  "port-run": "Road to port",
  terminal: "At terminal",
  sea: "At sea",
  delivery: "Destination",
}

type TempPoint = {
  at: string
  tempC: number
  humidityPct: number
  /** Null while the cargo is not yet under temperature control. */
  setpointC: number | null
  leg: ColdLeg
  excursion: boolean
}

/** Only produce that is carried under a real set point gets a trace —
 *  rice at 20 °C in a dry box has nothing a temperature chart can say. */
function isColdChain(trade: W.Trade): boolean {
  const product = W.productById(trade.productId)
  return Boolean(product && product.setpointC <= 14)
}

/** Ambient temperature at origin during harvest, by product region. */
const FIELD_TEMP_C: Record<string, number> = {
  apple: 21.5,
  mango: 31,
  banana: 30,
  pomegranate: 29,
  grapes: 28,
  citrus: 26,
  onion: 29,
}

/** The set point this trade actually ran at — the container's, else the
 *  one its excursions were logged against, else the product default. */
function tradeSetpoint(trade: W.Trade): number | null {
  const container = W.containerForTrade(trade.id)
  if (container) return container.setpointC
  const logged = W.EXCURSIONS.find((excursion) => excursion.tradeId === trade.id)
  if (logged) return logged.setpointC
  return W.productById(trade.productId)?.setpointC ?? null
}

function harvestAt(trade: W.Trade): string | null {
  const lots = W.lotsForTrade(trade.id)
  if (lots.length > 0) {
    return lots.map((lot) => lot.shelfLifeStart).sort()[0]
  }
  const qc = W.stageRecord(trade.id, 3)
  return qc?.startedAt ?? null
}

const streamCache = new Map<string, TempPoint[] | null>()

function temperatureTrace(trade: W.Trade): TempPoint[] | null {
  if (streamCache.has(trade.id)) return streamCache.get(trade.id) ?? null
  const trace = buildTrace(trade)
  streamCache.set(trade.id, trace)
  return trace
}

function buildTrace(trade: W.Trade): TempPoint[] | null {
  if (!isColdChain(trade)) return null

  if (trade.id === W.PRIMARY_TRADE_ID) {
    return W.TEMPERATURE_STREAM.map((sample) => ({
      at: sample.at,
      tempC: sample.tempC,
      humidityPct: sample.humidityPct,
      setpointC: sample.leg === "orchard" ? null : sample.setpointC,
      leg: sample.leg,
      excursion: sample.excursion,
    }))
  }

  const product = W.productById(trade.productId)
  const harvest = ms(harvestAt(trade))
  if (!product || harvest === null || harvest > NOW_MS) return null

  const record = (stage: W.StageNo) => W.stageRecord(trade.id, stage)
  const container = W.containerForTrade(trade.id)
  const shipment = W.shipmentForTrade(trade.id)

  const anchors: { leg: ColdLeg; at: number | null }[] = [
    { leg: "orchard", at: harvest },
    { leg: "road", at: ms(record(5)?.startedAt) },
    { leg: "pre-cool", at: ms(record(6)?.startedAt ?? record(6)?.completedAt) },
    { leg: "cold-store", at: ms(record(7)?.startedAt) },
    { leg: "stuffing", at: ms(record(10)?.startedAt ?? container?.stuffedAt) },
    { leg: "port-run", at: ms(record(10)?.completedAt ?? container?.doorCloseAt) },
    { leg: "terminal", at: ms(container?.terminalPlugInAt ?? container?.gateInAt ?? record(13)?.completedAt) },
    { leg: "sea", at: ms(shipment?.atd ?? record(14)?.startedAt) },
    { leg: "delivery", at: ms(shipment?.ata ?? record(15)?.startedAt) },
  ]

  const closedAt = ms(record(15)?.completedAt) ?? ms(record(16)?.startedAt)
  const end = Math.min(NOW_MS, closedAt ?? NOW_MS)

  // Keep only anchors that happened, in order, before the trace ends.
  const legs: { leg: ColdLeg; at: number }[] = []
  for (const anchor of anchors) {
    if (anchor.at === null || anchor.at >= end) continue
    const last = legs[legs.length - 1]
    if (last && anchor.at <= last.at) continue
    legs.push({ leg: anchor.leg, at: anchor.at })
  }
  if (legs.length === 0 || end - legs[0].at < 2 * HOUR) return null

  const excursions = W.EXCURSIONS.filter((excursion) => excursion.tradeId === trade.id)
  const span = end - legs[0].at
  const step = Math.max(1, Math.ceil(span / HOUR / 240)) * HOUR

  const times = new Set<number>()
  for (let at = legs[0].at; at <= end; at += step) times.add(at)
  for (const excursion of excursions) {
    const start = ms(excursion.startedAt) ?? 0
    const length = excursion.durationMin * 60_000
    for (const fraction of [0, 0.35, 0.7, 1]) times.add(Math.round(start + length * fraction))
    times.add(start - step / 2)
    times.add(start + length + step / 2)
  }

  const random = seeded(tradeNumber(trade.id) * 97)
  const jitter = (spread: number) => (random() - 0.5) * spread
  const set = tradeSetpoint(trade) ?? product.setpointC
  const field = FIELD_TEMP_C[trade.productId] ?? 28

  const points: TempPoint[] = []
  for (const at of [...times].filter((time) => time >= legs[0].at && time <= end).sort((a, b) => a - b)) {
    const index = legs.findLastIndex((leg) => leg.at <= at)
    const leg = legs[index]
    const legEnd = legs[index + 1]?.at ?? end
    const progress = Math.min(1, (at - leg.at) / Math.max(legEnd - leg.at, HOUR))

    let tempC: number
    let humidityPct: number
    switch (leg.leg) {
      case "orchard":
        tempC = field + jitter(2.4)
        humidityPct = 55 + jitter(10)
        break
      case "road":
        tempC = field - 2 - (field - 2 - (set + (field - set) * 0.4)) * progress + jitter(0.9)
        humidityPct = 72 + jitter(6)
        break
      case "pre-cool": {
        const hours = (at - leg.at) / HOUR
        const from = set + (field - set) * 0.4
        tempC = set + 0.5 + (from - set - 0.5) * Math.exp(-hours / 2.6) + jitter(0.4)
        humidityPct = 86 + jitter(4)
        break
      }
      case "cold-store":
        tempC = set + jitter(0.8)
        humidityPct = 91 + jitter(4)
        break
      case "stuffing":
        tempC = set + 0.5 + jitter(0.6)
        humidityPct = 88 + jitter(4)
        break
      case "port-run":
        tempC = set + 0.6 + jitter(0.7)
        humidityPct = 87 + jitter(4)
        break
      case "terminal":
        tempC = set + 0.4 + jitter(0.5)
        humidityPct = 88 + jitter(3)
        break
      case "sea":
        tempC = set + jitter(0.5)
        humidityPct = 90 + jitter(3)
        break
      case "delivery":
        tempC = set + 1.2 + progress * 1.5 + jitter(0.6)
        humidityPct = 84 + jitter(5)
        break
    }

    let excursion = false
    for (const event of excursions) {
      const start = ms(event.startedAt) ?? 0
      const stop = start + event.durationMin * 60_000
      if (at >= start && at <= stop) {
        const shape = Math.sin(((at - start) / Math.max(stop - start, 1)) * Math.PI)
        tempC = event.setpointC + (event.peakTempC - event.setpointC) * Math.max(0.55, shape)
        excursion = true
      }
    }

    points.push({
      at: new Date(at).toISOString(),
      tempC: Math.round(tempC * 10) / 10,
      humidityPct: Math.round(Math.min(98, humidityPct)),
      setpointC: leg.leg === "orchard" || leg.leg === "road" ? null : set,
      leg: leg.leg,
      excursion,
    })
  }

  return points.length > 1 ? points : null
}

/* ── the three clocks ────────────────────────────────────────────────── */

type ClockTone = "ok" | "warn" | "crit" | "muted"

type Clock = { label: string; value: string; detail: string; tone: ClockTone; progress: number | null }

function shelfLifeClock(trade: W.Trade): Clock {
  const product = W.productById(trade.productId)
  const start = ms(harvestAt(trade))
  if (!product || start === null) {
    return {
      label: "Shelf life",
      value: "Not started",
      detail: `Starts at harvest · ${product?.shelfLifeDays ?? "—"} d budget`,
      tone: "muted",
      progress: null,
    }
  }
  const deliveredAt = ms(W.stageRecord(trade.id, 15)?.completedAt)
  const end = deliveredAt ?? NOW_MS
  const debit = W.EXCURSIONS.filter((excursion) => excursion.tradeId === trade.id).reduce(
    (sum, excursion) => sum + excursion.shelfLifeDebitDays,
    0
  )
  const consumed = (end - start) / DAY + debit
  const remaining = Math.max(0, product.shelfLifeDays - consumed)
  const share = remaining / product.shelfLifeDays
  return {
    label: "Shelf life",
    value: `${Math.round(remaining)} d left`,
    detail: `${Math.round(consumed)} of ${product.shelfLifeDays} d used${debit > 0 ? ` · ${debit.toFixed(1)} d lost to excursions` : ""}${deliveredAt ? " · at delivery" : ""}`,
    tone: share < 0.25 ? "crit" : share < 0.5 ? "warn" : "ok",
    progress: 1 - share,
  }
}

type Cutoff = { label: string; at: string }

function cutoffs(trade: W.Trade): Cutoff[] {
  const container = W.containerForTrade(trade.id)
  if (container) {
    return [
      { label: "Shipping instructions", at: container.cutoffSi },
      { label: "VGM", at: container.cutoffVgm },
      { label: "Gate-in", at: container.cutoffGateIn },
    ].filter((cutoff) => cutoff.at)
  }
  const shipment = W.shipmentForTrade(trade.id)
  const gateIn = shipment?.milestones.find((milestone) => milestone.key === "gatein")
  return gateIn ? [{ label: "Gate-in", at: gateIn.plannedAt }] : []
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)} h`
  return `${Math.round(hours / 24)} d`
}

function cutoffClock(trade: W.Trade): Clock {
  const gatedIn = trade.currentStage > 13 || trade.status === "closed" || W.stageRecord(trade.id, 13)?.state === "complete"
  if (gatedIn) {
    return { label: "Cut-off", value: "Cleared", detail: "Gated in before the terminal cut-off", tone: "ok", progress: null }
  }
  const list = cutoffs(trade)
  if (list.length === 0) {
    return {
      label: "Cut-off",
      value: "Not set",
      detail: "Fixed when the sailing is booked at stage 09",
      tone: "muted",
      progress: null,
    }
  }
  const next = list.find((cutoff) => (ms(cutoff.at) ?? 0) > NOW_MS)
  if (!next) {
    return { label: "Cut-off", value: "Passed", detail: "Gate-in not confirmed — rebook risk", tone: "crit", progress: 1 }
  }
  const hours = ((ms(next.at) ?? 0) - NOW_MS) / HOUR
  return {
    label: "Cut-off",
    value: `${formatHours(hours)} left`,
    detail: `${next.label} cut-off`,
    tone: hours < 2 ? "crit" : hours < 24 ? "warn" : "ok",
    progress: null,
  }
}

function paymentClock(trade: W.Trade): Clock {
  const fulfilment = W.fulfilmentForTrade(trade.id)
  if (fulfilment?.balanceReceivedAt || (trade.status === "closed" && W.stageRecord(trade.id, 16)?.state === "complete")) {
    return { label: "Payment", value: "Settled", detail: trade.paymentTerms, tone: "ok", progress: 1 }
  }
  const due = ms(fulfilment?.balanceDueAt)
  if (due !== null) {
    const days = (due - NOW_MS) / DAY
    return {
      label: "Payment",
      value: days < 0 ? `Overdue ${Math.abs(Math.round(days))} d` : `Due in ${Math.round(days)} d`,
      detail: `Balance USD ${Math.round(fulfilment?.balanceDueUsd ?? 0).toLocaleString("en-US")}`,
      tone: days < 0 ? "crit" : days < 7 ? "warn" : "ok",
      progress: null,
    }
  }
  return {
    label: "Payment",
    value: fulfilment?.advanceReceivedUsd ? "Advance in" : "Not started",
    detail: trade.paymentTerms,
    tone: "muted",
    progress: null,
  }
}

/** The grower's side of the money: released at settlement against the
 *  QC-accepted quantity, and held back by any grower KYC still open. */
function payoutClock(trade: W.Trade, sellerIds: string[]): Clock {
  if (W.stageRecord(trade.id, 16)?.state === "complete" || W.fulfilmentForTrade(trade.id)?.balanceReceivedAt) {
    return { label: "Your payout", value: "Released", detail: "Paid against your accepted quantity", tone: "ok", progress: 1 }
  }
  const mine = trade.sellerIds.filter((id) => sellerIds.includes(id)).map((id) => W.sellerById(id))
  const blocked = mine.filter((seller) => seller && seller.kyc !== "verified")
  if (blocked.length > 0) {
    return {
      label: "Your payout",
      value: "KYC open",
      detail: `${blocked.map((seller) => seller?.entity).join(", ")} — finish KYC or the payout is held at settlement`,
      tone: "warn",
      progress: null,
    }
  }
  return {
    label: "Your payout",
    value: "At settlement",
    detail: "Released once the buyer's balance is reconciled at stage 16",
    tone: "muted",
    progress: null,
  }
}

/* ── documents ───────────────────────────────────────────────────────── */

type RegisterDocument = W.TradeDocument & { derived: boolean }

const slug = (text: string): string =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")

/** Every document the trade has reached, stage by stage. Hand-authored
 *  documents are used as they are; the rest follow the stage template —
 *  mandatory papers verified once their stage closed, still pending while
 *  it is open, optional ones marked not applicable. */
function documentRegister(trade: W.Trade): RegisterDocument[] {
  const explicit = W.documentsForTrade(trade.id)
  const rows: RegisterDocument[] = []
  const reached = trade.status === "closed" ? 16 : trade.currentStage

  for (const stage of W.STAGES) {
    for (const spec of stage.docs) {
      const authored = explicit.find((document) => document.stage === stage.n && document.name === spec.name)
      if (authored) {
        rows.push({ ...authored, derived: false })
        continue
      }
      if (stage.n > reached) continue
      const state = stageStateFor(trade, stage.n)
      const record = W.stageRecord(trade.id, stage.n)
      const done = state === "complete"
      const status: W.DocStatus =
        spec.requirement === "O" ? (done ? "NA" : "PENDING") : done ? "VERIFIED" : "PENDING"
      rows.push({
        id: `${trade.id}-${stage.n}-${slug(spec.name)}`,
        tradeId: trade.id,
        stage: stage.n,
        name: spec.name,
        requirement: spec.requirement,
        issuer: spec.issuer,
        why: spec.why,
        status,
        issuedOn: status === "VERIFIED" ? (record?.completedAt ?? null) : null,
        expiresOn: null,
        verifiedBy: status === "VERIFIED" ? (record?.ownerId ?? null) : null,
        verifiedAt: status === "VERIFIED" ? (record?.completedAt ?? null) : null,
        blocks: [],
        attachedTo: null,
        note: null,
        derived: true,
      })
    }
  }

  for (const document of explicit) {
    if (!rows.some((row) => row.id === document.id)) rows.push({ ...document, derived: false })
  }
  return rows.sort((a, b) => a.stage - b.stage)
}

/** Mandatory documents actually holding the trade up. A templated paper
 *  that is merely pending on a stage still being worked is ordinary work
 *  in progress, not a gate — it only counts once that stage is blocked. */
function openGates(trade: W.Trade): RegisterDocument[] {
  return documentRegister(trade).filter((document) => {
    if (document.requirement !== "M" || document.status === "VERIFIED" || document.status === "NA") return false
    if (!document.derived) return true
    return stageStateFor(trade, document.stage) === "blocked"
  })
}

/* ── where each stage's paperwork belongs on screen ──────────────────── */

type TradeDomain = "finance" | "quality" | "shipment"

/** Commercial papers and settlement read as finance, inspection and cold
 *  store as quality, everything that moves the cargo as shipment. */
const STAGE_DOMAIN: Record<W.StageNo, TradeDomain> = {
  1: "finance", 2: "finance", 3: "quality", 4: "quality", 5: "shipment", 6: "shipment",
  7: "quality", 8: "quality", 9: "shipment", 10: "shipment", 11: "shipment", 12: "shipment",
  13: "shipment", 14: "shipment", 15: "shipment", 16: "finance",
}

function documentsFor(trade: W.Trade, domain: TradeDomain): RegisterDocument[] {
  return documentRegister(trade).filter((document) => STAGE_DOMAIN[document.stage] === domain)
}

/* ── the journey, as continuous legs ─────────────────────────────────── */

type LegState = "complete" | "in-progress" | "pending"

type JourneyLeg = {
  key: "pickup" | "port" | "sea" | "delivery"
  mode: "road" | "sea"
  from: string
  to: string
  carrier: string | null
  reference: string | null
  departedAt: string | null
  arrivedAt: string | null
  etaAt: string | null
  state: LegState
}

const legState = (state: W.StageState): LegState =>
  state === "complete" ? "complete" : state === "pending" ? "pending" : "in-progress"

/** Farm → pack-house → port of loading → port of discharge → buyer, for
 *  every trade — the booked shipment's own legs where they exist, the
 *  stage records where they do not. */
function journeyLegs(trade: W.Trade): JourneyLeg[] {
  const shipment = W.shipmentForTrade(trade.id)
  const container = W.containerForTrade(trade.id)
  const record = (stage: W.StageNo) => W.stageRecord(trade.id, stage)
  const firstRoad = shipment?.legs.find((leg) => leg.mode === "road")
  const sea = shipment?.legs.find((leg) => leg.mode === "sea")
  const lastRoad = shipment?.legs.filter((leg) => leg.mode === "road").at(1)
  const growers = trade.sellerIds.map((id) => W.sellerById(id)?.village).filter(Boolean)
  const farm = [...new Set(growers)].join(", ") || trade.origin.split(",")[0]
  const packhouse = firstRoad?.from ?? "Pack-house"
  const pol = trade.portOfLoading.split(" — ")[1] ?? trade.portOfLoading
  const pod = trade.portOfDischarge.split(" — ")[1] ?? trade.portOfDischarge
  const buyer = W.buyerById(trade.buyerId)

  return [
    {
      key: "pickup",
      mode: "road",
      from: farm,
      to: packhouse,
      carrier: null,
      reference: null,
      departedAt: record(5)?.startedAt ?? null,
      arrivedAt: record(6)?.startedAt ?? record(5)?.completedAt ?? null,
      etaAt: null,
      state: legState(stageStateFor(trade, 5)),
    },
    {
      key: "port",
      mode: "road",
      from: packhouse,
      to: pol,
      carrier: firstRoad?.carrier ?? null,
      reference: firstRoad?.reference ?? null,
      departedAt: firstRoad?.departedAt ?? record(13)?.startedAt ?? null,
      arrivedAt: firstRoad?.arrivedAt ?? record(13)?.completedAt ?? null,
      etaAt: null,
      state: firstRoad ? firstRoad.state : legState(stageStateFor(trade, 13)),
    },
    {
      key: "sea",
      mode: "sea",
      from: pol,
      to: pod,
      carrier: shipment?.carrier ?? container?.line ?? null,
      reference: shipment ? `${shipment.vessel} ${shipment.voyage}` : container ? `${container.vessel} ${container.voyage}` : null,
      departedAt: shipment?.atd ?? null,
      arrivedAt: shipment?.ata ?? null,
      etaAt: shipment?.eta ?? container?.eta ?? null,
      state: sea ? sea.state : legState(stageStateFor(trade, 14)),
    },
    {
      key: "delivery",
      mode: "road",
      from: pod,
      to: buyer?.city ?? trade.destination,
      carrier: lastRoad?.carrier ?? null,
      reference: lastRoad?.reference && lastRoad.reference !== "—" ? lastRoad.reference : null,
      departedAt: lastRoad?.departedAt ?? record(15)?.startedAt ?? null,
      arrivedAt: lastRoad?.arrivedAt ?? record(15)?.completedAt ?? null,
      etaAt: null,
      state: lastRoad ? lastRoad.state : legState(stageStateFor(trade, 15)),
    },
  ]
}

/* ── quantities & traceability ───────────────────────────────────────── */

/** Rule one of the model: quantity is never a single number. */
function quantityLadder(trade: W.Trade): { label: string; mt: number | null }[] {
  const fulfilment = W.fulfilmentForTrade(trade.id)
  const lots = W.lotsForTrade(trade.id)
  const accepted = lots.length > 0 ? lots.reduce((sum, lot) => sum + lot.qtyAcceptedKg, 0) / 1000 : null
  const nonZero = (value: number | undefined) => (value ? value : null)
  const delivered = W.stageRecord(trade.id, 15)?.state === "complete" ? trade.qtyShippedMt : null
  return [
    { label: "Contracted", mt: trade.qtyContractedMt },
    { label: "Allocated", mt: nonZero(fulfilment?.allocatedMt) },
    { label: "Harvested", mt: nonZero(fulfilment?.harvestedMt) },
    { label: "QC-accepted", mt: accepted },
    { label: "Packed", mt: nonZero(fulfilment?.packedMt) },
    { label: "Shipped", mt: trade.qtyShippedMt ?? nonZero(fulfilment?.shippedMt) },
    { label: "Delivered", mt: delivered },
  ]
}

type SpineLink = { stage: W.StageNo; label: string; value: string | null }

/** The ID spine: one key created at contract, every later record carrying
 *  it — what lets a claim in the destination port be traced to a farm. */
function idSpine(trade: W.Trade): SpineLink[] {
  const lots = W.lotsForTrade(trade.id)
  const pallets = W.palletsForTrade(trade.id)
  const container = W.containerForTrade(trade.id)
  const shipment = W.shipmentForTrade(trade.id)
  const fulfilment = W.fulfilmentForTrade(trade.id)
  const settled = Boolean(fulfilment?.balanceReceivedAt) || W.stageRecord(trade.id, 16)?.state === "complete"
  return [
    { stage: 1, label: "Transaction", value: trade.id },
    {
      stage: 4,
      label: lots.length === 1 ? "Lot" : "Lots",
      value: lots.length === 0 ? null : lots.length === 1 ? lots[0].id : `${lots[0].id} +${lots.length - 1}`,
    },
    {
      stage: 8,
      label: "Pallets",
      value:
        pallets.length > 0
          ? `${pallets[0].id}…${pallets[pallets.length - 1].id.split("-").pop()}`
          : fulfilment?.palletsPacked
            ? `${fulfilment.palletsPacked} packed`
            : null,
    },
    {
      stage: 10,
      label: "Container + seal",
      value: container ? `${container.id}${container.sealNo ? ` · ${container.sealNo}` : ""}` : null,
    },
    { stage: 14, label: "Bill of lading", value: shipment?.blNo ?? null },
    { stage: 16, label: "Invoice + payout", value: settled ? `INV-${tradeNumber(trade.id)}` : null },
  ]
}

export {
  COLD_LEG_LABEL,
  STAGE_DOMAIN,
  documentsFor,
  journeyLegs,
  currentRecord,
  cutoffClock,
  cutoffs,
  documentRegister,
  exceptionStages,
  harvestAt,
  idSpine,
  isColdChain,
  openGates,
  paymentClock,
  payoutClock,
  quantityLadder,
  shelfLifeClock,
  stageRecords,
  stageStateFor,
  temperatureTrace,
  tradeSetpoint,
}
export type {
  Clock,
  ClockTone,
  ColdLeg,
  JourneyLeg,
  LegState,
  RegisterDocument,
  SpineLink,
  TempPoint,
  TradeDomain,
}
