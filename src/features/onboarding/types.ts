import type { DateParts } from "@/components/ui/date-of-birth-picker"

export type OnboardingRole = "buyer" | "seller"

/** Whether the account represents a person or an organisation — determines
 *  whether date of birth is even a meaningful question to ask (see
 *  `BirthdayStep`), and which documents get asked for later. "" means not
 *  chosen yet. */
export type EntityType = "individual" | "organization" | ""

/**
 * Sellers only. A producer grows what they sell; a trader buys from
 * producers and resells — the two need different documents (land proof vs.
 * an import-export code) and this is what drives that split later on.
 * "" means not chosen yet.
 */
export type SellerSubType = "producer" | "trader" | ""

/**
 * How a buyer likes to buy, independent of any one product. Every list is
 * ordered — the first entry matters most — and every field is optional;
 * the marketplace uses them only to decide what to show first.
 */
export type BuyerPreferences = {
  /** Product ids (crop ids, or a slugified custom name) and variants
   *  (`<productId>/<variety slug>`), most wanted first. */
  products: string[]
  /** Grade names, most wanted first. */
  grades: string[]
  /** One of `orderSizes` in steps.ts, "" when not chosen. */
  orderSize: string
}

export const emptyPreferences: BuyerPreferences = { products: [], grades: [], orderSize: "" }

export type BuyerDraft = {
  email: string
  fullName: string
  entityType: EntityType
  dateOfBirth: DateParts | null
  companyName: string
  country: string
  businessType: string
  importLicence: string
  /** Crop ids the buyer wants to source. */
  sourcing: string[]
  /** Kept for submissions made before preferences replaced it. */
  annualVolume: string
  incoterm: string
  preferences: BuyerPreferences
}

export type SellerDraft = {
  email: string
  fullName: string
  entityType: EntityType
  sellerSubType: SellerSubType
  dateOfBirth: DateParts | null
  farmName: string
  country: string
  region: string
  farmSize: string
  producerType: string
  /** Crop ids the producer grows. */
  produce: string[]
  certifications: string[]
  /** "Tell us about your farm" — optional, shown to buyers. */
  bio: string
}

export type OnboardingDraft = {
  role: OnboardingRole | null
  buyer: BuyerDraft
  seller: SellerDraft
}

export const emptyBuyer: BuyerDraft = {
  email: "",
  fullName: "",
  entityType: "",
  dateOfBirth: null,
  companyName: "",
  country: "",
  businessType: "",
  importLicence: "",
  sourcing: [],
  annualVolume: "",
  incoterm: "",
  preferences: emptyPreferences,
}

export const emptySeller: SellerDraft = {
  email: "",
  fullName: "",
  entityType: "",
  sellerSubType: "",
  dateOfBirth: null,
  farmName: "",
  country: "",
  region: "",
  farmSize: "",
  producerType: "",
  produce: [],
  certifications: [],
  bio: "",
}

export const emptyDraft: OnboardingDraft = {
  role: null,
  buyer: emptyBuyer,
  seller: emptySeller,
}
