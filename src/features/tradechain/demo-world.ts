/**
 * AMAMA TRADECHAIN — the demo world.
 *
 * One hardcoded, fully cross-referenced dataset for the whole platform.
 * Every id in here resolves to a record in here; nothing dangles. Screens
 * import from this file and never invent data of their own.
 *
 * The world is frozen at one moment: `NOW` — 7 Oct 2026, 16:45 IST. The
 * primary trade (AMT-2026-00418, Royal Delicious apples, Kotkhai → Jebel
 * Ali) is sitting at stage 13 with 75 minutes left on the terminal gate-in
 * cut-off, so every upstream stage has real history and the live edge of
 * the trade is the one the control tower is built to watch.
 *
 * Domain source: the 16-stage lifecycle in the Trade Control Tower brief —
 * five phases, five scenario chains (A normal, B delay, C failure,
 * D document issue, E commercial change), and a document model where a
 * document is a gate, not an attachment.
 */

/* ════════════════════════════════════════════════════════════════════
   PRIMITIVES
   ════════════════════════════════════════════════════════════════════ */

export type StageNo =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16

export type PhaseId = "commercial" | "farm-gate" | "cold-chain" | "export" | "transit"

/** A, B, C, D, E — the five exception chains every stage is modelled
 *  against. The whole exception engine is these five shapes, not sixteen
 *  bespoke inboxes. */
export type ScenarioKey = "A" | "B" | "C" | "D" | "E"

export type Severity = "INFO" | "ACTION" | "WARNING" | "CRITICAL" | "URGENT"

export type DocStatus = "VERIFIED" | "PENDING" | "MISSING" | "REJECTED" | "NA"

/** Mandatory vs optional. An `M` document with a non-VERIFIED status is
 *  what actually stops a container. */
export type DocRequirement = "M" | "O"

export type RiskBand = "LOW" | "MODERATE" | "ELEVATED" | "HIGH"

/**
 * Internal roles. Deliberately AMAMA's own ladder (master admin → admin →
 * master KAM → KAM → function specialists), not the generic "CEO / Trade
 * Desk" titles the brief uses — the brief's owners are mapped onto these
 * on each stage via `ownerRole`.
 */
export type InternalRoleId =
  | "master-admin"
  | "admin"
  | "master-kam"
  | "kam"
  | "procurement"
  | "qc"
  | "warehouse"
  | "cold-chain"
  | "logistics"
  | "documentation"
  | "finance"
  | "compliance"

export type PartyKind = "internal" | "buyer" | "seller"

/** Every entity the peek panel can open. The shell resolves any id to one
 *  of these, which is what makes the product feel interconnected. */
export type EntityKind =
  | "trade" | "lot" | "pallet" | "container" | "document" | "user"
  | "buyer" | "seller" | "product" | "variant" | "listing"
  | "conversation" | "rfq" | "quote" | "termSheet" | "po"
  | "shipment" | "stage" | "event" | "notification"

export type EntityRef = { kind: EntityKind; id: string }

/* ════════════════════════════════════════════════════════════════════
   THE CLOCK
   ════════════════════════════════════════════════════════════════════ */

/** The demo's frozen "now". Everything relative (countdowns, overdue
 *  flags, "2h ago") is computed against this, never against the real
 *  wall clock — so the world reads identically on every load, forever. */
export const NOW = "2026-10-07T16:45:00+05:30"

/** Harvest of the primary trade's first lot. The spine every other
 *  primary-trade date is measured forward from. */
export const PRIMARY_HARVEST = "2026-09-28T07:40:00+05:30"

/* ════════════════════════════════════════════════════════════════════
   ROLES
   ════════════════════════════════════════════════════════════════════ */

export type InternalRole = {
  id: InternalRoleId
  label: string
  /** What this role is accountable for, in one line — used on the team
   *  screen and in escalation paths. */
  remit: string
  /** Who this role escalates to when an SLA burns. Empty for the top. */
  escalatesTo: InternalRoleId[]
}

export const INTERNAL_ROLES: InternalRole[] = [
  {
    id: "master-admin",
    label: "Master Admin",
    remit: "Final authority on contracts, pricing and write-offs. Signs trade contracts and approves anything that moves realised margin.",
    escalatesTo: [],
  },
  {
    id: "admin",
    label: "Admin",
    remit: "Platform operations, user and role administration, review queues.",
    escalatesTo: ["master-admin"],
  },
  {
    id: "master-kam",
    label: "Master KAM",
    remit: "Owns the trade desk. Allocates accounts to KAMs, approves term sheets before they go to a buyer, carries the escalation for every KAM.",
    escalatesTo: ["master-admin"],
  },
  {
    id: "kam",
    label: "KAM",
    remit: "Single point of contact for a set of buyers and sellers. Runs RFQ → term sheet → PO, and stays on the trade until settlement.",
    escalatesTo: ["master-kam"],
  },
  {
    id: "procurement",
    label: "Procurement",
    remit: "Matches demand to the farmer network, onboards growers, and owns supply confirmation against the harvest calendar.",
    escalatesTo: ["master-kam", "master-admin"],
  },
  {
    id: "qc",
    label: "Quality Control",
    remit: "Field QC at harvest and export QC before stuffing. Owns the PASS / CONDITIONAL / HOLD / REJECT decision and the evidence behind it.",
    escalatesTo: ["master-admin"],
  },
  {
    id: "warehouse",
    label: "Warehouse",
    remit: "Inbound receipt, zone allocation, sorting, packing and container stuffing.",
    escalatesTo: ["logistics", "master-admin"],
  },
  {
    id: "cold-chain",
    label: "Cold Chain",
    remit: "Pre-cooling, cold storage and the temperature record. Owns every excursion and the shelf-life debit it costs.",
    escalatesTo: ["qc", "master-admin"],
  },
  {
    id: "logistics",
    label: "Logistics & Freight",
    remit: "Transport, reefer booking, stuffing coordination, terminal gate-in and vessel tracking. Owns the three cut-offs.",
    escalatesTo: ["master-admin"],
  },
  {
    id: "documentation",
    label: "Documentation",
    remit: "The document control tower: status, expiry, D-7/D-3/D-1 escalation, customs filing and the CHA relationship.",
    escalatesTo: ["logistics", "master-admin"],
  },
  {
    id: "finance",
    label: "Finance",
    remit: "Buyer receipts, farmer settlement, cost ledger by stage and realised margin against plan.",
    escalatesTo: ["master-admin"],
  },
  {
    id: "compliance",
    label: "Compliance",
    remit: "Buyer and seller KYC, onboarding review and the standing certifications a destination market demands.",
    escalatesTo: ["admin", "master-admin"],
  },
]

export const roleById = (id: InternalRoleId): InternalRole =>
  INTERNAL_ROLES.find((role) => role.id === id) ?? INTERNAL_ROLES[0]

/* ════════════════════════════════════════════════════════════════════
   PHASES
   ════════════════════════════════════════════════════════════════════ */

export type Phase = {
  id: PhaseId
  label: string
  stages: [StageNo, StageNo]
  /** Tailwind-ready token name; the shell maps these to CSS vars. */
  tone: "accent" | "ok" | "change" | "warn" | "apple"
  blurb: string
}

export const PHASES: Phase[] = [
  {
    id: "commercial",
    label: "Commercial lock-in",
    stages: [1, 2],
    tone: "accent",
    blurb:
      "Demand becomes a signed contract and supply is matched to it. Nothing physical has moved, but the Transaction ID, the quality spec and the margin are all fixed here. Almost every downstream dispute traces back to a loose spec written at this phase.",
  },
  {
    id: "farm-gate",
    label: "Farm to gate",
    stages: [3, 5],
    tone: "ok",
    blurb:
      "Inspect, accept, identify and collect. The cargo enters custody and the shelf-life clock starts running against your budget. Risk here is biological and weather-driven — it cannot be negotiated away.",
  },
  {
    id: "cold-chain",
    label: "Warehouse & cold chain",
    stages: [6, 8],
    tone: "change",
    blurb:
      "Receive, pull the temperature down, hold, sort, pack and pass export QC. The only phase where you can add value and buy time — and the only one where a single equipment failure writes off the consignment.",
  },
  {
    id: "export",
    label: "Export execution",
    stages: [9, 13],
    tone: "warn",
    blurb:
      "Book, stuff, document, clear and gate in. Five stages governed by deadlines you do not control: the shipping line's, customs' and the terminal's. Everything here is a race against a cut-off.",
  },
  {
    id: "transit",
    label: "Transit & closure",
    stages: [14, 16],
    tone: "apple",
    blurb:
      "Sail, arrive, deliver, get paid. Your ability to influence the outcome drops to nearly zero and your capital exposure peaks. The only assets you have left are your documents and your traceability.",
  },
]

/** Stage number → phase. Index 0 is stage 01. */
const STAGE_PHASE: PhaseId[] = [
  "commercial", "commercial",
  "farm-gate", "farm-gate", "farm-gate",
  "cold-chain", "cold-chain", "cold-chain",
  "export", "export", "export", "export", "export",
  "transit", "transit", "transit",
]

export const phaseForStage = (n: StageNo): Phase =>
  PHASES.find((phase) => phase.id === STAGE_PHASE[n - 1]) ?? PHASES[0]

/* ════════════════════════════════════════════════════════════════════
   SCENARIO MODEL  (A / B / C / D / E)
   ════════════════════════════════════════════════════════════════════ */

export type ScenarioMeta = {
  key: ScenarioKey
  label: string
  state: string
  tone: "ok" | "warn" | "crit" | "change" | "accent"
  blurb: string
}

export const SCENARIOS: ScenarioMeta[] = [
  {
    key: "A",
    label: "Normal",
    state: "On track",
    tone: "ok",
    blurb:
      "The happy path. The same six steps at every stage — which is exactly why it can be one generic state machine rather than sixteen bespoke ones.",
  },
  {
    key: "B",
    label: "Delay",
    state: "Attention",
    tone: "warn",
    blurb:
      "Something is late but recoverable. The cost of a delay is not the delay itself, it is the downstream slot, appointment or cut-off it puts at risk. Every delay chain recalculates an ETA and reassigns an owner.",
  },
  {
    key: "C",
    label: "Failure",
    state: "Critical",
    tone: "crit",
    blurb:
      "Quantity, quality or the sailing is genuinely lost. Note the shape: mark the item, recalculate the gap, search for a replacement, notify, log. Recovery before blame — the audit trail comes last, not first.",
  },
  {
    key: "D",
    label: "Document issue",
    state: "Action required",
    tone: "change",
    blurb:
      "A document is missing, wrong or expired. The only scenario that can stop the process dead at almost any stage, the most preventable, and the cheapest to fix with software.",
  },
  {
    key: "E",
    label: "Commercial change",
    state: "In progress",
    tone: "accent",
    blurb:
      "The buyer or your own team changes quantity, destination, spec, date or price mid-flight. The chain is identical everywhere — four impact assessments and an approval — but the cost of the same change rises sharply the later it arrives.",
  },
]

/**
 * One exception chain at one stage. The brief's contribution is the
 * `steps`; the `owner` / `sla` / `escalation` triple is what turns a
 * described chain into something a control tower can actually run.
 */
export type ScenarioChain = {
  key: ScenarioKey
  trigger: string
  steps: string[]
  owner: InternalRoleId
  sla: string
  /** Ordered escalation path — each hop fires when the previous one's
   *  clock burns without a resolution. */
  escalation: InternalRoleId[]
}

/* The generic chains. Most stages use these verbatim; where the brief
   gives a stage its own wording, the stage overrides them below. */
const GEN_A = [
  "Trigger fires on schedule",
  "Owner performs action",
  "Document generated / verified",
  "Approval logged",
  "System status updated",
  "Advance to next stage",
]
const GEN_B = [
  "System flags delay",
  "Downstream slot / appointment at risk",
  "New ETA calculated",
  "Notification sent to owner",
  "Owner re-plans and confirms",
]
const GEN_C = [
  "Item marked HOLD / REJECTED",
  "Downstream quantity gap recalculated",
  "Replacement or recovery plan searched",
  "Owner + escalation notified",
  "Resolution logged to audit trail",
]
const GEN_D = [
  "Document status set RED",
  "Dependent clearance blocked",
  "Documentation owner notified",
  "Deadline countdown starts",
  "Escalation if unresolved by deadline",
]
const GEN_E = [
  "Impact analysis run",
  "Inventory + logistics impact assessed",
  "Cost & margin impact calculated",
  "Document impact assessed",
  "Approval → revised trade plan issued",
]

const T_A = "Trigger fires on schedule"
const T_B = "Expected trigger overdue"
const T_C = "Critical check fails"
const T_D = "Required document missing, incorrect or expired"
const T_E = "Buyer or ops requests a change (qty / destination / spec / date / price)"

/** Terse constructor so the stage table below stays readable. */
const chain = (
  key: ScenarioKey,
  trigger: string,
  steps: string[],
  owner: InternalRoleId,
  sla: string,
  escalation: InternalRoleId[]
): ScenarioChain => ({ key, trigger, steps, owner, sla, escalation })

/* ════════════════════════════════════════════════════════════════════
   STAGE DOCUMENT TEMPLATES
   ════════════════════════════════════════════════════════════════════ */

/** The document *type* expected at a stage — the template. Actual issued
 *  documents (with status, dates and blocks) live in `DOCUMENTS`. */
export type StageDocSpec = {
  name: string
  requirement: DocRequirement
  issuer: string
  /** Why it exists and what it holds up — the sentence that turns a
   *  document tracker into a control tower. */
  why: string
}

/* ════════════════════════════════════════════════════════════════════
   THE SIXTEEN STAGES
   ════════════════════════════════════════════════════════════════════ */

export type Stage = {
  n: StageNo
  name: string
  short: string
  phase: PhaseId
  /** AMAMA's own owning role — the brief's job titles mapped onto our
   *  ladder. */
  ownerRole: InternalRoleId
  /** Supporting roles that act inside the stage without owning it. */
  supportRoles: InternalRoleId[]
  risk: number
  band: RiskBand
  desc: string
  input: string
  output: string
  sla: string
  trigger: string
  systemAction: string
  humanAction: string
  notifications: { level: Severity; text: string }[]
  docs: StageDocSpec[]
  scenarios: Record<ScenarioKey, ScenarioChain>
  /** The worked example, told against the primary apple trade. */
  worked: string
  erp: { entities: string; fields: string; note: string }
}

export const STAGES: Stage[] = [
  {
    n: 1,
    name: "Buyer Demand & Trade Contract",
    short: "Demand & Contract",
    phase: "commercial",
    ownerRole: "kam",
    supportRoles: ["master-kam", "master-admin"],
    risk: 18,
    band: "LOW",
    desc: "A buyer RFQ is converted into a signed trade contract carrying the master Transaction ID that every downstream record will inherit.",
    input: "Buyer RFQ + product & quality specification",
    output: "Signed trade contract + Transaction ID",
    sla: "48 hrs buyer response · 72 hrs contract signature",
    trigger: "Buyer submits an RFQ or a PO",
    systemAction: "Creates the Transaction ID, opens the trade record, notifies Procurement of demand",
    humanAction: "KAM negotiates terms; Master Admin approves and signs the contract",
    notifications: [
      { level: "INFO", text: "New RFQ received from buyer" },
      { level: "ACTION", text: "Contract awaiting signature" },
    ],
    docs: [
      { name: "Purchase Order", requirement: "M", issuer: "Buyer", why: "The buyer's formal order. Fixes quantity, price, delivery window and destination — the basis of everything that follows." },
      { name: "Sales Contract", requirement: "M", issuer: "AMAMA + Buyer", why: "The binding agreement and parent record of the Transaction ID. Blocks: no contract, no procurement demand signal." },
      { name: "Product & Quality Spec", requirement: "M", issuer: "Agreed between parties", why: "Variety, grade, count size, colour, firmness, brix and defect tolerance. The yardstick every QC stage measures against — a vague spec here is an unwinnable claim at stage 15." },
      { name: "Packaging Spec", requirement: "M", issuer: "Buyer", why: "Carton type and strength, units per carton, liner, labelling, pallet pattern and wrap. Blocks: the packing run at stage 08 cannot start without it." },
      { name: "Incoterm & Payment Terms", requirement: "M", issuer: "Contract clause", why: "Who arranges and pays for freight and insurance, and when money moves. Drives stages 09, 14 and 16 entirely." },
      { name: "Buyer KYC / Company Registration", requirement: "M", issuer: "Buyer", why: "Trade licence, tax registration and import code. Blocks: shipment planning is held at source if this is missing." },
      { name: "Insurance Responsibility Clause", requirement: "O", issuer: "Contract clause", why: "Under CFR the seller arranges freight but not insurance; under CIF the seller insures. Determines who raises the insurance certificate at stage 14." },
      { name: "Force Majeure / Arbitration Clause", requirement: "M", issuer: "Contract clause", why: "Governing law and dispute forum. Rarely read until a claim lands at stage 15, at which point it decides the outcome." },
    ],
    scenarios: {
      A: chain("A", T_A, GEN_A, "kam", "72 hrs to signature", ["master-kam"]),
      B: chain("B", "Buyer response overdue past 48 hrs", [
        "System flags the RFQ as stalled",
        "KAM follow-up task created",
        "Risk score raised on the pipeline forecast",
        "Notification to the owning KAM",
        "Buyer re-engaged, revised response deadline set",
      ], "kam", "24 hrs to re-engage", ["master-kam", "master-admin"]),
      C: chain("C", "Buyer and AMAMA fail to agree terms", [
        "RFQ marked LOST / ON HOLD",
        "No Transaction ID generated",
        "Procurement demand signal withdrawn",
        "Owning KAM notified",
        "Lead archived with a reason code",
      ], "master-kam", "Same day close-out", ["master-admin"]),
      D: chain("D", "Buyer KYC or import licence missing", [
        "Contract status set PENDING COMPLIANCE",
        "Shipment planning blocked at source",
        "KAM notifies the buyer for documents",
        "7-day countdown to resubmission deadline",
        "Escalated to Master Admin if unresolved",
      ], "kam", "7 days to resubmission", ["master-kam", "master-admin"]),
      E: chain("E", T_E, GEN_E, "kam", "24 hrs to re-quote", ["master-kam"]),
    },
    worked:
      "Al Noor Fresh Trading sends an RFQ for one 40ft reefer of Royal Delicious, Grade A, 100–125 count, CFR Jebel Ali, arriving in the second half of October. The KAM quotes against the Himachal harvest window, agrees 30% advance and 70% at 30 days from B/L, and the Master Admin signs. The system issues AMT-2026-00418. The quality spec is the sentence that matters: minimum 60% red blush, firmness ≥ 14 lbf, brix ≥ 12, zero russeting above 10% of surface, max 2% defects. If any of those numbers is left out, the buyer defines them on arrival.",
    erp: {
      entities: "Trade",
      fields: "transaction_id · buyer_id · incoterm · payment_terms · qty_contracted · price · currency · delivery_window_start/end · spec_id",
      note: "The spec should be a structured record with typed tolerances, not a PDF attachment. Stage 03 and stage 08 both need to compare measurements against it programmatically.",
    },
  },
  {
    n: 2,
    name: "Procurement & Farmer Onboarding",
    short: "Procurement",
    phase: "commercial",
    ownerRole: "procurement",
    supportRoles: ["kam"],
    risk: 34,
    band: "MODERATE",
    desc: "Demand is matched against the supplier and farmer network; new farmers are onboarded with full KYC and traceability data before any allocation is made.",
    input: "Trade contract + supply forecast",
    output: "Confirmed farmer / supplier allocation for the lot",
    sla: "5 days to confirm supply against forecast",
    trigger: "Trade contract signed, demand pushed to Procurement",
    systemAction: "Matches demand to farmer capacity and opens an onboarding checklist for new suppliers",
    humanAction: "Procurement visits or calls farmers and confirms the harvest window and price",
    notifications: [
      { level: "INFO", text: "Supply match found" },
      { level: "WARNING", text: "Forecast shortfall in region" },
    ],
    docs: [
      { name: "Supplier / Farmer KYC", requirement: "M", issuer: "Farmer + AMAMA", why: "Identity and tax details. Required before any payout can be released at stage 16, and the root of the traceability chain." },
      { name: "Farm / Land Details", requirement: "M", issuer: "Farmer", why: "Survey number, village, GPS boundary, area under crop and variety. This is what a recall traces back to — without a GPS polygon your traceability stops at 'Himachal'." },
      { name: "Bank Details", requirement: "M", issuer: "Farmer", why: "Settlement account. Blocks: farmer payout at stage 16." },
      { name: "Supplier Agreement", requirement: "M", issuer: "AMAMA + Farmer", why: "Price basis, quality norms, and — critically — who bears the loss on a QC rejection. Settle this before the harvest, never after." },
      { name: "Harvest Calendar", requirement: "M", issuer: "Procurement", why: "Expected picking windows by block and altitude. Feeds the supply forecast and shelf-life planning." },
      { name: "Certifications (GlobalGAP etc.)", requirement: "O", issuer: "Third-party certifier", why: "Required by most EU and UK buyers, usually not by UAE. If your buyer mix changes this becomes mandatory overnight — build the field now." },
      { name: "Product & Quality History", requirement: "O", issuer: "AMAMA", why: "Past pass rates and claim history per farm. Should feed the farm's risk score and the sampling intensity at stage 03." },
    ],
    scenarios: {
      A: chain("A", T_A, GEN_A, "procurement", "5 days to confirm supply", ["master-kam"]),
      B: chain("B", "Farmer confirmation delayed beyond SLA", [
        "System flags the supply-confirmation delay",
        "Harvest window risk increases",
        "Alternate farmer shortlist surfaced",
        "Notification to the Procurement owner",
        "Backup farmer engaged in parallel",
      ], "procurement", "48 hrs to engage a backup", ["master-kam", "master-admin"]),
      C: chain("C", "Crop yield forecast falls below buyer quantity", [
        "Supply gap calculated against the contract",
        "Additional farmers searched in region",
        "If unmet, buyer quantity renegotiation triggered",
        "Procurement + KAM notified",
        "Gap resolution logged to audit trail",
      ], "procurement", "72 hrs to close the gap", ["master-kam", "master-admin"]),
      D: chain("D", T_D, GEN_D, "procurement", "5 days to complete KYC", ["master-kam"]),
      E: chain("E", T_E, GEN_E, "procurement", "48 hrs to re-plan supply", ["master-kam"]),
    },
    worked:
      "20 MT is allocated across four growers in Kotkhai and Jubbal — roughly 5 MT each, deliberately spread across two altitude bands so a hailstorm in one valley does not take out the whole consignment. Two growers are already on the system; two are new and need KYC, land records and bank details captured before the pickers go out. The harvest calendar says the Royal Delicious blocks at 2,100 m pick around 26–30 September.",
    erp: {
      entities: "Supplier, Farm, Allocation",
      fields: "farmer_id · farm_id · gps_polygon · variety · expected_yield_kg · harvest_window · allocation_qty · agreed_price",
      note: "Allocation is a separate record from the lot. One allocation can produce several lots, and a lot can under-deliver against its allocation — you need both numbers to explain a shortfall.",
    },
  },
  {
    n: 3,
    name: "Field QC",
    short: "Field QC",
    phase: "farm-gate",
    ownerRole: "qc",
    supportRoles: ["procurement"],
    risk: 41,
    band: "ELEVATED",
    desc: "Pre-harvest or at-harvest inspection captures size, maturity, defects, GPS and photo evidence against the buyer specification, before any lot is created.",
    input: "Farm + crop + buyer specification",
    output: "Digital QC record with a PASS / CONDITIONAL / HOLD / REJECT decision",
    sla: "Inspection logged within 4 hrs of harvest",
    trigger: "Harvest reaches inspection-ready state",
    systemAction: "Generates the QC record, timestamps GPS and photos, calculates the pass rate",
    humanAction: "Inspector grades a sample against the spec and uploads photo and video evidence",
    notifications: [
      { level: "ACTION", text: "QC pending inspector sign-off" },
      { level: "CRITICAL", text: "Lot failed QC" },
    ],
    docs: [
      { name: "Field QC Report", requirement: "M", issuer: "QC Inspector", why: "Sample size, count-size distribution, firmness, brix, colour and defect percentages against spec. The single most valuable document you own when a claim arrives." },
      { name: "Photo / Video Evidence", requirement: "M", issuer: "QC Inspector", why: "Timestamped, geotagged images of the actual sample. Blocks: no evidence, no defensible QC decision." },
      { name: "GPS & Timestamp Log", requirement: "M", issuer: "System", why: "Proves the inspector was physically at that farm at that time. Prevents desk-signed QC, the most common quiet failure in field inspection." },
      { name: "Pesticide / Residue Test", requirement: "O", issuer: "Accredited laboratory", why: "Maximum residue limit compliance. Mandatory for EU and several other markets, risk-based for UAE. Lead time is days — order it before you need it." },
      { name: "Inspector Sign-off", requirement: "M", issuer: "QC Inspector", why: "The named human accountable for the decision. Blocks: lot creation at stage 04." },
    ],
    scenarios: {
      A: chain("A", "Inspector arrives on schedule", [
        "Sample graded against buyer spec",
        "Photos, GPS and timestamp captured",
        "QC record marked PASS",
        "Lot creation unlocked",
        "Advance to lot creation",
      ], "qc", "4 hrs from harvest", ["master-admin"]),
      B: chain("B", T_B, GEN_B, "qc", "4 hrs to reschedule inspection", ["procurement", "master-admin"]),
      C: chain("C", "Maturity or quality below buyer spec", [
        "QC record marked REJECT",
        "Lot creation blocked for this crop batch",
        "Buyer quantity gap recalculated",
        "Replacement supply search triggered",
        "Procurement alert created",
      ], "qc", "Same day decision", ["procurement", "master-kam", "master-admin"]),
      D: chain("D", T_D, GEN_D, "qc", "24 hrs to produce evidence", ["master-admin"]),
      E: chain("E", T_E, GEN_E, "qc", "24 hrs to re-sample against the new spec", ["master-kam"]),
    },
    worked:
      "The inspector pulls 100 apples from across the picking and finds 82% meet the 100–125 count band, firmness averages 15.2 lbf and brix 12.6 — all inside spec. But 6% show sunburn on the south-facing block, above the 2% defect tolerance. The decision is CONDITIONAL PASS with a note to grade out the sunburnt fruit at packing. That single note is what later explains why 20 MT was contracted and only 19.4 MT shipped.",
    erp: {
      entities: "QCRecord",
      fields: "lot_candidate_id · farm_id · sample_size · measurements{} · defect_pct · decision · inspector_id · gps · photos[] · timestamp",
      note: "Store measurements as structured values against the spec's typed tolerances so PASS / FAIL is computed, then optionally overridden by a named human — never typed in free text.",
    },
  },
  {
    n: 4,
    name: "Lot Creation",
    short: "Lot Creation",
    phase: "farm-gate",
    ownerRole: "qc",
    supportRoles: ["warehouse"],
    risk: 15,
    band: "LOW",
    desc: "Every accepted quantity is assigned a unique, QR-linked Lot ID connecting farm, farmer, crop, QC record and every downstream movement.",
    input: "PASS or CONDITIONAL QC record + accepted quantity",
    output: "Lot ID with QR traceability",
    sla: "Immediate on QC approval",
    trigger: "Field QC returns PASS or CONDITIONAL PASS",
    systemAction: "Generates the Lot ID and QR code and opens the traceability chain",
    humanAction: "QC or Warehouse confirms quantity and grade against the lot",
    notifications: [{ level: "INFO", text: "Lot created and ready for pickup scheduling" }],
    docs: [
      { name: "Lot Certificate", requirement: "M", issuer: "System", why: "The lot's birth certificate: farm, farmer, variety, harvest date, quantity, grade and QC reference." },
      { name: "QR Traceability Record", requirement: "M", issuer: "System", why: "The scannable link, printed on every carton and pallet label so the buyer — and a regulator — can trace the fruit back without calling you." },
      { name: "Grade & Quantity Declaration", requirement: "M", issuer: "QC / Warehouse", why: "The accepted quantity by grade. The number procurement is measured against and the number the farmer is paid on." },
    ],
    scenarios: {
      A: chain("A", T_A, GEN_A, "qc", "Immediate on QC approval", ["warehouse"]),
      B: chain("B", T_B, GEN_B, "qc", "2 hrs to create the lot", ["warehouse", "master-admin"]),
      C: chain("C", T_C, GEN_C, "qc", "Same day", ["procurement", "master-admin"]),
      D: chain("D", T_D, GEN_D, "qc", "24 hrs", ["documentation"]),
      E: chain("E", T_E, GEN_E, "qc", "24 hrs", ["master-kam"]),
    },
    worked:
      "Four lots are created, one per grower: LOT-HP-APL-2026-00112 through 00115. The 00112 lot carries 5.1 MT from Kotkhai, harvested 28 September at 07:40, CONDITIONAL PASS, sunburn note attached. The QR printed on its cartons resolves to that record for the life of the fruit. Six weeks later, when the buyer photographs three bruised cartons, the QR on those cartons is what tells you they came from 00114 and not 00112.",
    erp: {
      entities: "Lot",
      fields: "lot_id · trade_id · farm_id · farmer_id · variety · harvest_datetime · qty_accepted_kg · grade · qc_record_id · shelf_life_start · state",
      note: "shelf_life_start = harvest datetime, not warehouse receipt. Getting this wrong makes every downstream shelf-life number optimistic, which is the dangerous direction to be wrong in.",
    },
  },
  {
    n: 5,
    name: "Farm Pickup",
    short: "Farm Pickup",
    phase: "farm-gate",
    ownerRole: "logistics",
    supportRoles: ["procurement", "cold-chain"],
    risk: 38,
    band: "MODERATE",
    desc: "Truck and driver are assigned, the load is weighed and temperature-logged at origin, and the shipment departs for the warehouse.",
    input: "Lot ID + pickup request",
    output: "Loaded truck en route with GPS and temperature logging started",
    sla: "Truck dispatched within 6 hrs of pickup request",
    trigger: "Lot marked ready for pickup",
    systemAction: "Assigns truck and driver, opens the GPS and temperature stream, starts the ETA clock",
    humanAction: "Driver loads the produce and records start weight and temperature",
    notifications: [{ level: "WARNING", text: "Truck not dispatched within SLA window" }],
    docs: [
      { name: "Pickup / Gate Pass", requirement: "M", issuer: "AMAMA / Farm", why: "Authorises the movement and records which lots left which farm on which vehicle." },
      { name: "Weighbridge Slip", requirement: "M", issuer: "Weighbridge operator", why: "Independent gross weight at origin. Your only defence against a quantity dispute with the farmer, and the baseline for reconciliation at stage 06." },
      { name: "Loading QC Checklist", requirement: "M", issuer: "Driver / Field supervisor", why: "Crate condition, stacking height, tarpaulin and pulp temperature at loading. Blocks: cold-chain accountability — without a start temperature, every later excursion is arguable." },
      { name: "Driver / Vehicle Documents", requirement: "M", issuer: "Transporter", why: "Licence, registration, fitness, insurance and — for a reefer leg — the genset. An expired fitness certificate detains your fruit at a state checkpoint." },
    ],
    scenarios: {
      A: chain("A", T_A, GEN_A, "logistics", "6 hrs to dispatch", ["master-admin"]),
      B: chain("B", "Truck delayed at origin", [
        "Warehouse inbound slot missed",
        "Appointment rescheduled",
        "Inventory risk increases at the warehouse",
        "Notification generated to both parties",
        "New ETA calculated, owner assigned",
      ], "logistics", "4 hrs to a new ETA", ["warehouse", "master-admin"]),
      C: chain("C", "Truck breakdown or unavailable en route", [
        "Pickup marked FAILED",
        "Backup vehicle search triggered",
        "Cold-chain clock risk reassessed",
        "Logistics + Cold Chain notified",
        "Recovery plan logged to audit trail",
      ], "logistics", "6 hrs to a replacement vehicle", ["cold-chain", "master-admin"]),
      D: chain("D", T_D, GEN_D, "logistics", "Before dispatch — hard gate", ["documentation"]),
      E: chain("E", T_E, GEN_E, "logistics", "12 hrs to re-plan the run", ["master-kam"]),
    },
    worked:
      "The apples are picked from first light and sit in the orchard shed until a truck can get up the road — six hours of field heat at roughly 22 °C, and the most expensive six hours in the entire trade. The run down to the pack-house is 18 hours. A non-reefer truck here would burn about four days of shelf life; an insulated truck with a genset burns about one. This is the cheapest upgrade available in the whole chain.",
    erp: {
      entities: "Movement",
      fields: "movement_id · lot_ids[] · vehicle_id · driver_id · origin_gps · dispatch_planned/actual · gross_weight · pulp_temp_start · eta_planned/actual",
      note: "Start the temperature time-series at dispatch, not at warehouse arrival. The road leg is where most unexplained shelf-life loss happens and where nobody is watching.",
    },
  },
  {
    n: 6,
    name: "Warehouse Inbound & Zones",
    short: "Warehouse Inbound",
    phase: "cold-chain",
    ownerRole: "warehouse",
    supportRoles: ["qc", "logistics"],
    risk: 44,
    band: "ELEVATED",
    desc: "Truck arrival, gate entry, weight verification, lot scan and zone allocation across receiving, QC, sorting, cold storage and dispatch zones.",
    input: "Arriving truck + Lot ID",
    output: "Inventory record with zone, temperature and status",
    sla: "Unloaded and scanned within 90 min of arrival",
    trigger: "Truck reaches the warehouse gate",
    systemAction: "Logs gate-in, verifies weight against the manifest, allocates a storage zone",
    humanAction: "Dock team unloads; warehouse QC re-checks the lot",
    notifications: [{ level: "ACTION", text: "Quantity mismatch on inbound" }],
    docs: [
      { name: "Gate Entry Log", requirement: "M", issuer: "Warehouse", why: "Arrival timestamp, vehicle, seal condition and driver. Starts the 90-minute unload clock." },
      { name: "Weight Verification Report", requirement: "M", issuer: "Warehouse", why: "Received weight against the origin weighbridge slip. Any gap over tolerance is either shrinkage, theft or a measurement error — and each has a different owner." },
      { name: "Inbound QC Record", requirement: "M", issuer: "Warehouse QC", why: "A second look after the road leg: transit damage, temperature on arrival, crate condition. Catches damage before it is mixed into your good stock." },
      { name: "Zone Allocation Slip", requirement: "M", issuer: "Warehouse system", why: "Which lot went into which zone and bay. Blocks: you cannot find, pick or pre-cool what you cannot locate." },
    ],
    scenarios: {
      A: chain("A", T_A, GEN_A, "warehouse", "90 min to unload and scan", ["logistics"]),
      B: chain("B", "Truck arrives outside the appointment window", [
        "Dock assignment delayed",
        "Queue risk flagged for other inbound trucks",
        "New dock slot allocated",
        "Notification to warehouse & logistics owner",
        "Inbound resumed, ETA log updated",
      ], "warehouse", "2 hrs to a new dock slot", ["logistics", "master-admin"]),
      C: chain("C", "Warehouse has no capacity in the required zone", [
        "Inbound marked HOLD at gate",
        "Overflow / alternate warehouse searched",
        "Cold-chain clock risk escalates",
        "Warehouse + Cold Chain notified",
        "Reallocation logged and inventory updated",
      ], "warehouse", "4 hrs to reallocate", ["cold-chain", "master-admin"]),
      D: chain("D", T_D, GEN_D, "warehouse", "24 hrs", ["documentation"]),
      E: chain("E", T_E, GEN_E, "warehouse", "12 hrs", ["master-kam"]),
    },
    worked:
      "The truck arrives at 04:10 with a pulp temperature of 19 °C. 5,080 kg is recorded against the 5,100 kg that left Kotkhai — a 0.4% loss, inside tolerance and normal for an 18-hour road leg. The lot is scanned into the pre-cooling zone rather than straight into cold storage, which matters: dropping warm fruit directly into a cold room takes days to reach core temperature and condenses moisture on the skin, which is how rot starts.",
    erp: {
      entities: "InventoryRecord",
      fields: "lot_id · warehouse_id · zone · bay · qty_received · weight_variance · arrival_temp · gate_in_time · unload_complete_time · state",
      note: "Zone is a state with a temperature regime attached, not a label. The system should refuse to move a lot into a zone whose regime contradicts the product's requirement.",
    },
  },
  {
    n: 7,
    name: "Pre-cooling & Cold Storage",
    short: "Pre-cool & Cold Store",
    phase: "cold-chain",
    ownerRole: "cold-chain",
    supportRoles: ["qc", "warehouse"],
    risk: 52,
    band: "ELEVATED",
    desc: "Continuous temperature tracking from pre-cooling through cold storage, with automated excursion detection and a corrective workflow.",
    input: "Inbound lot at ambient / field temperature",
    output: "Lot stabilised at target temperature, shelf-life clock recalculated",
    sla: "Target temperature reached within 2 hrs of inbound",
    trigger: "Lot enters the pre-cooling zone",
    systemAction: "Streams sensor data, calculates the shelf-life countdown, flags excursions automatically",
    humanAction: "Cold Chain team monitors the dashboard and responds to alerts",
    notifications: [{ level: "CRITICAL", text: "Temperature excursion detected for lot" }],
    docs: [
      { name: "Pre-cooling Log", requirement: "M", issuer: "System / Cold Chain", why: "The pull-down curve: start pulp temperature, time to seven-eighths cooling, final core temperature. Proves the fruit was actually cooled, not just stored cold." },
      { name: "Cold Storage Temperature Log", requirement: "M", issuer: "System", why: "Continuous set-point-versus-actual record. The document an insurer or a carrier asks for first when a claim is raised." },
      { name: "Shelf-life Reassessment", requirement: "O", issuer: "Cold Chain / QC", why: "Raised after any excursion: revised remaining shelf life and a recommendation to ship first, downgrade or divert." },
    ],
    scenarios: {
      A: chain("A", T_A, GEN_A, "cold-chain", "2 hrs to target temperature", ["warehouse"]),
      B: chain("B", T_B, GEN_B, "cold-chain", "2 hrs to restore the pull-down", ["warehouse", "master-admin"]),
      C: chain("C", "Temperature exceeds the configured threshold", [
        "Sensor event fires automatically",
        "Risk engine recalculates shelf life and shipment risk",
        "Lot moved to quarantine",
        "QC re-inspects the affected lot",
        "Accept / downgrade / reject decision logged",
      ], "cold-chain", "30 min to acknowledge · 4 hrs to a QC decision", ["qc", "master-admin"]),
      D: chain("D", T_D, GEN_D, "cold-chain", "24 hrs", ["documentation"]),
      E: chain("E", T_E, GEN_E, "cold-chain", "12 hrs", ["master-kam"]),
    },
    worked:
      "Forced-air pre-cooling brings the apples from 19 °C to 1 °C in about seven hours, then they hold at +0.5 °C and 90–95% relative humidity. Two things have to be watched that a generic WMS will not watch: humidity, because apples shrivel and lose weight below about 90% RH, and neighbours, because apples emit ethylene heavily and will over-ripen anything sensitive sharing the chamber. On day three a door sensor logs a 40-minute open door and the chamber drifts to 4 °C — a minor excursion, logged, no action, but now permanently on the record if a claim comes.",
    erp: {
      entities: "TemperatureStream, ExcursionEvent",
      fields: "lot_id · container_id · sensor_id · timestamp · temp_c · humidity_pct · setpoint_c · excursion_id · duration_min · peak_temp · shelf_life_debit_days",
      note: "Compute the shelf-life debit at the moment of the excursion and store it. Recomputing history later, after someone changes the model, destroys the audit value of the record.",
    },
  },
  {
    n: 8,
    name: "Packing & Export QC",
    short: "Packing & Export QC",
    phase: "cold-chain",
    ownerRole: "qc",
    supportRoles: ["warehouse"],
    risk: 36,
    band: "MODERATE",
    desc: "Sorted, washed and packed product undergoes final export QC — quantity, grade, packaging, labelling and origin — before container allocation.",
    input: "Cold-stored lot + packaging spec",
    output: "Packed, labelled, export-QC-approved pallets",
    sla: "Export QC completed 24 hrs before stuffing",
    trigger: "Packing run completed for a lot",
    systemAction: "Generates pallet IDs, links them to the Lot ID, opens the export QC checklist",
    humanAction: "QC signs off the export QC decision",
    notifications: [{ level: "ACTION", text: "Export QC pending before stuffing cut-off" }],
    docs: [
      { name: "Export QC Certificate", requirement: "M", issuer: "QC Manager", why: "The final quality decision before the fruit leaves your control. Blocks: container allocation at stage 09." },
      { name: "Packing List (draft)", requirement: "M", issuer: "Warehouse", why: "Cartons, net and gross weight, pallet breakdown. Becomes the final packing list at stage 11 and must then match the invoice and the shipping bill exactly." },
      { name: "Labelling / Country of Origin", requirement: "M", issuer: "AMAMA", why: "Carton marking: product, variety, grade, count, net weight, packer code, country of origin and lot QR. A labelling error is a customs hold at the destination, not a cosmetic issue." },
      { name: "Pallet Manifest", requirement: "M", issuer: "Warehouse system", why: "Which pallet holds which cartons from which lot. Blocks: the scan reconciliation at stage 10 — and any partial claim later." },
    ],
    scenarios: {
      A: chain("A", T_A, GEN_A, "qc", "24 hrs before stuffing", ["warehouse"]),
      B: chain("B", T_B, GEN_B, "qc", "12 hrs to complete export QC", ["warehouse", "master-admin"]),
      C: chain("C", "Export QC fails on damage, size or appearance", [
        "Pallet marked REJECT",
        "Container allocation reduced or re-planned",
        "Replacement pallets sourced from buffer stock",
        "QC + Procurement notified",
        "Revised packing plan logged",
      ], "qc", "8 hrs to substitute a pallet", ["procurement", "logistics", "master-admin"]),
      D: chain("D", T_D, GEN_D, "qc", "24 hrs", ["documentation"]),
      E: chain("E", T_E, GEN_E, "qc", "12 hrs", ["master-kam"]),
    },
    worked:
      "The four lots are graded, the sunburnt fruit from 00112 is pulled out, and the rest is packed into 9 kg telescopic cartons, 100 cartons per pallet, 20 pallets. Final export QC samples two cartons per pallet. One pallet fails on count-size drift — too many 135s — and is swapped for a buffer pallet from an earlier lot. Contracted 20.0 MT, shipping 19.4 MT: the gap is traceable, documented and priced, which is the difference between an adjustment and an argument.",
    erp: {
      entities: "Pallet",
      fields: "pallet_id · lot_id · carton_count · net_kg · gross_kg · pulp_temp_at_pack · qc_result · label_batch · state",
      note: "Pallets must be independently rejectable and independently swappable. A model where the container holds lots rather than pallets cannot represent a one-pallet substitution, which happens on most shipments.",
    },
  },
  {
    n: 9,
    name: "Reefer Container Planning",
    short: "Reefer Planning",
    phase: "export",
    ownerRole: "logistics",
    supportRoles: ["cold-chain", "documentation"],
    risk: 47,
    band: "ELEVATED",
    desc: "Container type, shipping line, set point and sailing are selected, with a primary and a backup sailing compared on ETD, transit time and risk.",
    input: "Export-QC-approved pallets + shipment requirement",
    output: "Booked container with PTI, set point and confirmed sailing",
    sla: "Booking confirmed 5 days before stuffing",
    trigger: "Export QC approved, pallets ready for allocation",
    systemAction: "Compares primary against backup sailing on ETD, ETA, cut-off and risk",
    humanAction: "Logistics confirms the booking with the shipping line",
    notifications: [{ level: "WARNING", text: "Reefer availability tight on preferred sailing" }],
    docs: [
      { name: "Booking Confirmation", requirement: "M", issuer: "Shipping line", why: "Vessel, voyage, ETD, ETA and — the fields that actually matter — the gate-in, VGM and shipping-instruction cut-offs." },
      { name: "PTI Report", requirement: "M", issuer: "Shipping line / Depot", why: "Pre-Trip Inspection of the reefer machinery. Blocks: never accept a reefer without a current PTI; a failed unit discovered at stuffing costs you the sailing." },
      { name: "Set-point / Ventilation Instructions", requirement: "M", issuer: "AMAMA → Shipping line", why: "Carriage temperature, fresh-air exchange rate and humidity. Issued in writing to the line, because 'we told the driver' is not a defence in a carrier claim." },
    ],
    scenarios: {
      A: chain("A", T_A, GEN_A, "logistics", "5 days before stuffing", ["master-admin"]),
      B: chain("B", T_B, GEN_B, "logistics", "24 hrs to confirm the booking", ["master-admin"]),
      C: chain("C", "Reefer unavailable on the primary sailing", [
        "Booking marked AT RISK",
        "System auto-recommends the backup sailing",
        "Cost and transit-time impact calculated",
        "Logistics notified for approval",
        "Rebooking confirmed and logged",
      ], "logistics", "12 hrs to confirm the backup sailing", ["master-kam", "master-admin"]),
      D: chain("D", T_D, GEN_D, "logistics", "24 hrs", ["documentation"]),
      E: chain("E", T_E, GEN_E, "logistics", "24 hrs to re-book", ["master-kam"]),
    },
    worked:
      "One 40ft high-cube reefer is booked out of Mundra: set point +0.5 °C, fresh-air vent 20 CBM/hr to clear CO₂ and the ethylene the apples generate, humidity 90%. Two sailings are compared — MSC on the 9th with a 6-day transit, and a CMA CGM sailing on the 12th at 8 days. The 9th is chosen and the 12th is held as the documented backup, because at stage 13 that backup is the only thing standing between a missed cut-off and a week of lost shelf life.",
    erp: {
      entities: "Booking, Container",
      fields: "booking_ref · line · vessel · voyage · etd · eta · cutoff_gatein · cutoff_vgm · cutoff_si · container_type · setpoint_c · vent_cbm · pti_ref · backup_booking_ref",
      note: "Store the three cut-offs as first-class datetime fields on the booking. Every urgent alert in the second half of the process is derived from them, and they change without notice when a vessel is re-scheduled.",
    },
  },
  {
    n: 10,
    name: "Container Stuffing",
    short: "Stuffing",
    phase: "export",
    ownerRole: "warehouse",
    supportRoles: ["logistics", "cold-chain"],
    risk: 49,
    band: "ELEVATED",
    desc: "The container is inspected, pre-cooled and loaded with full pallet and lot scan reconciliation, temperature check and seal capture.",
    input: "Booked container + dispatched pallets",
    output: "Sealed, stuffed container with a final stuffing report",
    sla: "Stuffing completed within the cut-off window",
    trigger: "Container arrives at the warehouse for loading",
    systemAction: "Reconciles pallet and lot scans against the manifest, captures seal number and VGM",
    humanAction: "Warehouse team loads the container and verifies temperature at close-out",
    notifications: [{ level: "URGENT", text: "Stuffing behind schedule against cut-off" }],
    docs: [
      { name: "Stuffing Report", requirement: "M", issuer: "Warehouse", why: "What went in, in what order, at what temperature, witnessed by whom. Photographs of the loaded container before the doors close belong here." },
      { name: "Seal Number Record", requirement: "M", issuer: "Warehouse / Line", why: "The bottle seal number, photographed. From this moment the contents are fixed; the seal number appears on the B/L and is checked on arrival." },
      { name: "VGM Declaration", requirement: "M", issuer: "Shipper", why: "Verified Gross Mass under SOLAS. Blocks: the line will not load a container without a VGM filed before the cut-off — a hard, non-negotiable gate." },
      { name: "Container Inspection / PTI Verification", requirement: "M", issuer: "Warehouse / Line", why: "Cleanliness, odour, drain holes, door seals, floor T-bars clear, and confirmation the machinery ran the PTI. Ten minutes here prevents a total loss." },
    ],
    scenarios: {
      A: chain("A", T_A, GEN_A, "warehouse", "Within the stuffing window", ["logistics"]),
      B: chain("B", "Container arrival delayed", [
        "Stuffing schedule pushed against the cut-off",
        "Risk of missed gate-in flagged",
        "Priority slot requested from the terminal",
        "Logistics notified",
        "Revised stuffing time confirmed",
      ], "logistics", "4 hrs to a revised stuffing slot", ["master-admin"]),
      C: chain("C", "Container damage or PTI failure found", [
        "Loading halted, container marked REJECTED",
        "Replacement container requested from the line",
        "Cut-off risk recalculated",
        "Logistics + Warehouse notified",
        "Replacement container stuffed and logged",
      ], "logistics", "6 hrs to a replacement container", ["master-admin"]),
      D: chain("D", T_D, GEN_D, "warehouse", "Before seal — hard gate", ["documentation", "logistics"]),
      E: chain("E", T_E, GEN_E, "warehouse", "Before seal only", ["master-kam"]),
    },
    worked:
      "MSKU 784123-6 arrives, is checked for odour and drain-hole blockage, and is run empty at set point for two hours before loading — a reefer holds temperature, it does not pull it down, so loading into a warm box undoes the pre-cooling. All 20 pallets are scanned at the door and reconciled against the manifest. Pulp temperature is taken at three pallet positions, not air temperature: 0.7 °C, 0.9 °C, 1.1 °C. Doors close, seal SL-0099412 photographed, VGM 26,340 kg filed. From here on, everything is paperwork and weather.",
    erp: {
      entities: "StuffingEvent",
      fields: "container_id · pallet_ids[] · scan_log[] · variance · pulp_temps[] · seal_no · seal_photo · vgm_kg · vgm_filed_at · stuffed_by · door_close_time",
      note: "Make seal capture the state transition that locks the container record. After SEALED, changes to contents should require a supervisor-authorised reversal event, not an edit.",
    },
  },
  {
    n: 11,
    name: "Document Control",
    short: "Document Control",
    phase: "export",
    ownerRole: "documentation",
    supportRoles: ["logistics", "finance"],
    risk: 45,
    band: "ELEVATED",
    desc: "Central control tower for every trade, lot and container document, with automated D-7 / D-3 / D-1 / OVERDUE alerts.",
    input: "All stage-level documents",
    output: "A complete, verified document set ready for customs filing",
    sla: "All mandatory documents VERIFIED 48 hrs before filing",
    trigger: "Any document uploaded, expiring or missing",
    systemAction: "Tracks status, fires D-7 / D-3 / D-1 / OVERDUE reminders, links documents to Lot and Container IDs",
    humanAction: "Documentation verifies and approves each document",
    notifications: [{ level: "CRITICAL", text: "Phytosanitary certificate missing — export clearance blocked" }],
    docs: [
      { name: "Commercial Invoice", requirement: "M", issuer: "AMAMA", why: "Value, terms and description of goods. Must agree with the packing list and shipping bill to the decimal — mismatches are the most common customs query." },
      { name: "Packing List (final)", requirement: "M", issuer: "AMAMA", why: "Final cartons, weights and pallet breakdown as actually stuffed, not as planned at stage 08." },
      { name: "Certificate of Origin", requirement: "M", issuer: "Chamber / DGFT platform", why: "Proves Indian origin. A preferential certificate under a trade agreement can cut the buyer's import duty — commercially significant, and a different form to raise." },
      { name: "Phytosanitary Certificate", requirement: "M", issuer: "Plant Quarantine authority", why: "Certifies the consignment is pest-free and meets the importing country's plant-health rules. Government-issued, inspection-dependent, and must be dated close to shipment — so it cannot be obtained early and parked. The usual reason a perishable export misses its sailing." },
      { name: "Fumigation Certificate", requirement: "O", issuer: "Approved fumigation agency", why: "Required by some destinations or for wooden pallets. Note that fumigating fresh produce is generally not acceptable, so the pallet specification matters." },
      { name: "Insurance Certificate", requirement: "M", issuer: "Insurer", why: "Cargo cover for the voyage. Under CFR the buyer normally insures; under CIF you do. Either way, record who holds it — at claim time it is the first question." },
      { name: "Bill of Lading (draft)", requirement: "M", issuer: "Shipping line", why: "Draft B/L issued against your shipping instructions. Check consignee, notify party, description and seal number before it is finalised; correcting a released B/L is slow and chargeable." },
    ],
    scenarios: {
      A: chain("A", T_A, GEN_A, "documentation", "48 hrs before filing", ["logistics"]),
      B: chain("B", T_B, GEN_B, "documentation", "D-3 escalation", ["logistics", "master-admin"]),
      C: chain("C", T_C, GEN_C, "documentation", "Same day", ["logistics", "master-admin"]),
      D: chain("D", "Phytosanitary certificate missing at D-3", [
        "Document status set RED",
        "Export clearance blocked automatically",
        "Documentation owner notified immediately",
        "Deadline countdown escalates to URGENT",
        "CHA engaged to expedite issuance",
      ], "documentation", "D-3 warning · D-1 urgent · hard block at filing", ["logistics", "master-admin"]),
      E: chain("E", T_E, GEN_E, "documentation", "24 hrs to reissue the document set", ["master-kam", "master-admin"]),
    },
    worked:
      "Seven documents have to be right and consistent with each other. The invoice says 19,400 kg net; so must the packing list, the shipping bill and the B/L. The phytosanitary inspection is booked for the 6th, one day before the gate-in cut-off — exactly the kind of margin that turns into a crisis when the inspector is diverted. The system starts pinging at D-7 and escalates at D-3 for precisely this document, because it is the only one whose timing you do not control.",
    erp: {
      entities: "Document (polymorphic)",
      fields: "doc_id · type · entity_type · entity_id · mandatory · issuer · issued_on · expires_on · status · file_ref · verified_by · verified_at · blocks[]",
      note: "One table, not one per type. The blocks[] field — which downstream gate this document holds up — is what turns a document tracker into a control tower.",
    },
  },
  {
    n: 12,
    name: "Customs",
    short: "Customs",
    phase: "export",
    ownerRole: "documentation",
    supportRoles: ["logistics"],
    risk: 43,
    band: "ELEVATED",
    desc: "Shipping bill filing and electronic upload of supporting documents, then assessment — branching into cleared, query, or rejected paths.",
    input: "Verified document set",
    output: "Let Export Order (LEO) — cleared for terminal gate-in",
    sla: "Assessment within 24 hrs of filing",
    trigger: "Document set marked complete",
    systemAction: "Files the shipping bill and uploads supporting documents electronically, tracks assessment status",
    humanAction: "CHA responds to any customs query",
    notifications: [{ level: "ACTION", text: "Customs query raised, response needed" }],
    docs: [
      { name: "Shipping Bill", requirement: "M", issuer: "CHA on the customs portal", why: "The export declaration. Carries the invoice value, HS classification, incentive claims and the AD code. Also the document your bank later reconciles the inward payment against." },
      { name: "e-SANCHIT Filing", requirement: "M", issuer: "CHA", why: "Electronic upload of every supporting certificate so the assessing officer can see them. A missing upload here reads to customs as a missing document." },
      { name: "Supporting Certificates", requirement: "M", issuer: "Various", why: "Phytosanitary, origin, insurance and inspection certificates as applicable to the destination." },
      { name: "Let Export Order (LEO)", requirement: "M", issuer: "Customs", why: "The clearance. Blocks: without a LEO the terminal will not accept the container — the gate between paperwork and physical movement." },
    ],
    scenarios: {
      A: chain("A", T_A, GEN_A, "documentation", "24 hrs assessment", ["logistics"]),
      B: chain("B", T_B, GEN_B, "documentation", "12 hrs to chase assessment", ["logistics", "master-admin"]),
      C: chain("C", "Customs examination flags a discrepancy", [
        "Filing marked BLOCKED",
        "Documentation correction prepared",
        "Resubmission filed",
        "CHA + Documentation notified",
        "Cleared or re-escalated based on outcome",
      ], "documentation", "4 hrs to respond to a query", ["logistics", "master-admin"]),
      D: chain("D", T_D, GEN_D, "documentation", "4 hrs", ["logistics", "master-admin"]),
      E: chain("E", T_E, GEN_E, "documentation", "Re-file required — 24 hrs", ["master-kam", "master-admin"]),
    },
    worked:
      "The shipping bill is filed on the 6th under the fresh-apple classification with the drawback and incentive claims attached. Assessment raises one query: the invoice says 19,400 kg net but the VGM implies a different tare. The CHA answers within three hours with the stuffing report and the container's tare plate. LEO is issued the same evening. Had the query landed on a Friday evening instead, the container would have missed the cut-off and rolled a week — which is why the 24-hour assessment SLA is tracked as a risk, not a fact.",
    erp: {
      entities: "CustomsFiling",
      fields: "shipping_bill_no · filed_at · assessed_at · status · queries[] · leo_no · leo_at · drawback_claim · incentive_claim · ad_code · port_code",
      note: "Keep the shipping bill number on the trade forever. It is the key that links the export to the bank's realisation record and to any incentive credit that arrives months later.",
    },
  },
  {
    n: 13,
    name: "Terminal Gate-In",
    short: "Terminal Gate-In",
    phase: "export",
    ownerRole: "logistics",
    supportRoles: ["documentation"],
    risk: 55,
    band: "HIGH",
    desc: "The container clears final terminal acceptance against a live cut-off countdown, with shipping line and customs sign-off.",
    input: "Cleared container (LEO) + VGM",
    output: "Container accepted inside the terminal, ready for vessel loading",
    sla: "Gate-in completed before cut-off",
    trigger: "LEO issued and container dispatched to the terminal",
    systemAction: "Runs a live cut-off countdown (green / amber / red) and confirms terminal acceptance",
    humanAction: "Logistics coordinates the terminal appointment",
    notifications: [{ level: "CRITICAL", text: "Cut-off in 60 minutes, gate-in not yet confirmed" }],
    docs: [
      { name: "Terminal Gate Pass", requirement: "M", issuer: "Terminal", why: "Authorises entry. Issued against the LEO and the booking, and tied to an appointment slot." },
      { name: "VGM Confirmation", requirement: "M", issuer: "Terminal / Line", why: "Acknowledgement that the verified gross mass was received and accepted. No VGM, no loading — no exceptions." },
      { name: "Shipping Line Acceptance", requirement: "M", issuer: "Shipping line", why: "The line's confirmation that the container is accepted for the nominated vessel. The moment the sailing stops being a plan." },
    ],
    scenarios: {
      A: chain("A", T_A, GEN_A, "logistics", "Before cut-off", ["master-admin"]),
      B: chain("B", T_B, GEN_B, "logistics", "Live countdown — amber at T-4h", ["master-admin"]),
      C: chain("C", "Container misses the terminal cut-off", [
        "Gate-in marked MISSED",
        "Vessel roll risk assessed",
        "Backup sailing evaluated automatically",
        "Logistics + KAM + buyer notified",
        "Container re-booked on the next available sailing",
      ], "logistics", "2 hrs to confirm the backup sailing", ["master-kam", "master-admin"]),
      D: chain("D", T_D, GEN_D, "documentation", "Immediate — blocks gate-in", ["logistics", "master-admin"]),
      E: chain("E", T_E, GEN_E, "logistics", "Not permitted after gate-in", ["master-admin"]),
    },
    worked:
      "Cut-off is 18:00 on the 7th. The container leaves the pack-house at 05:00 on a genset trailer and reaches Mundra at 15:40 — comfortable, but only because the LEO came through the previous evening. It plugs into terminal power at 16:20. That plug-in time should be a mandatory field: between the trailer genset stopping and terminal power starting there is a gap of minutes to hours in which nothing is cooling the fruit and nothing is recording it. This is the single largest blind spot in most cold chains.",
    erp: {
      entities: "GateInEvent",
      fields: "container_id · terminal · appointment_slot · cutoff_at · gate_in_at · countdown_state · genset_off_at · terminal_plug_in_at · accepted_by",
      note: "The countdown state (green / amber / red) should be computed server-side on a schedule, not on page load. Nobody is looking at the dashboard at 02:00 — the alert has to find the person.",
    },
  },
  {
    n: 14,
    name: "Vessel & Freight Tracking",
    short: "Vessel Tracking",
    phase: "transit",
    ownerRole: "logistics",
    supportRoles: ["kam", "documentation"],
    risk: 58,
    band: "HIGH",
    desc: "Live vessel tracking with ETA variance, delay-reason capture and automatic backup-sailing recommendation.",
    input: "Loaded, departed container",
    output: "Live ETA and delay risk feed to the buyer portal",
    sla: "ETA variance reviewed daily until arrival",
    trigger: "Vessel departs the port of loading",
    systemAction: "Ingests vessel position data, recalculates ETA variance and delay risk",
    humanAction: "Logistics reviews at-risk sailings and actions backups",
    notifications: [{ level: "WARNING", text: "Vessel ETA variance +12 hrs, shelf-life risk rising" }],
    docs: [
      { name: "Bill of Lading (final)", requirement: "M", issuer: "Shipping line", why: "The title document. Under these payment terms the scanned copy triggers the buyer's 70% payment clock — so the day it is released is a financial date, not just a logistics one." },
      { name: "Vessel Manifest", requirement: "M", issuer: "Shipping line", why: "Confirms the container is actually on the sailing you think it is on. Worth checking: containers do get short-shipped without notice." },
      { name: "Insurance Certificate", requirement: "M", issuer: "Insurer", why: "Must be in force from the moment of loading. A certificate issued after departure is a certificate that may not respond." },
    ],
    scenarios: {
      A: chain("A", T_A, GEN_A, "logistics", "Daily ETA review", ["master-admin"]),
      B: chain("B", T_B, GEN_B, "logistics", "Daily until arrival", ["kam", "master-admin"]),
      C: chain("C", "Vessel delayed materially beyond ETA", [
        "Delay hours and reason captured",
        "Remaining shelf life against the buyer deadline recalculated",
        "Alternative sailing or mode evaluated",
        "Buyer + Logistics notified",
        "Revised delivery plan approved and logged",
      ], "logistics", "12 hrs to a revised delivery plan", ["kam", "master-kam", "master-admin"]),
      D: chain("D", T_D, GEN_D, "documentation", "24 hrs", ["logistics"]),
      E: chain("E", T_E, GEN_E, "kam", "Documents only after departure", ["master-kam"]),
    },
    worked:
      "MSC Aurora sails on the 9th, ETA Jebel Ali the 15th. The B/L is released on the 10th and the scan goes to the buyer, starting the 30-day payment clock. Mid-voyage the ETA slips 14 hours on weather. For apples with 100 days of budget left that is noise; for a mango or a berry shipment the same 14 hours would trigger a diversion discussion. Your risk engine has to weigh delay against remaining shelf life per commodity, not treat a delay as a delay.",
    erp: {
      entities: "VoyageTracking",
      fields: "container_id · vessel · voyage · atd · eta_original · eta_current · variance_hrs · delay_reason · bl_no · bl_released_at · shelf_life_remaining_at_eta",
      note: "Push ETA changes to the buyer automatically. A buyer who learns about a two-day slip from your system stays a customer; one who learns it from their own warehouse does not.",
    },
  },
  {
    n: 15,
    name: "Destination Arrival & Buyer Delivery",
    short: "Arrival & Delivery",
    phase: "transit",
    ownerRole: "kam",
    supportRoles: ["logistics", "qc"],
    risk: 39,
    band: "MODERATE",
    desc: "Discharge, import clearance, delivery and proof of delivery, with a final quality confirmation feeding the claim or no-claim decision.",
    input: "Arrived vessel + container",
    output: "Delivered cargo with POD and quality confirmation",
    sla: "Delivery within the buyer's window post-discharge",
    trigger: "Vessel arrives at the destination port",
    systemAction: "Tracks discharge, import clearance and delivery status; opens QR traceability for the buyer",
    humanAction: "Buyer inspects the cargo on arrival and confirms POD",
    notifications: [{ level: "ACTION", text: "Buyer quality confirmation pending" }],
    docs: [
      { name: "Import Clearance Documents", requirement: "M", issuer: "Buyer's broker", why: "Destination-side clearance, including the importing country's food-safety registration and import permit where required. Held by the buyer, but your problem if it stalls — demurrage on a reefer runs fast." },
      { name: "Proof of Delivery (POD)", requirement: "M", issuer: "Buyer", why: "Signed receipt of the cargo. Blocks: the payment clock and the final closure of the trade." },
      { name: "Final Quality Confirmation", requirement: "M", issuer: "Buyer", why: "The buyer's arrival inspection against the original spec. Either it closes the trade clean, or it becomes the basis of a claim — which is why the stage 01 spec and stage 03 evidence matter so much here." },
    ],
    scenarios: {
      A: chain("A", T_A, GEN_A, "kam", "Buyer delivery window", ["master-kam"]),
      B: chain("B", T_B, GEN_B, "kam", "Daily — demurrage accrues", ["logistics", "master-kam"]),
      C: chain("C", "Cargo arrives with quality deterioration", [
        "Buyer raises a claim",
        "Claim evidence (photos, QC) collected",
        "Root cause traced via the traceability chain",
        "Finance + QC + buyer notified",
        "Claim resolved: credit, replacement or rejection",
      ], "kam", "48 hrs to acknowledge · 7 days to resolve", ["qc", "master-kam", "master-admin"]),
      D: chain("D", T_D, GEN_D, "documentation", "24 hrs — demurrage risk", ["kam", "master-admin"]),
      E: chain("E", T_E, GEN_E, "kam", "Credit note route only", ["master-kam", "finance"]),
    },
    worked:
      "The container is discharged on the 15th, cleared on the 16th and delivered to Al Noor's cold store on the 17th, 20 days after harvest with roughly 100 days of budget left. The buyer scans a carton QR, sees the farm, the harvest date, the QC report and the full temperature curve, and signs POD without a survey. That scan is the whole point of stages 03 and 04: it converts a quality argument into a shared record, and it is the reason this buyer reorders without asking for a discount.",
    erp: {
      entities: "Delivery, Claim",
      fields: "container_id · discharged_at · cleared_at · delivered_at · pod_ref · buyer_quality_result · claim_id · claim_amount · claim_root_stage · resolution",
      note: "Link the claim to the stage that caused it, not just to the trade. Ten claims tagged 'stage 07 excursion' is an equipment business case; ten claims tagged 'trade' is a shrug.",
    },
  },
  {
    n: 16,
    name: "Payment & Settlement",
    short: "Payment & Settlement",
    phase: "transit",
    ownerRole: "finance",
    supportRoles: ["kam", "master-admin"],
    risk: 33,
    band: "MODERATE",
    desc: "Buyer payment reconciliation against trade revenue and costs, farmer settlement, and final trade profitability.",
    input: "Delivered and confirmed cargo",
    output: "Reconciled payment, farmer payout, final trade margin",
    sla: "Reconciliation within 5 days of the payment due date",
    trigger: "Buyer payment due date reached, or payment received",
    systemAction: "Reconciles expected against received payment and calculates the realised margin",
    humanAction: "Finance confirms bank receipt and releases the farmer payout",
    notifications: [{ level: "CRITICAL", text: "Buyer payment overdue" }],
    docs: [
      { name: "Payment Advice / SWIFT", requirement: "M", issuer: "Buyer's bank", why: "Evidence of the inward remittance, matched to the invoice and the shipping bill. Also the input to your export realisation record." },
      { name: "Farmer Settlement Record", requirement: "M", issuer: "AMAMA", why: "Final payout per farmer against accepted quantity and grade, net of advances and rejections. Publish it to the farmer — settlement opacity is how supplier networks quietly fall apart." },
      { name: "Trade Profitability Statement", requirement: "M", issuer: "Finance", why: "Revenue against every accrued cost, by stage. The document that tells you whether the trade you just celebrated actually made money." },
    ],
    scenarios: {
      A: chain("A", T_A, GEN_A, "finance", "5 days from due date", ["master-admin"]),
      B: chain("B", "Buyer payment not received by the due date", [
        "Payment status set OVERDUE",
        "Working-capital risk flagged to Finance",
        "Reminder sent to buyer",
        "Finance owner notified",
        "Payment received and reconciled, or escalated to collections",
      ], "finance", "D+3 reminder · D+7 escalation", ["kam", "master-kam", "master-admin"]),
      C: chain("C", "Realised margin falls below the minimum threshold", [
        "Margin risk flagged CRITICAL",
        "Cost breakdown reviewed against plan",
        "Root cause traced to a specific stage (freight / claim / shrinkage)",
        "Master Admin + Finance notified",
        "Corrective pricing action logged for future trades",
      ], "finance", "5 days to a root-cause note", ["master-admin"]),
      D: chain("D", T_D, GEN_D, "finance", "5 days", ["documentation", "master-admin"]),
      E: chain("E", T_E, GEN_E, "finance", "Credit note within 5 days", ["master-kam", "master-admin"]),
    },
    worked:
      "The 30% advance landed before stuffing; the 70% balance is due 30 days from the B/L date — the 8th of November, 41 days after harvest and 30 days after your money went out the door. Finance reconciles the remittance against the invoice and shipping bill, releases the four farmer payouts net of the 0.6 MT graded out at packing, and closes the trade. Realised margin comes in slightly under plan because of the substituted pallet and the extra pre-cooling run — both traceable to a stage, both fixable next season.",
    erp: {
      entities: "Settlement, CostLedger",
      fields: "trade_id · invoice_no · amount_due · amount_received · received_at · fx_rate · farmer_payouts[] · costs_by_stage[] · realised_margin · variance_vs_plan",
      note: "Close the loop past this stage: record the bank's export realisation evidence against the shipping bill, and open a receivable for any duty drawback or export incentive — both arrive weeks later and both belong to this trade's margin.",
    },
  },
]

export const stageByNo = (n: StageNo): Stage => STAGES[n - 1]

/** The four places the process runs backwards. Each is a first-class
 *  state in the model, never an email. */
export const REVERSALS: { from: StageNo; to: StageNo; label: string; cost: string }[] = [
  { from: 3, to: 2, label: "QC reject · re-source", cost: "Days lost" },
  { from: 8, to: 7, label: "Export QC reject · pull buffer pallets", cost: "Margin lost" },
  { from: 12, to: 11, label: "Customs query · correct & refile", cost: "Hours lost against a cut-off" },
  { from: 13, to: 9, label: "Missed cut-off · rebook sailing", cost: "A week lost, shelf life burned" },
]

/* ════════════════════════════════════════════════════════════════════
   PEOPLE — internal
   ════════════════════════════════════════════════════════════════════ */

export type InternalUser = {
  id: string
  name: string
  email: string
  role: InternalRoleId
  title: string
  /** Where they sit — matters because half of these people are at a
   *  pack-house or a port, not at a desk. */
  base: string
  phone: string
}

export const INTERNAL_USERS: InternalUser[] = [
  { id: "u-vikram", name: "Vikram Menon", email: "vikram@amama.com", role: "master-admin", title: "Master Admin", base: "Mumbai", phone: "+91 98200 41120" },
  { id: "u-nisha", name: "Nisha Verma", email: "nisha@amama.com", role: "admin", title: "Platform Admin", base: "Mumbai", phone: "+91 98200 41121" },
  { id: "u-ananya", name: "Ananya Rao", email: "ananya@amama.com", role: "master-kam", title: "Head of Trade Desk", base: "Mumbai", phone: "+91 98200 41122" },
  { id: "u-rohit", name: "Rohit Sharma", email: "rohit@amama.com", role: "kam", title: "Key Account Manager — Gulf", base: "Mumbai", phone: "+91 98200 41123" },
  { id: "u-fatima", name: "Fatima Sheikh", email: "fatima@amama.com", role: "kam", title: "Key Account Manager — Europe & UK", base: "Mumbai", phone: "+91 98200 41124" },
  { id: "u-devendra", name: "Devendra Thakur", email: "devendra@amama.com", role: "procurement", title: "Procurement Manager — North", base: "Shimla", phone: "+91 98160 22014" },
  { id: "u-meera", name: "Meera Pillai", email: "meera@amama.com", role: "qc", title: "Field QC Inspector", base: "Kotkhai, Shimla", phone: "+91 98160 22015" },
  { id: "u-sanjay", name: "Sanjay Gupta", email: "sanjay@amama.com", role: "qc", title: "Export QC Manager", base: "Sonipat pack-house", phone: "+91 98110 33201" },
  { id: "u-pradeep", name: "Pradeep Rane", email: "pradeep@amama.com", role: "warehouse", title: "Warehouse Manager", base: "Sonipat pack-house", phone: "+91 98110 33202" },
  { id: "u-arun", name: "Arun Nair", email: "arun@amama.com", role: "cold-chain", title: "Cold Chain Manager", base: "Sonipat pack-house", phone: "+91 98110 33203" },
  { id: "u-harpreet", name: "Harpreet Singh", email: "harpreet@amama.com", role: "logistics", title: "Freight & Logistics Manager", base: "Mundra", phone: "+91 99040 77510" },
  { id: "u-imran", name: "Imran Qureshi", email: "imran@amama.com", role: "documentation", title: "Documentation Manager", base: "Mundra", phone: "+91 99040 77511" },
  { id: "u-kavita", name: "Kavita Desai", email: "kavita@amama.com", role: "finance", title: "Finance Controller", base: "Mumbai", phone: "+91 98200 41125" },
  { id: "u-leela", name: "Leela Krishnan", email: "leela@amama.com", role: "compliance", title: "Compliance Officer", base: "Mumbai", phone: "+91 98200 41126" },
]

export const userById = (id: string): InternalUser | undefined =>
  INTERNAL_USERS.find((user) => user.id === id)

/** The three KAMs who carry accounts. Everything commercial routes
 *  through one of these three. */
export const KAM_IDS = ["u-ananya", "u-rohit", "u-fatima"] as const

/* ════════════════════════════════════════════════════════════════════
   PEOPLE — buyers
   ════════════════════════════════════════════════════════════════════ */

export type KycState = "verified" | "pending" | "expiring" | "missing"

export type Buyer = {
  id: string
  company: string
  contact: string
  email: string
  country: string
  countryCode: string
  city: string
  /** Which KAM owns this account. */
  kamId: string
  kyc: KycState
  incotermPreference: string
  since: string
  products: string[]
  /** Lifetime GMV in USD — used on the account header, nothing else. */
  lifetimeUsd: number
}

export const BUYERS: Buyer[] = [
  { id: "b-alnoor", company: "Al Noor Fresh Trading LLC", contact: "Khalid Al Mansoori", email: "khalid@alnoorfresh.ae", country: "United Arab Emirates", countryCode: "AE", city: "Jebel Ali, Dubai", kamId: "u-rohit", kyc: "verified", incotermPreference: "CFR", since: "2023-04-11", products: ["apple", "citrus", "onion", "pomegranate"], lifetimeUsd: 2_410_000 },
  { id: "b-gulfstar", company: "Gulf Star Foodstuff LLC", contact: "Reem Haddad", email: "reem@gulfstarfoods.ae", country: "United Arab Emirates", countryCode: "AE", city: "Deira, Dubai", kamId: "u-rohit", kyc: "verified", incotermPreference: "CIF", since: "2024-01-19", products: ["mango", "banana", "grapes"], lifetimeUsd: 880_000 },
  { id: "b-emiratesagro", company: "Emirates Agro Distribution", contact: "Yousef Bin Tariq", email: "yousef@emiratesagro.ae", country: "United Arab Emirates", countryCode: "AE", city: "Sharjah", kamId: "u-rohit", kyc: "pending", incotermPreference: "CFR", since: "2026-06-02", products: ["potato", "onion"], lifetimeUsd: 96_000 },
  { id: "b-reef", company: "Reef Al Sharq Trading Co.", contact: "Abdulaziz Al Otaibi", email: "aziz@reefalsharq.sa", country: "Saudi Arabia", countryCode: "SA", city: "Jeddah", kamId: "u-rohit", kyc: "verified", incotermPreference: "CFR", since: "2023-09-27", products: ["basmati-rice", "cashew", "dried-chilli"], lifetimeUsd: 1_640_000 },
  { id: "b-najd", company: "Najd Provisions Company", contact: "Sara Al Harbi", email: "sara@najdprovisions.sa", country: "Saudi Arabia", countryCode: "SA", city: "Riyadh", kamId: "u-rohit", kyc: "expiring", incotermPreference: "CIF", since: "2024-11-05", products: ["pigeon-pea", "chickpea", "turmeric"], lifetimeUsd: 430_000 },
  { id: "b-britannia", company: "Britannia Produce Ltd", contact: "Eleanor Whitfield", email: "eleanor@britanniaproduce.co.uk", country: "United Kingdom", countryCode: "GB", city: "Spalding", kamId: "u-fatima", kyc: "verified", incotermPreference: "CIF", since: "2022-08-14", products: ["mango", "arabica-coffee", "grapes"], lifetimeUsd: 3_120_000 },
  { id: "b-vanderveen", company: "Vanderveen Produce BV", contact: "Joost Vanderveen", email: "joost@vanderveenproduce.nl", country: "Netherlands", countryCode: "NL", city: "Rotterdam", kamId: "u-fatima", kyc: "verified", incotermPreference: "CIF", since: "2023-02-20", products: ["pomegranate", "dried-chilli", "grapes"], lifetimeUsd: 1_970_000 },
  { id: "b-moskva", company: "Moskva Fresh Import OOO", contact: "Dmitri Sokolov", email: "dmitri@moskvafresh.ru", country: "Russia", countryCode: "RU", city: "Moscow", kamId: "u-fatima", kyc: "verified", incotermPreference: "CFR", since: "2024-03-08", products: ["grapes", "citrus", "black-tea"], lifetimeUsd: 720_000 },
]

export const buyerById = (id: string): Buyer | undefined => BUYERS.find((buyer) => buyer.id === id)

/* ════════════════════════════════════════════════════════════════════
   PEOPLE — sellers / farmers
   ════════════════════════════════════════════════════════════════════ */

export type Seller = {
  id: string
  name: string
  entity: string
  email: string
  village: string
  district: string
  state: string
  /** Decimal degrees — the anchor point of the farm polygon. Traceability
   *  that stops at "Himachal" is not traceability. */
  gps: [number, number]
  areaHa: number
  altitudeM: number
  products: string[]
  kyc: KycState
  /** Onboarded through the platform, or a legacy supplier migrated in. */
  onboardedAt: string
  capacityMtPerSeason: number
  /** Rolling QC pass rate — feeds the sampling intensity at stage 03. */
  passRatePct: number
  kamId: string
}

export const SELLERS: Seller[] = [
  { id: "s-tilak", name: "Tilak Raj Negi", entity: "Negi Orchards", email: "tilak.negi@growers.amama.in", village: "Kotkhai", district: "Shimla", state: "Himachal Pradesh", gps: [31.1247, 77.5432], areaHa: 6.2, altitudeM: 2100, products: ["apple"], kyc: "verified", onboardedAt: "2024-07-18", capacityMtPerSeason: 62, passRatePct: 94, kamId: "u-rohit" },
  { id: "s-suresh", name: "Suresh Chauhan", entity: "Chauhan Fruit Farms", email: "suresh.chauhan@growers.amama.in", village: "Jubbal", district: "Shimla", state: "Himachal Pradesh", gps: [31.1089, 77.6612], areaHa: 4.8, altitudeM: 2240, products: ["apple"], kyc: "verified", onboardedAt: "2024-07-21", capacityMtPerSeason: 48, passRatePct: 91, kamId: "u-rohit" },
  { id: "s-pushpa", name: "Pushpa Devi Rawat", entity: "Rawat Apple Estate", email: "pushpa.rawat@growers.amama.in", village: "Kotkhai", district: "Shimla", state: "Himachal Pradesh", gps: [31.1305, 77.5288], areaHa: 3.4, altitudeM: 1980, products: ["apple"], kyc: "pending", onboardedAt: "2026-09-12", capacityMtPerSeason: 34, passRatePct: 88, kamId: "u-rohit" },
  { id: "s-mahesh", name: "Mahesh Thakur", entity: "Thakur Highland Orchards", email: "mahesh.thakur@growers.amama.in", village: "Jubbal", district: "Shimla", state: "Himachal Pradesh", gps: [31.0974, 77.6790], areaHa: 5.1, altitudeM: 2320, products: ["apple"], kyc: "pending", onboardedAt: "2026-09-14", capacityMtPerSeason: 51, passRatePct: 90, kamId: "u-rohit" },
  { id: "s-devgad", name: "Prakash Sawant", entity: "Devgad Alphonso Growers Co-op", email: "prakash@devgadalphonso.in", village: "Devgad", district: "Sindhudurg", state: "Maharashtra", gps: [16.3789, 73.3812], areaHa: 24.0, altitudeM: 40, products: ["mango", "fruit-pulp"], kyc: "verified", onboardedAt: "2023-03-02", capacityMtPerSeason: 240, passRatePct: 96, kamId: "u-fatima" },
  { id: "s-krishna", name: "Bhausaheb Patil", entity: "Krishna Valley Farmers Cooperative", email: "bhausaheb@krishnavalley.in", village: "Dindori", district: "Nashik", state: "Maharashtra", gps: [20.2012, 73.8367], areaHa: 61.0, altitudeM: 620, products: ["pomegranate", "grapes", "onion"], kyc: "verified", onboardedAt: "2022-11-30", capacityMtPerSeason: 610, passRatePct: 93, kamId: "u-fatima" },
  { id: "s-karnal", name: "Gurmeet Singh Sandhu", entity: "Karnal Basmati Millers", email: "gurmeet@karnalbasmati.in", village: "Nissing", district: "Karnal", state: "Haryana", gps: [29.5721, 76.8901], areaHa: 0, altitudeM: 245, products: ["basmati-rice", "non-basmati-rice"], kyc: "verified", onboardedAt: "2023-01-16", capacityMtPerSeason: 1800, passRatePct: 97, kamId: "u-rohit" },
  { id: "s-coorg", name: "Nanaiah Ponnappa", entity: "Coorg Estates Coffee Growers", email: "nanaiah@coorgestates.in", village: "Suntikoppa", district: "Kodagu", state: "Karnataka", gps: [12.4586, 75.8320], areaHa: 88.0, altitudeM: 1100, products: ["arabica-coffee", "robusta-coffee", "black-pepper"], kyc: "verified", onboardedAt: "2022-06-09", capacityMtPerSeason: 320, passRatePct: 95, kamId: "u-fatima" },
  { id: "s-kollam", name: "Thomas Mathew", entity: "Kollam Cashew Traders", email: "thomas@kollamcashew.in", village: "Kundara", district: "Kollam", state: "Kerala", gps: [8.9520, 76.6885], areaHa: 0, altitudeM: 18, products: ["cashew"], kyc: "verified", onboardedAt: "2023-05-24", capacityMtPerSeason: 420, passRatePct: 94, kamId: "u-rohit" },
  { id: "s-guntur", name: "Venkata Rami Reddy", entity: "Guntur Chilli Farmers Collective", email: "venkata@gunturchilli.in", village: "Tadikonda", district: "Guntur", state: "Andhra Pradesh", gps: [16.4152, 80.4028], areaHa: 140.0, altitudeM: 32, products: ["dried-chilli", "spice-powder"], kyc: "verified", onboardedAt: "2023-08-13", capacityMtPerSeason: 980, passRatePct: 92, kamId: "u-fatima" },
  { id: "s-jalgaon", name: "Sanjivani Patil", entity: "Jalgaon Banana Growers Cooperative", email: "sanjivani@jalgaonbanana.in", village: "Raver", district: "Jalgaon", state: "Maharashtra", gps: [21.2461, 76.0342], areaHa: 190.0, altitudeM: 209, products: ["banana"], kyc: "verified", onboardedAt: "2024-02-28", capacityMtPerSeason: 1500, passRatePct: 89, kamId: "u-rohit" },
  { id: "s-alleppey", name: "Rajan Kurup", entity: "Alleppey Spice Gardens", email: "rajan@alleppeyspice.in", village: "Kuttanad", district: "Alappuzha", state: "Kerala", gps: [9.3844, 76.4062], areaHa: 42.0, altitudeM: 4, products: ["turmeric", "cardamom", "black-pepper"], kyc: "verified", onboardedAt: "2023-10-07", capacityMtPerSeason: 210, passRatePct: 95, kamId: "u-fatima" },
  { id: "s-sirsa", name: "Balwant Rai", entity: "Sirsa Kinnow Farms", email: "balwant@sirsakinnow.in", village: "Ellenabad", district: "Sirsa", state: "Haryana", gps: [29.4519, 74.6604], areaHa: 33.0, altitudeM: 205, products: ["citrus"], kyc: "expiring", onboardedAt: "2024-09-30", capacityMtPerSeason: 330, passRatePct: 87, kamId: "u-rohit" },
  { id: "s-ooty", name: "Ramasamy Gounder", entity: "Nilgiri Highland Produce", email: "ramasamy@nilgirihighland.in", village: "Kotagiri", district: "Nilgiris", state: "Tamil Nadu", gps: [11.4204, 76.8608], areaHa: 27.0, altitudeM: 1980, products: ["potato", "black-tea", "green-tea"], kyc: "verified", onboardedAt: "2023-12-11", capacityMtPerSeason: 280, passRatePct: 91, kamId: "u-fatima" },
]

export const sellerById = (id: string): Seller | undefined => SELLERS.find((seller) => seller.id === id)

/* ════════════════════════════════════════════════════════════════════
   MARKETPLACE — categories, products, variants, listings
   ════════════════════════════════════════════════════════════════════ */

export type CatalogCategory = { id: string; label: string; blurb: string }

export const CATEGORIES: CatalogCategory[] = [
  { id: "fruits", label: "Fruits", blurb: "Fresh fruit for reefer export — the shortest shelf-life clocks on the platform." },
  { id: "vegetables", label: "Vegetables", blurb: "Bulb, root and fresh vegetables, mostly Gulf-bound." },
  { id: "grains", label: "Grains", blurb: "Milled and raw cereals. Long shelf life, thin margins, high volume." },
  { id: "spices", label: "Spices", blurb: "India's highest-value export category by weight." },
  { id: "pulses", label: "Pulses", blurb: "Whole and split legumes for the diaspora and processing trade." },
  { id: "tea-coffee", label: "Tea & Coffee", blurb: "Plantation crops sold on cup quality and estate provenance." },
  { id: "dry-fruits", label: "Dry Fruits", blurb: "Kernels and dried fruit — graded by count and moisture." },
  { id: "processed", label: "Processed", blurb: "Pulps, powders, flakes and pressed oils." },
]

export type Product = {
  id: string
  categoryId: string
  label: string
  /** HS heading — carried onto the shipping bill at stage 12. */
  hsCode: string
  unit: "MT"
  /** Days of shelf life from harvest under correct cold chain. Drives
   *  how hard a delay at stage 14 actually bites. */
  shelfLifeDays: number
  /** Carriage set point in °C. */
  setpointC: number
}

export type Variant = {
  id: string
  productId: string
  label: string
  /** The grade/spec shorthand a trader would actually quote. */
  spec: string
}

/** Compact source table: [productId, label, hsCode, shelfLifeDays, setpointC, [variant, spec] ×3].
 *  Expanded into PRODUCTS and VARIANTS below — 40 products, 120 variants. */
const PRODUCT_SOURCE: [string, string, string, string, number, number, [string, string][]][] = [
  ["apple", "Apple", "fruits", "0808.10", 150, 0.5, [["Royal Delicious", "Grade A · 100–125 count"], ["Kashmiri Apple", "Grade A · 80–100 count"], ["Kinnaur Green", "Grade A · 110–135 count"]]],
  ["mango", "Mango", "fruits", "0804.50", 24, 12, [["Alphonso", "Grade A · 250–300 g"], ["Kesar", "Grade A · 200–250 g"], ["Banganapalli", "Grade A · 300–400 g"]]],
  ["banana", "Banana", "fruits", "0803.90", 28, 13.5, [["Nendran", "Grade A · 75% maturity"], ["Robusta", "Grade A · export hands"], ["Yelakki", "Grade A · small finger"]]],
  ["pomegranate", "Pomegranate", "fruits", "0810.90", 90, 5, [["Bhagwa", "Grade A+ · 250 g+"], ["Ganesh", "Grade A · 200 g+"], ["Ruby", "Grade A · 220 g+"]]],
  ["grapes", "Grapes", "fruits", "0806.10", 60, 0, [["Thompson Seedless", "Grade A · 16 mm+"], ["Flame Seedless", "Grade A · 18 mm+"], ["Sonaka", "Grade A · 18 mm+"]]],
  ["citrus", "Citrus", "fruits", "0805.10", 70, 4, [["Nagpur Orange", "Grade A · 60–70 mm"], ["Kinnow", "Grade A · 65–75 mm"], ["Mosambi", "Grade A · 70–80 mm"]]],
  ["guava", "Guava", "fruits", "0804.50", 21, 8, [["Allahabad Safeda", "Grade A · 200 g+"], ["Lalit", "Grade A · 180 g+"], ["Taiwan Pink", "Grade A · 250 g+"]]],
  ["papaya", "Papaya", "fruits", "0807.20", 18, 10, [["Red Lady", "Grade A · 1.2–1.8 kg"], ["Taiwan 786", "Grade A · 1–1.5 kg"], ["Sinta", "Grade A · 1.5–2 kg"]]],
  ["onion", "Onion", "vegetables", "0703.10", 120, 2, [["Nashik Red", "Grade A · 45–70 mm"], ["Bangalore Rose", "Grade A · 30–45 mm"], ["White Onion", "Grade A · 50–70 mm"]]],
  ["potato", "Potato", "vegetables", "0701.90", 150, 6, [["Kufri Jyoti", "Grade A · 50–80 mm"], ["Kufri Chandramukhi", "Grade A · 45–75 mm"], ["Ooty Hill Potato", "Grade A · 50–80 mm"]]],
  ["tomato", "Tomato", "vegetables", "0702.00", 21, 10, [["Hybrid Round", "Grade A · firm, thick-skin"], ["Roma Plum", "Grade A · processing"], ["Cherry Tomato", "Grade A · punnet pack"]]],
  ["green-chilli", "Green Chilli", "vegetables", "0709.60", 21, 8, [["G4 Green", "Grade A · 8–10 cm"], ["Jwala", "Grade A · 6–8 cm"], ["Bhut Jolokia", "Specialty · high pungency"]]],
  ["okra", "Okra", "vegetables", "0709.99", 12, 9, [["Arka Anamika", "Grade A · 7–9 cm"], ["Parbhani Kranti", "Grade A · 6–8 cm"], ["Green Gold", "Grade A · 8–10 cm"]]],
  ["basmati-rice", "Basmati Rice", "grains", "1006.30", 720, 20, [["1121 Steam", "ELG 8.30 mm · aged 12 mo"], ["Pusa Basmati", "ELG 7.80 mm · aged 9 mo"], ["Traditional Basmati", "ELG 7.20 mm · aged 24 mo"]]],
  ["non-basmati-rice", "Non-Basmati Rice", "grains", "1006.30", 540, 20, [["Sona Masoori", "5% broken · raw"], ["IR-64 Parboiled", "5% broken · parboiled"], ["Ponni", "5% broken · raw"]]],
  ["wheat", "Wheat", "grains", "1001.99", 540, 20, [["Sharbati", "Mill grade · 12% protein"], ["Lokwan", "Mill grade · 11.5% protein"], ["Durum", "Semolina grade · 13% protein"]]],
  ["maize", "Maize", "grains", "1005.90", 365, 20, [["Yellow Feed Maize", "Feed grade · 14% moisture"], ["White Maize", "Food grade · 13% moisture"], ["Sweet Corn", "Frozen grade"]]],
  ["millet", "Millet", "grains", "1008.29", 365, 20, [["Pearl Millet (Bajra)", "Food grade · sortex"], ["Finger Millet (Ragi)", "Food grade · sortex"], ["Foxtail Millet", "Food grade · polished"]]],
  ["turmeric", "Turmeric", "spices", "0910.30", 730, 20, [["Alleppey Finger", "Curcumin 5%+"], ["Salem Finger", "Curcumin 3.5%+"], ["Nizamabad Bulb", "Curcumin 3%+"]]],
  ["dried-chilli", "Dried Chilli", "spices", "0904.21", 540, 20, [["Guntur Sannam S4", "ASTA 90+ · medium heat"], ["Byadgi", "ASTA 130+ · low heat"], ["Teja S17", "ASTA 80 · high heat"]]],
  ["cumin", "Cumin", "spices", "0909.31", 730, 20, [["Europe Quality", "99.5% purity"], ["Singapore Quality", "99% purity"], ["Machine Cleaned 99%", "Sortex cleaned"]]],
  ["coriander", "Coriander", "spices", "0909.21", 540, 20, [["Eagle Seeds", "Split · 99% purity"], ["Scooter Seeds", "Whole · 99% purity"], ["Single Parrot", "Green · premium"]]],
  ["cardamom", "Cardamom", "spices", "0908.31", 365, 18, [["Green Bold 8mm", "Auction grade AGEB"], ["Green 7mm", "Auction grade AGB"], ["Large Cardamom", "Black · Sikkim"]]],
  ["black-pepper", "Black Pepper", "spices", "0904.11", 730, 20, [["Malabar Garbled", "550 g/l"], ["Tellicherry Extra Bold", "600 g/l"], ["Light Berries", "450 g/l"]]],
  ["chickpea", "Chickpea", "pulses", "0713.20", 365, 20, [["Kabuli 12mm", "Machine cleaned"], ["Desi Chana", "Machine cleaned"], ["Chana Dal", "Split · polished"]]],
  ["pigeon-pea", "Pigeon Pea", "pulses", "0713.60", 365, 20, [["Toor Whole", "Machine cleaned"], ["Toor Dal", "Split · polished"], ["Organic Toor", "Certified organic"]]],
  ["lentil", "Lentil", "pulses", "0713.40", 365, 20, [["Masoor Whole", "Machine cleaned"], ["Masoor Dal", "Split · polished"], ["Football Masoor", "Bold · sortex"]]],
  ["mung-bean", "Mung Bean", "pulses", "0713.31", 365, 20, [["Green Mung Whole", "Machine cleaned"], ["Mung Dal", "Split · polished"], ["Sprouting Grade", "95% germination"]]],
  ["black-tea", "Black Tea", "tea-coffee", "0902.30", 730, 20, [["Assam CTC", "BOP · strong malty"], ["Nilgiri Orthodox", "Whole leaf · brisk"], ["Darjeeling Second Flush", "FTGFOP1 · muscatel"]]],
  ["green-tea", "Green Tea", "tea-coffee", "0902.10", 540, 20, [["Nilgiri Green", "Whole leaf"], ["Kangra Green", "Whole leaf"], ["Assam Green", "Broken leaf"]]],
  ["arabica-coffee", "Arabica Coffee", "tea-coffee", "0901.11", 540, 20, [["Plantation A", "Washed · screen 17"], ["Monsooned Malabar AA", "Monsooned · screen 18"], ["Mysore Nuggets EB", "Washed · screen 19"]]],
  ["robusta-coffee", "Robusta Coffee", "tea-coffee", "0901.11", 540, 20, [["Cherry AB", "Natural · screen 15"], ["Parchment AB", "Washed · screen 15"], ["Kaapi Royale", "Washed · screen 18"]]],
  ["cashew", "Cashew", "dry-fruits", "0801.32", 365, 18, [["W-180 Jumbo", "Fewer than 180/lb"], ["W-240", "240/lb · vacuum tin"], ["W-320", "320/lb · vacuum tin"]]],
  ["almond", "Almond", "dry-fruits", "0802.12", 365, 18, [["Mamra", "Kashmir · wrinkled shell"], ["California Style", "Kernel · 27–30 mm"], ["Gurbandi", "Kernel · small bold"]]],
  ["raisin", "Raisin", "dry-fruits", "0806.20", 365, 18, [["Thompson Golden", "Sortex · 8% moisture"], ["Black Currant", "Sortex · 10% moisture"], ["Green Long", "Premium · 9% moisture"]]],
  ["walnut", "Walnut", "dry-fruits", "0802.31", 300, 12, [["Kashmir Inshell", "32–34 mm"], ["Kernel Light Halves", "Light halves · 80%"], ["Kernel Quarters", "Light quarters"]]],
  ["fruit-pulp", "Fruit Pulp", "processed", "2007.99", 540, 20, [["Alphonso Mango Pulp", "Aseptic · 16 brix"], ["Totapuri Pulp", "Aseptic · 14 brix"], ["Guava Pulp", "Aseptic · 10 brix"]]],
  ["dehydrated-onion", "Dehydrated Onion", "processed", "0712.20", 540, 20, [["White Kibbled", "3–5 mm · 5% moisture"], ["Onion Powder", "100 mesh"], ["Toasted Flakes", "Golden · 4% moisture"]]],
  ["spice-powder", "Spice Powder", "processed", "0904.22", 540, 20, [["Turmeric Powder", "Curcumin 3%+ · 80 mesh"], ["Chilli Powder", "ASTA 90+ · 60 mesh"], ["Coriander Powder", "99% purity · 60 mesh"]]],
  ["edible-oil", "Edible Oil", "processed", "1515.90", 365, 20, [["Groundnut Cold-Pressed", "Kachi ghani · unrefined"], ["Mustard Kachi Ghani", "Cold-pressed · unrefined"], ["Sesame Oil", "Cold-pressed · unrefined"]]],
]

export const PRODUCTS: Product[] = PRODUCT_SOURCE.map(
  ([id, label, categoryId, hsCode, shelfLifeDays, setpointC]) => ({
    id,
    categoryId,
    label,
    hsCode,
    unit: "MT" as const,
    shelfLifeDays,
    setpointC,
  })
)

export const VARIANTS: Variant[] = PRODUCT_SOURCE.flatMap(([productId, , , , , , variants]) =>
  variants.map(([label, spec], index) => ({
    id: `${productId}--${index + 1}`,
    productId,
    label,
    spec,
  }))
)

export const productById = (id: string): Product | undefined =>
  PRODUCTS.find((product) => product.id === id)
export const variantById = (id: string): Variant | undefined =>
  VARIANTS.find((variant) => variant.id === id)
export const variantsForProduct = (productId: string): Variant[] =>
  VARIANTS.filter((variant) => variant.productId === productId)
export const productsForCategory = (categoryId: string): Product[] =>
  PRODUCTS.filter((product) => product.categoryId === categoryId)

/* ---- listings -------------------------------------------------------
   ~300 seller offers against those 120 variants. Built deterministically
   from a fixed seed rather than hand-written: the pairing of seller to
   variant, the price spread and the volumes are reproducible on every
   load, and — more importantly — every sellerId and variantId in here is
   guaranteed to resolve, which hand-writing 300 rows does not.
   ------------------------------------------------------------------ */

/** mulberry32 — small, fast, fully deterministic. Same seed, same world,
 *  every time, in every browser. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type Listing = {
  id: string
  sellerId: string
  variantId: string
  productId: string
  categoryId: string
  /** USD per metric tonne, FOB origin. */
  priceUsdPerMt: number
  availableMt: number
  minOrderMt: number
  incoterm: "FOB" | "CFR" | "CIF" | "EXW"
  leadTimeDays: number
  /** Whether this seller can supply right now or is pre-season. */
  status: "available" | "pre-season" | "committed"
  updatedAt: string
}

/** Base USD/MT per product — the anchor each listing's price jitters
 *  around, so a cashew listing never prices like an onion. */
const BASE_PRICE: Record<string, number> = {
  apple: 1150, mango: 1400, banana: 470, pomegranate: 1250, grapes: 1600,
  citrus: 640, guava: 720, papaya: 560, onion: 340, potato: 300,
  tomato: 420, "green-chilli": 780, okra: 900, "basmati-rice": 1180,
  "non-basmati-rice": 480, wheat: 320, maize: 260, millet: 520,
  turmeric: 2100, "dried-chilli": 2250, cumin: 3100, coriander: 1450,
  cardamom: 14500, "black-pepper": 5400, chickpea: 880, "pigeon-pea": 960,
  lentil: 840, "mung-bean": 1020, "black-tea": 2700, "green-tea": 3200,
  "arabica-coffee": 4300, "robusta-coffee": 2650, cashew: 5600, almond: 8200,
  raisin: 2400, walnut: 7400, "fruit-pulp": 1350, "dehydrated-onion": 2450,
  "spice-powder": 1900, "edible-oil": 1280,
}

const INCOTERMS: Listing["incoterm"][] = ["FOB", "CFR", "CIF", "EXW"]

function buildListings(): Listing[] {
  const random = seededRandom(418)
  const rows: Listing[] = []

  for (const variant of VARIANTS) {
    const product = productById(variant.productId)
    if (!product) continue
    // Only sellers who actually grow this product can offer it — that is
    // what keeps the catalog honest and every reference resolvable.
    const eligible = SELLERS.filter((seller) => seller.products.includes(product.id))
    const pool = eligible.length > 0 ? eligible : SELLERS
    const offers = 2 + Math.floor(random() * 2) // 2 or 3 sellers per variant

    for (let index = 0; index < offers; index += 1) {
      const seller = pool[Math.floor(random() * pool.length)]
      const id = `lst-${variant.id}-${seller.id}-${index + 1}`
      if (rows.some((row) => row.id === id)) continue
      const base = BASE_PRICE[product.id] ?? 1000
      rows.push({
        id,
        sellerId: seller.id,
        variantId: variant.id,
        productId: product.id,
        categoryId: product.categoryId,
        priceUsdPerMt: Math.round((base * (0.88 + random() * 0.26)) / 5) * 5,
        availableMt: 5 + Math.floor(random() * 60),
        minOrderMt: [5, 10, 15, 20][Math.floor(random() * 4)],
        incoterm: INCOTERMS[Math.floor(random() * INCOTERMS.length)],
        leadTimeDays: 5 + Math.floor(random() * 18),
        status: random() > 0.82 ? (random() > 0.5 ? "pre-season" : "committed") : "available",
        updatedAt: `2026-09-${String(8 + Math.floor(random() * 21)).padStart(2, "0")}T09:00:00+05:30`,
      })
    }
  }

  return rows
}

export const LISTINGS: Listing[] = buildListings()

export const listingById = (id: string): Listing | undefined =>
  LISTINGS.find((listing) => listing.id === id)
export const listingsForVariant = (variantId: string): Listing[] =>
  LISTINGS.filter((listing) => listing.variantId === variantId)
export const listingsForSeller = (sellerId: string): Listing[] =>
  LISTINGS.filter((listing) => listing.sellerId === sellerId)

/* ════════════════════════════════════════════════════════════════════
   TRADES
   ════════════════════════════════════════════════════════════════════ */

export type TradeStatus = "active" | "at-risk" | "blocked" | "closed"

export type Trade = {
  /** The Transaction ID — the spine. Every lot, pallet, container,
   *  document and event below carries it. */
  id: string
  buyerId: string
  kamId: string
  productId: string
  variantId: string
  origin: string
  destination: string
  portOfLoading: string
  portOfDischarge: string
  incoterm: string
  paymentTerms: string
  qtyContractedMt: number
  /** Null until the packing run closes at stage 08. */
  qtyShippedMt: number | null
  priceUsdPerMt: number
  contractSignedAt: string
  deliveryWindow: [string, string]
  currentStage: StageNo
  status: TradeStatus
  risk: number
  /** Which growers supply this trade. */
  sellerIds: string[]
  /** Free-text quality spec — the yardstick stages 03 and 08 measure
   *  against, and the thing a stage-15 claim is argued over. */
  spec: string
  nextAction: { label: string; ownerRole: InternalRoleId; dueAt: string }
}

export const TRADES: Trade[] = [
  {
    id: "AMT-2026-00418",
    buyerId: "b-alnoor",
    kamId: "u-rohit",
    productId: "apple",
    variantId: "apple--1",
    origin: "Kotkhai & Jubbal, Shimla, Himachal Pradesh",
    destination: "Jebel Ali, Dubai",
    portOfLoading: "INMUN — Mundra",
    portOfDischarge: "AEJEA — Jebel Ali",
    incoterm: "CFR Jebel Ali",
    paymentTerms: "30% advance · 70% at B/L + 30 days",
    qtyContractedMt: 20,
    qtyShippedMt: 19.4,
    priceUsdPerMt: 1180,
    contractSignedAt: "2026-09-18T15:20:00+05:30",
    deliveryWindow: ["2026-10-15", "2026-10-31"],
    currentStage: 13,
    status: "at-risk",
    risk: 55,
    sellerIds: ["s-tilak", "s-suresh", "s-pushpa", "s-mahesh"],
    spec: "Royal Delicious, Grade A, 100–125 count. Minimum 60% red blush, firmness ≥ 14 lbf, brix ≥ 12, no russeting above 10% of surface, max 2% defects.",
    nextAction: { label: "Confirm terminal gate-in before the 18:00 cut-off", ownerRole: "logistics", dueAt: "2026-10-07T18:00:00+05:30" },
  },
  {
    id: "AMT-2026-00419",
    buyerId: "b-britannia", kamId: "u-fatima", productId: "mango", variantId: "mango--1",
    origin: "Devgad, Sindhudurg, Maharashtra", destination: "Spalding, Lincolnshire",
    portOfLoading: "INNSA — Nhava Sheva", portOfDischarge: "GBFXT — Felixstowe",
    incoterm: "CIF Felixstowe", paymentTerms: "50% advance · 50% at B/L",
    qtyContractedMt: 12, qtyShippedMt: null, priceUsdPerMt: 1480,
    contractSignedAt: "2026-10-05T11:00:00+05:30", deliveryWindow: ["2026-11-20", "2026-12-05"],
    currentStage: 1, status: "active", risk: 22, sellerIds: ["s-devgad"],
    spec: "Alphonso, Grade A, 250–300 g, brix ≥ 18, zero spongy tissue tolerance.",
    nextAction: { label: "Countersign the trade contract", ownerRole: "master-admin", dueAt: "2026-10-08T18:00:00+05:30" },
  },
  {
    id: "AMT-2026-00421",
    buyerId: "b-reef", kamId: "u-rohit", productId: "basmati-rice", variantId: "basmati-rice--1",
    origin: "Karnal, Haryana", destination: "Jeddah",
    portOfLoading: "INMUN — Mundra", portOfDischarge: "SAJED — Jeddah",
    incoterm: "CFR Jeddah", paymentTerms: "LC at sight",
    qtyContractedMt: 240, qtyShippedMt: null, priceUsdPerMt: 1210,
    contractSignedAt: "2026-09-29T10:15:00+05:30", deliveryWindow: ["2026-11-01", "2026-11-15"],
    currentStage: 2, status: "active", risk: 30, sellerIds: ["s-karnal"],
    spec: "1121 Steam basmati, ELG 8.30 mm, aged 12 months, 1% broken max, sortex cleaned.",
    nextAction: { label: "Confirm mill allocation against the November window", ownerRole: "procurement", dueAt: "2026-10-09T18:00:00+05:30" },
  },
  {
    id: "AMT-2026-00423",
    buyerId: "b-vanderveen", kamId: "u-fatima", productId: "pomegranate", variantId: "pomegranate--1",
    origin: "Dindori, Nashik, Maharashtra", destination: "Rotterdam",
    portOfLoading: "INNSA — Nhava Sheva", portOfDischarge: "NLRTM — Rotterdam",
    incoterm: "CIF Rotterdam", paymentTerms: "30% advance · 70% at B/L + 45 days",
    qtyContractedMt: 18, qtyShippedMt: null, priceUsdPerMt: 1320,
    contractSignedAt: "2026-09-24T14:40:00+05:30", deliveryWindow: ["2026-10-25", "2026-11-08"],
    currentStage: 3, status: "at-risk", risk: 44, sellerIds: ["s-krishna"],
    spec: "Bhagwa, Grade A+, 250 g+, aril colour uniform, max 1% sunscald, residue within EU MRL.",
    nextAction: { label: "Log field QC for the Dindori picking", ownerRole: "qc", dueAt: "2026-10-07T20:00:00+05:30" },
  },
  {
    id: "AMT-2026-00425",
    buyerId: "b-moskva", kamId: "u-fatima", productId: "grapes", variantId: "grapes--1",
    origin: "Dindori, Nashik, Maharashtra", destination: "Moscow",
    portOfLoading: "INNSA — Nhava Sheva", portOfDischarge: "RULED — St Petersburg",
    incoterm: "CFR St Petersburg", paymentTerms: "100% against scanned B/L",
    qtyContractedMt: 16, qtyShippedMt: null, priceUsdPerMt: 1650,
    contractSignedAt: "2026-09-20T09:30:00+05:30", deliveryWindow: ["2026-10-20", "2026-11-02"],
    currentStage: 5, status: "active", risk: 38, sellerIds: ["s-krishna"],
    spec: "Thompson Seedless, Grade A, 16 mm+ berry, brix ≥ 16, SO₂ pads required.",
    nextAction: { label: "Dispatch the pickup truck from Dindori", ownerRole: "logistics", dueAt: "2026-10-07T22:00:00+05:30" },
  },
  {
    id: "AMT-2026-00427",
    buyerId: "b-gulfstar", kamId: "u-rohit", productId: "banana", variantId: "banana--1",
    origin: "Raver, Jalgaon, Maharashtra", destination: "Dubai",
    portOfLoading: "INNSA — Nhava Sheva", portOfDischarge: "AEJEA — Jebel Ali",
    incoterm: "CIF Jebel Ali", paymentTerms: "30% advance · 70% at B/L + 30 days",
    qtyContractedMt: 26, qtyShippedMt: null, priceUsdPerMt: 495,
    contractSignedAt: "2026-09-26T16:10:00+05:30", deliveryWindow: ["2026-10-18", "2026-10-28"],
    currentStage: 6, status: "active", risk: 41, sellerIds: ["s-jalgaon"],
    spec: "Nendran, Grade A, 75% maturity at harvest, hands foam-netted, green-life ≥ 21 days.",
    nextAction: { label: "Reconcile inbound weight against the origin weighbridge", ownerRole: "warehouse", dueAt: "2026-10-07T19:30:00+05:30" },
  },
  {
    id: "AMT-2026-00429",
    buyerId: "b-alnoor", kamId: "u-rohit", productId: "citrus", variantId: "citrus--2",
    origin: "Ellenabad, Sirsa, Haryana", destination: "Dubai",
    portOfLoading: "INMUN — Mundra", portOfDischarge: "AEJEA — Jebel Ali",
    incoterm: "CFR Jebel Ali", paymentTerms: "30% advance · 70% at B/L + 30 days",
    qtyContractedMt: 22, qtyShippedMt: null, priceUsdPerMt: 660,
    contractSignedAt: "2026-09-22T12:00:00+05:30", deliveryWindow: ["2026-10-22", "2026-11-05"],
    currentStage: 7, status: "blocked", risk: 61, sellerIds: ["s-sirsa"],
    spec: "Kinnow, Grade A, 65–75 mm, brix ≥ 11, degreening permitted, max 2% granulation.",
    nextAction: { label: "Close out the 3.8 °C chamber excursion with a QC decision", ownerRole: "cold-chain", dueAt: "2026-10-07T18:30:00+05:30" },
  },
  {
    id: "AMT-2026-00431",
    buyerId: "b-vanderveen", kamId: "u-fatima", productId: "dried-chilli", variantId: "dried-chilli--1",
    origin: "Tadikonda, Guntur, Andhra Pradesh", destination: "Rotterdam",
    portOfLoading: "INMAA — Chennai", portOfDischarge: "NLRTM — Rotterdam",
    incoterm: "CIF Rotterdam", paymentTerms: "LC at sight",
    qtyContractedMt: 54, qtyShippedMt: 54, priceUsdPerMt: 2310,
    contractSignedAt: "2026-09-08T11:45:00+05:30", deliveryWindow: ["2026-10-20", "2026-11-04"],
    currentStage: 9, status: "active", risk: 47, sellerIds: ["s-guntur"],
    spec: "Guntur Sannam S4, ASTA 90+, stem-removed, moisture ≤ 12%, aflatoxin within EU limit.",
    nextAction: { label: "Confirm the reefer booking five days ahead of stuffing", ownerRole: "logistics", dueAt: "2026-10-08T12:00:00+05:30" },
  },
  {
    id: "AMT-2026-00433",
    buyerId: "b-najd", kamId: "u-rohit", productId: "turmeric", variantId: "turmeric--1",
    origin: "Kuttanad, Alappuzha, Kerala", destination: "Riyadh",
    portOfLoading: "INCOK — Cochin", portOfDischarge: "SADMM — Dammam",
    incoterm: "CIF Dammam", paymentTerms: "50% advance · 50% at B/L",
    qtyContractedMt: 34, qtyShippedMt: 34, priceUsdPerMt: 2180,
    contractSignedAt: "2026-09-11T10:00:00+05:30", deliveryWindow: ["2026-10-18", "2026-11-01"],
    currentStage: 10, status: "active", risk: 49, sellerIds: ["s-alleppey"],
    spec: "Alleppey finger turmeric, curcumin ≥ 5%, moisture ≤ 10%, steam-sterilised.",
    nextAction: { label: "Capture the seal number and file VGM", ownerRole: "warehouse", dueAt: "2026-10-07T21:00:00+05:30" },
  },
  {
    id: "AMT-2026-00435",
    buyerId: "b-britannia", kamId: "u-fatima", productId: "arabica-coffee", variantId: "arabica-coffee--2",
    origin: "Suntikoppa, Kodagu, Karnataka", destination: "London",
    portOfLoading: "INCOK — Cochin", portOfDischarge: "GBLON — London Gateway",
    incoterm: "CIF London Gateway", paymentTerms: "100% at B/L + 30 days",
    qtyContractedMt: 19.2, qtyShippedMt: 19.2, priceUsdPerMt: 4450,
    contractSignedAt: "2026-09-02T15:30:00+05:30", deliveryWindow: ["2026-10-16", "2026-10-30"],
    currentStage: 11, status: "blocked", risk: 52, sellerIds: ["s-coorg"],
    spec: "Monsooned Malabar AA, screen 18, moisture 13–14%, cup score ≥ 82.",
    nextAction: { label: "Chase the certificate of origin — filing blocked at D-2", ownerRole: "documentation", dueAt: "2026-10-08T10:00:00+05:30" },
  },
  {
    id: "AMT-2026-00437",
    buyerId: "b-reef", kamId: "u-rohit", productId: "cashew", variantId: "cashew--2",
    origin: "Kundara, Kollam, Kerala", destination: "Jeddah",
    portOfLoading: "INCOK — Cochin", portOfDischarge: "SAJED — Jeddah",
    incoterm: "CFR Jeddah", paymentTerms: "LC at sight",
    qtyContractedMt: 17, qtyShippedMt: 17, priceUsdPerMt: 5750,
    contractSignedAt: "2026-08-21T13:20:00+05:30", deliveryWindow: ["2026-10-10", "2026-10-22"],
    currentStage: 14, status: "active", risk: 35, sellerIds: ["s-kollam"],
    spec: "W-240 cashew kernels, vacuum-packed 25 lb tins, moisture ≤ 5%, aflatoxin tested per batch.",
    nextAction: { label: "Review ETA variance against the buyer's delivery window", ownerRole: "logistics", dueAt: "2026-10-08T09:00:00+05:30" },
  },
  {
    id: "AMT-2026-00439",
    buyerId: "b-alnoor", kamId: "u-rohit", productId: "onion", variantId: "onion--1",
    origin: "Dindori, Nashik, Maharashtra", destination: "Dubai",
    portOfLoading: "INNSA — Nhava Sheva", portOfDischarge: "AEJEA — Jebel Ali",
    incoterm: "CFR Jebel Ali", paymentTerms: "30% advance · 70% at B/L + 30 days",
    qtyContractedMt: 48, qtyShippedMt: 47.6, priceUsdPerMt: 355,
    contractSignedAt: "2026-08-06T09:50:00+05:30", deliveryWindow: ["2026-09-12", "2026-09-25"],
    currentStage: 16, status: "closed", risk: 20, sellerIds: ["s-krishna"],
    spec: "Nashik Red, Grade A, 45–70 mm, single-layer sun-cured, max 2% sprouting.",
    nextAction: { label: "Release the farmer payout against the reconciled remittance", ownerRole: "finance", dueAt: "2026-10-09T17:00:00+05:30" },
  },
]

export const tradeById = (id: string): Trade | undefined => TRADES.find((trade) => trade.id === id)
export const PRIMARY_TRADE_ID = "AMT-2026-00418"
export const primaryTrade = (): Trade => tradeById(PRIMARY_TRADE_ID) as Trade
export const tradesForKam = (kamId: string): Trade[] => TRADES.filter((trade) => trade.kamId === kamId)
export const tradesForBuyer = (buyerId: string): Trade[] => TRADES.filter((trade) => trade.buyerId === buyerId)
export const tradesForSeller = (sellerId: string): Trade[] =>
  TRADES.filter((trade) => trade.sellerIds.includes(sellerId))

/* ════════════════════════════════════════════════════════════════════
   THE PHYSICAL CHAIN — lots → pallets → container
   ════════════════════════════════════════════════════════════════════ */

export type QcDecision = "PASS" | "CONDITIONAL" | "HOLD" | "REJECT"

export type Lot = {
  id: string
  tradeId: string
  sellerId: string
  variantId: string
  harvestedAt: string
  /** shelf_life_start = harvest, never warehouse receipt. Getting this
   *  wrong makes every downstream number optimistic. */
  shelfLifeStart: string
  qtyAcceptedKg: number
  grade: string
  qcDecision: QcDecision
  qcRecordId: string
  /** The note that survives to the end of the trade. */
  qcNote: string | null
  gps: [number, number]
  state: "packed" | "in-store" | "shipped" | "rejected"
}

export const LOTS: Lot[] = [
  {
    id: "LOT-HP-APL-2026-00112", tradeId: "AMT-2026-00418", sellerId: "s-tilak", variantId: "apple--1",
    harvestedAt: PRIMARY_HARVEST, shelfLifeStart: PRIMARY_HARVEST, qtyAcceptedKg: 5100,
    grade: "Grade A", qcDecision: "CONDITIONAL", qcRecordId: "QC-00418-01",
    qcNote: "6% sunburn on the south-facing block, above the 2% defect tolerance. Grade out the sunburnt fruit at packing.",
    gps: [31.1247, 77.5432], state: "shipped",
  },
  {
    id: "LOT-HP-APL-2026-00113", tradeId: "AMT-2026-00418", sellerId: "s-suresh", variantId: "apple--1",
    harvestedAt: "2026-09-28T09:15:00+05:30", shelfLifeStart: "2026-09-28T09:15:00+05:30", qtyAcceptedKg: 5000,
    grade: "Grade A", qcDecision: "PASS", qcRecordId: "QC-00418-02", qcNote: null,
    gps: [31.1089, 77.6612], state: "shipped",
  },
  {
    id: "LOT-HP-APL-2026-00114", tradeId: "AMT-2026-00418", sellerId: "s-pushpa", variantId: "apple--1",
    harvestedAt: "2026-09-29T07:55:00+05:30", shelfLifeStart: "2026-09-29T07:55:00+05:30", qtyAcceptedKg: 4900,
    grade: "Grade A", qcDecision: "PASS", qcRecordId: "QC-00418-03", qcNote: null,
    gps: [31.1305, 77.5288], state: "shipped",
  },
  {
    id: "LOT-HP-APL-2026-00115", tradeId: "AMT-2026-00418", sellerId: "s-mahesh", variantId: "apple--1",
    harvestedAt: "2026-09-29T10:30:00+05:30", shelfLifeStart: "2026-09-29T10:30:00+05:30", qtyAcceptedKg: 5000,
    grade: "Grade A", qcDecision: "PASS", qcRecordId: "QC-00418-04", qcNote: null,
    gps: [31.0974, 77.6790], state: "shipped",
  },
]

export const lotById = (id: string): Lot | undefined => LOTS.find((lot) => lot.id === id)
export const lotsForTrade = (tradeId: string): Lot[] => LOTS.filter((lot) => lot.tradeId === tradeId)

/** The field QC record behind each lot — the most valuable document you
 *  own when a claim arrives at stage 15. */
export type QcRecord = {
  id: string
  lotId: string
  tradeId: string
  inspectorId: string
  inspectedAt: string
  sampleSize: number
  measurements: { label: string; value: string; spec: string; pass: boolean }[]
  defectPct: number
  decision: QcDecision
  note: string | null
  photos: number
  gps: [number, number]
}

export const QC_RECORDS: QcRecord[] = [
  {
    id: "QC-00418-01", lotId: "LOT-HP-APL-2026-00112", tradeId: "AMT-2026-00418",
    inspectorId: "u-meera", inspectedAt: "2026-09-28T11:10:00+05:30", sampleSize: 100,
    measurements: [
      { label: "Count size in 100–125 band", value: "82%", spec: "≥ 80%", pass: true },
      { label: "Firmness", value: "15.2 lbf", spec: "≥ 14 lbf", pass: true },
      { label: "Brix", value: "12.6", spec: "≥ 12", pass: true },
      { label: "Red blush", value: "67%", spec: "≥ 60%", pass: true },
      { label: "Sunburn defect", value: "6%", spec: "≤ 2%", pass: false },
    ],
    defectPct: 6,
    decision: "CONDITIONAL",
    note: "Sunburn concentrated on the south-facing block. Conditional pass — grade out at packing, expect roughly 0.6 MT loss against the contracted quantity.",
    photos: 14, gps: [31.1247, 77.5432],
  },
  {
    id: "QC-00418-02", lotId: "LOT-HP-APL-2026-00113", tradeId: "AMT-2026-00418",
    inspectorId: "u-meera", inspectedAt: "2026-09-28T13:40:00+05:30", sampleSize: 100,
    measurements: [
      { label: "Count size in 100–125 band", value: "88%", spec: "≥ 80%", pass: true },
      { label: "Firmness", value: "15.8 lbf", spec: "≥ 14 lbf", pass: true },
      { label: "Brix", value: "12.9", spec: "≥ 12", pass: true },
      { label: "Red blush", value: "71%", spec: "≥ 60%", pass: true },
      { label: "Defects", value: "1.2%", spec: "≤ 2%", pass: true },
    ],
    defectPct: 1.2, decision: "PASS", note: null, photos: 11, gps: [31.1089, 77.6612],
  },
  {
    id: "QC-00418-03", lotId: "LOT-HP-APL-2026-00114", tradeId: "AMT-2026-00418",
    inspectorId: "u-meera", inspectedAt: "2026-09-29T10:05:00+05:30", sampleSize: 100,
    measurements: [
      { label: "Count size in 100–125 band", value: "85%", spec: "≥ 80%", pass: true },
      { label: "Firmness", value: "14.9 lbf", spec: "≥ 14 lbf", pass: true },
      { label: "Brix", value: "12.2", spec: "≥ 12", pass: true },
      { label: "Red blush", value: "64%", spec: "≥ 60%", pass: true },
      { label: "Defects", value: "1.8%", spec: "≤ 2%", pass: true },
    ],
    defectPct: 1.8, decision: "PASS", note: null, photos: 12, gps: [31.1305, 77.5288],
  },
  {
    id: "QC-00418-04", lotId: "LOT-HP-APL-2026-00115", tradeId: "AMT-2026-00418",
    inspectorId: "u-meera", inspectedAt: "2026-09-29T12:30:00+05:30", sampleSize: 100,
    measurements: [
      { label: "Count size in 100–125 band", value: "90%", spec: "≥ 80%", pass: true },
      { label: "Firmness", value: "15.5 lbf", spec: "≥ 14 lbf", pass: true },
      { label: "Brix", value: "13.1", spec: "≥ 12", pass: true },
      { label: "Red blush", value: "74%", spec: "≥ 60%", pass: true },
      { label: "Defects", value: "0.9%", spec: "≤ 2%", pass: true },
    ],
    defectPct: 0.9, decision: "PASS", note: null, photos: 10, gps: [31.0974, 77.6790],
  },
]

export const qcRecordById = (id: string): QcRecord | undefined =>
  QC_RECORDS.find((record) => record.id === id)

/**
 * Pallets. Independently rejectable and independently swappable — a model
 * where the container holds lots rather than pallets cannot represent the
 * one-pallet substitution that happens on most shipments, and did on this
 * one (PLT-00418-07 failed export QC on count-size drift).
 */
export type Pallet = {
  id: string
  tradeId: string
  lotId: string
  cartons: number
  netKg: number
  grossKg: number
  pulpTempAtPackC: number
  qcResult: "approved" | "rejected" | "substituted"
  note: string | null
}

function buildPallets(): Pallet[] {
  // 20 pallets, 100 cartons each, 970 kg net — 19,400 kg total, which is
  // the 19.4 MT that actually shipped against 20.0 MT contracted.
  const lotOrder = [
    "LOT-HP-APL-2026-00112",
    "LOT-HP-APL-2026-00113",
    "LOT-HP-APL-2026-00114",
    "LOT-HP-APL-2026-00115",
  ]
  const random = seededRandom(112)
  return Array.from({ length: 20 }, (_, index) => {
    const number = String(index + 1).padStart(2, "0")
    const lotId = lotOrder[Math.floor(index / 5)]
    const failed = index === 6 // PLT-00418-07 — the count-size drift
    return {
      id: `PLT-00418-${number}`,
      tradeId: "AMT-2026-00418",
      // The substituted pallet came from buffer stock on an earlier lot.
      lotId: failed ? "LOT-HP-APL-2026-00113" : lotId,
      cartons: 100,
      netKg: 970,
      grossKg: 1070,
      pulpTempAtPackC: Math.round((0.6 + random() * 0.6) * 10) / 10,
      qcResult: failed ? ("substituted" as const) : ("approved" as const),
      note: failed
        ? "Original pallet failed export QC on count-size drift — too many 135s. Swapped for a buffer pallet from lot 00113."
        : null,
    }
  })
}

export const PALLETS: Pallet[] = buildPallets()
export const palletById = (id: string): Pallet | undefined =>
  PALLETS.find((pallet) => pallet.id === id)
export const palletsForTrade = (tradeId: string): Pallet[] =>
  PALLETS.filter((pallet) => pallet.tradeId === tradeId)
export const palletsForLot = (lotId: string): Pallet[] =>
  PALLETS.filter((pallet) => pallet.lotId === lotId)

export type Container = {
  id: string
  tradeId: string
  type: string
  bookingRef: string
  line: string
  vessel: string
  voyage: string
  setpointC: number
  ventCbmPerHr: number
  humidityPct: number
  ptiRef: string
  sealNo: string
  vgmKg: number
  vgmFiledAt: string
  palletIds: string[]
  /** The three cut-offs, first-class. Every urgent alert in the second
   *  half of the process is derived from these. */
  cutoffGateIn: string
  cutoffVgm: string
  cutoffSi: string
  etd: string
  eta: string
  /** The documented fallback sailing — the only thing standing between a
   *  missed cut-off and a week of lost shelf life. */
  backupBookingRef: string | null
  backupEtd: string | null
  stuffedAt: string | null
  doorCloseAt: string | null
  gensetOffAt: string | null
  terminalPlugInAt: string | null
  gateInAt: string | null
  state: "booked" | "stuffing" | "sealed" | "at-terminal" | "gated-in" | "sailed" | "discharged" | "delivered"
}

export const CONTAINERS: Container[] = [
  {
    id: "MSKU 784123-6", tradeId: "AMT-2026-00418", type: "40ft High Cube Reefer",
    bookingRef: "MSCUBK-4471902", line: "MSC", vessel: "MSC Aurora", voyage: "2641E",
    setpointC: 0.5, ventCbmPerHr: 20, humidityPct: 90, ptiRef: "PTI-MUN-26-40118",
    sealNo: "SL-0099412", vgmKg: 26340, vgmFiledAt: "2026-10-06T19:20:00+05:30",
    palletIds: PALLETS.map((pallet) => pallet.id),
    cutoffGateIn: "2026-10-07T18:00:00+05:30",
    cutoffVgm: "2026-10-07T12:00:00+05:30",
    cutoffSi: "2026-10-06T18:00:00+05:30",
    etd: "2026-10-09T02:30:00+05:30", eta: "2026-10-15T08:00:00+04:00",
    backupBookingRef: "CMACGM-8890344", backupEtd: "2026-10-12T05:00:00+05:30",
    stuffedAt: "2026-10-06T14:10:00+05:30", doorCloseAt: "2026-10-06T17:45:00+05:30",
    gensetOffAt: "2026-10-07T15:52:00+05:30", terminalPlugInAt: "2026-10-07T16:20:00+05:30",
    gateInAt: null, state: "at-terminal",
  },
  {
    id: "CMAU 660214-3", tradeId: "AMT-2026-00437", type: "40ft High Cube Reefer",
    bookingRef: "CMACGM-8871204", line: "CMA CGM", vessel: "CMA CGM Bharat", voyage: "0FA2W",
    setpointC: 18, ventCbmPerHr: 0, humidityPct: 60, ptiRef: "PTI-COK-26-29844",
    sealNo: "SL-0099117", vgmKg: 22180, vgmFiledAt: "2026-09-30T11:00:00+05:30",
    palletIds: [], cutoffGateIn: "2026-09-30T16:00:00+05:30",
    cutoffVgm: "2026-09-30T10:00:00+05:30", cutoffSi: "2026-09-29T16:00:00+05:30",
    etd: "2026-10-01T22:00:00+05:30", eta: "2026-10-12T07:00:00+03:00",
    backupBookingRef: null, backupEtd: null,
    stuffedAt: "2026-09-29T13:00:00+05:30", doorCloseAt: "2026-09-29T16:20:00+05:30",
    gensetOffAt: "2026-09-30T13:05:00+05:30", terminalPlugInAt: "2026-09-30T13:25:00+05:30",
    gateInAt: "2026-09-30T13:40:00+05:30", state: "sailed",
  },
  {
    id: "TGHU 559803-1", tradeId: "AMT-2026-00433", type: "20ft Dry",
    bookingRef: "MAEU-7719340", line: "Maersk", vessel: "Maersk Kalmar", voyage: "641W",
    setpointC: 20, ventCbmPerHr: 0, humidityPct: 55, ptiRef: "—",
    sealNo: "", vgmKg: 0, vgmFiledAt: "",
    palletIds: [], cutoffGateIn: "2026-10-09T14:00:00+05:30",
    cutoffVgm: "2026-10-09T08:00:00+05:30", cutoffSi: "2026-10-08T14:00:00+05:30",
    etd: "2026-10-10T18:00:00+05:30", eta: "2026-10-21T06:00:00+03:00",
    backupBookingRef: null, backupEtd: null,
    stuffedAt: null, doorCloseAt: null, gensetOffAt: null, terminalPlugInAt: null,
    gateInAt: null, state: "stuffing",
  },
]

export const containerById = (id: string): Container | undefined =>
  CONTAINERS.find((container) => container.id === id)
export const containerForTrade = (tradeId: string): Container | undefined =>
  CONTAINERS.find((container) => container.tradeId === tradeId)

/* ════════════════════════════════════════════════════════════════════
   TEMPERATURE STREAM
   ════════════════════════════════════════════════════════════════════ */

export type TempSample = {
  at: string
  tempC: number
  humidityPct: number
  setpointC: number
  /** Which leg of the journey this sample belongs to — the reason a
   *  22 °C reading on day one is normal and the same reading on day five
   *  is a write-off. */
  leg: "orchard" | "road" | "pre-cool" | "cold-store" | "stuffing" | "port-run" | "terminal"
  excursion: boolean
}

export type Excursion = {
  id: string
  tradeId: string
  lotId: string | null
  startedAt: string
  durationMin: number
  peakTempC: number
  setpointC: number
  cause: string
  /** Computed at the moment of the excursion and stored — recomputing it
   *  later, after someone changes the model, destroys the audit value. */
  shelfLifeDebitDays: number
  decision: string
  acknowledgedBy: string
}

export const EXCURSIONS: Excursion[] = [
  {
    id: "EXC-00418-01", tradeId: "AMT-2026-00418", lotId: null,
    startedAt: "2026-10-01T14:20:00+05:30", durationMin: 40, peakTempC: 4.0, setpointC: 0.5,
    cause: "Chamber door held open during a pallet move — door sensor logged 40 minutes.",
    shelfLifeDebitDays: 1.2,
    decision: "Logged, no action. Minor excursion well inside the apple tolerance; permanently on the record if a claim comes.",
    acknowledgedBy: "u-arun",
  },
  {
    id: "EXC-00418-02", tradeId: "AMT-2026-00418", lotId: null,
    startedAt: "2026-10-07T15:52:00+05:30", durationMin: 28, peakTempC: 6.4, setpointC: 0.5,
    cause: "Genset off on arrival at Mundra; terminal power not connected until 16:20. The blind spot between trailer genset and terminal plug-in.",
    shelfLifeDebitDays: 0.8,
    decision: "Accepted. Plug-in confirmed at 16:20, pull-down back inside tolerance within the hour.",
    acknowledgedBy: "u-harpreet",
  },
  {
    id: "EXC-00429-01", tradeId: "AMT-2026-00429", lotId: null,
    startedAt: "2026-10-07T09:40:00+05:30", durationMin: 165, peakTempC: 3.8, setpointC: 2.0,
    cause: "Evaporator fan failure in chamber CR-03. Kinnow held 2.8 °C above set point for close to three hours.",
    shelfLifeDebitDays: 4.5,
    decision: "Lot moved to quarantine, QC re-inspection pending. Accept / downgrade / reject decision due 18:30.",
    acknowledgedBy: "u-arun",
  },
]

/**
 * Hourly samples for the primary trade, harvest → terminal plug-in.
 * Built from the documented curve rather than 230 hand-written rows: six
 * hours of field heat at ~22 °C, an 18-hour road leg on a genset trailer,
 * a seven-hour forced-air pull-down from 19 °C to 1 °C, the hold at
 * +0.5 °C with the day-three door excursion, then stuffing, the port run
 * and the genset gap at Mundra.
 */
function buildTemperatureStream(): TempSample[] {
  const random = seededRandom(704)
  const samples: TempSample[] = []
  const start = new Date(PRIMARY_HARVEST).getTime()
  const hours = 226 // 28 Sep 07:40 → 7 Oct 16:40
  const jitter = (spread: number) => (random() - 0.5) * spread

  for (let hour = 0; hour < hours; hour += 1) {
    const at = new Date(start + hour * 3_600_000).toISOString()
    let tempC: number
    let humidityPct: number
    let leg: TempSample["leg"]
    let excursion = false

    if (hour < 6) {
      leg = "orchard"
      tempC = 21.5 + jitter(2.2)
      humidityPct = 58 + jitter(8)
    } else if (hour < 24) {
      leg = "road"
      // Genset trailer holds it, it does not pull it down.
      tempC = 19.4 - (hour - 6) * 0.18 + jitter(0.9)
      humidityPct = 74 + jitter(6)
    } else if (hour < 31) {
      leg = "pre-cool"
      // Forced-air: 19 °C to 1 °C over roughly seven hours.
      tempC = 19 - (hour - 24) * 2.57 + jitter(0.5)
      humidityPct = 86 + jitter(4)
    } else if (hour < 194) {
      leg = "cold-store"
      // Day-three door excursion — 40 minutes, drift to 4 °C.
      const excursionHour = hour >= 78 && hour < 80
      excursion = excursionHour
      tempC = excursionHour ? 3.4 + jitter(1.1) : 0.5 + jitter(0.5)
      humidityPct = excursionHour ? 84 + jitter(3) : 92 + jitter(3)
    } else if (hour < 200) {
      leg = "stuffing"
      tempC = 0.9 + jitter(0.6)
      humidityPct = 89 + jitter(4)
    } else if (hour < 224) {
      leg = "port-run"
      tempC = 1.1 + jitter(0.7)
      humidityPct = 88 + jitter(4)
    } else {
      leg = "terminal"
      // The genset gap: nothing cooling, nothing recording — except here.
      excursion = hour === 224
      tempC = hour === 224 ? 6.2 + jitter(0.8) : 2.4 + jitter(0.6)
      humidityPct = 82 + jitter(5)
    }

    samples.push({
      at,
      tempC: Math.round(tempC * 10) / 10,
      humidityPct: Math.round(humidityPct),
      setpointC: hour < 24 ? 8 : 0.5,
      leg,
      excursion,
    })
  }

  return samples
}

export const TEMPERATURE_STREAM: TempSample[] = buildTemperatureStream()

/* ════════════════════════════════════════════════════════════════════
   COMMERCIAL — RFQ → quote → term sheet → PO
   ════════════════════════════════════════════════════════════════════ */

export type RfqStatus = "open" | "quoting" | "awarded" | "lost" | "expired"

export type Rfq = {
  id: string
  /** Buyers re-issue RFQs when a spec or quantity changes; the revision
   *  is what a quote is actually priced against. */
  revision: number
  /** The buyer's own reference. Half of every chase email quotes this
   *  and not our id, so it has to be on the record. */
  buyerReference: string
  buyerId: string
  kamId: string
  productId: string
  variantId: string
  qtyMt: number
  /** Accepted over/under-shipment, in percent. An agro lot never lands
   *  exactly on the contracted number. */
  qtyTolerancePct: number
  /** The spec as typed tolerances rather than a paragraph — this is what
   *  field QC and export QC are both measured against. */
  specLines: { label: string; requirement: string }[]
  packaging: string
  incoterm: string
  destination: string
  portOfDischarge: string
  deliveryWindow: [string, string]
  paymentTermsRequested: string
  currency: "USD" | "EUR" | "GBP"
  /** Disclosed only when the buyer chooses to anchor the negotiation. */
  targetPriceUsdPerMt: number | null
  certifications: string[]
  documentsRequired: string[]
  inspection: string
  raisedAt: string
  respondBy: string
  status: RfqStatus
  invitations: RfqInvitation[]
  awardedQuoteId: string | null
  /** Why a lost or expired RFQ closed the way it did. */
  closeReason: string | null
  attachments: { label: string; kind: "spec" | "document" | "photo" }[]
  activity: { at: string; actorId: string; text: string }[]
  tradeId: string | null
}

export type RfqInvitation = {
  sellerId: string
  invitedAt: string
  respondedAt: string | null
  state: "quoted" | "declined" | "no-response" | "invited"
  /** Present when the grower declined. */
  declineReason?: string
}

const inv = (
  sellerId: string,
  invitedAt: string,
  respondedAt: string | null,
  state: RfqInvitation["state"],
  declineReason?: string
): RfqInvitation => ({ sellerId, invitedAt, respondedAt, state, declineReason })

export const RFQS: Rfq[] = [
  {
    id: "RFQ-2026-0311",
    revision: 2,
    buyerReference: "ANF/PO-REQ/26-1142",
    buyerId: "b-alnoor",
    kamId: "u-rohit",
    productId: "apple",
    variantId: "apple--1",
    qtyMt: 20,
    qtyTolerancePct: 5,
    specLines: [
      { label: "Variety", requirement: "Royal Delicious" },
      { label: "Grade", requirement: "Grade A" },
      { label: "Count size", requirement: "100–125 per 20 kg carton" },
      { label: "Red blush", requirement: "≥ 60% of surface" },
      { label: "Firmness", requirement: "≥ 14 lbf" },
      { label: "Brix", requirement: "≥ 12" },
      { label: "Russeting", requirement: "≤ 10% of surface" },
      { label: "Total defects", requirement: "≤ 2%" },
    ],
    packaging: "9 kg telescopic cartons · 100 cartons per pallet · corner posts, stretch-wrapped, lot QR on every carton",
    incoterm: "CFR Jebel Ali",
    destination: "Jebel Ali, Dubai",
    portOfDischarge: "AEJEA — Jebel Ali",
    deliveryWindow: ["2026-10-15", "2026-10-31"],
    paymentTermsRequested: "30% advance · 70% at B/L + 30 days",
    currency: "USD",
    targetPriceUsdPerMt: 1150,
    certifications: [],
    documentsRequired: ["Commercial invoice", "Packing list", "Certificate of origin", "Phytosanitary certificate"],
    inspection: "AMAMA field QC at harvest and export QC before stuffing; evidence pack shared. Buyer inspects on arrival.",
    raisedAt: "2026-09-12T09:05:00+05:30",
    respondBy: "2026-09-14T09:05:00+05:30",
    status: "awarded",
    invitations: [
      inv("s-tilak", "2026-09-12T09:30:00+05:30", "2026-09-12T16:40:00+05:30", "quoted"),
      inv("s-suresh", "2026-09-12T09:30:00+05:30", "2026-09-12T18:05:00+05:30", "quoted"),
      inv("s-pushpa", "2026-09-12T09:30:00+05:30", "2026-09-13T09:25:00+05:30", "quoted"),
      inv("s-mahesh", "2026-09-12T09:30:00+05:30", "2026-09-13T11:50:00+05:30", "quoted"),
      inv("s-krishna", "2026-09-12T09:30:00+05:30", "2026-09-13T14:00:00+05:30", "quoted"),
    ],
    awardedQuoteId: "QT-0311-01",
    closeReason: null,
    attachments: [
      { label: "Al Noor buying spec v1.pdf", kind: "spec" },
      { label: "Carton and pallet drawing.pdf", kind: "document" },
    ],
    activity: [
      { at: "2026-09-12T09:05:00+05:30", actorId: "b-alnoor", text: "RFQ raised for 20 MT Royal Delicious, CFR Jebel Ali" },
      { at: "2026-09-12T10:52:00+05:30", actorId: "u-rohit", text: "Spec tightened to typed tolerances at revision 2 — blush, firmness, brix and defects given numbers" },
      { at: "2026-09-13T16:30:00+05:30", actorId: "u-rohit", text: "Five quotes received, 21 MT available across two altitude bands" },
      { at: "2026-09-14T10:30:00+05:30", actorId: "u-rohit", text: "Term sheet TS-2026-0311 opened against the four Himachal quotes" },
      { at: "2026-09-18T15:20:00+05:30", actorId: "u-vikram", text: "Awarded — contract signed as AMT-2026-00418" },
    ],
    tradeId: "AMT-2026-00418",
  },
  {
    id: "RFQ-2026-0318",
    revision: 1,
    buyerReference: "BPL-SRC-4471",
    buyerId: "b-britannia",
    kamId: "u-fatima",
    productId: "mango",
    variantId: "mango--1",
    qtyMt: 12,
    qtyTolerancePct: 5,
    specLines: [
      { label: "Variety", requirement: "Alphonso" },
      { label: "Grade", requirement: "Grade A" },
      { label: "Fruit weight", requirement: "250–300 g" },
      { label: "Brix", requirement: "≥ 18" },
      { label: "Spongy tissue", requirement: "Zero tolerance" },
      { label: "Residues", requirement: "Within EU MRL" },
    ],
    packaging: "4 kg single-layer cartons · 5 fruit per tray · perforated liner",
    incoterm: "CIF Felixstowe",
    destination: "Spalding, Lincolnshire",
    portOfDischarge: "GBFXT — Felixstowe",
    deliveryWindow: ["2026-11-20", "2026-12-05"],
    paymentTermsRequested: "50% advance · 50% at B/L",
    currency: "USD",
    targetPriceUsdPerMt: null,
    certifications: ["GlobalGAP", "GRASP"],
    documentsRequired: ["Commercial invoice", "Packing list", "Phytosanitary certificate", "Residue test report", "GlobalGAP certificate"],
    inspection: "Third-party residue panel from an accredited lab before shipment; buyer QA attends the packing run.",
    raisedAt: "2026-09-28T11:20:00+05:30",
    respondBy: "2026-09-30T11:20:00+05:30",
    status: "awarded",
    invitations: [
      inv("s-devgad", "2026-09-28T12:00:00+05:30", "2026-09-28T17:00:00+05:30", "quoted"),
      inv("s-krishna", "2026-09-28T12:00:00+05:30", "2026-09-29T10:30:00+05:30", "quoted"),
      inv("s-jalgaon", "2026-09-28T12:00:00+05:30", "2026-09-30T08:40:00+05:30", "quoted"),
    ],
    awardedQuoteId: "QT-0318-01",
    closeReason: null,
    attachments: [{ label: "Britannia EU MRL schedule.pdf", kind: "spec" }],
    activity: [
      { at: "2026-09-28T11:20:00+05:30", actorId: "b-britannia", text: "RFQ raised — GlobalGAP and EU MRL compliance stated as non-negotiable" },
      { at: "2026-09-28T17:10:00+05:30", actorId: "u-fatima", text: "Residue panel ordered ahead of need — lab lead time is days and it gates a UK entry" },
      { at: "2026-10-04T16:20:00+05:30", actorId: "b-britannia", text: "PO-BRI-2026-1180 raised against the Devgad quote" },
    ],
    tradeId: "AMT-2026-00419",
  },
  {
    id: "RFQ-2026-0322",
    revision: 1,
    buyerReference: "VDV-2026-0891",
    buyerId: "b-vanderveen",
    kamId: "u-fatima",
    productId: "grapes",
    variantId: "grapes--2",
    qtyMt: 24,
    qtyTolerancePct: 10,
    specLines: [
      { label: "Variety", requirement: "Flame Seedless" },
      { label: "Grade", requirement: "Grade A" },
      { label: "Berry size", requirement: "≥ 18 mm" },
      { label: "Brix", requirement: "≥ 17" },
      { label: "Bunch weight", requirement: "400–700 g" },
      { label: "SO₂ pads", requirement: "Dual-release, mandatory" },
    ],
    packaging: "4.5 kg punnets in vented cartons · 8 punnets per carton",
    incoterm: "CIF Rotterdam",
    destination: "Rotterdam",
    portOfDischarge: "NLRTM — Rotterdam",
    deliveryWindow: ["2026-12-10", "2026-12-24"],
    paymentTermsRequested: "LC at sight",
    currency: "EUR",
    targetPriceUsdPerMt: 1620,
    certifications: ["GlobalGAP"],
    documentsRequired: ["Commercial invoice", "Packing list", "Certificate of origin", "Phytosanitary certificate", "Residue test report"],
    inspection: "Pre-shipment inspection at the pack-house; buyer reserves arrival survey rights.",
    raisedAt: "2026-10-02T15:40:00+05:30",
    respondBy: "2026-10-09T15:40:00+05:30",
    status: "quoting",
    invitations: [
      inv("s-krishna", "2026-10-02T16:10:00+05:30", "2026-10-03T14:20:00+05:30", "quoted"),
      inv("s-ooty", "2026-10-02T16:10:00+05:30", "2026-10-04T09:10:00+05:30", "quoted"),
      inv("s-devgad", "2026-10-02T16:10:00+05:30", "2026-10-05T16:05:00+05:30", "quoted"),
      inv("s-sirsa", "2026-10-02T16:10:00+05:30", null, "no-response"),
    ],
    awardedQuoteId: null,
    closeReason: null,
    attachments: [{ label: "Vanderveen punnet spec.pdf", kind: "spec" }],
    activity: [
      { at: "2026-10-02T15:40:00+05:30", actorId: "b-vanderveen", text: "RFQ raised for the December Flame window" },
      { at: "2026-10-05T16:05:00+05:30", actorId: "u-fatima", text: "Three quotes in. Flame blocks come on around 5 December, which is tight against the window" },
    ],
    tradeId: null,
  },
  {
    id: "RFQ-2026-0325",
    revision: 2,
    buyerReference: "RAS-PUR-7712",
    buyerId: "b-reef",
    kamId: "u-rohit",
    productId: "cashew",
    variantId: "cashew--1",
    qtyMt: 14,
    qtyTolerancePct: 2,
    specLines: [
      { label: "Grade", requirement: "W-180 jumbo, fewer than 180 kernels/lb" },
      { label: "Moisture", requirement: "≤ 5%" },
      { label: "Broken kernels", requirement: "≤ 5%" },
      { label: "Aflatoxin", requirement: "Tested per batch, within Gulf limit" },
      { label: "Foreign matter", requirement: "Nil" },
    ],
    packaging: "Revision 2 — 10 kg vacuum pouches in a master carton, replacing 25 lb tins",
    incoterm: "CFR Jeddah",
    destination: "Jeddah",
    portOfDischarge: "SAJED — Jeddah",
    deliveryWindow: ["2026-11-10", "2026-11-25"],
    paymentTermsRequested: "LC at sight, confirmed",
    currency: "USD",
    targetPriceUsdPerMt: 5700,
    certifications: ["HACCP", "ISO 22000"],
    documentsRequired: ["Commercial invoice", "Packing list", "Certificate of origin", "Aflatoxin certificate", "Health certificate"],
    inspection: "Per-batch aflatoxin certificate from an accredited lab, shared before shipment.",
    raisedAt: "2026-10-04T10:10:00+05:30",
    respondBy: "2026-10-08T10:10:00+05:30",
    status: "quoting",
    invitations: [
      inv("s-kollam", "2026-10-04T11:15:00+05:30", "2026-10-04T15:45:00+05:30", "quoted"),
      inv("s-alleppey", "2026-10-04T11:15:00+05:30", "2026-10-05T11:15:00+05:30", "quoted"),
      inv("s-coorg", "2026-10-04T11:15:00+05:30", "2026-10-05T18:30:00+05:30", "quoted"),
    ],
    awardedQuoteId: null,
    closeReason: null,
    attachments: [
      { label: "Reef pouch artwork.pdf", kind: "document" },
      { label: "Previous shipment kernel photos.jpg", kind: "photo" },
    ],
    activity: [
      { at: "2026-10-04T10:10:00+05:30", actorId: "b-reef", text: "RFQ raised — same quality as the last two containers" },
      { at: "2026-10-06T09:20:00+05:30", actorId: "b-reef", text: "Revision 2 — packing changed from 25 lb tins to 10 kg vacuum pouches" },
      { at: "2026-10-06T15:40:00+05:30", actorId: "u-rohit", text: "Pouches costed at +USD 85/MT and four days on the packing run" },
      { at: "2026-10-07T11:30:00+05:30", actorId: "b-reef", text: "PO raised at USD 5,700 with pouches — treated as a counter-offer" },
    ],
    tradeId: null,
  },
  {
    id: "RFQ-2026-0327",
    revision: 1,
    buyerReference: "EAD/RFQ/0043",
    buyerId: "b-emiratesagro",
    kamId: "u-rohit",
    productId: "potato",
    variantId: "potato--1",
    qtyMt: 40,
    qtyTolerancePct: 10,
    specLines: [
      { label: "Variety", requirement: "Kufri Jyoti" },
      { label: "Grade", requirement: "Grade A" },
      { label: "Size", requirement: "50–80 mm" },
      { label: "Reducing sugars", requirement: "Low — fry colour ≤ 2 on the USDA scale" },
      { label: "Greening", requirement: "≤ 1%" },
    ],
    packaging: "25 kg mesh bags, palletised",
    incoterm: "CFR Jebel Ali",
    destination: "Sharjah",
    portOfDischarge: "AEJEA — Jebel Ali",
    deliveryWindow: ["2026-11-05", "2026-11-20"],
    paymentTermsRequested: "100% advance — new account",
    currency: "USD",
    targetPriceUsdPerMt: 300,
    certifications: [],
    documentsRequired: ["Commercial invoice", "Packing list", "Phytosanitary certificate"],
    inspection: "Fry-colour test on a sample lot before dispatch.",
    raisedAt: "2026-10-06T12:30:00+05:30",
    respondBy: "2026-10-10T12:30:00+05:30",
    status: "open",
    invitations: [
      inv("s-ooty", "2026-10-06T13:00:00+05:30", "2026-10-06T17:30:00+05:30", "quoted"),
      inv("s-krishna", "2026-10-06T13:00:00+05:30", "2026-10-07T09:50:00+05:30", "quoted"),
    ],
    awardedQuoteId: null,
    closeReason: null,
    attachments: [],
    activity: [
      { at: "2026-10-06T12:30:00+05:30", actorId: "b-emiratesagro", text: "RFQ raised by a new account" },
      { at: "2026-10-06T12:35:00+05:30", actorId: "u-leela", text: "Buyer KYC incomplete — shipment planning held at source until it clears" },
    ],
    tradeId: null,
  },
  {
    id: "RFQ-2026-0304",
    revision: 1,
    buyerReference: "NPC-2026-338",
    buyerId: "b-najd",
    kamId: "u-rohit",
    productId: "chickpea",
    variantId: "chickpea--1",
    qtyMt: 60,
    qtyTolerancePct: 5,
    specLines: [
      { label: "Type", requirement: "Kabuli" },
      { label: "Calibre", requirement: "12 mm" },
      { label: "Moisture", requirement: "≤ 12%" },
      { label: "Admixture", requirement: "≤ 1%" },
    ],
    packaging: "50 kg PP bags",
    incoterm: "CIF Dammam",
    destination: "Riyadh",
    portOfDischarge: "SADMM — Dammam",
    deliveryWindow: ["2026-09-20", "2026-10-05"],
    paymentTermsRequested: "60 days from B/L",
    currency: "USD",
    targetPriceUsdPerMt: 870,
    certifications: [],
    documentsRequired: ["Commercial invoice", "Packing list", "Certificate of origin", "Fumigation certificate"],
    inspection: "SGS pre-shipment inspection — cost disputed.",
    raisedAt: "2026-08-28T09:00:00+05:30",
    respondBy: "2026-09-01T09:00:00+05:30",
    status: "lost",
    invitations: [
      inv("s-karnal", "2026-08-28T09:40:00+05:30", "2026-08-29T12:00:00+05:30", "quoted"),
      inv("s-krishna", "2026-08-28T09:40:00+05:30", "2026-08-29T16:20:00+05:30", "quoted"),
    ],
    awardedQuoteId: null,
    closeReason:
      "Awarded to a Turkish origin at USD 880 CIF. Our floor was 985 and the buyer also wanted 60-day unsecured terms on a new account — walked away rather than buy the volume.",
    attachments: [],
    activity: [
      { at: "2026-08-28T09:00:00+05:30", actorId: "b-najd", text: "RFQ raised" },
      { at: "2026-09-01T11:00:00+05:30", actorId: "u-rohit", text: "Term sheet TS-2026-0304 opened" },
      { at: "2026-09-04T16:30:00+05:30", actorId: "u-ananya", text: "Closed as lost — price floor and unsecured 60-day terms both breached" },
    ],
    tradeId: null,
  },
  {
    id: "RFQ-2026-0330",
    revision: 1,
    buyerReference: "GSF-DXB-2214",
    buyerId: "b-gulfstar",
    kamId: "u-rohit",
    productId: "pomegranate",
    variantId: "pomegranate--1",
    qtyMt: 21,
    qtyTolerancePct: 5,
    specLines: [
      { label: "Variety", requirement: "Bhagwa" },
      { label: "Grade", requirement: "Grade A+" },
      { label: "Fruit weight", requirement: "≥ 250 g" },
      { label: "Aril colour", requirement: "Uniform deep red" },
      { label: "Sunscald", requirement: "≤ 1%" },
    ],
    packaging: "3.5 kg cartons, single layer, foam net per fruit",
    incoterm: "CFR Jebel Ali",
    destination: "Dubai",
    portOfDischarge: "AEJEA — Jebel Ali",
    deliveryWindow: ["2026-11-12", "2026-11-26"],
    paymentTermsRequested: "30% advance · 70% at B/L + 30 days",
    currency: "USD",
    targetPriceUsdPerMt: 1280,
    certifications: [],
    documentsRequired: ["Commercial invoice", "Packing list", "Phytosanitary certificate"],
    inspection: "AMAMA field QC plus export QC; photo evidence pack shared.",
    raisedAt: "2026-10-07T09:15:00+05:30",
    respondBy: "2026-10-11T09:15:00+05:30",
    status: "open",
    invitations: [
      inv("s-krishna", "2026-10-07T10:00:00+05:30", null, "invited"),
      inv("s-devgad", "2026-10-07T10:00:00+05:30", null, "invited"),
    ],
    awardedQuoteId: null,
    closeReason: null,
    attachments: [{ label: "Gulf Star carton marking.pdf", kind: "document" }],
    activity: [
      { at: "2026-10-07T09:15:00+05:30", actorId: "b-gulfstar", text: "RFQ raised for the November Bhagwa window" },
      { at: "2026-10-07T10:00:00+05:30", actorId: "u-rohit", text: "Invited Krishna Valley and Devgad — awaiting both" },
    ],
    tradeId: null,
  },
  {
    id: "RFQ-2026-0331",
    revision: 1,
    buyerReference: "MFI-SPB-0442",
    buyerId: "b-moskva",
    kamId: "u-fatima",
    productId: "citrus",
    variantId: "citrus--2",
    qtyMt: 28,
    qtyTolerancePct: 10,
    specLines: [
      { label: "Variety", requirement: "Kinnow" },
      { label: "Grade", requirement: "Grade A" },
      { label: "Size", requirement: "65–75 mm" },
      { label: "Brix", requirement: "≥ 11" },
      { label: "Granulation", requirement: "≤ 2%" },
    ],
    packaging: "15 kg telescopic cartons, waxed fruit",
    incoterm: "CFR St Petersburg",
    destination: "Moscow",
    portOfDischarge: "RULED — St Petersburg",
    deliveryWindow: ["2026-12-01", "2026-12-18"],
    paymentTermsRequested: "100% against scanned B/L",
    currency: "USD",
    targetPriceUsdPerMt: 620,
    certifications: [],
    documentsRequired: ["Commercial invoice", "Packing list", "Certificate of origin", "Phytosanitary certificate", "GOST declaration"],
    inspection: "Buyer's agent inspects at the pack-house before stuffing.",
    raisedAt: "2026-10-05T14:00:00+05:30",
    respondBy: "2026-10-12T14:00:00+05:30",
    status: "quoting",
    invitations: [
      inv("s-sirsa", "2026-10-05T14:40:00+05:30", "2026-10-06T10:20:00+05:30", "quoted"),
      inv("s-krishna", "2026-10-05T14:40:00+05:30", "2026-10-06T16:00:00+05:30", "declined", "No Kinnow volume — blocks are committed to a domestic buyer this season."),
    ],
    awardedQuoteId: null,
    closeReason: null,
    attachments: [],
    activity: [
      { at: "2026-10-05T14:00:00+05:30", actorId: "b-moskva", text: "RFQ raised for the December Kinnow window" },
      { at: "2026-10-06T16:00:00+05:30", actorId: "u-fatima", text: "Krishna Valley declined — one quote in hand, sourcing a second grower" },
      { at: "2026-10-07T08:00:00+05:30", actorId: "u-leela", text: "Sirsa Kinnow Farms KYC lapses in 14 days — renew before award" },
    ],
    tradeId: null,
  },
  {
    id: "RFQ-2026-0333",
    revision: 1,
    buyerReference: "BPL-SRC-4498",
    buyerId: "b-britannia",
    kamId: "u-fatima",
    productId: "arabica-coffee",
    variantId: "arabica-coffee--2",
    qtyMt: 19.2,
    qtyTolerancePct: 2,
    specLines: [
      { label: "Grade", requirement: "Monsooned Malabar AA, screen 18" },
      { label: "Moisture", requirement: "13–14%" },
      { label: "Cup score", requirement: "≥ 82" },
      { label: "Defects", requirement: "≤ 8 full defects per 300 g" },
    ],
    packaging: "60 kg jute bags with GrainPro liner",
    incoterm: "CIF London Gateway",
    destination: "London",
    portOfDischarge: "GBLON — London Gateway",
    deliveryWindow: ["2026-10-16", "2026-10-30"],
    paymentTermsRequested: "100% at B/L + 30 days",
    currency: "GBP",
    targetPriceUsdPerMt: null,
    certifications: ["Rainforest Alliance"],
    documentsRequired: ["Commercial invoice", "Packing list", "Certificate of origin", "ICO certificate of origin", "Weight and quality certificate"],
    inspection: "Cupping sample approved by the buyer's Q-grader before shipment.",
    raisedAt: "2026-08-25T11:00:00+05:30",
    respondBy: "2026-08-29T11:00:00+05:30",
    status: "awarded",
    invitations: [inv("s-coorg", "2026-08-25T11:30:00+05:30", "2026-08-26T15:00:00+05:30", "quoted")],
    awardedQuoteId: null,
    closeReason: null,
    attachments: [{ label: "Cupping score sheet — pre-ship sample.pdf", kind: "document" }],
    activity: [
      { at: "2026-08-25T11:00:00+05:30", actorId: "b-britannia", text: "RFQ raised against the monsooned lot" },
      { at: "2026-08-26T15:00:00+05:30", actorId: "u-fatima", text: "Coorg Estates quoted; cupping sample cleared at 83.5" },
      { at: "2026-09-02T15:30:00+05:30", actorId: "u-vikram", text: "Awarded — contract signed as AMT-2026-00435" },
    ],
    tradeId: "AMT-2026-00435",
  },
  {
    id: "RFQ-2026-0298",
    revision: 3,
    buyerReference: "VDV-2026-0804",
    buyerId: "b-vanderveen",
    kamId: "u-fatima",
    productId: "dried-chilli",
    variantId: "dried-chilli--1",
    qtyMt: 54,
    qtyTolerancePct: 5,
    specLines: [
      { label: "Type", requirement: "Guntur Sannam S4" },
      { label: "Colour value", requirement: "ASTA 90+" },
      { label: "Moisture", requirement: "≤ 12%" },
      { label: "Stems", requirement: "Removed" },
      { label: "Aflatoxin", requirement: "Within EU limit" },
    ],
    packaging: "25 kg woven bags, palletised and shrink-wrapped",
    incoterm: "CIF Rotterdam",
    destination: "Rotterdam",
    portOfDischarge: "NLRTM — Rotterdam",
    deliveryWindow: ["2026-10-20", "2026-11-04"],
    paymentTermsRequested: "LC at sight",
    currency: "EUR",
    targetPriceUsdPerMt: 2250,
    certifications: ["HACCP"],
    documentsRequired: ["Commercial invoice", "Packing list", "Certificate of origin", "Phytosanitary certificate", "Aflatoxin certificate"],
    inspection: "Aflatoxin and ASTA colour tested per lot by an accredited lab.",
    raisedAt: "2026-08-20T10:30:00+05:30",
    respondBy: "2026-08-24T10:30:00+05:30",
    status: "awarded",
    invitations: [inv("s-guntur", "2026-08-20T11:00:00+05:30", "2026-08-21T09:30:00+05:30", "quoted")],
    awardedQuoteId: null,
    closeReason: null,
    attachments: [{ label: "EU aflatoxin limits — chilli.pdf", kind: "spec" }],
    activity: [
      { at: "2026-08-20T10:30:00+05:30", actorId: "b-vanderveen", text: "RFQ raised" },
      { at: "2026-08-22T09:00:00+05:30", actorId: "u-fatima", text: "Revision 3 — ASTA raised from 80 to 90+ after the buyer's own retail spec changed" },
      { at: "2026-09-08T11:45:00+05:30", actorId: "u-vikram", text: "Awarded — contract signed as AMT-2026-00431" },
    ],
    tradeId: "AMT-2026-00431",
  },
  {
    id: "RFQ-2026-0336",
    revision: 1,
    buyerReference: "RAS-PUR-7740",
    buyerId: "b-reef",
    kamId: "u-rohit",
    productId: "basmati-rice",
    variantId: "basmati-rice--3",
    qtyMt: 120,
    qtyTolerancePct: 2,
    specLines: [
      { label: "Type", requirement: "Traditional basmati, aged 24 months" },
      { label: "Average grain length", requirement: "≥ 7.20 mm" },
      { label: "Broken", requirement: "≤ 1%" },
      { label: "Moisture", requirement: "≤ 13%" },
      { label: "Sortex", requirement: "Double-pass" },
    ],
    packaging: "20 kg non-woven bags with handle, retail-ready",
    incoterm: "CFR Jeddah",
    destination: "Jeddah",
    portOfDischarge: "SAJED — Jeddah",
    deliveryWindow: ["2026-12-15", "2027-01-10"],
    paymentTermsRequested: "LC at sight",
    currency: "USD",
    targetPriceUsdPerMt: 1380,
    certifications: ["HACCP", "SFDA registration"],
    documentsRequired: ["Commercial invoice", "Packing list", "Certificate of origin", "Health certificate", "SFDA registration"],
    inspection: "Grain length and ageing verified on a drawn sample before dispatch.",
    raisedAt: "2026-10-07T13:40:00+05:30",
    respondBy: "2026-10-14T13:40:00+05:30",
    status: "open",
    invitations: [inv("s-karnal", "2026-10-07T14:10:00+05:30", null, "invited")],
    awardedQuoteId: null,
    closeReason: null,
    attachments: [{ label: "Reef retail bag artwork.pdf", kind: "document" }],
    activity: [
      { at: "2026-10-07T13:40:00+05:30", actorId: "b-reef", text: "RFQ raised for aged traditional basmati, retail-ready packing" },
    ],
    tradeId: null,
  },
  {
    id: "RFQ-2026-0289",
    revision: 1,
    buyerReference: "ANF/PO-REQ/26-1098",
    buyerId: "b-alnoor",
    kamId: "u-rohit",
    productId: "onion",
    variantId: "onion--1",
    qtyMt: 48,
    qtyTolerancePct: 10,
    specLines: [
      { label: "Variety", requirement: "Nashik Red" },
      { label: "Grade", requirement: "Grade A" },
      { label: "Size", requirement: "45–70 mm" },
      { label: "Curing", requirement: "Single-layer sun-cured" },
      { label: "Sprouting", requirement: "≤ 2%" },
    ],
    packaging: "25 kg mesh bags",
    incoterm: "CFR Jebel Ali",
    destination: "Dubai",
    portOfDischarge: "AEJEA — Jebel Ali",
    deliveryWindow: ["2026-09-12", "2026-09-25"],
    paymentTermsRequested: "30% advance · 70% at B/L + 30 days",
    currency: "USD",
    targetPriceUsdPerMt: 350,
    certifications: [],
    documentsRequired: ["Commercial invoice", "Packing list", "Phytosanitary certificate"],
    inspection: "Export QC at the pack-house.",
    raisedAt: "2026-07-30T10:00:00+05:30",
    respondBy: "2026-08-03T10:00:00+05:30",
    status: "awarded",
    invitations: [inv("s-krishna", "2026-07-30T10:30:00+05:30", "2026-07-31T12:00:00+05:30", "quoted")],
    awardedQuoteId: null,
    closeReason: null,
    attachments: [],
    activity: [
      { at: "2026-07-30T10:00:00+05:30", actorId: "b-alnoor", text: "RFQ raised" },
      { at: "2026-08-06T09:50:00+05:30", actorId: "u-vikram", text: "Awarded — contract signed as AMT-2026-00439, since settled and closed" },
    ],
    tradeId: "AMT-2026-00439",
  },
]

export const rfqById = (id: string): Rfq | undefined => RFQS.find((rfq) => rfq.id === id)

export type QuoteStatus = "submitted" | "shortlisted" | "accepted" | "not-selected" | "withdrawn"

export type Quote = {
  id: string
  rfqId: string
  sellerId: string
  priceUsdPerMt: number
  availableMt: number
  incoterm: string
  validUntil: string
  leadTimeDays: number
  submittedAt: string
  status: QuoteStatus
  note: string | null
}

export const QUOTES: Quote[] = [
  { id: "QT-0311-01", rfqId: "RFQ-2026-0311", sellerId: "s-tilak", priceUsdPerMt: 1165, availableMt: 6, incoterm: "EXW Kotkhai", validUntil: "2026-09-20", leadTimeDays: 12, submittedAt: "2026-09-12T16:40:00+05:30", status: "accepted", note: "2,100 m blocks pick 26–30 September. Can hold 6 MT." },
  { id: "QT-0311-02", rfqId: "RFQ-2026-0311", sellerId: "s-suresh", priceUsdPerMt: 1150, availableMt: 5, incoterm: "EXW Jubbal", validUntil: "2026-09-20", leadTimeDays: 12, submittedAt: "2026-09-12T18:05:00+05:30", status: "accepted", note: null },
  { id: "QT-0311-03", rfqId: "RFQ-2026-0311", sellerId: "s-pushpa", priceUsdPerMt: 1140, availableMt: 5, incoterm: "EXW Kotkhai", validUntil: "2026-09-19", leadTimeDays: 14, submittedAt: "2026-09-13T09:25:00+05:30", status: "accepted", note: "First season on the platform — KYC in progress." },
  { id: "QT-0311-04", rfqId: "RFQ-2026-0311", sellerId: "s-mahesh", priceUsdPerMt: 1175, availableMt: 5, incoterm: "EXW Jubbal", validUntil: "2026-09-20", leadTimeDays: 12, submittedAt: "2026-09-13T11:50:00+05:30", status: "accepted", note: null },
  { id: "QT-0318-01", rfqId: "RFQ-2026-0318", sellerId: "s-devgad", priceUsdPerMt: 1460, availableMt: 14, incoterm: "EXW Devgad", validUntil: "2026-10-10", leadTimeDays: 30, submittedAt: "2026-09-28T17:00:00+05:30", status: "accepted", note: "GlobalGAP certificate current to March 2027." },
  { id: "QT-0318-02", rfqId: "RFQ-2026-0318", sellerId: "s-krishna", priceUsdPerMt: 1510, availableMt: 8, incoterm: "EXW Nashik", validUntil: "2026-10-08", leadTimeDays: 34, submittedAt: "2026-09-29T10:30:00+05:30", status: "not-selected", note: "Kesar only — no Alphonso volume this window." },
  { id: "QT-0322-01", rfqId: "RFQ-2026-0322", sellerId: "s-krishna", priceUsdPerMt: 1680, availableMt: 24, incoterm: "EXW Nashik", validUntil: "2026-10-16", leadTimeDays: 62, submittedAt: "2026-10-03T14:20:00+05:30", status: "submitted", note: "Flame blocks come on around 5 December." },
  { id: "QT-0322-02", rfqId: "RFQ-2026-0322", sellerId: "s-ooty", priceUsdPerMt: 1755, availableMt: 10, incoterm: "EXW Kotagiri", validUntil: "2026-10-14", leadTimeDays: 66, submittedAt: "2026-10-04T09:10:00+05:30", status: "submitted", note: null },
  { id: "QT-0325-01", rfqId: "RFQ-2026-0325", sellerId: "s-kollam", priceUsdPerMt: 5820, availableMt: 14, incoterm: "EXW Kundara", validUntil: "2026-10-12", leadTimeDays: 20, submittedAt: "2026-10-04T15:45:00+05:30", status: "shortlisted", note: "W-180 is tight this season — can commit 14 MT only." },
  { id: "QT-0325-02", rfqId: "RFQ-2026-0325", sellerId: "s-alleppey", priceUsdPerMt: 5960, availableMt: 8, incoterm: "EXW Kuttanad", validUntil: "2026-10-11", leadTimeDays: 24, submittedAt: "2026-10-05T11:15:00+05:30", status: "submitted", note: null },
  { id: "QT-0327-01", rfqId: "RFQ-2026-0327", sellerId: "s-ooty", priceUsdPerMt: 312, availableMt: 40, incoterm: "EXW Kotagiri", validUntil: "2026-10-14", leadTimeDays: 16, submittedAt: "2026-10-06T17:30:00+05:30", status: "submitted", note: "Cold-stored, fry colour tested." },
  { id: "QT-0327-02", rfqId: "RFQ-2026-0327", sellerId: "s-krishna", priceUsdPerMt: 298, availableMt: 25, incoterm: "EXW Nashik", validUntil: "2026-10-13", leadTimeDays: 12, submittedAt: "2026-10-07T09:50:00+05:30", status: "submitted", note: null },
  { id: "QT-0304-01", rfqId: "RFQ-2026-0304", sellerId: "s-karnal", priceUsdPerMt: 905, availableMt: 60, incoterm: "EXW Karnal", validUntil: "2026-09-08", leadTimeDays: 18, submittedAt: "2026-08-29T12:00:00+05:30", status: "not-selected", note: "Buyer went with a Turkish origin on price." },
  { id: "QT-0304-02", rfqId: "RFQ-2026-0304", sellerId: "s-krishna", priceUsdPerMt: 920, availableMt: 30, incoterm: "EXW Nashik", validUntil: "2026-09-07", leadTimeDays: 20, submittedAt: "2026-08-29T16:20:00+05:30", status: "not-selected", note: null },
  { id: "QT-0311-05", rfqId: "RFQ-2026-0311", sellerId: "s-krishna", priceUsdPerMt: 1290, availableMt: 8, incoterm: "EXW Nashik", validUntil: "2026-09-18", leadTimeDays: 16, submittedAt: "2026-09-13T14:00:00+05:30", status: "not-selected", note: "Not Royal Delicious — offered an alternate variety, declined on spec." },
  { id: "QT-0318-03", rfqId: "RFQ-2026-0318", sellerId: "s-jalgaon", priceUsdPerMt: 1490, availableMt: 6, incoterm: "EXW Jalgaon", validUntil: "2026-10-06", leadTimeDays: 32, submittedAt: "2026-09-30T08:40:00+05:30", status: "withdrawn", note: "Withdrawn — volume committed elsewhere." },
  { id: "QT-0322-03", rfqId: "RFQ-2026-0322", sellerId: "s-devgad", priceUsdPerMt: 1720, availableMt: 12, incoterm: "EXW Devgad", validUntil: "2026-10-15", leadTimeDays: 64, submittedAt: "2026-10-05T16:05:00+05:30", status: "submitted", note: null },
  { id: "QT-0325-03", rfqId: "RFQ-2026-0325", sellerId: "s-coorg", priceUsdPerMt: 6100, availableMt: 5, incoterm: "EXW Suntikoppa", validUntil: "2026-10-10", leadTimeDays: 26, submittedAt: "2026-10-05T18:30:00+05:30", status: "not-selected", note: "Below the buyer's minimum lot size." },
]

export const quoteById = (id: string): Quote | undefined => QUOTES.find((quote) => quote.id === id)
export const quotesForRfq = (rfqId: string): Quote[] => QUOTES.filter((quote) => quote.rfqId === rfqId)

/* ---- term sheets ---------------------------------------------------
   The clause-by-clause negotiation that sits between a quote and a PO.
   Each clause is separately agreed, disputed or pending — which is what
   lets a KAM see at a glance that the whole sheet is stuck on exactly
   one line rather than "in negotiation".
   ------------------------------------------------------------------ */

export type ClauseStatus = "agreed" | "disputed" | "pending"

export type TermSheetClause = {
  id: string
  label: string
  /** What AMAMA put on the table. */
  amamaPosition: string
  /** What the buyer came back with — null if they simply accepted. */
  buyerPosition: string | null
  status: ClauseStatus
  agreedAt: string | null
  note: string | null
}

export type TermSheetStatus = "draft" | "in-negotiation" | "signed" | "rejected"

export type TermSheet = {
  id: string
  tradeId: string | null
  rfqId: string
  buyerId: string
  kamId: string
  version: number
  status: TermSheetStatus
  openedAt: string
  closedAt: string | null
  clauses: TermSheetClause[]
  /** Set when status is `signed` — the PO issued against it. */
  poId: string | null
}

export const TERM_SHEETS: TermSheet[] = [
  {
    id: "TS-2026-0311", tradeId: "AMT-2026-00418", rfqId: "RFQ-2026-0311",
    buyerId: "b-alnoor", kamId: "u-rohit", version: 3, status: "signed",
    openedAt: "2026-09-14T10:30:00+05:30", closedAt: "2026-09-18T15:20:00+05:30",
    poId: "PO-ALN-2026-0442",
    clauses: [
      { id: "TS-2026-0311-c1", label: "Product & quality spec", amamaPosition: "Royal Delicious, Grade A, 100–125 count, ≥ 60% red blush, firmness ≥ 14 lbf, brix ≥ 12, max 2% defects.", buyerPosition: "Add: no russeting above 10% of surface.", status: "agreed", agreedAt: "2026-09-16T11:20:00+05:30", note: "Russeting tolerance added verbatim. This is the sentence stage 03 and stage 08 both measure against." },
      { id: "TS-2026-0311-c2", label: "Packaging spec", amamaPosition: "9 kg telescopic cartons, 100 cartons per pallet, corner posts, stretch-wrapped, lot QR on every carton.", buyerPosition: null, status: "agreed", agreedAt: "2026-09-15T09:40:00+05:30", note: null },
      { id: "TS-2026-0311-c3", label: "Price & currency", amamaPosition: "USD 1,220 / MT CFR Jebel Ali", buyerPosition: "USD 1,150 / MT CFR Jebel Ali", status: "agreed", agreedAt: "2026-09-17T17:05:00+05:30", note: "Settled at USD 1,180 / MT. Two rounds — the gap closed on the back of the QC evidence pack." },
      { id: "TS-2026-0311-c4", label: "Payment terms", amamaPosition: "30% advance against proforma · 70% at B/L + 30 days", buyerPosition: null, status: "agreed", agreedAt: "2026-09-15T09:40:00+05:30", note: null },
      { id: "TS-2026-0311-c5", label: "Incoterms", amamaPosition: "CFR Jebel Ali (Incoterms 2020)", buyerPosition: null, status: "agreed", agreedAt: "2026-09-15T09:40:00+05:30", note: "CFR, so the buyer insures. Recorded here because at claim time it is the first question." },
      { id: "TS-2026-0311-c6", label: "Delivery window", amamaPosition: "Arrival Jebel Ali between 15 and 31 October 2026", buyerPosition: "Arrival no later than 25 October.", status: "agreed", agreedAt: "2026-09-17T12:10:00+05:30", note: "Held at 15–31 October. Buyer accepted after seeing the sailing schedule and the 6-day transit." },
      { id: "TS-2026-0311-c7", label: "QC arrangement", amamaPosition: "AMAMA field QC at harvest + export QC before stuffing, evidence pack shared with buyer. Buyer inspection on arrival.", buyerPosition: null, status: "agreed", agreedAt: "2026-09-16T11:20:00+05:30", note: null },
      { id: "TS-2026-0311-c8", label: "Dispute resolution", amamaPosition: "DIFC-LCIA arbitration, seat Dubai, English law.", buyerPosition: null, status: "agreed", agreedAt: "2026-09-16T11:20:00+05:30", note: null },
    ],
  },
  {
    id: "TS-2026-0325", tradeId: null, rfqId: "RFQ-2026-0325",
    buyerId: "b-reef", kamId: "u-rohit", version: 2, status: "in-negotiation",
    openedAt: "2026-10-05T10:00:00+05:30", closedAt: null, poId: null,
    clauses: [
      { id: "TS-2026-0325-c1", label: "Product & quality spec", amamaPosition: "W-180 jumbo kernels, moisture ≤ 5%, aflatoxin tested per batch.", buyerPosition: null, status: "agreed", agreedAt: "2026-10-05T14:20:00+05:30", note: null },
      { id: "TS-2026-0325-c2", label: "Packaging spec", amamaPosition: "Vacuum-packed 25 lb tins, 2 tins per carton.", buyerPosition: "10 kg vacuum pouches inside a master carton.", status: "disputed", agreedAt: null, note: "Buyer's retail packing line takes pouches, not tins. Costed at +USD 85/MT — awaiting their acceptance." },
      { id: "TS-2026-0325-c3", label: "Price & currency", amamaPosition: "USD 5,950 / MT CFR Jeddah", buyerPosition: "USD 5,700 / MT CFR Jeddah", status: "disputed", agreedAt: null, note: "Gap of USD 250/MT. Kollam cannot go below 5,820 EXW this season." },
      { id: "TS-2026-0325-c4", label: "Payment terms", amamaPosition: "LC at sight, confirmed by a bank on our list.", buyerPosition: null, status: "agreed", agreedAt: "2026-10-05T14:20:00+05:30", note: null },
      { id: "TS-2026-0325-c5", label: "Incoterms", amamaPosition: "CFR Jeddah (Incoterms 2020)", buyerPosition: null, status: "agreed", agreedAt: "2026-10-05T14:20:00+05:30", note: null },
      { id: "TS-2026-0325-c6", label: "Delivery window", amamaPosition: "Arrival Jeddah between 10 and 25 November 2026", buyerPosition: null, status: "pending", agreedAt: null, note: "Cannot be fixed until the packing question closes — pouches add four days to the run." },
      { id: "TS-2026-0325-c7", label: "QC arrangement", amamaPosition: "Per-batch aflatoxin certificate from an accredited lab, shared before shipment.", buyerPosition: null, status: "agreed", agreedAt: "2026-10-05T14:20:00+05:30", note: null },
      { id: "TS-2026-0325-c8", label: "Dispute resolution", amamaPosition: "Saudi Center for Commercial Arbitration, seat Riyadh.", buyerPosition: null, status: "pending", agreedAt: null, note: null },
    ],
  },
  {
    id: "TS-2026-0304", tradeId: null, rfqId: "RFQ-2026-0304",
    buyerId: "b-najd", kamId: "u-rohit", version: 1, status: "rejected",
    openedAt: "2026-09-01T11:00:00+05:30", closedAt: "2026-09-04T16:30:00+05:30", poId: null,
    clauses: [
      { id: "TS-2026-0304-c1", label: "Product & quality spec", amamaPosition: "Kabuli chickpea 12 mm, machine cleaned, moisture ≤ 12%.", buyerPosition: null, status: "agreed", agreedAt: "2026-09-02T10:00:00+05:30", note: null },
      { id: "TS-2026-0304-c2", label: "Packaging spec", amamaPosition: "50 kg PP bags.", buyerPosition: null, status: "agreed", agreedAt: "2026-09-02T10:00:00+05:30", note: null },
      { id: "TS-2026-0304-c3", label: "Price & currency", amamaPosition: "USD 985 / MT CIF Dammam", buyerPosition: "USD 870 / MT CIF Dammam", status: "disputed", agreedAt: null, note: "Buyer awarded to a Turkish origin at 880. Below our floor — walked away rather than buy the volume." },
      { id: "TS-2026-0304-c4", label: "Payment terms", amamaPosition: "LC at sight", buyerPosition: "60 days from B/L", status: "disputed", agreedAt: null, note: "Unsecured 60-day exposure on a new account. Declined." },
      { id: "TS-2026-0304-c5", label: "Incoterms", amamaPosition: "CIF Dammam (Incoterms 2020)", buyerPosition: null, status: "agreed", agreedAt: "2026-09-02T10:00:00+05:30", note: null },
      { id: "TS-2026-0304-c6", label: "Delivery window", amamaPosition: "Arrival Dammam 20 September – 5 October 2026", buyerPosition: null, status: "pending", agreedAt: null, note: null },
      { id: "TS-2026-0304-c7", label: "QC arrangement", amamaPosition: "Pre-shipment inspection by SGS at buyer's cost.", buyerPosition: "At seller's cost.", status: "disputed", agreedAt: null, note: null },
      { id: "TS-2026-0304-c8", label: "Dispute resolution", amamaPosition: "SCCA, seat Riyadh.", buyerPosition: null, status: "pending", agreedAt: null, note: null },
    ],
  },
]

export const termSheetById = (id: string): TermSheet | undefined =>
  TERM_SHEETS.find((sheet) => sheet.id === id)

/**
 * Purchase orders. The legal nuance that matters: a PO that matches the
 * agreed term sheet is instant acceptance and needs no confirmation; a PO
 * that changes anything is a counter-offer and stays pending until the
 * seller side confirms it.
 */
export type PoStatus = "auto-accepted" | "pending-confirmation" | "confirmed" | "cancelled"

export type PurchaseOrder = {
  id: string
  tradeId: string | null
  termSheetId: string | null
  buyerId: string
  kamId: string
  issuedAt: string
  qtyMt: number
  priceUsdPerMt: number
  incoterm: string
  paymentTerms: string
  deliveryWindow: [string, string]
  status: PoStatus
  /** Populated when the PO departed from the agreed term sheet — this is
   *  what turns acceptance into a counter-offer. */
  deviations: string[]
  confirmedAt: string | null
  confirmedBy: string | null
}

export const PURCHASE_ORDERS: PurchaseOrder[] = [
  { id: "PO-ALN-2026-0442", tradeId: "AMT-2026-00418", termSheetId: "TS-2026-0311", buyerId: "b-alnoor", kamId: "u-rohit", issuedAt: "2026-09-18T12:40:00+05:30", qtyMt: 20, priceUsdPerMt: 1180, incoterm: "CFR Jebel Ali", paymentTerms: "30% advance · 70% at B/L + 30 days", deliveryWindow: ["2026-10-15", "2026-10-31"], status: "auto-accepted", deviations: [], confirmedAt: "2026-09-18T12:40:00+05:30", confirmedBy: "system" },
  { id: "PO-BRI-2026-1180", tradeId: "AMT-2026-00419", termSheetId: null, buyerId: "b-britannia", kamId: "u-fatima", issuedAt: "2026-10-04T16:20:00+05:30", qtyMt: 12, priceUsdPerMt: 1480, incoterm: "CIF Felixstowe", paymentTerms: "50% advance · 50% at B/L", deliveryWindow: ["2026-11-20", "2026-12-05"], status: "confirmed", deviations: [], confirmedAt: "2026-10-05T10:50:00+05:30", confirmedBy: "u-fatima" },
  { id: "PO-REE-2026-0876", tradeId: "AMT-2026-00421", termSheetId: null, buyerId: "b-reef", kamId: "u-rohit", issuedAt: "2026-09-28T14:00:00+05:30", qtyMt: 240, priceUsdPerMt: 1210, incoterm: "CFR Jeddah", paymentTerms: "LC at sight", deliveryWindow: ["2026-11-01", "2026-11-15"], status: "confirmed", deviations: [], confirmedAt: "2026-09-29T09:30:00+05:30", confirmedBy: "u-rohit" },
  { id: "PO-VAN-2026-0331", tradeId: "AMT-2026-00423", termSheetId: null, buyerId: "b-vanderveen", kamId: "u-fatima", issuedAt: "2026-09-23T11:15:00+05:30", qtyMt: 18, priceUsdPerMt: 1320, incoterm: "CIF Rotterdam", paymentTerms: "30% advance · 70% at B/L + 45 days", deliveryWindow: ["2026-10-25", "2026-11-08"], status: "confirmed", deviations: [], confirmedAt: "2026-09-24T10:05:00+05:30", confirmedBy: "u-fatima" },
  { id: "PO-MOS-2026-0117", tradeId: "AMT-2026-00425", termSheetId: null, buyerId: "b-moskva", kamId: "u-fatima", issuedAt: "2026-09-19T13:30:00+05:30", qtyMt: 16, priceUsdPerMt: 1650, incoterm: "CFR St Petersburg", paymentTerms: "100% against scanned B/L", deliveryWindow: ["2026-10-20", "2026-11-02"], status: "confirmed", deviations: [], confirmedAt: "2026-09-20T08:45:00+05:30", confirmedBy: "u-fatima" },
  { id: "PO-GUL-2026-0559", tradeId: "AMT-2026-00427", termSheetId: null, buyerId: "b-gulfstar", kamId: "u-rohit", issuedAt: "2026-09-25T15:00:00+05:30", qtyMt: 26, priceUsdPerMt: 495, incoterm: "CIF Jebel Ali", paymentTerms: "30% advance · 70% at B/L + 30 days", deliveryWindow: ["2026-10-18", "2026-10-28"], status: "confirmed", deviations: [], confirmedAt: "2026-09-26T11:20:00+05:30", confirmedBy: "u-rohit" },
  { id: "PO-ALN-2026-0451", tradeId: "AMT-2026-00429", termSheetId: null, buyerId: "b-alnoor", kamId: "u-rohit", issuedAt: "2026-09-21T10:00:00+05:30", qtyMt: 22, priceUsdPerMt: 660, incoterm: "CFR Jebel Ali", paymentTerms: "30% advance · 70% at B/L + 30 days", deliveryWindow: ["2026-10-22", "2026-11-05"], status: "confirmed", deviations: [], confirmedAt: "2026-09-22T09:15:00+05:30", confirmedBy: "u-rohit" },
  { id: "PO-REE-2026-0891", tradeId: null, termSheetId: "TS-2026-0325", buyerId: "b-reef", kamId: "u-rohit", issuedAt: "2026-10-07T11:30:00+05:30", qtyMt: 14, priceUsdPerMt: 5700, incoterm: "CFR Jeddah", paymentTerms: "LC at sight", deliveryWindow: ["2026-11-10", "2026-11-25"], status: "pending-confirmation", deviations: ["Price USD 5,700/MT against USD 5,950/MT on the open term sheet", "Packing changed to 10 kg vacuum pouches — not yet agreed"], confirmedAt: null, confirmedBy: null },
]

export const poById = (id: string): PurchaseOrder | undefined =>
  PURCHASE_ORDERS.find((po) => po.id === id)

/* ════════════════════════════════════════════════════════════════════
   CONVERSATIONS
   ════════════════════════════════════════════════════════════════════ */

export type MessageAttachment = {
  kind: "spec" | "photo" | "term-sheet" | "quote" | "po" | "document" | "report" | "booking"
  label: string
  /** Resolves into the peek panel when the chip is clicked. */
  ref: EntityRef | null
}

export type Message = {
  id: string
  conversationId: string
  authorId: string
  authorKind: PartyKind | "system"
  at: string
  body: string
  attachments: MessageAttachment[]
}

export type ConversationKind = "buyer-kam" | "kam-seller" | "buyer-seller" | "internal"

export type Conversation = {
  id: string
  kind: ConversationKind
  subject: string
  tradeId: string | null
  rfqId: string | null
  /** Ids of everyone on the thread — internal users, buyers, sellers. */
  participantIds: string[]
  startedAt: string
  lastMessageAt: string
  unread: number
  pinned: boolean
}

export const CONVERSATIONS: Conversation[] = [
  { id: "CONV-0418-BK", kind: "buyer-kam", subject: "Royal Delicious · 20 MT CFR Jebel Ali", tradeId: "AMT-2026-00418", rfqId: "RFQ-2026-0311", participantIds: ["b-alnoor", "u-rohit", "u-ananya"], startedAt: "2026-09-12T09:05:00+05:30", lastMessageAt: "2026-10-07T16:32:00+05:30", unread: 2, pinned: true },
  { id: "CONV-0418-KS", kind: "kam-seller", subject: "Kotkhai & Jubbal allocation · AMT-2026-00418", tradeId: "AMT-2026-00418", rfqId: "RFQ-2026-0311", participantIds: ["u-rohit", "u-devendra", "s-tilak", "s-suresh"], startedAt: "2026-09-12T14:00:00+05:30", lastMessageAt: "2026-10-06T18:10:00+05:30", unread: 0, pinned: false },
  { id: "CONV-0418-OPS", kind: "internal", subject: "Gate-in cut-off · MSKU 784123-6", tradeId: "AMT-2026-00418", rfqId: null, participantIds: ["u-rohit", "u-harpreet", "u-imran", "u-ananya"], startedAt: "2026-10-06T09:00:00+05:30", lastMessageAt: "2026-10-07T16:40:00+05:30", unread: 4, pinned: true },
  { id: "CONV-0325-BK", kind: "buyer-kam", subject: "W-180 cashew · packing and price", tradeId: null, rfqId: "RFQ-2026-0325", participantIds: ["b-reef", "u-rohit"], startedAt: "2026-10-04T10:30:00+05:30", lastMessageAt: "2026-10-07T12:05:00+05:30", unread: 1, pinned: false },
  { id: "CONV-0419-BK", kind: "buyer-kam", subject: "Alphonso · 12 MT CIF Felixstowe", tradeId: "AMT-2026-00419", rfqId: "RFQ-2026-0318", participantIds: ["b-britannia", "u-fatima"], startedAt: "2026-09-28T11:30:00+05:30", lastMessageAt: "2026-10-06T14:20:00+05:30", unread: 0, pinned: false },
  { id: "CONV-0421-BK", kind: "buyer-kam", subject: "Basmati 1121 · 240 MT CFR Jeddah", tradeId: "AMT-2026-00421", rfqId: null, participantIds: ["b-reef", "u-rohit"], startedAt: "2026-09-26T10:00:00+05:30", lastMessageAt: "2026-10-05T16:45:00+05:30", unread: 0, pinned: false },
  { id: "CONV-0423-KS", kind: "kam-seller", subject: "Dindori pomegranate · field QC", tradeId: "AMT-2026-00423", rfqId: null, participantIds: ["u-fatima", "u-meera", "s-krishna"], startedAt: "2026-10-05T08:30:00+05:30", lastMessageAt: "2026-10-07T15:10:00+05:30", unread: 3, pinned: false },
  { id: "CONV-0425-BK", kind: "buyer-kam", subject: "Thompson Seedless · pickup schedule", tradeId: "AMT-2026-00425", rfqId: null, participantIds: ["b-moskva", "u-fatima"], startedAt: "2026-10-03T12:00:00+05:30", lastMessageAt: "2026-10-07T11:40:00+05:30", unread: 0, pinned: false },
  { id: "CONV-0427-KS", kind: "kam-seller", subject: "Jalgaon Nendran · inbound reconciliation", tradeId: "AMT-2026-00427", rfqId: null, participantIds: ["u-rohit", "u-pradeep", "s-jalgaon"], startedAt: "2026-10-06T07:20:00+05:30", lastMessageAt: "2026-10-07T16:05:00+05:30", unread: 1, pinned: false },
  { id: "CONV-0429-OPS", kind: "internal", subject: "CR-03 excursion · Kinnow quarantine", tradeId: "AMT-2026-00429", rfqId: null, participantIds: ["u-arun", "u-sanjay", "u-rohit"], startedAt: "2026-10-07T09:45:00+05:30", lastMessageAt: "2026-10-07T16:20:00+05:30", unread: 2, pinned: true },
  { id: "CONV-0431-BK", kind: "buyer-kam", subject: "Guntur Sannam · reefer booking", tradeId: "AMT-2026-00431", rfqId: null, participantIds: ["b-vanderveen", "u-fatima", "u-harpreet"], startedAt: "2026-10-02T13:00:00+05:30", lastMessageAt: "2026-10-07T10:30:00+05:30", unread: 0, pinned: false },
  { id: "CONV-0435-OPS", kind: "internal", subject: "Certificate of origin blocked · AMT-2026-00435", tradeId: "AMT-2026-00435", rfqId: null, participantIds: ["u-imran", "u-fatima", "u-harpreet"], startedAt: "2026-10-06T11:00:00+05:30", lastMessageAt: "2026-10-07T14:50:00+05:30", unread: 3, pinned: false },
]

export const conversationById = (id: string): Conversation | undefined =>
  CONVERSATIONS.find((conversation) => conversation.id === id)

const msg = (
  id: string,
  conversationId: string,
  authorId: string,
  authorKind: PartyKind | "system",
  at: string,
  body: string,
  attachments: MessageAttachment[] = []
): Message => ({ id, conversationId, authorId, authorKind, at, body, attachments })

/** The full commercial arc on the primary trade: RFQ in, clarification,
 *  quotes back, term sheet opened, three clauses fought over, term sheet
 *  signed, PO issued and auto-accepted, then the trade running. */
const PRIMARY_THREAD: Message[] = [
  msg("m-0418-01", "CONV-0418-BK", "b-alnoor", "buyer", "2026-09-12T09:05:00+05:30", "Good morning Rohit. We need one 40ft reefer of Royal Delicious for the second half of October — Grade A, 100–125 count, CFR Jebel Ali. Can Himachal cover that window?", [{ kind: "spec", label: "Al Noor buying spec v1.pdf", ref: null }]),
  msg("m-0418-02", "CONV-0418-BK", "u-rohit", "internal", "2026-09-12T09:22:00+05:30", "Morning Khalid. Yes — the 2,100 m blocks in Kotkhai and Jubbal pick 26–30 September, which lands perfectly for a mid-October arrival. Raising the RFQ to our growers now.", [{ kind: "quote", label: "RFQ-2026-0311", ref: { kind: "rfq", id: "RFQ-2026-0311" } }]),
  msg("m-0418-03", "CONV-0418-BK", "u-rohit", "internal", "2026-09-12T09:24:00+05:30", "One thing before I quote: your spec says Grade A but doesn't put numbers on blush, firmness or defect tolerance. I'd rather we fix those now than argue about them in Dubai in five weeks.", []),
  msg("m-0418-04", "CONV-0418-BK", "b-alnoor", "buyer", "2026-09-12T10:40:00+05:30", "Fair. Minimum 60% red blush, firmness at least 14 lbf, brix 12 or above. Defects under 2%.", []),
  msg("m-0418-05", "CONV-0418-BK", "u-rohit", "internal", "2026-09-12T10:52:00+05:30", "Noted, and I'll write those into the term sheet as measurable tolerances rather than prose — our field QC app checks against them directly, so you'll get the actual numbers per lot, not an adjective.", []),
  msg("m-0418-06", "CONV-0418-BK", "b-alnoor", "buyer", "2026-09-12T11:05:00+05:30", "That's the part we like. Last season's supplier sent 'Grade A' and we spent three weeks arguing what that meant.", []),
  msg("m-0418-07", "CONV-0418-BK", "u-rohit", "internal", "2026-09-13T16:30:00+05:30", "Four growers have come back — 21 MT available across Kotkhai and Jubbal. I'm deliberately spreading the allocation across two altitude bands so a hailstorm in one valley doesn't take out your whole container.", [{ kind: "quote", label: "4 quotes received", ref: { kind: "rfq", id: "RFQ-2026-0311" } }]),
  msg("m-0418-08", "CONV-0418-BK", "u-rohit", "internal", "2026-09-13T16:34:00+05:30", "Opening a term sheet so we can settle this clause by clause rather than in a chain of emails.", [{ kind: "term-sheet", label: "TS-2026-0311 v1", ref: { kind: "termSheet", id: "TS-2026-0311" } }]),
  msg("m-0418-09", "CONV-0418-BK", "b-alnoor", "buyer", "2026-09-14T08:15:00+05:30", "Reviewed. Spec, packaging, payment and incoterms are fine. Two problems: the price and the delivery window.", []),
  msg("m-0418-10", "CONV-0418-BK", "b-alnoor", "buyer", "2026-09-14T08:17:00+05:30", "USD 1,220 is above where we are. We're seeing 1,150 landed from other origins. And we need arrival by 25 October, not 31 — our promotion starts the 27th.", []),
  msg("m-0418-11", "CONV-0418-BK", "u-rohit", "internal", "2026-09-14T11:40:00+05:30", "Understood on both. Let me take the window first because it's the easier one — the MSC sailing out of Mundra is a 6-day transit, so a 9 October departure puts you alongside on the 15th. Ten days of headroom against your promotion.", [{ kind: "booking", label: "Mundra → Jebel Ali sailing schedule", ref: null }]),
  msg("m-0418-12", "CONV-0418-BK", "u-rohit", "internal", "2026-09-14T11:44:00+05:30", "Holding 15–31 October in the sheet gives us a documented backup sailing on the 12th if anything slips. If I narrow it to the 25th I lose that fallback and you carry the roll risk, not me.", []),
  msg("m-0418-13", "CONV-0418-BK", "b-alnoor", "buyer", "2026-09-14T13:20:00+05:30", "Put like that, keep the wider window.", []),
  msg("m-0418-14", "CONV-0418-BK", "u-rohit", "internal", "2026-09-15T09:40:00+05:30", "Marking packaging, payment and incoterms agreed. Three clauses left open: price, delivery window and the spec addition you mentioned on the call.", [{ kind: "term-sheet", label: "TS-2026-0311 · 5 of 8 agreed", ref: { kind: "termSheet", id: "TS-2026-0311" } }]),
  msg("m-0418-15", "CONV-0418-BK", "b-alnoor", "buyer", "2026-09-15T14:10:00+05:30", "The spec addition: no russeting above 10% of surface. We've been burned on that specifically.", []),
  msg("m-0418-16", "CONV-0418-BK", "u-rohit", "internal", "2026-09-16T11:20:00+05:30", "Added verbatim. Spec and QC arrangement now agreed, along with dispute resolution — DIFC-LCIA, seat Dubai, which I assume is uncontroversial.", [{ kind: "term-sheet", label: "TS-2026-0311 v2", ref: { kind: "termSheet", id: "TS-2026-0311" } }]),
  msg("m-0418-17", "CONV-0418-BK", "b-alnoor", "buyer", "2026-09-16T11:45:00+05:30", "It is. So we're down to price.", []),
  msg("m-0418-18", "CONV-0418-BK", "u-rohit", "internal", "2026-09-16T15:30:00+05:30", "We are. Let me put something in front of you rather than just defend the number.", []),
  msg("m-0418-19", "CONV-0418-BK", "u-rohit", "internal", "2026-09-16T15:36:00+05:30", "This is the evidence pack you'd get on every lot: sample measurements against your tolerances, geotagged photos, the inspector's name, and the full temperature curve from harvest to your door. If a carton is wrong in Dubai you'll know which farm block it came from in two clicks.", [{ kind: "report", label: "Sample QC evidence pack — 2025 season", ref: null }]),
  msg("m-0418-20", "CONV-0418-BK", "b-alnoor", "buyer", "2026-09-17T09:10:00+05:30", "I've shown this to our QA. The traceability is worth something to us — it's the survey cost we don't pay. But 1,220 is still too far.", []),
  msg("m-0418-21", "CONV-0418-BK", "u-rohit", "internal", "2026-09-17T10:05:00+05:30", "Then let's split it properly rather than meet in a lazy middle. 1,180 CFR, and I'll hold the spread against the growers rather than passing a squeeze down to them mid-harvest.", []),
  msg("m-0418-22", "CONV-0418-BK", "u-ananya", "internal", "2026-09-17T10:30:00+05:30", "Approved from my side at 1,180 — that clears our floor on a CFR basis with the freight we've booked.", []),
  msg("m-0418-23", "CONV-0418-BK", "b-alnoor", "buyer", "2026-09-17T17:05:00+05:30", "Agreed at 1,180. Close it.", []),
  msg("m-0418-24", "CONV-0418-BK", "u-rohit", "internal", "2026-09-17T17:12:00+05:30", "All eight clauses agreed. Term sheet is locked — you can raise the PO against it whenever you're ready.", [{ kind: "term-sheet", label: "TS-2026-0311 · 8 of 8 agreed", ref: { kind: "termSheet", id: "TS-2026-0311" } }]),
  msg("m-0418-25", "CONV-0418-BK", "b-alnoor", "buyer", "2026-09-18T12:40:00+05:30", "PO raised. Matches the sheet exactly.", [{ kind: "po", label: "PO-ALN-2026-0442", ref: { kind: "po", id: "PO-ALN-2026-0442" } }]),
  msg("m-0418-26", "CONV-0418-BK", "system", "system", "2026-09-18T12:40:30+05:30", "PO-ALN-2026-0442 matched the agreed term sheet on every clause and was auto-accepted. No seller confirmation required.", [{ kind: "po", label: "PO-ALN-2026-0442 · auto-accepted", ref: { kind: "po", id: "PO-ALN-2026-0442" } }]),
  msg("m-0418-27", "CONV-0418-BK", "system", "system", "2026-09-18T15:20:00+05:30", "Trade contract signed. Transaction ID AMT-2026-00418 issued. Demand pushed to Procurement.", [{ kind: "document", label: "AMT-2026-00418", ref: { kind: "trade", id: "AMT-2026-00418" } }]),
  msg("m-0418-28", "CONV-0418-BK", "u-rohit", "internal", "2026-09-18T15:35:00+05:30", "Signed and live. You'll now get every stage on this trade in your portal automatically — I won't be emailing you status updates.", []),
  msg("m-0418-29", "CONV-0418-BK", "u-rohit", "internal", "2026-09-28T13:05:00+05:30", "Harvest started this morning. First field QC is in: 82% in the 100–125 band, firmness 15.2, brix 12.6 — all comfortably inside your tolerances.", [{ kind: "report", label: "QC-00418-01 · field QC", ref: { kind: "document", id: "DOC-00418-field-qc-report" } }]),
  msg("m-0418-30", "CONV-0418-BK", "u-rohit", "internal", "2026-09-28T13:09:00+05:30", "One thing to flag now rather than at the end: 6% of the Kotkhai block shows sunburn, against your 2% tolerance. The inspector has marked it conditional and we'll grade the sunburnt fruit out at packing.", [{ kind: "photo", label: "Sunburn — south-facing block (6 photos)", ref: { kind: "lot", id: "LOT-HP-APL-2026-00112" } }]),
  msg("m-0418-31", "CONV-0418-BK", "b-alnoor", "buyer", "2026-09-28T16:20:00+05:30", "Appreciate the early warning. What does that do to the quantity?", []),
  msg("m-0418-32", "CONV-0418-BK", "u-rohit", "internal", "2026-09-28T16:38:00+05:30", "Roughly 0.6 MT comes out. I'll confirm the exact number at export QC — I'd rather tell you 19.4 now and ship 19.4 than promise 20 and short you on the invoice.", []),
  msg("m-0418-33", "CONV-0418-BK", "b-alnoor", "buyer", "2026-09-28T16:50:00+05:30", "Fine. Invoice the actual shipped weight.", []),
  msg("m-0418-34", "CONV-0418-BK", "u-rohit", "internal", "2026-10-05T18:40:00+05:30", "Export QC done. One pallet failed on count-size drift and was swapped for a buffer pallet. Final: 20 pallets, 2,000 cartons, 19,400 kg net — the 19.4 we flagged on the 28th.", [{ kind: "report", label: "Export QC certificate", ref: { kind: "document", id: "DOC-00418-export-qc-certificate" } }]),
  msg("m-0418-35", "CONV-0418-BK", "u-rohit", "internal", "2026-10-06T18:00:00+05:30", "Container sealed — MSKU 784123-6, seal SL-0099412. Pulp temperature at three pallet positions: 0.7, 0.9 and 1.1 °C. VGM filed.", [{ kind: "document", label: "Stuffing report", ref: { kind: "container", id: "MSKU 784123-6" } }]),
  msg("m-0418-36", "CONV-0418-BK", "b-alnoor", "buyer", "2026-10-07T08:30:00+05:30", "Good. Still on the MSC Aurora for the 9th?", []),
  msg("m-0418-37", "CONV-0418-BK", "u-rohit", "internal", "2026-10-07T08:45:00+05:30", "Yes. LEO came through yesterday evening, container left the pack-house at 05:00 and is running to Mundra now. Gate-in cut-off is 18:00 today.", []),
  msg("m-0418-38", "CONV-0418-BK", "u-rohit", "internal", "2026-10-07T15:58:00+05:30", "Container is at Mundra, plugged into terminal power at 16:20. Gate-in is being processed now — I'll confirm the moment the terminal accepts it.", []),
  msg("m-0418-39", "CONV-0418-BK", "b-alnoor", "buyer", "2026-10-07T16:25:00+05:30", "Cutting it fine. Anything I should be planning around?", []),
  msg("m-0418-40", "CONV-0418-BK", "u-rohit", "internal", "2026-10-07T16:32:00+05:30", "Ninety minutes of headroom and the paperwork is all clear, so no. If gate-in were to fail we have the CMA CGM sailing on the 12th already held — that's an 8-day transit, so you'd still be inside the delivery window. You won't need it.", [{ kind: "booking", label: "Backup sailing · CMACGM-8890344", ref: { kind: "container", id: "MSKU 784123-6" } }]),
]

const OTHER_THREADS: Message[] = [
  // CONV-0418-KS — KAM ↔ growers
  msg("m-ks-01", "CONV-0418-KS", "u-rohit", "internal", "2026-09-12T14:00:00+05:30", "Tilak ji, Suresh ji — Al Noor wants 20 MT of Royal Delicious for a mid-October arrival. Spec is Grade A, 100–125 count, firmness 14 lbf minimum. What can each of you hold?", [{ kind: "spec", label: "RFQ-2026-0311", ref: { kind: "rfq", id: "RFQ-2026-0311" } }]),
  msg("m-ks-02", "CONV-0418-KS", "s-tilak", "seller", "2026-09-12T16:40:00+05:30", "The 2,100 m block picks 26–30 September. I can hold 6 MT comfortably. Price 1,165 EXW.", [{ kind: "quote", label: "QT-0311-01", ref: { kind: "quote", id: "QT-0311-01" } }]),
  msg("m-ks-03", "CONV-0418-KS", "s-suresh", "seller", "2026-09-12T18:05:00+05:30", "5 MT from Jubbal at 1,150 EXW. Same window.", [{ kind: "quote", label: "QT-0311-02", ref: { kind: "quote", id: "QT-0311-02" } }]),
  msg("m-ks-04", "CONV-0418-KS", "u-devendra", "internal", "2026-09-13T10:15:00+05:30", "Taking 5 MT each from four growers across both altitude bands rather than 10+10 from two. Costs a little more in collection runs, protects the whole container against one hailstorm.", []),
  msg("m-ks-05", "CONV-0418-KS", "u-devendra", "internal", "2026-09-14T09:00:00+05:30", "Pushpa ji and Mahesh ji are new to the platform — KYC, land records and bank details need to be captured before the pickers go out, or we cannot pay them at settlement.", []),
  msg("m-ks-06", "CONV-0418-KS", "u-meera", "internal", "2026-09-28T11:30:00+05:30", "Field QC done on the Kotkhai picking. Numbers are good but there's 6% sunburn on the south-facing rows — above the 2% the buyer specified. Marking it conditional with a note to grade out at packing.", [{ kind: "report", label: "QC-00418-01", ref: { kind: "lot", id: "LOT-HP-APL-2026-00112" } }]),
  msg("m-ks-07", "CONV-0418-KS", "s-tilak", "seller", "2026-09-28T12:10:00+05:30", "That block took the worst of the September sun. Understood — better to pull it out now than have it rejected in Dubai.", []),
  msg("m-ks-08", "CONV-0418-KS", "u-rohit", "internal", "2026-10-06T18:10:00+05:30", "Final shipped weight is 19,400 kg against 20,000 contracted. The 0.6 MT gap is the sunburn grade-out, documented against lot 00112 — settlement will reflect accepted quantity, not contracted.", [{ kind: "report", label: "Export QC certificate", ref: { kind: "document", id: "DOC-00418-export-qc-certificate" } }]),

  // CONV-0418-OPS — the live gate-in thread
  msg("m-ops-01", "CONV-0418-OPS", "u-imran", "internal", "2026-10-06T09:00:00+05:30", "Phytosanitary inspection is booked for today, one day ahead of the cut-off. That's the only document on this trade whose timing we don't control.", [{ kind: "document", label: "Phytosanitary certificate", ref: { kind: "document", id: "DOC-00418-phytosanitary-certificate" } }]),
  msg("m-ops-02", "CONV-0418-OPS", "u-imran", "internal", "2026-10-06T14:30:00+05:30", "Inspector attended, certificate issued. Filing the shipping bill now with drawback and incentive claims attached.", []),
  msg("m-ops-03", "CONV-0418-OPS", "u-imran", "internal", "2026-10-06T16:10:00+05:30", "Customs raised one query — invoice says 19,400 kg net but the VGM implies a different tare. Sending the stuffing report and the container tare plate.", []),
  msg("m-ops-04", "CONV-0418-OPS", "u-imran", "internal", "2026-10-06T19:05:00+05:30", "Query answered in three hours. LEO issued this evening. Had that landed on a Friday night we'd have rolled a week.", [{ kind: "document", label: "Let Export Order", ref: { kind: "document", id: "DOC-00418-let-export-order-leo" } }]),
  msg("m-ops-05", "CONV-0418-OPS", "u-harpreet", "internal", "2026-10-07T05:10:00+05:30", "Container away from the pack-house at 05:00 on a genset trailer. ETA Mundra around 15:30, cut-off 18:00.", []),
  msg("m-ops-06", "CONV-0418-OPS", "u-harpreet", "internal", "2026-10-07T15:45:00+05:30", "At Mundra 15:40. Genset off at 15:52.", []),
  msg("m-ops-07", "CONV-0418-OPS", "u-arun", "internal", "2026-10-07T16:05:00+05:30", "Flagging the gap — genset off at 15:52, no terminal power yet. Nothing is cooling that box and nothing is recording it. This is the blind spot I keep raising.", []),
  msg("m-ops-08", "CONV-0418-OPS", "u-harpreet", "internal", "2026-10-07T16:22:00+05:30", "Plugged into terminal power at 16:20. 28 minutes unplugged, peak 6.4 °C. Logged as an excursion.", [{ kind: "report", label: "EXC-00418-02", ref: { kind: "trade", id: "AMT-2026-00418" } }]),
  msg("m-ops-09", "CONV-0418-OPS", "u-arun", "internal", "2026-10-07T16:30:00+05:30", "0.8 days of shelf-life debit. Irrelevant on apples with 100 days of budget — but on the mango trade that same 28 minutes would have been a conversation with the buyer.", []),
  msg("m-ops-10", "CONV-0418-OPS", "u-ananya", "internal", "2026-10-07T16:40:00+05:30", "Ninety minutes to cut-off. Harpreet, ping this thread the second the terminal accepts — Rohit is holding the buyer.", []),

  // CONV-0325-BK — live term sheet negotiation
  msg("m-325-01", "CONV-0325-BK", "b-reef", "buyer", "2026-10-04T10:30:00+05:30", "Aziz here. We need 14 MT of W-180 for November. Same quality as the last two containers.", []),
  msg("m-325-02", "CONV-0325-BK", "u-rohit", "internal", "2026-10-04T11:15:00+05:30", "Raising the RFQ now. W-180 is tight this season so I'd rather lock Kollam early than shop it around and lose the volume.", [{ kind: "quote", label: "RFQ-2026-0325", ref: { kind: "rfq", id: "RFQ-2026-0325" } }]),
  msg("m-325-03", "CONV-0325-BK", "u-rohit", "internal", "2026-10-05T10:00:00+05:30", "Term sheet opened. Spec, payment, incoterms and QC are straightforward — I've pre-agreed those. Two open questions: packing and price.", [{ kind: "term-sheet", label: "TS-2026-0325 v1", ref: { kind: "termSheet", id: "TS-2026-0325" } }]),
  msg("m-325-04", "CONV-0325-BK", "b-reef", "buyer", "2026-10-06T09:20:00+05:30", "Our retail line takes 10 kg vacuum pouches now, not 25 lb tins. And we need to be at 5,700.", []),
  msg("m-325-05", "CONV-0325-BK", "u-rohit", "internal", "2026-10-06T15:40:00+05:30", "Pouches are doable but they add USD 85/MT and four days to the packing run — which pushes the delivery window, so I can't agree that clause until the packing one closes. On price, Kollam is at 5,820 EXW; 5,700 CFR is below our landed cost.", []),
  msg("m-325-06", "CONV-0325-BK", "b-reef", "buyer", "2026-10-07T11:30:00+05:30", "Raising the PO at 5,700 with pouches. See if you can make it work.", [{ kind: "po", label: "PO-REE-2026-0891", ref: { kind: "po", id: "PO-REE-2026-0891" } }]),
  msg("m-325-07", "CONV-0325-BK", "system", "system", "2026-10-07T11:30:30+05:30", "PO-REE-2026-0891 departs from the open term sheet on 2 clauses. Treated as a counter-offer — pending confirmation, not accepted.", [{ kind: "po", label: "PO-REE-2026-0891 · pending confirmation", ref: { kind: "po", id: "PO-REE-2026-0891" } }]),
  msg("m-325-08", "CONV-0325-BK", "u-rohit", "internal", "2026-10-07T12:05:00+05:30", "Flagging clearly: that PO is a counter-offer, not an order — nothing is committed until we confirm it. I'm taking the price to Ananya today. The pouch cost I can absorb half of; the other half has to move.", []),

  // Remaining threads — shorter records
  msg("m-419-01", "CONV-0419-BK", "b-britannia", "buyer", "2026-09-28T11:30:00+05:30", "Eleanor here. 12 MT Alphonso for the pre-Christmas window, GlobalGAP certified, EU MRL compliance non-negotiable.", []),
  msg("m-419-02", "CONV-0419-BK", "u-fatima", "internal", "2026-09-28T17:10:00+05:30", "Devgad can cover it and their GlobalGAP runs to March 2027. Residue panel ordered now rather than nearer the date — the lab takes days and it is the one thing that will hold a UK entry.", [{ kind: "quote", label: "QT-0318-01", ref: { kind: "quote", id: "QT-0318-01" } }]),
  msg("m-419-03", "CONV-0419-BK", "b-britannia", "buyer", "2026-10-04T16:20:00+05:30", "PO raised against your quote.", [{ kind: "po", label: "PO-BRI-2026-1180", ref: { kind: "po", id: "PO-BRI-2026-1180" } }]),
  msg("m-419-04", "CONV-0419-BK", "u-fatima", "internal", "2026-10-06T14:20:00+05:30", "Confirmed and countersigned. Contract goes to Vikram for signature today, then Procurement picks it up.", [{ kind: "document", label: "AMT-2026-00419", ref: { kind: "trade", id: "AMT-2026-00419" } }]),

  msg("m-421-01", "CONV-0421-BK", "b-reef", "buyer", "2026-09-26T10:00:00+05:30", "240 MT of 1121 steam for November, LC at sight as usual.", []),
  msg("m-421-02", "CONV-0421-BK", "u-rohit", "internal", "2026-09-28T14:00:00+05:30", "Karnal confirmed. PO raised and accepted — contract signed yesterday.", [{ kind: "po", label: "PO-REE-2026-0876", ref: { kind: "po", id: "PO-REE-2026-0876" } }]),
  msg("m-421-03", "CONV-0421-BK", "u-rohit", "internal", "2026-10-05T16:45:00+05:30", "Procurement is confirming mill allocation against the November window — I'll have the harvest-to-mill schedule by Thursday.", []),

  msg("m-423-01", "CONV-0423-KS", "u-fatima", "internal", "2026-10-05T08:30:00+05:30", "Bhausaheb ji, the Dindori picking needs field QC logged before we can create lots. Vanderveen's spec is tight on sunscald — max 1%.", []),
  msg("m-423-02", "CONV-0423-KS", "s-krishna", "seller", "2026-10-06T07:45:00+05:30", "Picking finishes today. Inspector can come tomorrow morning.", []),
  msg("m-423-03", "CONV-0423-KS", "u-meera", "internal", "2026-10-07T15:10:00+05:30", "I'm at Dindori now. Aril colour is excellent but I'm seeing sunscald above the 1% EU tolerance on two blocks. Logging conditional and pulling a wider sample before I sign anything.", [{ kind: "photo", label: "Sunscald sample — blocks 4 and 7", ref: null }]),

  msg("m-425-01", "CONV-0425-BK", "u-fatima", "internal", "2026-10-03T12:00:00+05:30", "Dmitri, the Thompson blocks are ready. Pickup truck is scheduled for tonight so we hit the pack-house tomorrow morning.", []),
  msg("m-425-02", "CONV-0425-BK", "b-moskva", "buyer", "2026-10-06T10:20:00+05:30", "SO₂ pads confirmed? Last shipment arrived without them and we lost a pallet to botrytis.", []),
  msg("m-425-03", "CONV-0425-BK", "u-fatima", "internal", "2026-10-07T11:40:00+05:30", "Confirmed and written into the packing spec this time, so it's checked at export QC rather than assumed.", []),

  msg("m-427-01", "CONV-0427-KS", "s-jalgaon", "seller", "2026-10-06T07:20:00+05:30", "Truck left Raver at 04:00 with 26.2 MT on the weighbridge slip.", []),
  msg("m-427-02", "CONV-0427-KS", "u-pradeep", "internal", "2026-10-07T16:05:00+05:30", "Received 25.9 MT against 26.2 on the slip — 1.1% variance, above our 0.5% tolerance. Not writing that off as shrinkage without a look at the loading photos.", []),

  msg("m-429-01", "CONV-0429-OPS", "u-arun", "internal", "2026-10-07T09:45:00+05:30", "CR-03 evaporator fan has failed. Kinnow sitting 2.8 °C above set point, going on three hours now. Moving the lot to quarantine.", [{ kind: "report", label: "EXC-00429-01", ref: { kind: "trade", id: "AMT-2026-00429" } }]),
  msg("m-429-02", "CONV-0429-OPS", "u-sanjay", "internal", "2026-10-07T13:20:00+05:30", "Re-inspecting now. Citrus is more forgiving than stone fruit but 4.5 days of shelf-life debit on a 70-day budget with a 12-day transit ahead is not nothing.", []),
  msg("m-429-03", "CONV-0429-OPS", "u-rohit", "internal", "2026-10-07T16:20:00+05:30", "If it downgrades I need to know before 18:30 — Al Noor has to be told today, not when it lands in Dubai.", []),

  msg("m-431-01", "CONV-0431-BK", "u-fatima", "internal", "2026-10-02T13:00:00+05:30", "Joost, 54 MT of Sannam S4 is packed and export-QC'd. Booking the reefer out of Chennai now.", []),
  msg("m-431-02", "CONV-0431-BK", "u-harpreet", "internal", "2026-10-07T10:30:00+05:30", "Reefer availability on the preferred sailing is tight. I'm holding a backup two days later rather than gambling on one booking.", [{ kind: "booking", label: "Chennai → Rotterdam options", ref: null }]),

  msg("m-435-01", "CONV-0435-OPS", "u-imran", "internal", "2026-10-06T11:00:00+05:30", "Certificate of origin for the Coorg coffee is stuck at the chamber — they've queried the exporter details against our IEC.", [{ kind: "document", label: "Certificate of origin", ref: { kind: "document", id: "DOC-00435-certificate-of-origin" } }]),
  msg("m-435-02", "CONV-0435-OPS", "u-imran", "internal", "2026-10-07T09:15:00+05:30", "D-2 now. Filing is blocked until this clears — everything else in the set is verified.", []),
  msg("m-435-03", "CONV-0435-OPS", "u-fatima", "internal", "2026-10-07T14:50:00+05:30", "Britannia's window has enough slack to absorb one sailing, but I'd rather not spend it on a form. Escalating to Vikram if it isn't issued by 10:00 tomorrow.", []),
]

export const MESSAGES: Message[] = [...PRIMARY_THREAD, ...OTHER_THREADS]

export const messagesForConversation = (conversationId: string): Message[] =>
  MESSAGES.filter((message) => message.conversationId === conversationId)
export const messageById = (id: string): Message | undefined =>
  MESSAGES.find((message) => message.id === id)

/* ════════════════════════════════════════════════════════════════════
   DOCUMENTS
   ════════════════════════════════════════════════════════════════════ */

export type TradeDocument = {
  id: string
  tradeId: string
  stage: StageNo
  name: string
  requirement: DocRequirement
  issuer: string
  why: string
  status: DocStatus
  issuedOn: string | null
  expiresOn: string | null
  verifiedBy: string | null
  verifiedAt: string | null
  /** Which downstream gate this document holds up. The field that turns
   *  a document tracker into a control tower. */
  blocks: string[]
  /** The lot / pallet / container this attaches to, when it is not simply
   *  a trade-level document. */
  attachedTo: EntityRef | null
  note: string | null
}

const slug = (text: string): string =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")

/** Per-document overrides for the primary trade, keyed by
 *  `stage:document name`. Anything not listed here is VERIFIED with the
 *  default issue date for its stage — which is the honest shape of a
 *  trade that is 12 stages deep and clean. */
const PRIMARY_DOC_STATE: Record<
  string,
  { status: DocStatus; issuedOn?: string | null; verifiedBy?: string; blocks?: string[]; note?: string; expiresOn?: string }
> = {
  "1:Buyer KYC / Company Registration": { status: "VERIFIED", verifiedBy: "u-leela", expiresOn: "2027-03-31", note: "Dubai trade licence and importer code on file." },
  "2:Supplier / Farmer KYC": { status: "PENDING", verifiedBy: "u-leela", blocks: ["Farmer payout at settlement"], note: "Two of four growers onboarded this season — Pushpa Devi Rawat and Mahesh Thakur still pending. Blocks their payout, not the shipment." },
  "2:Certifications (GlobalGAP etc.)": { status: "NA", note: "Not required for the UAE. Would become mandatory overnight if this buyer mix shifted to EU or UK." },
  "2:Product & Quality History": { status: "NA", note: "First season for two of the four growers — no history to score against yet." },
  "3:Pesticide / Residue Test": { status: "NA", note: "Risk-based for the UAE, not mandatory. Would be a hard gate for an EU destination." },
  "3:Field QC Report": { status: "VERIFIED", verifiedBy: "u-meera", note: "Four records, one per lot. Lot 00112 conditional on 6% sunburn — the origin of the 0.6 MT gap between contracted and shipped." },
  "7:Shelf-life Reassessment": { status: "VERIFIED", verifiedBy: "u-arun", note: "Raised after the day-three door excursion. 1.2 days debited against a ~150 day budget; ship-first recommendation not triggered." },
  "8:Export QC Certificate": { status: "VERIFIED", verifiedBy: "u-sanjay", note: "One pallet rejected on count-size drift and substituted from buffer stock. Final shipped quantity 19,400 kg." },
  "11:Phytosanitary Certificate": { status: "VERIFIED", issuedOn: "2026-10-06T14:20:00+05:30", verifiedBy: "u-imran", expiresOn: "2026-10-20", note: "Inspection booked one day ahead of the gate-in cut-off. Cleared — but this is the document that rolls a container when it does not." },
  "11:Fumigation Certificate": { status: "NA", note: "Not accepted on fresh produce, and the pallet spec is plastic — so not applicable to this consignment." },
  "11:Bill of Lading (draft)": { status: "PENDING", blocks: ["Final B/L release", "Buyer's 70% payment clock"], note: "Draft checked against consignee, notify party and seal number. Final issues after sailing." },
  "12:Let Export Order (LEO)": { status: "VERIFIED", issuedOn: "2026-10-06T19:05:00+05:30", verifiedBy: "u-imran", note: "Issued the same evening the VGM/tare query was answered. Without it the terminal will not accept the container." },
  "13:Terminal Gate Pass": { status: "PENDING", blocks: ["Terminal gate-in", "Vessel loading"], note: "Issued against the LEO and the booking. Appointment slot 16:00–18:00 on 7 October." },
  "13:Shipping Line Acceptance": { status: "MISSING", blocks: ["Vessel loading", "Bill of Lading"], note: "Outstanding. This is the moment the sailing stops being a plan — cut-off 18:00 today." },
}

/** Default issue timestamp per stage on the primary trade. */
const PRIMARY_STAGE_DATE: Record<number, string> = {
  1: "2026-09-18T15:20:00+05:30", 2: "2026-09-22T11:00:00+05:30", 3: "2026-09-28T13:00:00+05:30",
  4: "2026-09-29T14:20:00+05:30", 5: "2026-09-29T18:00:00+05:30", 6: "2026-09-30T05:40:00+05:30",
  7: "2026-09-30T13:00:00+05:30", 8: "2026-10-05T18:30:00+05:30", 9: "2026-10-01T11:00:00+05:30",
  10: "2026-10-06T17:45:00+05:30", 11: "2026-10-06T12:00:00+05:30", 12: "2026-10-06T19:05:00+05:30",
  13: "2026-10-07T16:30:00+05:30",
}

function buildPrimaryDocuments(): TradeDocument[] {
  const rows: TradeDocument[] = []
  for (const stage of STAGES) {
    if (stage.n > 13) continue // the trade has not reached stages 14–16 yet
    for (const spec of stage.docs) {
      const override = PRIMARY_DOC_STATE[`${stage.n}:${spec.name}`]
      const status = override?.status ?? "VERIFIED"
      const issuedOn =
        override?.issuedOn !== undefined
          ? override.issuedOn
          : status === "NA" || status === "MISSING"
            ? null
            : PRIMARY_STAGE_DATE[stage.n]
      rows.push({
        id: `DOC-00418-${slug(spec.name)}`,
        tradeId: "AMT-2026-00418",
        stage: stage.n,
        name: spec.name,
        requirement: spec.requirement,
        issuer: spec.issuer,
        why: spec.why,
        status,
        issuedOn,
        expiresOn: override?.expiresOn ?? null,
        verifiedBy: status === "VERIFIED" ? (override?.verifiedBy ?? "u-imran") : null,
        verifiedAt: status === "VERIFIED" ? issuedOn : null,
        blocks: override?.blocks ?? [],
        attachedTo:
          stage.n >= 10
            ? { kind: "container", id: "MSKU 784123-6" }
            : stage.n >= 3 && stage.n <= 7
              ? { kind: "lot", id: "LOT-HP-APL-2026-00112" }
              : null,
        note: override?.note ?? null,
      })
    }
  }
  return rows
}

/** Documents on the other eleven trades — only the ones that actually
 *  matter to a screen: the blockers, the expiries and the gates. */
const SECONDARY_DOCUMENTS: TradeDocument[] = [
  { id: "DOC-00435-certificate-of-origin", tradeId: "AMT-2026-00435", stage: 11, name: "Certificate of Origin", requirement: "M", issuer: "Chamber / DGFT platform", why: "Proves Indian origin, and under a trade agreement can cut the buyer's import duty.", status: "REJECTED", issuedOn: null, expiresOn: null, verifiedBy: null, verifiedAt: null, blocks: ["e-SANCHIT filing", "Shipping bill", "Terminal gate-in"], attachedTo: null, note: "Chamber queried the exporter details against our IEC. D-2 and the whole filing is held behind this one form." },
  { id: "DOC-00435-commercial-invoice", tradeId: "AMT-2026-00435", stage: 11, name: "Commercial Invoice", requirement: "M", issuer: "AMAMA", why: "Value, terms and description of goods — must agree with the packing list and shipping bill to the decimal.", status: "VERIFIED", issuedOn: "2026-10-05T10:00:00+05:30", expiresOn: null, verifiedBy: "u-imran", verifiedAt: "2026-10-05T10:30:00+05:30", blocks: [], attachedTo: null, note: null },
  { id: "DOC-00429-cold-storage-temperature-log", tradeId: "AMT-2026-00429", stage: 7, name: "Cold Storage Temperature Log", requirement: "M", issuer: "System", why: "Continuous set-point-versus-actual record — the first document an insurer asks for.", status: "VERIFIED", issuedOn: "2026-10-07T12:00:00+05:30", expiresOn: null, verifiedBy: "u-arun", verifiedAt: "2026-10-07T12:10:00+05:30", blocks: [], attachedTo: null, note: "Carries the CR-03 evaporator failure: 165 minutes at up to 3.8 °C against a 2.0 °C set point." },
  { id: "DOC-00429-shelf-life-reassessment", tradeId: "AMT-2026-00429", stage: 7, name: "Shelf-life Reassessment", requirement: "O", issuer: "Cold Chain / QC", why: "Revised remaining shelf life and a ship-first / downgrade / divert recommendation.", status: "PENDING", issuedOn: null, expiresOn: null, verifiedBy: null, verifiedAt: null, blocks: ["Container allocation", "Buyer notification"], attachedTo: null, note: "QC decision due 18:30 today. 4.5 days debited against a 70-day budget with a 12-day transit ahead." },
  { id: "DOC-00433-vgm-declaration", tradeId: "AMT-2026-00433", stage: 10, name: "VGM Declaration", requirement: "M", issuer: "Shipper", why: "Verified Gross Mass under SOLAS. The line will not load without it.", status: "PENDING", issuedOn: null, expiresOn: null, verifiedBy: null, verifiedAt: null, blocks: ["Terminal gate-in", "Vessel loading"], attachedTo: { kind: "container", id: "TGHU 559803-1" }, note: "Due before the 09 October 08:00 cut-off. Stuffing still in progress." },
  { id: "DOC-00431-booking-confirmation", tradeId: "AMT-2026-00431", stage: 9, name: "Booking Confirmation", requirement: "M", issuer: "Shipping line", why: "Vessel, voyage, ETD, ETA and the three cut-offs that drive every later alert.", status: "PENDING", issuedOn: null, expiresOn: null, verifiedBy: null, verifiedAt: null, blocks: ["Container stuffing"], attachedTo: null, note: "Reefer availability tight on the preferred sailing — a backup is held two days later." },
  { id: "DOC-00437-bill-of-lading-final", tradeId: "AMT-2026-00437", stage: 14, name: "Bill of Lading (final)", requirement: "M", issuer: "Shipping line", why: "The title document. The scanned copy starts the buyer's payment clock.", status: "VERIFIED", issuedOn: "2026-10-02T16:00:00+05:30", expiresOn: null, verifiedBy: "u-imran", verifiedAt: "2026-10-02T16:40:00+05:30", blocks: [], attachedTo: { kind: "container", id: "CMAU 660214-3" }, note: "Released on 2 October — the 30-day payment clock runs from here." },
  { id: "DOC-00439-payment-advice-swift", tradeId: "AMT-2026-00439", stage: 16, name: "Payment Advice / SWIFT", requirement: "M", issuer: "Buyer's bank", why: "Evidence of the inward remittance, matched to the invoice and shipping bill.", status: "VERIFIED", issuedOn: "2026-10-06T14:00:00+05:30", expiresOn: null, verifiedBy: "u-kavita", verifiedAt: "2026-10-06T15:20:00+05:30", blocks: [], attachedTo: null, note: "Balance received. Farmer payout released against accepted quantity." },
  { id: "DOC-00423-field-qc-report", tradeId: "AMT-2026-00423", stage: 3, name: "Field QC Report", requirement: "M", issuer: "QC Inspector", why: "Measurements against spec — the most valuable document you own when a claim arrives.", status: "PENDING", issuedOn: null, expiresOn: null, verifiedBy: null, verifiedAt: null, blocks: ["Lot creation", "Farm pickup"], attachedTo: null, note: "Inspector on site at Dindori. Sunscald reading above the 1% EU tolerance on two blocks — wider sample being pulled before sign-off." },
]

export const DOCUMENTS: TradeDocument[] = [...buildPrimaryDocuments(), ...SECONDARY_DOCUMENTS]

export const documentById = (id: string): TradeDocument | undefined =>
  DOCUMENTS.find((document) => document.id === id)
export const documentsForTrade = (tradeId: string): TradeDocument[] =>
  DOCUMENTS.filter((document) => document.tradeId === tradeId)
export const documentsForStage = (tradeId: string, stage: StageNo): TradeDocument[] =>
  DOCUMENTS.filter((document) => document.tradeId === tradeId && document.stage === stage)
/** Every mandatory document that is not VERIFIED — i.e. every open gate
 *  across the whole book. This is the document control tower's inbox. */
export const blockingDocuments = (): TradeDocument[] =>
  DOCUMENTS.filter(
    (document) =>
      document.requirement === "M" && document.status !== "VERIFIED" && document.status !== "NA"
  )

/* ════════════════════════════════════════════════════════════════════
   STAGE RECORDS
   ════════════════════════════════════════════════════════════════════ */

export type StageState = "complete" | "in-progress" | "blocked" | "pending"

export type StageRecord = {
  id: string
  tradeId: string
  stage: StageNo
  state: StageState
  ownerId: string
  startedAt: string | null
  completedAt: string | null
  /** Which of the five chains this stage actually ran. */
  scenario: ScenarioKey
  /** What happened, in this trade's own words. */
  outcome: string
  slaMet: boolean | null
  documentIds: string[]
}

/** Full stage-by-stage record for the primary trade — stages 01–12
 *  complete, 13 live, 14–16 not yet reached. */
export const STAGE_RECORDS: StageRecord[] = [
  { id: "SR-00418-01", tradeId: "AMT-2026-00418", stage: 1, state: "complete", ownerId: "u-rohit", startedAt: "2026-09-12T09:05:00+05:30", completedAt: "2026-09-18T15:20:00+05:30", scenario: "A", outcome: "RFQ converted to a signed contract in six days. Price settled at USD 1,180/MT after two rounds; the russeting tolerance was added to the spec at the buyer's request, which is what made stage 03 measurable.", slaMet: true, documentIds: [] },
  { id: "SR-00418-02", tradeId: "AMT-2026-00418", stage: 2, state: "complete", ownerId: "u-devendra", startedAt: "2026-09-18T15:30:00+05:30", completedAt: "2026-09-22T11:00:00+05:30", scenario: "A", outcome: "20 MT allocated across four growers in two altitude bands. Two growers newly onboarded; their KYC is still open, which blocks payout at stage 16 but nothing upstream.", slaMet: true, documentIds: [] },
  { id: "SR-00418-03", tradeId: "AMT-2026-00418", stage: 3, state: "complete", ownerId: "u-meera", startedAt: "2026-09-28T11:10:00+05:30", completedAt: "2026-09-29T12:30:00+05:30", scenario: "A", outcome: "Four inspections, four records. Three clean passes; lot 00112 conditional on 6% sunburn against a 2% tolerance, with a grade-out note attached. That note is the origin of every quantity number downstream.", slaMet: true, documentIds: [] },
  { id: "SR-00418-04", tradeId: "AMT-2026-00418", stage: 4, state: "complete", ownerId: "u-meera", startedAt: "2026-09-28T12:00:00+05:30", completedAt: "2026-09-29T14:20:00+05:30", scenario: "A", outcome: "Lots 00112–00115 created, 20,000 kg accepted. Shelf-life clock started at harvest datetime, not warehouse receipt.", slaMet: true, documentIds: [] },
  { id: "SR-00418-05", tradeId: "AMT-2026-00418", stage: 5, state: "complete", ownerId: "u-harpreet", startedAt: "2026-09-29T15:00:00+05:30", completedAt: "2026-09-30T04:10:00+05:30", scenario: "A", outcome: "Six hours of field heat in the orchard shed before the truck could get up the road, then an 18-hour run on a genset trailer. The most expensive six hours in the trade, and the cheapest to fix next season.", slaMet: true, documentIds: [] },
  { id: "SR-00418-06", tradeId: "AMT-2026-00418", stage: 6, state: "complete", ownerId: "u-pradeep", startedAt: "2026-09-30T04:10:00+05:30", completedAt: "2026-09-30T05:40:00+05:30", scenario: "A", outcome: "Arrived 04:10 at 19 °C pulp. 5,080 kg received against 5,100 despatched — 0.4% loss, inside tolerance for an 18-hour leg. Scanned into pre-cooling, not straight into cold storage.", slaMet: true, documentIds: [] },
  { id: "SR-00418-07", tradeId: "AMT-2026-00418", stage: 7, state: "complete", ownerId: "u-arun", startedAt: "2026-09-30T05:40:00+05:30", completedAt: "2026-10-05T09:00:00+05:30", scenario: "C", outcome: "Forced-air pull-down 19 °C → 1 °C in seven hours, then held at +0.5 °C and 90–95% RH. One excursion on day three: a 40-minute open door, drift to 4 °C, 1.2 days debited. Logged, no action — but permanently on the record if a claim comes.", slaMet: true, documentIds: [] },
  { id: "SR-00418-08", tradeId: "AMT-2026-00418", stage: 8, state: "complete", ownerId: "u-sanjay", startedAt: "2026-10-05T08:00:00+05:30", completedAt: "2026-10-05T18:30:00+05:30", scenario: "C", outcome: "Sunburnt fruit graded out of lot 00112. One pallet failed export QC on count-size drift and was swapped for a buffer pallet. Contracted 20.0 MT, shipping 19.4 MT — traceable, documented and priced.", slaMet: true, documentIds: [] },
  { id: "SR-00418-09", tradeId: "AMT-2026-00418", stage: 9, state: "complete", ownerId: "u-harpreet", startedAt: "2026-09-30T10:00:00+05:30", completedAt: "2026-10-01T11:00:00+05:30", scenario: "A", outcome: "40ft HC reefer booked on the MSC Aurora out of Mundra at +0.5 °C, 20 CBM/hr vent. CMA CGM on the 12th documented as the backup — the fallback that makes today's cut-off survivable.", slaMet: true, documentIds: [] },
  { id: "SR-00418-10", tradeId: "AMT-2026-00418", stage: 10, state: "complete", ownerId: "u-pradeep", startedAt: "2026-10-06T14:10:00+05:30", completedAt: "2026-10-06T17:45:00+05:30", scenario: "A", outcome: "Container run empty at set point for two hours before loading. All 20 pallets scanned and reconciled. Pulp temperatures 0.7 / 0.9 / 1.1 °C at three positions. Seal SL-0099412 photographed, VGM 26,340 kg filed.", slaMet: true, documentIds: [] },
  { id: "SR-00418-11", tradeId: "AMT-2026-00418", stage: 11, state: "complete", ownerId: "u-imran", startedAt: "2026-10-01T09:00:00+05:30", completedAt: "2026-10-06T14:20:00+05:30", scenario: "D", outcome: "Seven documents reconciled to the same 19,400 kg. The phytosanitary inspection sat one day ahead of the cut-off — D-7 and D-3 alerts both fired, inspector attended on the 6th, certificate issued.", slaMet: true, documentIds: [] },
  { id: "SR-00418-12", tradeId: "AMT-2026-00418", stage: 12, state: "complete", ownerId: "u-imran", startedAt: "2026-10-06T14:30:00+05:30", completedAt: "2026-10-06T19:05:00+05:30", scenario: "C", outcome: "Shipping bill filed with drawback and incentive claims. One query on the invoice net weight against the implied tare — answered in three hours with the stuffing report and tare plate. LEO issued the same evening.", slaMet: true, documentIds: [] },
  { id: "SR-00418-13", tradeId: "AMT-2026-00418", stage: 13, state: "in-progress", ownerId: "u-harpreet", startedAt: "2026-10-07T05:00:00+05:30", completedAt: null, scenario: "A", outcome: "Container left the pack-house at 05:00, reached Mundra at 15:40, plugged into terminal power at 16:20 after 28 minutes on no power. Gate-in being processed against an 18:00 cut-off.", slaMet: null, documentIds: [] },
  { id: "SR-00418-14", tradeId: "AMT-2026-00418", stage: 14, state: "pending", ownerId: "u-harpreet", startedAt: null, completedAt: null, scenario: "A", outcome: "Not reached. MSC Aurora sails 9 October, ETA Jebel Ali 15 October.", slaMet: null, documentIds: [] },
  { id: "SR-00418-15", tradeId: "AMT-2026-00418", stage: 15, state: "pending", ownerId: "u-rohit", startedAt: null, completedAt: null, scenario: "A", outcome: "Not reached.", slaMet: null, documentIds: [] },
  { id: "SR-00418-16", tradeId: "AMT-2026-00418", stage: 16, state: "pending", ownerId: "u-kavita", startedAt: null, completedAt: null, scenario: "A", outcome: "Not reached. 30% advance received; 70% balance due at B/L + 30 days.", slaMet: null, documentIds: [] },
]

/** Attach the document ids to their stage records now that both exist. */
for (const record of STAGE_RECORDS) {
  record.documentIds = DOCUMENTS.filter(
    (document) => document.tradeId === record.tradeId && document.stage === record.stage
  ).map((document) => document.id)
}

export const stageRecordsForTrade = (tradeId: string): StageRecord[] =>
  STAGE_RECORDS.filter((record) => record.tradeId === tradeId)
export const stageRecord = (tradeId: string, stage: StageNo): StageRecord | undefined =>
  STAGE_RECORDS.find((record) => record.tradeId === tradeId && record.stage === stage)

/* ════════════════════════════════════════════════════════════════════
   EVENT LOG  (append-only)
   ════════════════════════════════════════════════════════════════════ */

export type EventKind =
  | "stage-advanced" | "document" | "message" | "qc-decision" | "excursion"
  | "notification" | "commercial" | "logistics"

export type WorldEvent = {
  id: string
  at: string
  kind: EventKind
  tradeId: string | null
  actorId: string | null
  summary: string
  /** What this event is about — clicking it opens that record. */
  subject: EntityRef | null
}

/** Append-only. Drives the bottom activity strip and the audit trail. */
export const EVENTS: WorldEvent[] = [
  { id: "ev-001", at: "2026-09-12T09:05:00+05:30", kind: "commercial", tradeId: null, actorId: "b-alnoor", summary: "Al Noor Fresh Trading raised RFQ-2026-0311 for 20 MT Royal Delicious", subject: { kind: "rfq", id: "RFQ-2026-0311" } },
  { id: "ev-002", at: "2026-09-13T16:30:00+05:30", kind: "commercial", tradeId: null, actorId: "u-rohit", summary: "Four quotes received against RFQ-2026-0311 — 21 MT available", subject: { kind: "rfq", id: "RFQ-2026-0311" } },
  { id: "ev-003", at: "2026-09-14T10:30:00+05:30", kind: "commercial", tradeId: null, actorId: "u-rohit", summary: "Term sheet TS-2026-0311 opened", subject: { kind: "termSheet", id: "TS-2026-0311" } },
  { id: "ev-004", at: "2026-09-17T17:05:00+05:30", kind: "commercial", tradeId: null, actorId: "b-alnoor", summary: "Price clause agreed at USD 1,180/MT — all 8 clauses now agreed", subject: { kind: "termSheet", id: "TS-2026-0311" } },
  { id: "ev-005", at: "2026-09-18T12:40:00+05:30", kind: "commercial", tradeId: null, actorId: "b-alnoor", summary: "PO-ALN-2026-0442 issued and auto-accepted — matched the term sheet on every clause", subject: { kind: "po", id: "PO-ALN-2026-0442" } },
  { id: "ev-006", at: "2026-09-18T15:20:00+05:30", kind: "stage-advanced", tradeId: "AMT-2026-00418", actorId: "u-vikram", summary: "Contract signed — Transaction ID AMT-2026-00418 issued, stage 01 complete", subject: { kind: "trade", id: "AMT-2026-00418" } },
  { id: "ev-007", at: "2026-09-22T11:00:00+05:30", kind: "stage-advanced", tradeId: "AMT-2026-00418", actorId: "u-devendra", summary: "Stage 02 complete — 20 MT allocated across four growers in two altitude bands", subject: { kind: "trade", id: "AMT-2026-00418" } },
  { id: "ev-008", at: "2026-09-28T11:10:00+05:30", kind: "qc-decision", tradeId: "AMT-2026-00418", actorId: "u-meera", summary: "Field QC on lot 00112 — CONDITIONAL PASS, 6% sunburn against a 2% tolerance", subject: { kind: "lot", id: "LOT-HP-APL-2026-00112" } },
  { id: "ev-009", at: "2026-09-29T14:20:00+05:30", kind: "stage-advanced", tradeId: "AMT-2026-00418", actorId: "u-meera", summary: "Stage 04 complete — lots 00112–00115 created, 20,000 kg accepted", subject: { kind: "trade", id: "AMT-2026-00418" } },
  { id: "ev-010", at: "2026-09-30T04:10:00+05:30", kind: "logistics", tradeId: "AMT-2026-00418", actorId: "u-pradeep", summary: "Inbound at Sonipat — 5,080 kg received against 5,100 despatched, 0.4% variance", subject: { kind: "lot", id: "LOT-HP-APL-2026-00112" } },
  { id: "ev-011", at: "2026-10-01T14:20:00+05:30", kind: "excursion", tradeId: "AMT-2026-00418", actorId: "u-arun", summary: "Temperature excursion — chamber door open 40 min, peak 4.0 °C, 1.2 days debited", subject: { kind: "trade", id: "AMT-2026-00418" } },
  { id: "ev-012", at: "2026-10-01T11:00:00+05:30", kind: "logistics", tradeId: "AMT-2026-00418", actorId: "u-harpreet", summary: "Reefer booked on MSC Aurora 2641E — CMA CGM on the 12th held as backup", subject: { kind: "container", id: "MSKU 784123-6" } },
  { id: "ev-013", at: "2026-10-05T18:30:00+05:30", kind: "qc-decision", tradeId: "AMT-2026-00418", actorId: "u-sanjay", summary: "Export QC passed — one pallet substituted, final shipped quantity 19,400 kg", subject: { kind: "pallet", id: "PLT-00418-07" } },
  { id: "ev-014", at: "2026-10-06T14:20:00+05:30", kind: "document", tradeId: "AMT-2026-00418", actorId: "u-imran", summary: "Phytosanitary certificate issued — the last open gate before filing", subject: { kind: "document", id: "DOC-00418-phytosanitary-certificate" } },
  { id: "ev-015", at: "2026-10-06T16:10:00+05:30", kind: "document", tradeId: "AMT-2026-00418", actorId: "u-imran", summary: "Customs query raised on invoice net weight against implied tare", subject: { kind: "trade", id: "AMT-2026-00418" } },
  { id: "ev-016", at: "2026-10-06T17:45:00+05:30", kind: "logistics", tradeId: "AMT-2026-00418", actorId: "u-pradeep", summary: "Container sealed — SL-0099412, VGM 26,340 kg filed", subject: { kind: "container", id: "MSKU 784123-6" } },
  { id: "ev-017", at: "2026-10-06T19:05:00+05:30", kind: "document", tradeId: "AMT-2026-00418", actorId: "u-imran", summary: "Let Export Order issued — stage 12 complete", subject: { kind: "document", id: "DOC-00418-let-export-order-leo" } },
  { id: "ev-018", at: "2026-10-07T05:00:00+05:30", kind: "logistics", tradeId: "AMT-2026-00418", actorId: "u-harpreet", summary: "Container despatched to Mundra on a genset trailer", subject: { kind: "container", id: "MSKU 784123-6" } },
  { id: "ev-019", at: "2026-10-07T09:45:00+05:30", kind: "excursion", tradeId: "AMT-2026-00429", actorId: "u-arun", summary: "CR-03 evaporator failure — Kinnow 2.8 °C above set point, lot quarantined", subject: { kind: "trade", id: "AMT-2026-00429" } },
  { id: "ev-020", at: "2026-10-07T11:30:00+05:30", kind: "commercial", tradeId: null, actorId: "b-reef", summary: "PO-REE-2026-0891 issued with 2 deviations — treated as a counter-offer, pending confirmation", subject: { kind: "po", id: "PO-REE-2026-0891" } },
  { id: "ev-021", at: "2026-10-07T14:50:00+05:30", kind: "document", tradeId: "AMT-2026-00435", actorId: "u-fatima", summary: "Certificate of origin still rejected at D-2 — filing blocked", subject: { kind: "document", id: "DOC-00435-certificate-of-origin" } },
  { id: "ev-022", at: "2026-10-07T15:10:00+05:30", kind: "qc-decision", tradeId: "AMT-2026-00423", actorId: "u-meera", summary: "Dindori pomegranate — sunscald above the 1% EU tolerance, wider sample being pulled", subject: { kind: "trade", id: "AMT-2026-00423" } },
  { id: "ev-023", at: "2026-10-07T15:52:00+05:30", kind: "logistics", tradeId: "AMT-2026-00418", actorId: "u-harpreet", summary: "Arrived Mundra 15:40, genset off 15:52", subject: { kind: "container", id: "MSKU 784123-6" } },
  { id: "ev-024", at: "2026-10-07T16:05:00+05:30", kind: "message", tradeId: "AMT-2026-00418", actorId: "u-arun", summary: "Cold Chain flagged the genset-to-terminal-power gap on the gate-in thread", subject: { kind: "conversation", id: "CONV-0418-OPS" } },
  { id: "ev-025", at: "2026-10-07T16:05:00+05:30", kind: "logistics", tradeId: "AMT-2026-00427", actorId: "u-pradeep", summary: "Jalgaon inbound variance 1.1% — above the 0.5% tolerance, held for review", subject: { kind: "trade", id: "AMT-2026-00427" } },
  { id: "ev-026", at: "2026-10-07T16:20:00+05:30", kind: "excursion", tradeId: "AMT-2026-00418", actorId: "u-harpreet", summary: "Terminal power connected 16:20 — 28 min unplugged, peak 6.4 °C, 0.8 days debited", subject: { kind: "container", id: "MSKU 784123-6" } },
  { id: "ev-027", at: "2026-10-07T16:25:00+05:30", kind: "notification", tradeId: "AMT-2026-00418", actorId: null, summary: "CRITICAL — gate-in not yet confirmed, cut-off in 95 minutes", subject: { kind: "container", id: "MSKU 784123-6" } },
  { id: "ev-028", at: "2026-10-07T16:32:00+05:30", kind: "message", tradeId: "AMT-2026-00418", actorId: "u-rohit", summary: "Buyer updated on gate-in status and the held backup sailing", subject: { kind: "conversation", id: "CONV-0418-BK" } },
  { id: "ev-029", at: "2026-10-07T16:40:00+05:30", kind: "message", tradeId: "AMT-2026-00418", actorId: "u-ananya", summary: "Master KAM asked for terminal acceptance to be posted to the ops thread on confirmation", subject: { kind: "conversation", id: "CONV-0418-OPS" } },
  { id: "ev-030", at: "2026-10-07T16:42:00+05:30", kind: "notification", tradeId: "AMT-2026-00429", actorId: null, summary: "ACTION — Kinnow accept / downgrade / reject decision due at 18:30", subject: { kind: "trade", id: "AMT-2026-00429" } },
]

/** Newest first — what the activity strip renders. */
export const recentEvents = (limit = 5): WorldEvent[] =>
  [...EVENTS].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit)
export const eventById = (id: string): WorldEvent | undefined =>
  EVENTS.find((event) => event.id === id)
export const eventsForTrade = (tradeId: string): WorldEvent[] =>
  EVENTS.filter((event) => event.tradeId === tradeId)

/* ════════════════════════════════════════════════════════════════════
   NOTIFICATIONS
   ════════════════════════════════════════════════════════════════════ */

export type Notification = {
  id: string
  level: Severity
  title: string
  body: string
  at: string
  tradeId: string | null
  /** The role this lands on — notifications find a person, they do not
   *  wait on a dashboard. */
  ownerRole: InternalRoleId
  read: boolean
  subject: EntityRef | null
  stage: StageNo | null
}

export const NOTIFICATIONS: Notification[] = [
  { id: "nt-01", level: "CRITICAL", title: "Cut-off in 95 minutes, gate-in not confirmed", body: "MSKU 784123-6 is at Mundra but the terminal has not yet confirmed acceptance. Cut-off 18:00. Backup sailing CMACGM-8890344 is held for the 12th.", at: "2026-10-07T16:25:00+05:30", tradeId: "AMT-2026-00418", ownerRole: "logistics", read: false, subject: { kind: "container", id: "MSKU 784123-6" }, stage: 13 },
  { id: "nt-02", level: "URGENT", title: "Shipping line acceptance outstanding", body: "The one mandatory document still missing on AMT-2026-00418. Blocks vessel loading and the B/L.", at: "2026-10-07T16:26:00+05:30", tradeId: "AMT-2026-00418", ownerRole: "documentation", read: false, subject: { kind: "document", id: "DOC-00418-shipping-line-acceptance" }, stage: 13 },
  { id: "nt-03", level: "CRITICAL", title: "Temperature excursion — CR-03 evaporator failure", body: "Kinnow for AMT-2026-00429 held 2.8 °C above set point for 165 minutes. 4.5 days of shelf life debited. Lot quarantined pending QC.", at: "2026-10-07T09:50:00+05:30", tradeId: "AMT-2026-00429", ownerRole: "cold-chain", read: false, subject: { kind: "trade", id: "AMT-2026-00429" }, stage: 7 },
  { id: "nt-04", level: "ACTION", title: "Accept / downgrade / reject decision due 18:30", body: "QC re-inspection of the quarantined Kinnow lot is complete. A decision is needed before the buyer's end of day.", at: "2026-10-07T16:42:00+05:30", tradeId: "AMT-2026-00429", ownerRole: "qc", read: false, subject: { kind: "trade", id: "AMT-2026-00429" }, stage: 7 },
  { id: "nt-05", level: "CRITICAL", title: "Certificate of origin rejected at D-2", body: "The chamber queried exporter details against our IEC on AMT-2026-00435. Customs filing is blocked behind it; every other document in the set is verified.", at: "2026-10-07T09:15:00+05:30", tradeId: "AMT-2026-00435", ownerRole: "documentation", read: false, subject: { kind: "document", id: "DOC-00435-certificate-of-origin" }, stage: 11 },
  { id: "nt-06", level: "WARNING", title: "Inbound weight variance 1.1%", body: "Jalgaon Nendran received 25.9 MT against 26.2 MT on the origin weighbridge slip. Above the 0.5% tolerance — loading photos requested.", at: "2026-10-07T16:05:00+05:30", tradeId: "AMT-2026-00427", ownerRole: "warehouse", read: false, subject: { kind: "trade", id: "AMT-2026-00427" }, stage: 6 },
  { id: "nt-07", level: "ACTION", title: "Counter-offer PO awaiting confirmation", body: "PO-REE-2026-0891 departs from the open term sheet on price and packing. Nothing is committed until it is confirmed or countered.", at: "2026-10-07T11:31:00+05:30", tradeId: null, ownerRole: "kam", read: false, subject: { kind: "po", id: "PO-REE-2026-0891" }, stage: 1 },
  { id: "nt-08", level: "ACTION", title: "Field QC pending sign-off", body: "Dindori pomegranate sunscald reading is above the 1% EU tolerance. A wider sample is being pulled before the inspector signs.", at: "2026-10-07T15:12:00+05:30", tradeId: "AMT-2026-00423", ownerRole: "qc", read: false, subject: { kind: "trade", id: "AMT-2026-00423" }, stage: 3 },
  { id: "nt-09", level: "WARNING", title: "Reefer availability tight on preferred sailing", body: "Chennai → Rotterdam on AMT-2026-00431. A backup two days later is held rather than gambling on a single booking.", at: "2026-10-07T10:31:00+05:30", tradeId: "AMT-2026-00431", ownerRole: "logistics", read: false, subject: { kind: "trade", id: "AMT-2026-00431" }, stage: 9 },
  { id: "nt-10", level: "ACTION", title: "VGM due before the 09 October cut-off", body: "TGHU 559803-1 on AMT-2026-00433 is still stuffing. No VGM, no loading — this is a hard gate.", at: "2026-10-07T14:00:00+05:30", tradeId: "AMT-2026-00433", ownerRole: "warehouse", read: false, subject: { kind: "container", id: "TGHU 559803-1" }, stage: 10 },
  { id: "nt-11", level: "ACTION", title: "Contract awaiting signature", body: "AMT-2026-00419 (Alphonso, 12 MT CIF Felixstowe) has a confirmed PO and is waiting on countersignature.", at: "2026-10-06T14:25:00+05:30", tradeId: "AMT-2026-00419", ownerRole: "master-admin", read: false, subject: { kind: "trade", id: "AMT-2026-00419" }, stage: 1 },
  { id: "nt-12", level: "WARNING", title: "Supplier KYC incomplete — payout blocked", body: "Pushpa Devi Rawat and Mahesh Thakur are still pending on AMT-2026-00418. Does not block the shipment; does block their settlement.", at: "2026-10-05T09:00:00+05:30", tradeId: "AMT-2026-00418", ownerRole: "compliance", read: true, subject: { kind: "document", id: "DOC-00418-supplier-farmer-kyc" }, stage: 2 },
  { id: "nt-13", level: "INFO", title: "Excursion logged — genset to terminal power gap", body: "28 minutes unplugged at Mundra, peak 6.4 °C, 0.8 days debited. Irrelevant on apples; material on stone fruit.", at: "2026-10-07T16:22:00+05:30", tradeId: "AMT-2026-00418", ownerRole: "cold-chain", read: false, subject: { kind: "container", id: "MSKU 784123-6" }, stage: 13 },
  { id: "nt-14", level: "INFO", title: "Let Export Order issued", body: "AMT-2026-00418 cleared customs the same evening the net-weight query was answered.", at: "2026-10-06T19:06:00+05:30", tradeId: "AMT-2026-00418", ownerRole: "documentation", read: true, subject: { kind: "document", id: "DOC-00418-let-export-order-leo" }, stage: 12 },
  { id: "nt-15", level: "INFO", title: "Container sealed", body: "SL-0099412 photographed, VGM 26,340 kg filed. Contents are now fixed — changes require a supervisor-authorised reversal.", at: "2026-10-06T17:46:00+05:30", tradeId: "AMT-2026-00418", ownerRole: "warehouse", read: true, subject: { kind: "container", id: "MSKU 784123-6" }, stage: 10 },
  { id: "nt-16", level: "WARNING", title: "Buyer KYC expiring in 21 days", body: "Najd Provisions Company trade licence expires 28 October. Renew before the next shipment is planned.", at: "2026-10-07T08:00:00+05:30", tradeId: null, ownerRole: "compliance", read: false, subject: { kind: "buyer", id: "b-najd" }, stage: 1 },
  { id: "nt-17", level: "WARNING", title: "Seller KYC expiring", body: "Sirsa Kinnow Farms documents lapse in 14 days. Blocks payout on AMT-2026-00429 at settlement.", at: "2026-10-07T08:00:00+05:30", tradeId: "AMT-2026-00429", ownerRole: "compliance", read: false, subject: { kind: "seller", id: "s-sirsa" }, stage: 2 },
  { id: "nt-18", level: "ACTION", title: "Mill allocation unconfirmed", body: "240 MT of 1121 steam on AMT-2026-00421 — Karnal has not yet confirmed against the November window. SLA expires in 2 days.", at: "2026-10-07T09:00:00+05:30", tradeId: "AMT-2026-00421", ownerRole: "procurement", read: false, subject: { kind: "trade", id: "AMT-2026-00421" }, stage: 2 },
  { id: "nt-19", level: "ACTION", title: "Pickup truck not yet dispatched", body: "Thompson Seedless on AMT-2026-00425. 6-hour dispatch SLA expires at 22:00.", at: "2026-10-07T16:00:00+05:30", tradeId: "AMT-2026-00425", ownerRole: "logistics", read: false, subject: { kind: "trade", id: "AMT-2026-00425" }, stage: 5 },
  { id: "nt-20", level: "INFO", title: "Vessel ETA variance +14 hrs", body: "CMA CGM Bharat on AMT-2026-00437 slipped 14 hours on weather. Cashew has the shelf life to absorb it — no action.", at: "2026-10-07T07:30:00+05:30", tradeId: "AMT-2026-00437", ownerRole: "logistics", read: true, subject: { kind: "trade", id: "AMT-2026-00437" }, stage: 14 },
  { id: "nt-21", level: "INFO", title: "Payment reconciled", body: "AMT-2026-00439 balance received and matched to the invoice and shipping bill. Farmer payout released.", at: "2026-10-06T15:25:00+05:30", tradeId: "AMT-2026-00439", ownerRole: "finance", read: true, subject: { kind: "trade", id: "AMT-2026-00439" }, stage: 16 },
  { id: "nt-22", level: "WARNING", title: "Realised margin 2.1% under plan", body: "AMT-2026-00439 closed under plan — traced to the substituted pallet and an extra pre-cooling run. Both fixable next season.", at: "2026-10-06T16:00:00+05:30", tradeId: "AMT-2026-00439", ownerRole: "finance", read: false, subject: { kind: "trade", id: "AMT-2026-00439" }, stage: 16 },
  { id: "nt-23", level: "INFO", title: "New RFQ received", body: "Emirates Agro Distribution raised RFQ-2026-0327 for 40 MT of Kufri Jyoti potato.", at: "2026-10-06T12:31:00+05:30", tradeId: null, ownerRole: "kam", read: true, subject: { kind: "rfq", id: "RFQ-2026-0327" }, stage: 1 },
  { id: "nt-24", level: "ACTION", title: "RFQ response due in 26 hours", body: "RFQ-2026-0325 (W-180 cashew) expires 08 October 10:10. Two quotes in, one shortlisted.", at: "2026-10-07T08:10:00+05:30", tradeId: null, ownerRole: "kam", read: false, subject: { kind: "rfq", id: "RFQ-2026-0325" }, stage: 1 },
  { id: "nt-25", level: "WARNING", title: "New buyer pending compliance", body: "Emirates Agro Distribution has not completed KYC. Shipment planning is held at source until it clears.", at: "2026-10-06T12:35:00+05:30", tradeId: null, ownerRole: "compliance", read: false, subject: { kind: "buyer", id: "b-emiratesagro" }, stage: 1 },
  { id: "nt-26", level: "INFO", title: "Export QC passed with a substitution", body: "AMT-2026-00418 — one pallet swapped for buffer stock on count-size drift. Final 19,400 kg against 20,000 contracted.", at: "2026-10-05T18:35:00+05:30", tradeId: "AMT-2026-00418", ownerRole: "qc", read: true, subject: { kind: "pallet", id: "PLT-00418-07" }, stage: 8 },
  { id: "nt-27", level: "INFO", title: "Shelf-life reassessment filed", body: "Day-three door excursion on AMT-2026-00418 debited 1.2 days against a ~150 day budget. Ship-first not triggered.", at: "2026-10-01T15:10:00+05:30", tradeId: "AMT-2026-00418", ownerRole: "cold-chain", read: true, subject: { kind: "trade", id: "AMT-2026-00418" }, stage: 7 },
  { id: "nt-28", level: "ACTION", title: "Backup sailing decision point", body: "If gate-in fails tonight, CMACGM-8890344 on the 12th must be confirmed within 2 hours to stay inside the delivery window.", at: "2026-10-07T16:30:00+05:30", tradeId: "AMT-2026-00418", ownerRole: "logistics", read: false, subject: { kind: "container", id: "MSKU 784123-6" }, stage: 13 },
  { id: "nt-29", level: "INFO", title: "Term sheet signed", body: "TS-2026-0311 closed with all 8 clauses agreed. PO auto-accepted the same day.", at: "2026-09-18T12:41:00+05:30", tradeId: "AMT-2026-00418", ownerRole: "kam", read: true, subject: { kind: "termSheet", id: "TS-2026-0311" }, stage: 1 },
  { id: "nt-30", level: "WARNING", title: "Term sheet stalled on two clauses", body: "TS-2026-0325 has been open 3 days with price and packing disputed. Delivery window cannot be fixed until packing closes.", at: "2026-10-07T09:00:00+05:30", tradeId: null, ownerRole: "master-kam", read: false, subject: { kind: "termSheet", id: "TS-2026-0325" }, stage: 1 },
]

export const notificationById = (id: string): Notification | undefined =>
  NOTIFICATIONS.find((notification) => notification.id === id)
export const unreadNotifications = (): Notification[] =>
  NOTIFICATIONS.filter((notification) => !notification.read)

/* ════════════════════════════════════════════════════════════════════
   SHIPMENTS & FREIGHT
   ════════════════════════════════════════════════════════════════════ */

export type ShipmentStatus =
  | "planning" | "booked" | "stuffing" | "at-terminal" | "in-transit" | "arrived" | "delivered"

export type LegMode = "road" | "sea" | "rail"

export type ShipmentLeg = {
  id: string
  sequence: number
  mode: LegMode
  from: string
  to: string
  carrier: string
  reference: string
  departedAt: string | null
  arrivedAt: string | null
  state: "complete" | "in-progress" | "pending"
}

/** A freight cost line. `payer` is decided by the Incoterm, which is why
 *  the Incoterm sits on the shipment header rather than only on the
 *  contract — under CFR the seller pays main carriage but not insurance. */
export type FreightCharge = {
  code: string
  label: string
  amountUsd: number
  payer: "AMAMA" | "Buyer"
  status: "accrued" | "invoiced" | "paid"
}

export type ShipmentMilestone = {
  key: string
  label: string
  plannedAt: string
  actualAt: string | null
  state: "complete" | "due" | "late" | "pending"
}

export type Shipment = {
  id: string
  tradeId: string
  containerId: string | null
  status: ShipmentStatus
  carrier: string
  bookingRef: string
  vessel: string
  voyage: string
  blNo: string | null
  blReleasedAt: string | null
  portOfLoading: string
  portOfDischarge: string
  incoterm: string
  freightTerms: "Prepaid" | "Collect"
  etd: string
  eta: string
  atd: string | null
  ata: string | null
  /** Positive is late. Weighed against remaining shelf life, never read
   *  as a bare number of hours. */
  etaVarianceHrs: number
  transitDays: number
  remainingShelfLifeDays: number | null
  legs: ShipmentLeg[]
  charges: FreightCharge[]
  milestones: ShipmentMilestone[]
}

export const SHIPMENTS: Shipment[] = [
  {
    id: "SHP-00418", tradeId: "AMT-2026-00418", containerId: "MSKU 784123-6", status: "at-terminal",
    carrier: "MSC", bookingRef: "MSCUBK-4471902", vessel: "MSC Aurora", voyage: "2641E",
    blNo: null, blReleasedAt: null,
    portOfLoading: "INMUN — Mundra", portOfDischarge: "AEJEA — Jebel Ali",
    incoterm: "CFR Jebel Ali", freightTerms: "Prepaid",
    etd: "2026-10-09T02:30:00+05:30", eta: "2026-10-15T08:00:00+04:00",
    atd: null, ata: null, etaVarianceHrs: 0, transitDays: 6, remainingShelfLifeDays: 131,
    legs: [
      { id: "SHP-00418-L1", sequence: 1, mode: "road", from: "Sonipat pack-house", to: "Mundra terminal", carrier: "Northline Reefer Logistics", reference: "TRK-HR-55-AB-2214", departedAt: "2026-10-07T05:00:00+05:30", arrivedAt: "2026-10-07T15:40:00+05:30", state: "complete" },
      { id: "SHP-00418-L2", sequence: 2, mode: "sea", from: "Mundra", to: "Jebel Ali", carrier: "MSC", reference: "MSC Aurora 2641E", departedAt: null, arrivedAt: null, state: "pending" },
      { id: "SHP-00418-L3", sequence: 3, mode: "road", from: "Jebel Ali", to: "Al Noor cold store, Dubai", carrier: "Buyer's haulier", reference: "—", departedAt: null, arrivedAt: null, state: "pending" },
    ],
    charges: [
      { code: "THC-O", label: "Terminal handling — origin", amountUsd: 285, payer: "AMAMA", status: "accrued" },
      { code: "OFR", label: "Ocean freight, 40ft HC reefer", amountUsd: 2150, payer: "AMAMA", status: "invoiced" },
      { code: "GENSET", label: "Genset trailer hire, Sonipat → Mundra", amountUsd: 640, payer: "AMAMA", status: "paid" },
      { code: "PLUG", label: "Reefer plug-in at terminal", amountUsd: 95, payer: "AMAMA", status: "accrued" },
      { code: "DOC", label: "Documentation and B/L fee", amountUsd: 120, payer: "AMAMA", status: "accrued" },
      { code: "THC-D", label: "Terminal handling — destination", amountUsd: 310, payer: "Buyer", status: "accrued" },
      { code: "INS", label: "Marine cargo insurance", amountUsd: 0, payer: "Buyer", status: "accrued" },
    ],
    milestones: [
      { key: "si", label: "Shipping instructions filed", plannedAt: "2026-10-06T18:00:00+05:30", actualAt: "2026-10-06T15:10:00+05:30", state: "complete" },
      { key: "vgm", label: "VGM filed", plannedAt: "2026-10-07T12:00:00+05:30", actualAt: "2026-10-06T19:20:00+05:30", state: "complete" },
      { key: "gatein", label: "Terminal gate-in", plannedAt: "2026-10-07T18:00:00+05:30", actualAt: null, state: "due" },
      { key: "load", label: "Loaded on board", plannedAt: "2026-10-08T20:00:00+05:30", actualAt: null, state: "pending" },
      { key: "sail", label: "Vessel sailed", plannedAt: "2026-10-09T02:30:00+05:30", actualAt: null, state: "pending" },
      { key: "bl", label: "Bill of lading released", plannedAt: "2026-10-10T12:00:00+05:30", actualAt: null, state: "pending" },
      { key: "arrive", label: "Arrived Jebel Ali", plannedAt: "2026-10-15T08:00:00+04:00", actualAt: null, state: "pending" },
      { key: "pod", label: "Delivered and POD signed", plannedAt: "2026-10-17T12:00:00+04:00", actualAt: null, state: "pending" },
    ],
  },
  {
    id: "SHP-00437", tradeId: "AMT-2026-00437", containerId: "CMAU 660214-3", status: "in-transit",
    carrier: "CMA CGM", bookingRef: "CMACGM-8871204", vessel: "CMA CGM Bharat", voyage: "0FA2W",
    blNo: "CMDUCOK4471902", blReleasedAt: "2026-10-02T16:00:00+05:30",
    portOfLoading: "INCOK — Cochin", portOfDischarge: "SAJED — Jeddah",
    incoterm: "CFR Jeddah", freightTerms: "Prepaid",
    etd: "2026-10-01T22:00:00+05:30", eta: "2026-10-12T07:00:00+03:00",
    atd: "2026-10-01T23:40:00+05:30", ata: null, etaVarianceHrs: 14, transitDays: 11, remainingShelfLifeDays: 328,
    legs: [
      { id: "SHP-00437-L1", sequence: 1, mode: "road", from: "Kundara processing unit", to: "Cochin terminal", carrier: "Malabar Transport", reference: "TRK-KL-05-CJ-7781", departedAt: "2026-09-30T06:00:00+05:30", arrivedAt: "2026-09-30T13:25:00+05:30", state: "complete" },
      { id: "SHP-00437-L2", sequence: 2, mode: "sea", from: "Cochin", to: "Jeddah", carrier: "CMA CGM", reference: "CMA CGM Bharat 0FA2W", departedAt: "2026-10-01T23:40:00+05:30", arrivedAt: null, state: "in-progress" },
    ],
    charges: [
      { code: "THC-O", label: "Terminal handling — origin", amountUsd: 240, payer: "AMAMA", status: "paid" },
      { code: "OFR", label: "Ocean freight, 40ft HC reefer", amountUsd: 1880, payer: "AMAMA", status: "paid" },
      { code: "DOC", label: "Documentation and B/L fee", amountUsd: 120, payer: "AMAMA", status: "paid" },
      { code: "THC-D", label: "Terminal handling — destination", amountUsd: 265, payer: "Buyer", status: "accrued" },
    ],
    milestones: [
      { key: "vgm", label: "VGM filed", plannedAt: "2026-09-30T10:00:00+05:30", actualAt: "2026-09-30T11:00:00+05:30", state: "complete" },
      { key: "gatein", label: "Terminal gate-in", plannedAt: "2026-09-30T16:00:00+05:30", actualAt: "2026-09-30T13:40:00+05:30", state: "complete" },
      { key: "sail", label: "Vessel sailed", plannedAt: "2026-10-01T22:00:00+05:30", actualAt: "2026-10-01T23:40:00+05:30", state: "complete" },
      { key: "bl", label: "Bill of lading released", plannedAt: "2026-10-02T18:00:00+05:30", actualAt: "2026-10-02T16:00:00+05:30", state: "complete" },
      { key: "arrive", label: "Arrive Jeddah", plannedAt: "2026-10-12T07:00:00+03:00", actualAt: null, state: "pending" },
    ],
  },
  {
    id: "SHP-00433", tradeId: "AMT-2026-00433", containerId: "TGHU 559803-1", status: "stuffing",
    carrier: "Maersk", bookingRef: "MAEU-7719340", vessel: "Maersk Kalmar", voyage: "641W",
    blNo: null, blReleasedAt: null,
    portOfLoading: "INCOK — Cochin", portOfDischarge: "SADMM — Dammam",
    incoterm: "CIF Dammam", freightTerms: "Prepaid",
    etd: "2026-10-10T18:00:00+05:30", eta: "2026-10-21T06:00:00+03:00",
    atd: null, ata: null, etaVarianceHrs: 0, transitDays: 11, remainingShelfLifeDays: 705,
    legs: [
      { id: "SHP-00433-L1", sequence: 1, mode: "road", from: "Kuttanad processing unit", to: "Cochin terminal", carrier: "Malabar Transport", reference: "Pending allocation", departedAt: null, arrivedAt: null, state: "pending" },
      { id: "SHP-00433-L2", sequence: 2, mode: "sea", from: "Cochin", to: "Dammam", carrier: "Maersk", reference: "Maersk Kalmar 641W", departedAt: null, arrivedAt: null, state: "pending" },
    ],
    charges: [
      { code: "OFR", label: "Ocean freight, 20ft dry", amountUsd: 780, payer: "AMAMA", status: "accrued" },
      { code: "INS", label: "Marine cargo insurance", amountUsd: 210, payer: "AMAMA", status: "accrued" },
      { code: "THC-O", label: "Terminal handling — origin", amountUsd: 190, payer: "AMAMA", status: "accrued" },
    ],
    milestones: [
      { key: "stuff", label: "Stuffing complete", plannedAt: "2026-10-08T14:00:00+05:30", actualAt: null, state: "due" },
      { key: "vgm", label: "VGM filed", plannedAt: "2026-10-09T08:00:00+05:30", actualAt: null, state: "pending" },
      { key: "gatein", label: "Terminal gate-in", plannedAt: "2026-10-09T14:00:00+05:30", actualAt: null, state: "pending" },
      { key: "sail", label: "Vessel sailed", plannedAt: "2026-10-10T18:00:00+05:30", actualAt: null, state: "pending" },
    ],
  },
  {
    id: "SHP-00435", tradeId: "AMT-2026-00435", containerId: null, status: "booked",
    carrier: "Hapag-Lloyd", bookingRef: "HLCU-3391077", vessel: "Hapag Kobe Express", voyage: "118W",
    blNo: null, blReleasedAt: null,
    portOfLoading: "INCOK — Cochin", portOfDischarge: "GBLON — London Gateway",
    incoterm: "CIF London Gateway", freightTerms: "Prepaid",
    etd: "2026-10-11T09:00:00+05:30", eta: "2026-10-29T06:00:00+01:00",
    atd: null, ata: null, etaVarianceHrs: 0, transitDays: 18, remainingShelfLifeDays: 498,
    legs: [
      { id: "SHP-00435-L1", sequence: 1, mode: "road", from: "Suntikoppa estate", to: "Cochin terminal", carrier: "Kodagu Freight", reference: "TRK-KA-12-BD-4410", departedAt: null, arrivedAt: null, state: "pending" },
      { id: "SHP-00435-L2", sequence: 2, mode: "sea", from: "Cochin", to: "London Gateway", carrier: "Hapag-Lloyd", reference: "Hapag Kobe Express 118W", departedAt: null, arrivedAt: null, state: "pending" },
    ],
    charges: [
      { code: "OFR", label: "Ocean freight, 20ft dry", amountUsd: 1420, payer: "AMAMA", status: "accrued" },
      { code: "INS", label: "Marine cargo insurance", amountUsd: 340, payer: "AMAMA", status: "accrued" },
      { code: "THC-O", label: "Terminal handling — origin", amountUsd: 190, payer: "AMAMA", status: "accrued" },
    ],
    milestones: [
      { key: "docs", label: "Document set verified", plannedAt: "2026-10-08T10:00:00+05:30", actualAt: null, state: "late" },
      { key: "stuff", label: "Stuffing complete", plannedAt: "2026-10-09T14:00:00+05:30", actualAt: null, state: "pending" },
      { key: "gatein", label: "Terminal gate-in", plannedAt: "2026-10-10T16:00:00+05:30", actualAt: null, state: "pending" },
      { key: "sail", label: "Vessel sailed", plannedAt: "2026-10-11T09:00:00+05:30", actualAt: null, state: "pending" },
    ],
  },
  {
    id: "SHP-00431", tradeId: "AMT-2026-00431", containerId: null, status: "planning",
    carrier: "MSC", bookingRef: "Pending confirmation", vessel: "MSC Lorena", voyage: "2643W",
    blNo: null, blReleasedAt: null,
    portOfLoading: "INMAA — Chennai", portOfDischarge: "NLRTM — Rotterdam",
    incoterm: "CIF Rotterdam", freightTerms: "Prepaid",
    etd: "2026-10-14T20:00:00+05:30", eta: "2026-11-02T07:00:00+01:00",
    atd: null, ata: null, etaVarianceHrs: 0, transitDays: 19, remainingShelfLifeDays: 512,
    legs: [
      { id: "SHP-00431-L1", sequence: 1, mode: "road", from: "Tadikonda", to: "Chennai terminal", carrier: "Coromandel Carriers", reference: "Pending allocation", departedAt: null, arrivedAt: null, state: "pending" },
      { id: "SHP-00431-L2", sequence: 2, mode: "sea", from: "Chennai", to: "Rotterdam", carrier: "MSC", reference: "MSC Lorena 2643W", departedAt: null, arrivedAt: null, state: "pending" },
    ],
    charges: [
      { code: "OFR", label: "Ocean freight, 40ft dry", amountUsd: 1960, payer: "AMAMA", status: "accrued" },
      { code: "INS", label: "Marine cargo insurance", amountUsd: 410, payer: "AMAMA", status: "accrued" },
    ],
    milestones: [
      { key: "book", label: "Booking confirmed", plannedAt: "2026-10-08T12:00:00+05:30", actualAt: null, state: "due" },
      { key: "stuff", label: "Stuffing complete", plannedAt: "2026-10-12T14:00:00+05:30", actualAt: null, state: "pending" },
      { key: "sail", label: "Vessel sailed", plannedAt: "2026-10-14T20:00:00+05:30", actualAt: null, state: "pending" },
    ],
  },
  {
    id: "SHP-00439", tradeId: "AMT-2026-00439", containerId: null, status: "delivered",
    carrier: "MSC", bookingRef: "MSCUBK-4398112", vessel: "MSC Positano", voyage: "2638E",
    blNo: "MEDUMU4398112", blReleasedAt: "2026-09-08T14:00:00+05:30",
    portOfLoading: "INNSA — Nhava Sheva", portOfDischarge: "AEJEA — Jebel Ali",
    incoterm: "CFR Jebel Ali", freightTerms: "Prepaid",
    etd: "2026-09-07T04:00:00+05:30", eta: "2026-09-13T08:00:00+04:00",
    atd: "2026-09-07T05:10:00+05:30", ata: "2026-09-13T11:30:00+04:00", etaVarianceHrs: 3.5,
    transitDays: 6, remainingShelfLifeDays: null,
    legs: [
      { id: "SHP-00439-L1", sequence: 1, mode: "road", from: "Dindori", to: "Nhava Sheva", carrier: "Deccan Reefer Lines", reference: "TRK-MH-15-EK-8842", departedAt: "2026-09-05T18:00:00+05:30", arrivedAt: "2026-09-06T09:20:00+05:30", state: "complete" },
      { id: "SHP-00439-L2", sequence: 2, mode: "sea", from: "Nhava Sheva", to: "Jebel Ali", carrier: "MSC", reference: "MSC Positano 2638E", departedAt: "2026-09-07T05:10:00+05:30", arrivedAt: "2026-09-13T11:30:00+04:00", state: "complete" },
      { id: "SHP-00439-L3", sequence: 3, mode: "road", from: "Jebel Ali", to: "Al Noor cold store, Dubai", carrier: "Buyer's haulier", reference: "DXB-4471", departedAt: "2026-09-14T08:00:00+04:00", arrivedAt: "2026-09-14T11:00:00+04:00", state: "complete" },
    ],
    charges: [
      { code: "THC-O", label: "Terminal handling — origin", amountUsd: 260, payer: "AMAMA", status: "paid" },
      { code: "OFR", label: "Ocean freight, 40ft HC reefer", amountUsd: 1740, payer: "AMAMA", status: "paid" },
      { code: "DOC", label: "Documentation and B/L fee", amountUsd: 120, payer: "AMAMA", status: "paid" },
      { code: "DEM", label: "Demurrage — 1 day at destination", amountUsd: 180, payer: "Buyer", status: "paid" },
    ],
    milestones: [
      { key: "gatein", label: "Terminal gate-in", plannedAt: "2026-09-06T16:00:00+05:30", actualAt: "2026-09-06T14:10:00+05:30", state: "complete" },
      { key: "sail", label: "Vessel sailed", plannedAt: "2026-09-07T04:00:00+05:30", actualAt: "2026-09-07T05:10:00+05:30", state: "complete" },
      { key: "bl", label: "Bill of lading released", plannedAt: "2026-09-08T12:00:00+05:30", actualAt: "2026-09-08T14:00:00+05:30", state: "complete" },
      { key: "arrive", label: "Arrived Jebel Ali", plannedAt: "2026-09-13T08:00:00+04:00", actualAt: "2026-09-13T11:30:00+04:00", state: "complete" },
      { key: "pod", label: "Delivered and POD signed", plannedAt: "2026-09-14T12:00:00+04:00", actualAt: "2026-09-14T11:00:00+04:00", state: "complete" },
    ],
  },
]

export const shipmentById = (id: string): Shipment | undefined =>
  SHIPMENTS.find((shipment) => shipment.id === id)
export const shipmentForTrade = (tradeId: string): Shipment | undefined =>
  SHIPMENTS.find((shipment) => shipment.tradeId === tradeId)

/* ════════════════════════════════════════════════════════════════════
   ORDER FULFILMENT
   ════════════════════════════════════════════════════════════════════ */

/** How much of an order has actually been turned into fruit in a box.
 *  Kept separate from the trade so the contracted number and the real
 *  number never overwrite each other. */
export type OrderFulfilment = {
  tradeId: string
  allocatedMt: number
  harvestedMt: number
  packedMt: number
  shippedMt: number
  lotsCreated: number
  palletsPacked: number
  advanceReceivedUsd: number
  advanceReceivedAt: string | null
  balanceDueUsd: number
  balanceDueAt: string | null
  balanceReceivedAt: string | null
}

export const ORDER_FULFILMENT: OrderFulfilment[] = [
  { tradeId: "AMT-2026-00418", allocatedMt: 20, harvestedMt: 20, packedMt: 19.4, shippedMt: 19.4, lotsCreated: 4, palletsPacked: 20, advanceReceivedUsd: 7080, advanceReceivedAt: "2026-10-02T11:00:00+05:30", balanceDueUsd: 16520, balanceDueAt: "2026-11-08T00:00:00+05:30", balanceReceivedAt: null },
  { tradeId: "AMT-2026-00419", allocatedMt: 0, harvestedMt: 0, packedMt: 0, shippedMt: 0, lotsCreated: 0, palletsPacked: 0, advanceReceivedUsd: 0, advanceReceivedAt: null, balanceDueUsd: 17760, balanceDueAt: null, balanceReceivedAt: null },
  { tradeId: "AMT-2026-00421", allocatedMt: 180, harvestedMt: 0, packedMt: 0, shippedMt: 0, lotsCreated: 0, palletsPacked: 0, advanceReceivedUsd: 0, advanceReceivedAt: null, balanceDueUsd: 290400, balanceDueAt: null, balanceReceivedAt: null },
  { tradeId: "AMT-2026-00423", allocatedMt: 18, harvestedMt: 18, packedMt: 0, shippedMt: 0, lotsCreated: 0, palletsPacked: 0, advanceReceivedUsd: 7128, advanceReceivedAt: "2026-09-26T10:00:00+05:30", balanceDueUsd: 16632, balanceDueAt: null, balanceReceivedAt: null },
  { tradeId: "AMT-2026-00425", allocatedMt: 16, harvestedMt: 16, packedMt: 0, shippedMt: 0, lotsCreated: 3, palletsPacked: 0, advanceReceivedUsd: 0, advanceReceivedAt: null, balanceDueUsd: 26400, balanceDueAt: null, balanceReceivedAt: null },
  { tradeId: "AMT-2026-00427", allocatedMt: 26, harvestedMt: 26, packedMt: 0, shippedMt: 0, lotsCreated: 2, palletsPacked: 0, advanceReceivedUsd: 3861, advanceReceivedAt: "2026-09-30T12:00:00+05:30", balanceDueUsd: 9009, balanceDueAt: null, balanceReceivedAt: null },
  { tradeId: "AMT-2026-00429", allocatedMt: 22, harvestedMt: 22, packedMt: 0, shippedMt: 0, lotsCreated: 3, palletsPacked: 0, advanceReceivedUsd: 4356, advanceReceivedAt: "2026-09-27T09:00:00+05:30", balanceDueUsd: 10164, balanceDueAt: null, balanceReceivedAt: null },
  { tradeId: "AMT-2026-00431", allocatedMt: 54, harvestedMt: 54, packedMt: 54, shippedMt: 0, lotsCreated: 6, palletsPacked: 54, advanceReceivedUsd: 0, advanceReceivedAt: null, balanceDueUsd: 124740, balanceDueAt: null, balanceReceivedAt: null },
  { tradeId: "AMT-2026-00433", allocatedMt: 34, harvestedMt: 34, packedMt: 34, shippedMt: 0, lotsCreated: 4, palletsPacked: 34, advanceReceivedUsd: 37060, advanceReceivedAt: "2026-09-20T10:00:00+05:30", balanceDueUsd: 37060, balanceDueAt: null, balanceReceivedAt: null },
  { tradeId: "AMT-2026-00435", allocatedMt: 19.2, harvestedMt: 19.2, packedMt: 19.2, shippedMt: 0, lotsCreated: 3, palletsPacked: 20, advanceReceivedUsd: 0, advanceReceivedAt: null, balanceDueUsd: 85440, balanceDueAt: "2026-11-28T00:00:00+05:30", balanceReceivedAt: null },
  { tradeId: "AMT-2026-00437", allocatedMt: 17, harvestedMt: 17, packedMt: 17, shippedMt: 17, lotsCreated: 2, palletsPacked: 17, advanceReceivedUsd: 0, advanceReceivedAt: null, balanceDueUsd: 97750, balanceDueAt: "2026-11-01T00:00:00+05:30", balanceReceivedAt: null },
  { tradeId: "AMT-2026-00439", allocatedMt: 48, harvestedMt: 48, packedMt: 47.6, shippedMt: 47.6, lotsCreated: 5, palletsPacked: 48, advanceReceivedUsd: 5112, advanceReceivedAt: "2026-08-20T10:00:00+05:30", balanceDueUsd: 11786, balanceDueAt: "2026-10-08T00:00:00+05:30", balanceReceivedAt: "2026-10-06T14:00:00+05:30" },
]

export const fulfilmentForTrade = (tradeId: string): OrderFulfilment | undefined =>
  ORDER_FULFILMENT.find((row) => row.tradeId === tradeId)


/* ════════════════════════════════════════════════════════════════════
   ENTITY RESOLVER — what makes the peek panel work
   ════════════════════════════════════════════════════════════════════ */

export type ResolvedEntity = {
  ref: EntityRef
  title: string
  subtitle: string
  /** The record itself, for the panel to render in full. */
  record: unknown
}

/** Any id, anywhere in the product, resolves to exactly one record. If
 *  this returns null the id was a typo — which is the point of having a
 *  single resolver rather than fifteen lookups scattered across screens. */
export function resolveEntity(ref: EntityRef): ResolvedEntity | null {
  const wrap = (title: string, subtitle: string, record: unknown): ResolvedEntity => ({ ref, title, subtitle, record })

  switch (ref.kind) {
    case "trade": {
      const trade = tradeById(ref.id)
      if (!trade) return null
      const buyer = buyerById(trade.buyerId)
      return wrap(trade.id, `${productById(trade.productId)?.label ?? trade.productId} · ${buyer?.company ?? ""}`, trade)
    }
    case "lot": {
      const lot = lotById(ref.id)
      if (!lot) return null
      return wrap(lot.id, `${(lot.qtyAcceptedKg / 1000).toFixed(1)} MT · ${sellerById(lot.sellerId)?.name ?? ""}`, lot)
    }
    case "pallet": {
      const pallet = palletById(ref.id)
      if (!pallet) return null
      return wrap(pallet.id, `${pallet.cartons} cartons · ${pallet.netKg} kg net`, pallet)
    }
    case "container": {
      const container = containerById(ref.id)
      if (!container) return null
      return wrap(container.id, `${container.type} · ${container.vessel} ${container.voyage}`, container)
    }
    case "document": {
      const document = documentById(ref.id)
      if (!document) return null
      return wrap(document.name, `${document.tradeId} · stage ${String(document.stage).padStart(2, "0")}`, document)
    }
    case "user": {
      const user = userById(ref.id)
      if (!user) return null
      return wrap(user.name, user.title, user)
    }
    case "buyer": {
      const buyer = buyerById(ref.id)
      if (!buyer) return null
      return wrap(buyer.company, `${buyer.city}, ${buyer.country}`, buyer)
    }
    case "seller": {
      const seller = sellerById(ref.id)
      if (!seller) return null
      return wrap(seller.name, `${seller.entity} · ${seller.village}, ${seller.state}`, seller)
    }
    case "product": {
      const product = productById(ref.id)
      if (!product) return null
      return wrap(product.label, `HS ${product.hsCode} · ${variantsForProduct(product.id).length} variants`, product)
    }
    case "variant": {
      const variant = variantById(ref.id)
      if (!variant) return null
      return wrap(variant.label, `${productById(variant.productId)?.label ?? ""} · ${variant.spec}`, variant)
    }
    case "listing": {
      const listing = listingById(ref.id)
      if (!listing) return null
      return wrap(
        `${variantById(listing.variantId)?.label ?? listing.variantId}`,
        `${sellerById(listing.sellerId)?.entity ?? ""} · USD ${listing.priceUsdPerMt}/MT`,
        listing
      )
    }
    case "conversation": {
      const conversation = conversationById(ref.id)
      if (!conversation) return null
      return wrap(conversation.subject, `${messagesForConversation(conversation.id).length} messages`, conversation)
    }
    case "rfq": {
      const rfq = rfqById(ref.id)
      if (!rfq) return null
      return wrap(rfq.id, `${rfq.qtyMt} MT · ${buyerById(rfq.buyerId)?.company ?? ""}`, rfq)
    }
    case "quote": {
      const quote = quoteById(ref.id)
      if (!quote) return null
      return wrap(quote.id, `${sellerById(quote.sellerId)?.entity ?? ""} · USD ${quote.priceUsdPerMt}/MT`, quote)
    }
    case "termSheet": {
      const sheet = termSheetById(ref.id)
      if (!sheet) return null
      const agreed = sheet.clauses.filter((clause) => clause.status === "agreed").length
      return wrap(sheet.id, `${agreed} of ${sheet.clauses.length} clauses agreed · v${sheet.version}`, sheet)
    }
    case "po": {
      const po = poById(ref.id)
      if (!po) return null
      return wrap(po.id, `${po.qtyMt} MT · USD ${po.priceUsdPerMt}/MT · ${po.status}`, po)
    }
    case "shipment": {
      const shipment = shipmentById(ref.id)
      if (!shipment) return null
      return wrap(shipment.id, `${shipment.carrier} · ${shipment.vessel} ${shipment.voyage}`, shipment)
    }
    case "stage": {
      const n = Number(ref.id) as StageNo
      const stage = STAGES[n - 1]
      if (!stage) return null
      return wrap(`${String(stage.n).padStart(2, "0")} · ${stage.name}`, roleById(stage.ownerRole).label, stage)
    }
    case "event": {
      const event = eventById(ref.id)
      if (!event) return null
      return wrap(event.summary, event.at, event)
    }
    case "notification": {
      const notification = notificationById(ref.id)
      if (!notification) return null
      return wrap(notification.title, notification.level, notification)
    }
    default:
      return null
  }
}

/* ════════════════════════════════════════════════════════════════════
   SEARCH — what the command palette runs against
   ════════════════════════════════════════════════════════════════════ */

export type SearchHit = { ref: EntityRef; title: string; subtitle: string; group: string }

/** One flat index over everything addressable. Built once at module load
 *  rather than per keystroke. */
export const SEARCH_INDEX: SearchHit[] = [
  ...TRADES.map((trade) => ({ ref: { kind: "trade" as const, id: trade.id }, title: trade.id, subtitle: `${productById(trade.productId)?.label ?? ""} · ${buyerById(trade.buyerId)?.company ?? ""}`, group: "Trades" })),
  ...LOTS.map((lot) => ({ ref: { kind: "lot" as const, id: lot.id }, title: lot.id, subtitle: `${sellerById(lot.sellerId)?.entity ?? ""} · ${(lot.qtyAcceptedKg / 1000).toFixed(1)} MT`, group: "Lots" })),
  ...CONTAINERS.map((container) => ({ ref: { kind: "container" as const, id: container.id }, title: container.id, subtitle: `${container.vessel} ${container.voyage}`, group: "Containers" })),
  ...PALLETS.map((pallet) => ({ ref: { kind: "pallet" as const, id: pallet.id }, title: pallet.id, subtitle: `${pallet.cartons} cartons · ${pallet.netKg} kg`, group: "Pallets" })),
  ...DOCUMENTS.map((document) => ({ ref: { kind: "document" as const, id: document.id }, title: document.name, subtitle: `${document.tradeId} · ${document.status}`, group: "Documents" })),
  ...BUYERS.map((buyer) => ({ ref: { kind: "buyer" as const, id: buyer.id }, title: buyer.company, subtitle: `${buyer.city}, ${buyer.country}`, group: "Buyers" })),
  ...SELLERS.map((seller) => ({ ref: { kind: "seller" as const, id: seller.id }, title: seller.entity, subtitle: `${seller.name} · ${seller.district}, ${seller.state}`, group: "Sellers" })),
  ...INTERNAL_USERS.map((user) => ({ ref: { kind: "user" as const, id: user.id }, title: user.name, subtitle: user.title, group: "People" })),
  ...RFQS.map((rfq) => ({ ref: { kind: "rfq" as const, id: rfq.id }, title: rfq.id, subtitle: `${rfq.qtyMt} MT · ${buyerById(rfq.buyerId)?.company ?? ""}`, group: "RFQs" })),
  ...TERM_SHEETS.map((sheet) => ({ ref: { kind: "termSheet" as const, id: sheet.id }, title: sheet.id, subtitle: `${buyerById(sheet.buyerId)?.company ?? ""} · ${sheet.status}`, group: "Term sheets" })),
  ...PURCHASE_ORDERS.map((po) => ({ ref: { kind: "po" as const, id: po.id }, title: po.id, subtitle: `${po.qtyMt} MT · ${po.status}`, group: "Purchase orders" })),
  ...CONVERSATIONS.map((conversation) => ({ ref: { kind: "conversation" as const, id: conversation.id }, title: conversation.subject, subtitle: conversation.kind, group: "Conversations" })),
  ...PRODUCTS.map((product) => ({ ref: { kind: "product" as const, id: product.id }, title: product.label, subtitle: `HS ${product.hsCode}`, group: "Products" })),
  ...VARIANTS.map((variant) => ({ ref: { kind: "variant" as const, id: variant.id }, title: variant.label, subtitle: variant.spec, group: "Variants" })),
  ...SHIPMENTS.map((shipment) => ({ ref: { kind: "shipment" as const, id: shipment.id }, title: shipment.id, subtitle: `${shipment.vessel} ${shipment.voyage} · ${shipment.status}`, group: "Shipments" })),
  ...STAGES.map((stage) => ({ ref: { kind: "stage" as const, id: String(stage.n) }, title: `${String(stage.n).padStart(2, "0")} · ${stage.name}`, subtitle: roleById(stage.ownerRole).label, group: "Stages" })),
]

export function search(query: string, limit = 12): SearchHit[] {
  const term = query.trim().toLowerCase()
  if (!term) return []
  return SEARCH_INDEX.filter(
    (hit) =>
      hit.title.toLowerCase().includes(term) ||
      hit.subtitle.toLowerCase().includes(term) ||
      hit.ref.id.toLowerCase().includes(term)
  ).slice(0, limit)
}
