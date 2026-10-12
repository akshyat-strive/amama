import type {
  EntityType,
  OnboardingRole,
  SellerSubType,
} from "@/features/onboarding/types"

/**
 * The document catalog — every id this engine can ever return. Display text
 * (label + hint) lives in `onboarding.documents.catalog.<id>` in the
 * translation dictionaries, keyed by `id`, the same convention as crops and
 * certifications. `icon` names a lucide-react export, resolved where the
 * list is rendered.
 */
export const documentCatalog = [
  { id: "governmentId", icon: "IdCard" },
  { id: "aadhaar", icon: "Fingerprint" },
  { id: "pan", icon: "CreditCard" },
  { id: "gstin", icon: "Receipt" },
  { id: "tradeLicense", icon: "ScrollText" },
  { id: "taxRegistration", icon: "FileStack" },
  { id: "iecCode", icon: "Ship" },
  { id: "landProof", icon: "MapPinned" },
  { id: "farmPhoto", icon: "Camera" },
  { id: "fpoRegistration", icon: "Users" },
  { id: "fssai", icon: "ShieldCheck" },
  { id: "importCustomsCode", icon: "PackageSearch" },
  { id: "bankDetails", icon: "Landmark" },
  // Licences a seller exports under.
  { id: "exportLicence", icon: "ScrollText" },
  { id: "apedaRcmc", icon: "ScrollText" },
  // One certificate per certification the seller claims at onboarding.
  { id: "certOrganic", icon: "BadgeCheck" },
  { id: "certFairtrade", icon: "BadgeCheck" },
  { id: "certGlobalgap", icon: "BadgeCheck" },
  { id: "certRainforest", icon: "BadgeCheck" },
  { id: "certHaccp", icon: "BadgeCheck" },
  { id: "certIso22000", icon: "BadgeCheck" },
  { id: "certHalal", icon: "BadgeCheck" },
] as const

export type DocumentId = (typeof documentCatalog)[number]["id"]

/**
 * English text for documents added after the translated catalog. The
 * other languages fall back to this until they are translated.
 */
const EXTRA_TEXT: Partial<Record<DocumentId, { label: string; hint: string }>> = {
  exportLicence: { label: "Export licence", hint: "Your export registration, where your country issues one" },
  apedaRcmc: { label: "APEDA registration (RCMC)", hint: "Registration-cum-membership certificate" },
  certOrganic: { label: "Organic certificate", hint: "From an accredited certifier, in date" },
  certFairtrade: { label: "Fairtrade certificate", hint: "Current Fairtrade certification" },
  certGlobalgap: { label: "GLOBALG.A.P. certificate", hint: "Current certificate and GGN" },
  certRainforest: { label: "Rainforest Alliance certificate", hint: "Current farm certificate" },
  certHaccp: { label: "HACCP certificate", hint: "Food safety certification for your packhouse" },
  certIso22000: { label: "ISO 22000 certificate", hint: "Food safety management system" },
  certHalal: { label: "Halal certificate", hint: "From a recognised Halal authority" },
}

/** Label and hint for any document id — the translated catalog first,
 *  the English extras for anything not in it yet. */
export function documentText(
  id: string,
  t: (path: string) => string
): { label: string; hint: string } {
  const extra = EXTRA_TEXT[id as DocumentId]
  if (extra) return extra
  return { label: t(`onboarding.options.documents.${id}.label`), hint: t(`onboarding.options.documents.${id}.hint`) }
}

/** Which certificate proves which certification picked at onboarding. */
const CERTIFICATE_FOR: Record<string, DocumentId> = {
  organic: "certOrganic",
  fairtrade: "certFairtrade",
  globalgap: "certGlobalgap",
  rainforest: "certRainforest",
  haccp: "certHaccp",
  iso22000: "certIso22000",
  halal: "certHalal",
}

/**
 * What a given document will accept, kept here with the rest of the matrix
 * rather than in the upload component — "which files count" is the same
 * kind of policy decision as "which documents are required", and both
 * should be changeable from one file.
 */
export type DocumentConstraint = {
  /** Exact MIME types, used both for the `accept` attribute and the
   *  post-pick check (a drag-and-drop bypasses `accept` entirely). */
  accept: string[]
  maxBytes: number
}

const MB = 1024 * 1024

export const defaultConstraint: DocumentConstraint = {
  accept: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  maxBytes: 10 * MB,
}

/** Only the documents whose rules differ from `defaultConstraint`. */
const constraintOverrides: Partial<Record<DocumentId, DocumentConstraint>> = {
  // A geo-tagged farm photo is, definitionally, a photo — a PDF of one
  // would lose the location metadata the document exists to carry.
  farmPhoto: {
    accept: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: 8 * MB,
  },
}

export function constraintFor(id: DocumentId): DocumentConstraint {
  return constraintOverrides[id] ?? defaultConstraint
}

const typeLabels: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WEBP",
}

/** "PDF · JPG · PNG" — extension names read the same in every locale, so
 *  this deliberately isn't run through the translation dictionaries. */
export function describeAccept(constraint: DocumentConstraint): string {
  return constraint.accept.map((type) => typeLabels[type] ?? type).join(" · ")
}

export function describeMaxSize(constraint: DocumentConstraint): string {
  return `${Math.round(constraint.maxBytes / MB)} MB`
}

export type DocumentContext = {
  /** ISO 3166-1 alpha-2. Falls back to the universal rule set alone when no
   *  country-specific entry exists yet — see `plug in a new country` below. */
  country: string
  role: OnboardingRole
  entityType: EntityType
  sellerSubType?: SellerSubType
  /** Certification ids the seller claimed — each needs its certificate. */
  certifications?: string[]
}

/** Every field is optional and means "matches any" when omitted — a rule
 *  scoped to `{ entityType: "organization" }` fires for buyers and sellers,
 *  individuals-only rules included, alike. */
type Scope = {
  role?: OnboardingRole
  entityType?: EntityType
  sellerSubType?: SellerSubType
}

type Rule = {
  when: Scope
  /** Documents this rule makes required. */
  add?: DocumentId[]
  /** Documents this rule surfaces, but doesn't require. */
  addOptional?: DocumentId[]
  /** Drops a document a rule already applied — how a country's rules
   *  override, not just add to, the universal baseline (e.g. India replaces
   *  the generic `governmentId` with `aadhaar` + `pan` for individuals). */
  remove?: DocumentId[]
}

/**
 * Rules that apply everywhere, before any country-specific rules run. This
 * is the fallback for every country that doesn't have its own entry below —
 * generic enough to ask for *something* reasonable anywhere in the world,
 * specific enough that a real country's rules mostly just override pieces
 * of it rather than starting from scratch.
 */
const universalRules: Rule[] = [
  { when: {}, add: ["governmentId", "bankDetails"] },
  { when: { entityType: "organization" }, add: ["tradeLicense", "taxRegistration"] },
  {
    when: { role: "seller", sellerSubType: "producer" },
    add: ["landProof"],
    addOptional: ["farmPhoto"],
  },
  {
    when: { role: "seller", sellerSubType: "producer", entityType: "organization" },
    add: ["fpoRegistration"],
  },
  {
    when: { role: "seller", sellerSubType: "trader" },
    add: ["iecCode", "taxRegistration"],
  },
  { when: { role: "seller" }, addOptional: ["exportLicence"] },
]

/**
 * Per-country overrides, keyed by ISO 3166-1 alpha-2. This is the "plug and
 * switch" seam: to add a new country's document matrix, add one entry here
 * — nothing in `getRequiredDocuments` needs to change. A country's rules run
 * *after* `universalRules`, in array order, so they can `remove` a generic
 * document a universal rule already added (not just layer more on top of
 * it) as well as `add` its own.
 */
const countryRules: Array<{ country: string; rules: Rule[] }> = [
  {
    country: "IN",
    rules: [
      {
        when: { entityType: "individual" },
        add: ["aadhaar", "pan"],
        remove: ["governmentId"],
      },
      { when: { entityType: "organization" }, add: ["pan", "gstin"] },
      { when: { role: "seller" }, addOptional: ["fssai", "apedaRcmc"], remove: ["exportLicence"] },
      { when: { role: "buyer" }, addOptional: ["importCustomsCode"] },
    ],
  },
]

function scopeMatches(when: Scope, ctx: DocumentContext): boolean {
  if (when.role && when.role !== ctx.role) return false
  if (when.entityType && when.entityType !== ctx.entityType) return false
  if (when.sellerSubType && when.sellerSubType !== ctx.sellerSubType) return false
  return true
}

export type ResolvedDocument = {
  id: DocumentId
  required: boolean
}

/**
 * The single entry point everything else should call — resolves a context
 * (country, role, entity type, seller sub-type) down to the documents that
 * actually need asking for, each flagged required or optional. Order:
 * universal rules first, then the matching country's own rules layered on
 * top, so a country can both add to and subtract from the generic baseline.
 */
export function getRequiredDocuments(ctx: DocumentContext): ResolvedDocument[] {
  // `Map` insertion order is what decides display order, and it's also what
  // lets a later `add` upgrade an earlier `addOptional` of the same id to
  // required without creating a duplicate entry.
  const resolved = new Map<DocumentId, boolean>()

  const applyRules = (rules: Rule[]) => {
    for (const rule of rules) {
      if (!scopeMatches(rule.when, ctx)) continue
      for (const id of rule.remove ?? []) resolved.delete(id)
      for (const id of rule.add ?? []) resolved.set(id, true)
      for (const id of rule.addOptional ?? []) {
        if (!resolved.has(id)) resolved.set(id, false)
      }
    }
  }

  applyRules(universalRules)
  const countrySpecific = countryRules.find((entry) => entry.country === ctx.country)
  if (countrySpecific) applyRules(countrySpecific.rules)

  // A claimed certification is only as good as its certificate.
  if (ctx.role === "seller") {
    for (const certification of ctx.certifications ?? []) {
      const id = CERTIFICATE_FOR[certification]
      if (id) resolved.set(id, true)
    }
  }

  return Array.from(resolved, ([id, required]) => ({ id, required }))
}
