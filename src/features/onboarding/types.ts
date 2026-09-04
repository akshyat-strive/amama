import type { DateParts } from "@/components/ui/date-of-birth-picker"

export type OnboardingRole = "buyer" | "seller"

/** Whether the account represents a person or an organisation — determines
 *  whether date of birth is even a meaningful question to ask (see
 *  `BirthdayStep`). "" means not chosen yet. */
export type AccountType = "individual" | "business" | ""

export type BuyerDraft = {
  email: string
  fullName: string
  accountType: AccountType
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
  accountType: AccountType
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
  accountType: "",
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
  accountType: "",
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
