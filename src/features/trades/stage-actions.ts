import type * as W from "@/features/tradechain/demo-world"
import type { TradePerspective } from "@/features/trades/trade-access"

/**
 * What each party can do at each stage — the brief's "Human action" line,
 * broken into the checklist a person actually works through, the
 * decisions that branch the stage into another chain, and the one button
 * that closes it.
 *
 * Every action runs client-side through `live-world`: it moves the demo
 * world in this browser and nothing else.
 */

type StageTask = { id: string; label: string; by: TradePerspective }

type StageDecision = {
  id: string
  label: string
  by: TradePerspective[]
  tone: "primary" | "neutral" | "danger"
  /** What the decision does to the trade. */
  effect:
    | { kind: "complete"; note: string }
    | { kind: "flag"; scenario: "B" | "C" | "D"; note: string }
    | { kind: "documents"; names: string[]; status: W.DocStatus; note: string }
    | { kind: "note"; summary: string }
    | { kind: "claim" }
}

type StageActionSpec = {
  /** The label on the button that closes the stage. */
  complete: string
  /** Who may close it. */
  completeBy: TradePerspective[]
  tasks: StageTask[]
  decisions: StageDecision[]
}

const t = (id: string, label: string, by: TradePerspective = "internal"): StageTask => ({ id, label, by })

const STAGE_ACTIONS: Record<W.StageNo, StageActionSpec> = {
  1: {
    complete: "Approve & sign contract",
    completeBy: ["internal"],
    tasks: [
      t("terms", "Negotiate terms with the buyer"),
      t("kyc", "Check buyer KYC and import licence"),
      t("review", "Review the contract terms", "buyer"),
    ],
    decisions: [
      { id: "stalled", label: "Buyer response overdue", by: ["internal"], tone: "neutral", effect: { kind: "flag", scenario: "B", note: "Buyer has not responded inside 48 hours — follow-up task created." } },
      { id: "kyc-missing", label: "KYC missing", by: ["internal"], tone: "neutral", effect: { kind: "flag", scenario: "D", note: "Buyer KYC / import licence missing — contract set to PENDING COMPLIANCE." } },
    ],
  },
  2: {
    complete: "Confirm allocation",
    completeBy: ["internal"],
    tasks: [
      t("match", "Match demand to grower capacity"),
      t("call", "Call growers to confirm harvest window and price"),
      t("confirm", "Confirm harvest window and price", "seller"),
    ],
    decisions: [
      { id: "late", label: "Grower confirmation late", by: ["internal"], tone: "neutral", effect: { kind: "flag", scenario: "B", note: "Grower confirmation is past the 5-day SLA — alternate growers shortlisted." } },
      { id: "shortfall", label: "Yield shortfall", by: ["internal"], tone: "danger", effect: { kind: "flag", scenario: "C", note: "Crop forecast below the contracted quantity — supply gap being searched in the region." } },
    ],
  },
  3: {
    complete: "Pass & sign off",
    completeBy: ["internal"],
    tasks: [
      t("grade", "Grade the sample against the buyer spec"),
      t("evidence", "Capture photos, GPS and timestamp"),
      t("ready", "Harvest ready for inspection", "seller"),
    ],
    decisions: [
      { id: "conditional", label: "Conditional pass", by: ["internal"], tone: "neutral", effect: { kind: "complete", note: "QC returned CONDITIONAL PASS — accepted with a re-check at export QC." } },
      { id: "hold", label: "Hold", by: ["internal"], tone: "neutral", effect: { kind: "flag", scenario: "B", note: "QC on HOLD pending a wider sample." } },
      { id: "reject", label: "Reject", by: ["internal"], tone: "danger", effect: { kind: "flag", scenario: "C", note: "QC record marked REJECT — lot creation blocked, replacement supply search triggered." } },
    ],
  },
  4: {
    complete: "Close lot creation",
    completeBy: ["internal"],
    tasks: [
      t("quantity", "Confirm quantity and grade against each lot"),
      t("labels", "Print QR labels"),
    ],
    decisions: [
      { id: "mismatch", label: "Quantity mismatch", by: ["internal"], tone: "neutral", effect: { kind: "flag", scenario: "C", note: "Weighed quantity does not match the QC record — lot on HOLD." } },
    ],
  },
  5: {
    complete: "Dispatch truck",
    completeBy: ["internal"],
    tasks: [
      t("assign", "Assign truck and driver"),
      t("weigh", "Record start weight and temperature"),
      t("handover", "Hand over the load at the farm gate", "seller"),
    ],
    decisions: [
      { id: "delayed", label: "Truck delayed", by: ["internal"], tone: "neutral", effect: { kind: "flag", scenario: "B", note: "Truck delayed at origin — warehouse inbound slot rescheduled." } },
      { id: "breakdown", label: "Truck breakdown", by: ["internal"], tone: "danger", effect: { kind: "flag", scenario: "C", note: "Truck broke down en route — backup vehicle search triggered, cold-chain clock reassessed." } },
    ],
  },
  6: {
    complete: "Close inbound",
    completeBy: ["internal"],
    tasks: [
      t("dock", "Assign a dock"),
      t("weight", "Verify weight against the manifest"),
      t("zone", "Scan lots and allocate a zone"),
    ],
    decisions: [
      { id: "late", label: "Arrived outside window", by: ["internal"], tone: "neutral", effect: { kind: "flag", scenario: "B", note: "Truck arrived outside its appointment window — new dock slot allocated." } },
      { id: "capacity", label: "No zone capacity", by: ["internal"], tone: "danger", effect: { kind: "flag", scenario: "C", note: "No capacity in the required zone — inbound on HOLD at the gate, overflow being searched." } },
    ],
  },
  7: {
    complete: "Release to packing",
    completeBy: ["internal"],
    tasks: [
      t("target", "Confirm target temperature reached"),
      t("alerts", "Acknowledge open temperature alerts"),
    ],
    decisions: [
      { id: "quarantine", label: "Quarantine lot", by: ["internal"], tone: "danger", effect: { kind: "flag", scenario: "C", note: "Temperature exceeded threshold — lot moved to quarantine for QC re-inspection." } },
    ],
  },
  8: {
    complete: "Sign off export QC",
    completeBy: ["internal"],
    tasks: [
      t("checks", "Check grade, labelling and origin marks"),
      t("pallets", "Generate pallet IDs and link them to lots"),
    ],
    decisions: [
      { id: "reject-pallet", label: "Reject a pallet", by: ["internal"], tone: "danger", effect: { kind: "flag", scenario: "C", note: "Pallet failed export QC — container allocation re-planned, buffer stock pulled." } },
    ],
  },
  9: {
    complete: "Confirm booking",
    completeBy: ["internal"],
    tasks: [
      t("compare", "Compare primary and backup sailing"),
      t("setpoint", "Confirm set-point and ventilation"),
    ],
    decisions: [
      { id: "backup", label: "Switch to backup sailing", by: ["internal"], tone: "neutral", effect: { kind: "note", summary: "Switched to the backup sailing — cost and transit impact logged" } },
      { id: "no-reefer", label: "Reefer unavailable", by: ["internal"], tone: "danger", effect: { kind: "flag", scenario: "C", note: "No reefer on the primary sailing — booking AT RISK, backup recommended." } },
    ],
  },
  10: {
    complete: "Seal container",
    completeBy: ["internal"],
    tasks: [
      t("pti", "Inspect the container and PTI"),
      t("scan", "Scan pallets against the manifest"),
      t("seal", "Record seal number and VGM"),
      t("temp", "Check temperature at close-out"),
    ],
    decisions: [
      { id: "late", label: "Container late", by: ["internal"], tone: "neutral", effect: { kind: "flag", scenario: "B", note: "Empty container arrived late — priority terminal slot requested." } },
      { id: "pti-fail", label: "PTI failure", by: ["internal"], tone: "danger", effect: { kind: "flag", scenario: "C", note: "Container failed PTI — loading halted, replacement requested from the line." } },
    ],
  },
  11: {
    complete: "Approve document set",
    completeBy: ["internal"],
    tasks: [
      t("verify", "Verify every mandatory document"),
      t("remind", "Send D-1 reminders on anything open"),
    ],
    decisions: [
      { id: "missing", label: "Document missing", by: ["internal"], tone: "danger", effect: { kind: "flag", scenario: "D", note: "Mandatory document missing at D-3 — export clearance blocked, CHA engaged." } },
    ],
  },
  12: {
    complete: "Record LEO",
    completeBy: ["internal"],
    tasks: [
      t("file", "File shipping bill and e-SANCHIT"),
      t("query", "Respond to any customs query"),
    ],
    decisions: [
      { id: "discrepancy", label: "Examination discrepancy", by: ["internal"], tone: "danger", effect: { kind: "flag", scenario: "C", note: "Customs examination flagged a discrepancy — filing BLOCKED, correction being prepared." } },
    ],
  },
  13: {
    complete: "Confirm gate-in",
    completeBy: ["internal"],
    tasks: [
      t("slot", "Book the terminal appointment"),
      t("vgm", "Confirm VGM accepted by the line"),
    ],
    decisions: [
      { id: "missed", label: "Missed cut-off", by: ["internal"], tone: "danger", effect: { kind: "flag", scenario: "C", note: "Container missed the terminal cut-off — roll risk assessed, backup sailing evaluated." } },
    ],
  },
  14: {
    complete: "Mark arrived",
    completeBy: ["internal"],
    tasks: [
      t("eta", "Review ETA variance against shelf life"),
      t("update", "Update the buyer on the ETA"),
      t("ack", "Acknowledge the revised ETA", "buyer"),
    ],
    decisions: [
      { id: "delay", label: "Material delay", by: ["internal"], tone: "danger", effect: { kind: "flag", scenario: "C", note: "Vessel delayed materially beyond ETA — shelf life vs buyer deadline recalculated." } },
    ],
  },
  15: {
    complete: "Confirm delivery",
    completeBy: ["buyer", "internal"],
    tasks: [
      t("track", "Track discharge and import clearance"),
      t("inspect", "Inspect the cargo on arrival", "buyer"),
    ],
    decisions: [
      { id: "pod", label: "Countersign POD", by: ["buyer"], tone: "neutral", effect: { kind: "documents", names: ["Proof of Delivery (POD)"], status: "VERIFIED", note: "Countersigned by the buyer after unloading and carton count." } },
      { id: "quality", label: "Confirm quality — no claim", by: ["buyer"], tone: "neutral", effect: { kind: "documents", names: ["Final Quality Confirmation"], status: "VERIFIED", note: "Arrival QC clean — claim window closed by the buyer." } },
      { id: "claim", label: "Raise a claim", by: ["buyer", "internal"], tone: "danger", effect: { kind: "claim" } },
    ],
  },
  16: {
    complete: "Close trade",
    completeBy: ["internal"],
    tasks: [
      t("receipt", "Confirm bank receipt"),
      t("reconcile", "Reconcile payment against invoice and costs"),
      t("payout", "Release farmer payout"),
      t("advice", "Send the payment advice", "buyer"),
      t("payout-ack", "Confirm payout received", "seller"),
    ],
    decisions: [
      { id: "overdue", label: "Payment overdue", by: ["internal"], tone: "neutral", effect: { kind: "flag", scenario: "B", note: "Buyer payment not received by the due date — reminder sent, working-capital risk flagged." } },
      { id: "margin", label: "Margin below threshold", by: ["internal"], tone: "danger", effect: { kind: "flag", scenario: "C", note: "Realised margin below the minimum — cost breakdown under review against plan." } },
    ],
  },
}

/** Which documents a party may put on file themselves — the ones it
 *  issues. Everything else is uploaded and verified by AMAMA. */
function canUpload(perspective: TradePerspective, issuer: string): boolean {
  if (perspective === "internal") return true
  if (perspective === "buyer") return /buyer/i.test(issuer)
  return /farmer/i.test(issuer)
}

export { STAGE_ACTIONS, canUpload }
export type { StageActionSpec, StageDecision, StageTask }
