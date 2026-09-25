import * as W from "@/features/tradechain/demo-world"

const IST = "Asia/Kolkata"

function formatStamp(value: string | null | undefined): string {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: IST,
  }).format(new Date(value))
}

function formatDay(value: string | null | undefined): string {
  if (!value) return "—"
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: IST }).format(
    new Date(value)
  )
}

function shortDay(value: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", timeZone: IST }).format(new Date(value))
}

const pad2 = (value: number): string => String(value).padStart(2, "0")

/** "INMUN — Mundra" → "Mundra". */
const portName = (port: string): string => port.split(" — ")[1] ?? port

/** Hours from the demo's frozen now to a deadline. */
function hoursUntil(iso: string): number {
  return (new Date(iso).getTime() - new Date(W.NOW).getTime()) / 3_600_000
}

type Tone = "ok" | "warn" | "crit" | "brand" | "muted"

function dueLabel(iso: string): { text: string; tone: Tone } {
  const hours = hoursUntil(iso)
  if (hours < 0) return { text: `Overdue ${Math.abs(Math.round(hours))} h`, tone: "crit" }
  if (hours < 2) return { text: `${Math.round(hours * 60)} min left`, tone: "crit" }
  if (hours < 24) return { text: `${hours.toFixed(1)} h left`, tone: "warn" }
  return { text: `${Math.round(hours / 24)} d left`, tone: "muted" }
}

const TRADE_STATUS_TONE: Record<W.TradeStatus, Tone> = {
  active: "ok",
  "at-risk": "warn",
  blocked: "crit",
  closed: "muted",
}

const TRADE_STATUS_LABEL: Record<W.TradeStatus, string> = {
  active: "On track",
  "at-risk": "At risk",
  blocked: "Blocked",
  closed: "Closed",
}

const STAGE_STATE_TONE: Record<W.StageState, Tone> = {
  complete: "ok",
  "in-progress": "brand",
  blocked: "crit",
  pending: "muted",
}

const STAGE_STATE_LABEL: Record<W.StageState, string> = {
  complete: "Complete",
  "in-progress": "In progress",
  blocked: "Blocked",
  pending: "Not reached",
}

const SCENARIO_TONE: Record<W.ScenarioKey, Tone> = {
  A: "ok",
  B: "warn",
  C: "crit",
  D: "brand",
  E: "muted",
}

const DOC_STATUS_TONE: Record<W.DocStatus, Tone> = {
  VERIFIED: "ok",
  PENDING: "warn",
  MISSING: "crit",
  REJECTED: "crit",
  NA: "muted",
}

const DOC_STATUS_LABEL: Record<W.DocStatus, string> = {
  VERIFIED: "Verified",
  PENDING: "Pending",
  MISSING: "Missing",
  REJECTED: "Rejected",
  NA: "Not applicable",
}

const SEVERITY_TONE: Record<W.Severity, Tone> = {
  INFO: "muted",
  ACTION: "brand",
  WARNING: "warn",
  CRITICAL: "crit",
  URGENT: "crit",
}

const scenarioMeta = (key: W.ScenarioKey): W.ScenarioMeta =>
  W.SCENARIOS.find((scenario) => scenario.key === key) ?? W.SCENARIOS[0]

export {
  DOC_STATUS_LABEL,
  DOC_STATUS_TONE,
  SCENARIO_TONE,
  SEVERITY_TONE,
  STAGE_STATE_LABEL,
  STAGE_STATE_TONE,
  TRADE_STATUS_LABEL,
  TRADE_STATUS_TONE,
  dueLabel,
  formatDay,
  formatStamp,
  hoursUntil,
  pad2,
  portName,
  scenarioMeta,
  shortDay,
}
export type { Tone }
