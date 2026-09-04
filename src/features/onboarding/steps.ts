import type { AccountType, OnboardingRole } from "@/features/onboarding/types"

export type StepDefinition = {
  slug: string
  href: string
  /** Shown in the progress bar's screen-reader announcement. */
  title: string
}

const buyerSteps: StepDefinition[] = [
  { slug: "account", href: "/buyer/onboarding/account", title: "Your account" },
  { slug: "birthday", href: "/buyer/onboarding/birthday", title: "Date of birth" },
  { slug: "company", href: "/buyer/onboarding/company", title: "Your company" },
  { slug: "sourcing", href: "/buyer/onboarding/sourcing", title: "What you source" },
  { slug: "volume", href: "/buyer/onboarding/volume", title: "Trade terms" },
  { slug: "done", href: "/buyer/onboarding/done", title: "All set" },
]

const sellerSteps: StepDefinition[] = [
  { slug: "account", href: "/seller/onboarding/account", title: "Your account" },
  { slug: "birthday", href: "/seller/onboarding/birthday", title: "Date of birth" },
  { slug: "farm", href: "/seller/onboarding/farm", title: "Your farm" },
  { slug: "produce", href: "/seller/onboarding/produce", title: "What you grow" },
  {
    slug: "certifications",
    href: "/seller/onboarding/certifications",
    title: "Certifications",
  },
  { slug: "done", href: "/seller/onboarding/done", title: "All set" },
]

export const stepsByRole: Record<OnboardingRole, StepDefinition[]> = {
  buyer: buyerSteps,
  seller: sellerSteps,
}

/**
 * The step list a given draft actually walks through. A business/org account
 * has no personal date of birth to give, so "birthday" is dropped entirely —
 * not just made skippable — meaning the progress dots and step count are
 * correct for that account too, not just "6 steps, one of which is a no-op."
 */
export function effectiveSteps(role: OnboardingRole, accountType?: AccountType) {
  const steps = stepsByRole[role]
  return accountType === "business"
    ? steps.filter((step) => step.slug !== "birthday")
    : steps
}

export function stepIndex(
  role: OnboardingRole,
  slug: string,
  accountType?: AccountType
) {
  return effectiveSteps(role, accountType).findIndex((step) => step.slug === slug)
}

export function nextStep(
  role: OnboardingRole,
  slug: string,
  accountType?: AccountType
) {
  const steps = effectiveSteps(role, accountType)
  // The current step may itself be filtered out (mid-flow "birthday" for a
  // draft that just became a business account) — fall back to treating it as
  // if we were sitting just before the first remaining step, not "not found".
  const index = stepIndex(role, slug, accountType)
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
  accountType?: AccountType
) {
  const steps = effectiveSteps(role, accountType)
  const index = stepIndex(role, slug, accountType)
  return index > 0 ? steps[index - 1] : null
}

/** A crop tile only ever renders at a few hundred px wide — no need for a full-res fetch. */
export function cropImageUrl(photoId: string) {
  return `https://images.unsplash.com/${photoId}?w=320&q=70&fit=crop&auto=format`
}

/**
 * Crops amama trades, used by both the buyer sourcing and seller produce
 * grids. Each photo id is a verified `images.unsplash.com/photo-*` id —
 * check a new one resolves (`fetch` a small size, expect 200) before adding
 * it, since a bad id fails silently as a blank tile.
 */
export const crops = [
  {
    id: "coffee",
    label: "Coffee",
    photo: "photo-1447933601403-0c6688de566e",
    credit: { name: "Asthetik", profileUrl: "https://unsplash.com/@asthetik" },
  },
  {
    id: "cocoa",
    label: "Cocoa",
    photo: "photo-1493925410384-84f842e616fb",
    credit: {
      name: "Pablo Merchán Montes",
      profileUrl: "https://unsplash.com/@pablomerchanm",
    },
  },
  {
    id: "cashew",
    label: "Cashew",
    photo: "photo-1626697556426-8a55a8af4999",
    credit: {
      name: "Towfiqu barbhuiya",
      profileUrl: "https://unsplash.com/@towfiqu999999",
    },
  },
  {
    id: "sesame",
    label: "Sesame",
    photo: "photo-1547496502-affa22d38842",
    credit: { name: "Yoav Aziz", profileUrl: "https://unsplash.com/@yoavaziz" },
  },
  {
    id: "spices",
    label: "Spices",
    photo: "photo-1525289722380-f5bf1653d504",
    credit: {
      name: "Paolo Bendandi",
      profileUrl: "https://unsplash.com/@paolobendandi",
    },
  },
  {
    id: "tea",
    label: "Tea",
    photo: "photo-1563822249366-3efb23b8e0c9",
    credit: {
      name: "Stri Khedonia",
      profileUrl: "https://unsplash.com/@stri_khedonia",
    },
  },
  {
    id: "grains",
    label: "Grains & cereals",
    photo: "photo-1595444042058-f038c7e0e778",
    credit: {
      name: "Melissa Askew",
      profileUrl: "https://unsplash.com/@jannerboy62",
    },
  },
  {
    id: "pulses",
    label: "Pulses & legumes",
    photo: "photo-1612257416648-ee7a6c533b4f",
    credit: {
      name: "Suheyl Burak",
      profileUrl: "https://unsplash.com/@suheylburak",
    },
  },
  {
    id: "fresh-fruit",
    label: "Fresh fruit",
    photo: "photo-1619566636858-adf3ef46400b",
    credit: { name: "Jkakaroto", profileUrl: "https://unsplash.com/@jkakaroto" },
  },
  {
    id: "dried-fruit",
    label: "Dried fruit",
    photo: "photo-1595412017587-b7f3117dff54",
    credit: {
      name: "Miracle Day",
      profileUrl: "https://unsplash.com/@miracleday",
    },
  },
  {
    id: "vegetables",
    label: "Vegetables",
    photo: "photo-1597362925123-77861d3fbac7",
    credit: {
      name: "Randy Fath",
      profileUrl: "https://unsplash.com/@randyfath",
    },
  },
  {
    id: "nuts",
    label: "Tree nuts",
    photo: "photo-1608797178974-15b35a64ede9",
    credit: { name: "Mockupo", profileUrl: "https://unsplash.com/@mockupo" },
  },
  {
    id: "cotton",
    label: "Cotton & fibre",
    photo: "photo-1616431101491-554c0932ea40",
    credit: { name: "Ranurte", profileUrl: "https://unsplash.com/@ranurte" },
  },
  {
    id: "sugar",
    label: "Sugar & sweeteners",
    photo: "photo-1559477882-f1a7c5931735",
    credit: {
      name: "John Cutting",
      profileUrl: "https://unsplash.com/@johncutting",
    },
  },
  {
    id: "oils",
    label: "Edible oils",
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
 */
export const certifications = [
  { id: "organic", label: "Organic", hint: "EU / USDA / NOP", icon: "Leaf" },
  { id: "fairtrade", label: "Fairtrade", hint: "FLO-CERT", icon: "Handshake" },
  {
    id: "globalgap",
    label: "GlobalG.A.P.",
    hint: "Farm assurance",
    icon: "ShieldCheck",
  },
  {
    id: "rainforest",
    label: "Rainforest Alliance",
    hint: "Sustainability",
    icon: "TreePine",
  },
  { id: "haccp", label: "HACCP", hint: "Food safety", icon: "ClipboardCheck" },
  {
    id: "iso22000",
    label: "ISO 22000",
    hint: "Food safety mgmt",
    icon: "Award",
  },
  { id: "halal", label: "Halal", hint: "Export markets", icon: "Moon" },
  {
    id: "none",
    label: "None yet",
    hint: "We can help you get certified",
    icon: "CircleDashed",
  },
] as const

export const businessTypes = [
  "Importer / distributor",
  "Food manufacturer",
  "Roaster / processor",
  "Wholesaler",
  "Retail chain",
  "Trading house",
] as const

export const producerTypes = [
  "Individual farmer",
  "Family farm",
  "Cooperative",
  "Producer association",
  "Estate / plantation",
  "Aggregator",
] as const

export const annualVolumes = [
  "Under 20 MT",
  "20 – 100 MT",
  "100 – 500 MT",
  "500 – 2,000 MT",
  "Over 2,000 MT",
] as const

export const incoterms = ["FOB", "CIF", "CFR", "EXW", "DAP", "Not sure yet"] as const

export const farmSizes = [
  "Under 2 hectares",
  "2 – 10 hectares",
  "10 – 50 hectares",
  "50 – 200 hectares",
  "Over 200 hectares",
] as const
