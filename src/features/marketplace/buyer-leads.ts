export type BuyerLead = {
  id: string
  name: string
  country: string
  /** Crop ids this buyer is sourcing — the same ids `crops` in
   *  onboarding/steps.ts uses, as if this were their own onboarding
   *  `sourcing` answer. */
  sourcing: string[]
}

/**
 * Standing-in for "every buyer on the platform sourcing a given crop" until
 * there's a real backend to query that from — a fixed roster a seller's
 * "Potential buyers" list filters down to whichever of these are sourcing
 * something that seller actually has listed. Same fictional importers
 * `demo-data.ts`'s `exportMarkets` already uses as order counterparties, so
 * a seller sees the same names show up in both places.
 */
export const BUYER_LEADS: BuyerLead[] = [
  { id: "lead-al-maha", name: "Al Maha Fresh FZC", country: "AE", sourcing: ["apple", "fresh-fruit", "vegetables"] },
  {
    id: "lead-vanderveen",
    name: "Vanderveen Produce BV",
    country: "NL",
    sourcing: ["apple", "fresh-fruit", "dried-fruit"],
  },
  {
    id: "lead-sembawang",
    name: "Sembawang Fruits Pte",
    country: "SG",
    sourcing: ["apple", "dried-fruit", "nuts"],
  },
  {
    id: "lead-reef",
    name: "Reef Al Sharq Co.",
    country: "SA",
    sourcing: ["dried-fruit", "spices", "grains"],
  },
  { id: "lead-ceylon", name: "Ceylon Agri Imports", country: "LK", sourcing: ["tea", "spices", "cashew"] },
  {
    id: "lead-nordholm",
    name: "Nordholm Fruit Import AB",
    country: "SE",
    sourcing: ["apple", "dried-fruit"],
  },
]
