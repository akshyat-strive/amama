/**
 * The eleven Incoterms® 2020 rules, in their own canonical order — EXW to
 * DDP is a real progression (each step hands the seller one more leg of
 * the journey to the buyer's own door), not an alphabetical accident, so
 * every picker and the reference table both use this exact order.
 * Source: ICC Incoterms 2020 (https://incodocs.com/blog/incoterms-2020-explained-the-complete-guide/).
 */
export type IncotermCode = "EXW" | "FCA" | "FAS" | "FOB" | "CFR" | "CIF" | "CPT" | "CIP" | "DAP" | "DPU" | "DDP"

export const INCOTERM_ORDER: IncotermCode[] = ["EXW", "FCA", "FAS", "FOB", "CFR", "CIF", "CPT", "CIP", "DAP", "DPU", "DDP"]

export const INCOTERM_NAMES: Record<IncotermCode, string> = {
  EXW: "Ex Works",
  FCA: "Free Carrier",
  FAS: "Free Alongside Ship",
  FOB: "Free on Board",
  CFR: "Cost and Freight",
  CIF: "Cost, Insurance and Freight",
  CPT: "Carriage Paid To",
  CIP: "Carriage and Insurance Paid To",
  DAP: "Delivered at Place",
  DPU: "Delivered at Place Unloaded",
  DDP: "Delivered Duty Paid",
}

/** `FAS`, `FOB`, `CFR` and `CIF` only ever apply to sea or inland
 *  waterway carriage — the other seven work for any mode, including
 *  multimodal. Shown as a small qualifier next to the code, since picking
 *  a sea-only term for an air shipment is exactly the kind of mistake
 *  this picker should make harder, not easier. */
export const INCOTERM_SEA_ONLY: Set<IncotermCode> = new Set(["FAS", "FOB", "CFR", "CIF"])

type Responsibility = "seller" | "buyer" | "varies"

/**
 * Who carries each obligation/charge, per rule — the same matrix a
 * standard Incoterms wall chart shows, columns running left (seller's own
 * premises) to right (buyer's named destination) in step with
 * `INCOTERM_ORDER`. A reference for who-pays-what, not a substitute for
 * reading the actual rule text on a specific contract — noted in the
 * dialog that shows this.
 */
export const INCOTERM_OBLIGATIONS: { label: string; responsibility: Record<IncotermCode, Responsibility> }[] = [
  {
    label: "Export packaging",
    responsibility: { EXW: "seller", FCA: "seller", FAS: "seller", FOB: "seller", CFR: "seller", CIF: "seller", CPT: "seller", CIP: "seller", DAP: "seller", DPU: "seller", DDP: "seller" },
  },
  {
    label: "Loading at origin",
    responsibility: { EXW: "buyer", FCA: "seller", FAS: "seller", FOB: "seller", CFR: "seller", CIF: "seller", CPT: "seller", CIP: "seller", DAP: "seller", DPU: "seller", DDP: "seller" },
  },
  {
    label: "Delivery to carrier / port",
    responsibility: { EXW: "buyer", FCA: "seller", FAS: "seller", FOB: "seller", CFR: "seller", CIF: "seller", CPT: "seller", CIP: "seller", DAP: "seller", DPU: "seller", DDP: "seller" },
  },
  {
    label: "Export customs clearance & duty",
    responsibility: { EXW: "buyer", FCA: "seller", FAS: "seller", FOB: "seller", CFR: "seller", CIF: "seller", CPT: "seller", CIP: "seller", DAP: "seller", DPU: "seller", DDP: "seller" },
  },
  {
    label: "Origin terminal charges",
    responsibility: { EXW: "buyer", FCA: "varies", FAS: "seller", FOB: "seller", CFR: "seller", CIF: "seller", CPT: "seller", CIP: "seller", DAP: "seller", DPU: "seller", DDP: "seller" },
  },
  {
    label: "Main carriage / freight",
    responsibility: { EXW: "buyer", FCA: "buyer", FAS: "buyer", FOB: "buyer", CFR: "seller", CIF: "seller", CPT: "seller", CIP: "seller", DAP: "seller", DPU: "seller", DDP: "seller" },
  },
  {
    label: "Cargo insurance",
    responsibility: { EXW: "buyer", FCA: "buyer", FAS: "buyer", FOB: "buyer", CFR: "buyer", CIF: "seller", CPT: "buyer", CIP: "seller", DAP: "buyer", DPU: "buyer", DDP: "seller" },
  },
  {
    label: "Destination terminal charges",
    responsibility: { EXW: "buyer", FCA: "buyer", FAS: "buyer", FOB: "buyer", CFR: "buyer", CIF: "buyer", CPT: "buyer", CIP: "buyer", DAP: "buyer", DPU: "seller", DDP: "seller" },
  },
  {
    label: "Delivery to final destination",
    responsibility: { EXW: "buyer", FCA: "buyer", FAS: "buyer", FOB: "buyer", CFR: "buyer", CIF: "buyer", CPT: "buyer", CIP: "buyer", DAP: "seller", DPU: "seller", DDP: "seller" },
  },
  {
    label: "Unloading at destination",
    responsibility: { EXW: "buyer", FCA: "buyer", FAS: "buyer", FOB: "buyer", CFR: "buyer", CIF: "buyer", CPT: "buyer", CIP: "buyer", DAP: "buyer", DPU: "seller", DDP: "seller" },
  },
  {
    label: "Import customs clearance & duty",
    responsibility: { EXW: "buyer", FCA: "buyer", FAS: "buyer", FOB: "buyer", CFR: "buyer", CIF: "buyer", CPT: "buyer", CIP: "buyer", DAP: "buyer", DPU: "buyer", DDP: "seller" },
  },
]
