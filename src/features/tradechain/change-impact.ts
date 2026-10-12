import * as W from "@/features/tradechain/demo-world"

/**
 * Chain E's four assessments — inventory, logistics, cost & margin,
 * documents — run against a proposed change before anyone decides on it.
 *
 * The numbers are estimates, not a costing engine: what they must get
 * right is the shape the brief insists on — the same change costs more the
 * later in the trade it arrives, and some changes stop being possible at
 * all once the container is sealed or inside the terminal gate.
 */

/** Planned margin by category, used when a trade has no approved change
 *  that already restated it. */
const CATEGORY_MARGIN_PCT: Record<string, number> = {
  fruits: 11,
  vegetables: 8.6,
  grains: 6.2,
  spices: 12,
  pulses: 7,
  "tea-coffee": 13.5,
  "dry-fruits": 10.9,
  processed: 9,
}

/** Net MT one container carries, by category — enough to tell whether a
 *  quantity change spills into another box. */
const CONTAINER_MT: Record<string, number> = {
  fruits: 20,
  vegetables: 28,
  grains: 26,
  spices: 18,
  pulses: 26,
  "tea-coffee": 19.2,
  "dry-fruits": 17,
  processed: 20,
}

/** Documents each kind of change touches. Only the ones already issued
 *  (their stage reached) need amending; the rest are simply drawn up
 *  against the revised plan. */
const AFFECTED_DOCUMENTS: Record<W.ChangeKind, string[]> = {
  quantity: [
    "Purchase Order", "Sales Contract", "Grade & Quantity Declaration", "Packing List (draft)", "Pallet Manifest",
    "Booking Confirmation", "VGM Declaration", "Commercial Invoice", "Packing List (final)", "Shipping Bill",
  ],
  price: ["Purchase Order", "Sales Contract", "Incoterm & Payment Terms", "Commercial Invoice", "Shipping Bill"],
  date: ["Sales Contract", "Harvest Calendar", "Booking Confirmation", "Insurance Certificate"],
  destination: [
    "Sales Contract", "Booking Confirmation", "Phytosanitary Certificate", "Certificate of Origin",
    "Insurance Certificate", "Shipping Bill", "Bill of Lading (draft)", "Bill of Lading (final)",
  ],
  spec: ["Product & Quality Spec", "Packaging Spec", "Field QC Report", "Export QC Certificate", "Labelling / Country of Origin"],
}

const APPROVER: Record<W.ChangeKind, W.InternalRoleId> = {
  quantity: "master-admin",
  price: "master-admin",
  date: "master-kam",
  destination: "master-kam",
  spec: "master-kam",
}

const DAY = 86_400_000

const round1 = (value: number) => Math.round(value * 10) / 10

function categoryOf(trade: W.Trade): string {
  return W.productById(trade.productId)?.categoryId ?? "fruits"
}

/** The trade's margin as it stands — the last approved change restated
 *  it, otherwise the category plan. */
function plannedMarginPct(trade: W.Trade): number {
  const approved = W.changeRequestsForTrade(trade.id).find((request) => request.status === "approved")
  return approved?.impact.marginAfterPct ?? CATEGORY_MARGIN_PCT[categoryOf(trade)] ?? 10
}

/** 1× before signature, rising to 4× at settlement. */
const lateness = (stage: W.StageNo): number => 1 + (stage - 1) / 5

type Assessment = {
  impact: W.ChangeImpact
  approverRole: W.InternalRoleId
  /** Reasons the change is risky or no longer physically possible. */
  warnings: string[]
}

function assessChange(trade: W.Trade, kind: W.ChangeKind, patch: W.ChangePatch): Assessment {
  const stage = trade.currentStage
  const factor = lateness(stage)
  const category = categoryOf(trade)
  const margin = plannedMarginPct(trade)
  const revenue = trade.qtyContractedMt * trade.priceUsdPerMt
  const accepted = W.lotsForTrade(trade.id).reduce((sum, lot) => sum + lot.qtyAcceptedKg, 0) / 1000
  const warnings: string[] = []

  let inventory = "No change to allocated stock."
  let logistics = "No change to the booking."
  /** Friction the change itself costs — re-planning, extra boxes, storage. */
  let costUsd = 0
  let revenueUsd = 0
  /** Cost of the goods a quantity change adds or removes. Not a cost of the
   *  change, but it decides what the extra revenue is worth. */
  let goodsUsd = 0

  if (kind === "quantity" && patch.qtyContractedMt !== undefined) {
    const delta = patch.qtyContractedMt - trade.qtyContractedMt
    revenueUsd = delta * trade.priceUsdPerMt
    goodsUsd = delta * trade.priceUsdPerMt * (1 - margin / 100)
    const capacity = CONTAINER_MT[category] ?? 20
    const boxesBefore = Math.ceil(trade.qtyContractedMt / capacity)
    const boxesAfter = Math.ceil(patch.qtyContractedMt / capacity)
    const extraBoxes = Math.max(0, boxesAfter - boxesBefore)
    costUsd = Math.abs(delta) * 30 * factor + extraBoxes * 2200
    if (accepted > 0) {
      const gap = patch.qtyContractedMt - accepted
      inventory =
        gap > 0.05
          ? `Lots cover ${round1(accepted)} MT — ${round1(gap)} MT more must be picked, inspected and lotted.`
          : `Lots already cover ${round1(accepted)} MT — ${round1(-gap)} MT surplus goes to buffer stock.`
    } else {
      inventory = delta > 0 ? `${round1(delta)} MT more to allocate from the grower network.` : `${round1(-delta)} MT released back to growers.`
    }
    logistics =
      extraBoxes > 0
        ? `Spills into ${extraBoxes} more container${extraBoxes > 1 ? "s" : ""} — a second booking at part load.`
        : `Still ${boxesAfter} container${boxesAfter > 1 ? "s" : ""}; stowage plan re-cut.`
    if (stage >= 10 && delta > 0) warnings.push("The container is sealed — extra quantity needs a separate shipment.")
    if (stage >= 13) warnings.push("Container is inside the terminal gate — quantity is frozen.")
  }

  if (kind === "price" && patch.priceUsdPerMt !== undefined) {
    revenueUsd = (patch.priceUsdPerMt - trade.priceUsdPerMt) * trade.qtyContractedMt
    inventory = "No change — the same cargo at a different price."
    if (stage >= 14) warnings.push("The B/L is out — the invoice must be reissued and the LC or bank set amended.")
  }

  if (kind === "date" && patch.deliveryWindow) {
    const days = Math.round((new Date(patch.deliveryWindow[1]).getTime() - new Date(trade.deliveryWindow[1]).getTime()) / DAY)
    const storage = days > 0 && stage >= 4 && stage <= 13 ? days * trade.qtyContractedMt * 1.2 : 0
    const rebook = stage >= 9 && stage <= 13 ? 350 * factor : 0
    costUsd = storage + rebook
    const product = W.productById(trade.productId)
    inventory =
      days > 0
        ? `Holds ${days} more day${days === 1 ? "" : "s"}${storage ? ` in store at about USD ${Math.round(storage)}` : ""}.`
        : days < 0
          ? `Pulls the schedule ${-days} day${days === -1 ? "" : "s"} forward — packing compressed.`
          : "Window shape changes; end date holds."
    logistics = rebook > 0 ? "Sailing re-evaluated against the new window — rebooking likely." : stage >= 14 ? "At sea — window cover only." : "Booking made against the new window."
    if (product && days > 0 && product.shelfLifeDays < 60) warnings.push(`Short shelf-life cargo (${product.shelfLifeDays} d budget) — every extra day comes off the buyer's shelf.`)
  }

  if (kind === "destination") {
    costUsd = 400 * factor
    logistics =
      stage >= 14
        ? "At sea — only destination-side documents and haulage can change."
        : stage >= 9
          ? "Booking re-routed; transit time and freight re-quoted."
          : "Sailing booked against the new port."
    inventory = "No change to stock."
    if (stage >= 12 && stage < 14) warnings.push("Shipping bill is filed or due — a destination change means an amendment with customs.")
  }

  if (kind === "spec") {
    costUsd = trade.qtyContractedMt * 15 * factor
    inventory =
      stage >= 3
        ? "Accepted lots re-graded against the revised spec; some may fall out."
        : "Allocation re-checked against the revised spec before QC."
    logistics = "No change to the booking."
    if (stage >= 8) warnings.push("Export QC has started — a spec change re-opens it.")
    if (stage >= 13) warnings.push("Container is inside the terminal gate — the spec is frozen.")
  }

  const profitBefore = (revenue * margin) / 100
  const revenueAfter = revenue + revenueUsd
  const profitAfter = profitBefore + revenueUsd - goodsUsd - costUsd
  const marginAfterPct = revenueAfter > 0 ? round1((profitAfter / revenueAfter) * 100) : 0

  const documents = AFFECTED_DOCUMENTS[kind].filter((name) => {
    const owner = W.STAGES.find((entry) => entry.docs.some((doc) => doc.name === name))
    return owner ? owner.n <= stage : false
  })

  return {
    impact: {
      inventory,
      logistics,
      costUsd: Math.round(costUsd),
      revenueUsd: Math.round(revenueUsd),
      marginBeforePct: round1(margin),
      marginAfterPct,
      documents: documents.length > 0 ? documents : ["Sales Contract"],
    },
    approverRole: APPROVER[kind],
    warnings,
  }
}

/** "14 MT" → the human side of a patch, for the request's from / to. */
function describeChange(trade: W.Trade, kind: W.ChangeKind, patch: W.ChangePatch): { from: string; to: string } {
  const day = (iso: string) =>
    new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso))
  switch (kind) {
    case "quantity":
      return { from: `${trade.qtyContractedMt} MT`, to: `${patch.qtyContractedMt} MT` }
    case "price":
      return { from: `USD ${trade.priceUsdPerMt.toLocaleString("en-US")} / MT`, to: `USD ${patch.priceUsdPerMt?.toLocaleString("en-US")} / MT` }
    case "date":
      return {
        from: `${day(trade.deliveryWindow[0])} – ${day(trade.deliveryWindow[1])}`,
        to: patch.deliveryWindow ? `${day(patch.deliveryWindow[0])} – ${day(patch.deliveryWindow[1])}` : "—",
      }
    case "destination":
      return { from: trade.portOfDischarge, to: patch.portOfDischarge ?? patch.destination ?? "—" }
    case "spec":
      return { from: trade.spec, to: patch.spec ?? "—" }
  }
}

export { assessChange, describeChange, plannedMarginPct }
export type { Assessment }
