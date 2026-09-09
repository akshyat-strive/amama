import type { EntityType, OnboardingRole } from "@/features/onboarding/types"

export type StepDefinition = {
  slug: string
  href: string
  /** Shown in the progress bar's screen-reader announcement. */
  title: string
}

// Country comes first, ahead of even the account step — which documents and
// fields make sense later (GST vs. VAT, a land title vs. a trade licence)
// all turn on where someone is trading from, so we ask it before anything
// else rather than burying it mid-flow.
const buyerSteps: StepDefinition[] = [
  { slug: "country", href: "/buyer/onboarding/country", title: "Your country" },
  { slug: "account", href: "/buyer/onboarding/account", title: "Your account" },
  { slug: "birthday", href: "/buyer/onboarding/birthday", title: "Date of birth" },
  { slug: "company", href: "/buyer/onboarding/company", title: "Your company" },
  { slug: "sourcing", href: "/buyer/onboarding/sourcing", title: "What you source" },
  { slug: "volume", href: "/buyer/onboarding/volume", title: "Trade terms" },
  { slug: "documents", href: "/buyer/onboarding/documents", title: "Documents" },
  { slug: "done", href: "/buyer/onboarding/done", title: "All set" },
]

const sellerSteps: StepDefinition[] = [
  { slug: "country", href: "/seller/onboarding/country", title: "Your country" },
  { slug: "account", href: "/seller/onboarding/account", title: "Your account" },
  { slug: "birthday", href: "/seller/onboarding/birthday", title: "Date of birth" },
  { slug: "farm", href: "/seller/onboarding/farm", title: "Your farm" },
  { slug: "produce", href: "/seller/onboarding/produce", title: "What you grow" },
  {
    slug: "certifications",
    href: "/seller/onboarding/certifications",
    title: "Certifications",
  },
  { slug: "documents", href: "/seller/onboarding/documents", title: "Documents" },
  { slug: "done", href: "/seller/onboarding/done", title: "All set" },
]

export const stepsByRole: Record<OnboardingRole, StepDefinition[]> = {
  buyer: buyerSteps,
  seller: sellerSteps,
}

/**
 * The step list a given draft actually walks through. An organisation has no
 * personal date of birth to give, so "birthday" is dropped entirely — not
 * just made skippable — meaning the progress dots and step count are correct
 * for that account too, not just "7 steps, one of which is a no-op."
 */
export function effectiveSteps(role: OnboardingRole, entityType?: EntityType) {
  const steps = stepsByRole[role]
  return entityType === "organization"
    ? steps.filter((step) => step.slug !== "birthday")
    : steps
}

export function stepIndex(
  role: OnboardingRole,
  slug: string,
  entityType?: EntityType
) {
  return effectiveSteps(role, entityType).findIndex((step) => step.slug === slug)
}

export function nextStep(
  role: OnboardingRole,
  slug: string,
  entityType?: EntityType
) {
  const steps = effectiveSteps(role, entityType)
  // The current step may itself be filtered out (mid-flow "birthday" for a
  // draft that just became an organisation account) — fall back to treating
  // it as if we were sitting just before the first remaining step, not "not
  // found".
  const index = stepIndex(role, slug, entityType)
  if (index >= 0) {
    return index < steps.length - 1 ? steps[index + 1] : null
  }
  const rawIndex = stepIndex(role, slug)
  const fallback = steps.find(
    (step) => stepIndex(role, step.slug) > rawIndex
  )
  return fallback ?? null
}

export function previousStep(
  role: OnboardingRole,
  slug: string,
  entityType?: EntityType
) {
  const steps = effectiveSteps(role, entityType)
  const index = stepIndex(role, slug, entityType)
  return index > 0 ? steps[index - 1] : null
}

/** A crop tile only ever renders at a few hundred px wide — no need for a
 *  full-res fetch. Callers with more room (a marketplace listing card, say)
 *  can ask for a wider crop of the same photo. */
export function cropImageUrl(photoId: string, width = 320) {
  return `https://images.unsplash.com/${photoId}?w=${width}&q=70&fit=crop&auto=format`
}

/**
 * Crops amama trades, used by both the buyer sourcing and seller produce
 * grids. Each photo id is a verified `images.unsplash.com/photo-*` id —
 * check a new one resolves (`fetch` a small size, expect 200) before adding
 * it, since a bad id fails silently as a blank tile.
 *
 * No `label` here — display text lives in `onboarding.options.crops.<id>` in
 * the translation dictionaries instead, keyed by `id`. Keeping it only there
 * means one source of truth per language rather than an English default
 * duplicated in this file and then shadowed everywhere it's rendered.
 */
export const crops = [
  {
    id: "coffee",
    photo: "photo-1447933601403-0c6688de566e",
    credit: { name: "Asthetik", profileUrl: "https://unsplash.com/@asthetik" },
  },
  {
    id: "cocoa",
    photo: "photo-1493925410384-84f842e616fb",
    credit: {
      name: "Pablo Merchán Montes",
      profileUrl: "https://unsplash.com/@pablomerchanm",
    },
  },
  {
    id: "cashew",
    photo: "photo-1626697556426-8a55a8af4999",
    credit: {
      name: "Towfiqu barbhuiya",
      profileUrl: "https://unsplash.com/@towfiqu999999",
    },
  },
  {
    id: "sesame",
    photo: "photo-1547496502-affa22d38842",
    credit: { name: "Yoav Aziz", profileUrl: "https://unsplash.com/@yoavaziz" },
  },
  {
    id: "spices",
    photo: "photo-1525289722380-f5bf1653d504",
    credit: {
      name: "Paolo Bendandi",
      profileUrl: "https://unsplash.com/@paolobendandi",
    },
  },
  {
    id: "tea",
    photo: "photo-1563822249366-3efb23b8e0c9",
    credit: {
      name: "Stri Khedonia",
      profileUrl: "https://unsplash.com/@stri_khedonia",
    },
  },
  {
    id: "grains",
    photo: "photo-1595444042058-f038c7e0e778",
    credit: {
      name: "Melissa Askew",
      profileUrl: "https://unsplash.com/@jannerboy62",
    },
  },
  {
    id: "pulses",
    photo: "photo-1612257416648-ee7a6c533b4f",
    credit: {
      name: "Suheyl Burak",
      profileUrl: "https://unsplash.com/@suheylburak",
    },
  },
  {
    id: "fresh-fruit",
    photo: "photo-1619566636858-adf3ef46400b",
    credit: { name: "Jkakaroto", profileUrl: "https://unsplash.com/@jkakaroto" },
  },
  {
    id: "dried-fruit",
    photo: "photo-1595412017587-b7f3117dff54",
    credit: {
      name: "Miracle Day",
      profileUrl: "https://unsplash.com/@miracleday",
    },
  },
  {
    id: "vegetables",
    photo: "photo-1597362925123-77861d3fbac7",
    credit: {
      name: "Randy Fath",
      profileUrl: "https://unsplash.com/@randyfath",
    },
  },
  {
    id: "nuts",
    photo: "photo-1608797178974-15b35a64ede9",
    credit: { name: "Mockupo", profileUrl: "https://unsplash.com/@mockupo" },
  },
  {
    id: "cotton",
    photo: "photo-1616431101491-554c0932ea40",
    credit: { name: "Ranurte", profileUrl: "https://unsplash.com/@ranurte" },
  },
  {
    id: "sugar",
    photo: "photo-1559477882-f1a7c5931735",
    credit: {
      name: "John Cutting",
      profileUrl: "https://unsplash.com/@johncutting",
    },
  },
  {
    id: "oils",
    photo: "photo-1474979266404-7eaacbcd87c5",
    credit: { name: "Robertina", profileUrl: "https://unsplash.com/@robertina" },
  },
] as const

/**
 * `icon` names a lucide-react export, resolved in the certifications step.
 * These are our own generic badge icons, not the certifying bodies' actual
 * registered marks (Fairtrade's mark, the Rainforest Alliance frog, etc.) —
 * reproducing those without a licence would be a trademark risk, and a grid
 * of mismatched third-party logo styles would look worse anyway.
 *
 * Display text (label + hint) lives in `onboarding.options.certifications.<id>`
 * in the translation dictionaries — see the note on `crops` above. Most of
 * these names (Fairtrade, HACCP, ISO 22000...) are proper nouns or standard
 * codes that don't change across languages; the hints do.
 */
export const certifications = [
  { id: "organic", icon: "Leaf" },
  { id: "fairtrade", icon: "Handshake" },
  { id: "globalgap", icon: "ShieldCheck" },
  { id: "rainforest", icon: "TreePine" },
  { id: "haccp", icon: "ClipboardCheck" },
  { id: "iso22000", icon: "Award" },
  { id: "halal", icon: "Moon" },
  { id: "none", icon: "CircleDashed" },
] as const

// Every pick-list below stores a stable, language-independent `id` in the
// draft — never the display label — so a selection made in one language
// still reads back correctly after switching to another. Labels live in
// `onboarding.options.<listName>.<id>` in the translation dictionaries.
export const businessTypes = [
  "importerDistributor",
  "foodManufacturer",
  "roasterProcessor",
  "wholesaler",
  "retailChain",
  "tradingHouse",
] as const

export const producerTypes = [
  "individualFarmer",
  "familyFarm",
  "cooperative",
  "producerAssociation",
  "estatePlantation",
  "aggregator",
] as const

export const annualVolumes = [
  "under20",
  "between20And100",
  "between100And500",
  "between500And2000",
  "over2000",
] as const

// Incoterms are standard international trade codes, unchanged across
// languages — only "not sure yet" is actual prose to translate.
export const incoterms = ["fob", "cif", "cfr", "exw", "dap", "notSure"] as const

export const farmSizes = [
  "under2Ha",
  "between2And10Ha",
  "between10And50Ha",
  "between50And200Ha",
  "over200Ha",
] as const
