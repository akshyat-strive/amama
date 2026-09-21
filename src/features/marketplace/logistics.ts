import {
  LOGISTICS_STAGE_LABELS,
  LOGISTICS_STAGE_ORDER,
  type LogisticsDocument,
  type LogisticsStage,
  type Shipment,
  type TemperatureSample,
} from "@/features/marketplace/deal-store"

/** The three bands the eleven stages group into for the stepper's own
 *  visual grouping — dispatch (the seller's own yard and cold store),
 *  export (the KAM-run booking-through-clearance machinery), and transit
 *  (once it's sailed, there's nothing left to do but watch and deliver). */
export type LogisticsPhaseBand = "dispatch" | "export" | "transit"

export const LOGISTICS_PHASE_BAND_LABELS: Record<LogisticsPhaseBand, string> = {
  dispatch: "Dispatch",
  export: "Export",
  transit: "Transit",
}

const PHASE_BY_STAGE: Record<LogisticsStage, LogisticsPhaseBand> = {
  "farm-pickup": "dispatch",
  "warehouse-inbound": "dispatch",
  "cold-storage": "dispatch",
  "packing-export-qc": "dispatch",
  "container-booked": "export",
  stuffing: "export",
  documentation: "export",
  customs: "export",
  "gate-in": "export",
  "vessel-transit": "transit",
  "arrived-delivered": "transit",
}

function phaseBandForStage(stage: LogisticsStage): LogisticsPhaseBand {
  return PHASE_BY_STAGE[stage]
}

export type CutoffState = "ok" | "soon" | "overdue"

/** Green while there's more than 48 hours left, amber inside that window,
 *  red once it's passed — the same three-color read the reference this
 *  pipeline is built from insists a cut-off needs, because by the time
 *  someone thinks to check a plain timestamp by eye it's often too late. */
function cutoffState(iso: string | null, now: Date = new Date()): CutoffState | null {
  if (!iso) return null
  const hoursLeft = (new Date(iso).getTime() - now.getTime()) / 3_600_000
  if (hoursLeft < 0) return "overdue"
  if (hoursLeft < 48) return "soon"
  return "ok"
}

/** The single soonest cut-off on a shipment still worth showing, and its
 *  state — what a countdown chip actually renders. `null` once every
 *  cut-off is either cleared or was never set, and also once the shipment
 *  has already sailed: a gate-in cut-off it plainly made is history, not
 *  a live concern, however long ago its timestamp now sits in the past. */
function soonestCutoff(shipment: Shipment, now: Date = new Date()): { label: string; at: string; state: CutoffState } | null {
  const stageIndex = LOGISTICS_STAGE_ORDER.indexOf(shipment.stage)
  if (stageIndex > LOGISTICS_STAGE_ORDER.indexOf("gate-in")) return null
  const entries: { label: string; at: string | null }[] = [
    { label: "Shipping instruction", at: shipment.cutoffs.shippingInstruction },
    { label: "VGM", at: shipment.cutoffs.vgm },
    { label: "Gate-in", at: shipment.cutoffs.gateIn },
  ]
  const withState = entries
    .filter((entry): entry is { label: string; at: string } => entry.at !== null)
    .map((entry) => ({ ...entry, state: cutoffState(entry.at, now) as CutoffState }))
  if (withState.length === 0) return null
  return [...withState].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())[0]
}

/** Mandatory documents this shipment still hasn't verified — its literal
 *  blockers right now, not a general document list. */
function documentBlockers(shipment: Shipment): LogisticsDocument[] {
  return shipment.documents.filter((doc) => doc.mandatory && doc.status !== "verified")
}

export type ColdChainExcursion = {
  startAt: string
  endAt: string
  peakTempC: number
  durationHrs: number
  shelfLifeDebitDays: number
}

/** Groups consecutive above-set-point readings into discrete excursions —
 *  derived on read rather than stored, a deliberate simplification of the
 *  reference model's stronger "store the debit at the moment it happens"
 *  advice, acceptable for this app's demo scope. Ageing follows the
 *  reference's own Q10 = 2 respiration model: every 10°C above set point
 *  roughly doubles the rate of decay. */
function detectExcursions(samples: TemperatureSample[], setpointC: number): ColdChainExcursion[] {
  const sorted = [...samples].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  const excursions: ColdChainExcursion[] = []
  let run: TemperatureSample[] = []

  const closeRun = () => {
    if (run.length === 0) return
    const startAt = run[0].at
    const endAt = run[run.length - 1].at
    const durationHrs = (new Date(endAt).getTime() - new Date(startAt).getTime()) / 3_600_000
    const peakTempC = Math.max(...run.map((sample) => sample.tempC))
    const rate = Math.pow(2, (peakTempC - setpointC) / 10)
    const shelfLifeDebitDays = Math.round((durationHrs / 24) * rate * 10) / 10
    excursions.push({ startAt, endAt, peakTempC, durationHrs: Math.round(durationHrs * 10) / 10, shelfLifeDebitDays })
    run = []
  }

  for (const sample of sorted) {
    if (sample.tempC > setpointC + 2) run.push(sample)
    else closeRun()
  }
  closeRun()
  return excursions
}

/** Days of shelf life left against budget, given how much has already
 *  been consumed since harvest at the plain 1-day-per-day rate plus
 *  whatever any cold-chain excursions have additionally debited. `null`
 *  when there's no harvest date or budget to measure against. */
function shelfLifeRemaining(shipment: Shipment): { budgetDays: number; usedDays: number; remainingDays: number } | null {
  if (!shipment.harvestAt || shipment.shelfLifeBudgetDays === null) return null
  const elapsedDays = (Date.now() - new Date(shipment.harvestAt).getTime()) / 86_400_000
  const excursionDebit = shipment.coldChain
    ? detectExcursions(shipment.coldChain.samples, shipment.coldChain.setpointC).reduce(
        (sum, excursion) => sum + excursion.shelfLifeDebitDays,
        0
      )
    : 0
  const usedDays = Math.round((elapsedDays + excursionDebit) * 10) / 10
  return {
    budgetDays: shipment.shelfLifeBudgetDays,
    usedDays,
    remainingDays: Math.round((shipment.shelfLifeBudgetDays - usedDays) * 10) / 10,
  }
}

export {
  LOGISTICS_STAGE_ORDER,
  LOGISTICS_STAGE_LABELS,
  phaseBandForStage,
  cutoffState,
  soonestCutoff,
  documentBlockers,
  detectExcursions,
  shelfLifeRemaining,
}
