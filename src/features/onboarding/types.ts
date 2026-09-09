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
  annualVolume: string
  incoterm: string
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
}

export const emptyDraft: OnboardingDraft = {
  role: null,
  buyer: emptyBuyer,
  seller: emptySeller,
}
