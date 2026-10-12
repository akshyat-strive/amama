import { emptyPreferences, type BuyerPreferences, type OnboardingDraft, type OnboardingRole } from "@/features/onboarding/types"

/** The demo buyer's interests — the server profile has no column for
 *  these yet, so they are restored from here on sign-in. */
const DEMO_PREFERENCES: BuyerPreferences = {
  categories: [],
  products: [],
  grades: ["Grade A+", "cashew::W-240"],
  orderSize: "20to50",
}

const DEMO_BUYER_PREFERENCES: Record<string, BuyerPreferences> = {
  "buyer@amama.in": DEMO_PREFERENCES,
}

/**
 * The two accounts a client demo actually logs in as — already through
 * onboarding, already verified (see `SEED_SUBMISSIONS` in
 * `admin/seed-data.ts`, both seeded "approved"), and already the buyer/
 * seller side of every deal, listing, and contract `seed-data.ts` seeds.
 * `LoginScreen`'s quick-login button loads one of these straight into
 * `useOnboarding()` and skips the wizard entirely — no email/password to
 * type, nothing to fill in.
 */
const demoBuyerDraft: OnboardingDraft = {
  role: "buyer",
  buyer: {
    email: "buyer@amama.in",
    fullName: "Vikram Shah",
    entityType: "organization",
    dateOfBirth: null,
    companyName: "Meridian Global Foods",
    country: "AE",
    businessType: "importerDistributor",
    importLicence: "IEC-AE-778821",
    sourcing: ["tea", "spices", "cashew", "grains"],
    annualVolume: "between100And500",
    incoterm: "cif",
    preferences: DEMO_PREFERENCES,
  },
  seller: {
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
  },
}

const demoSellerDraft: OnboardingDraft = {
  role: "seller",
  buyer: {
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
  },
  seller: {
    email: "seller@amama.in",
    fullName: "Ravi Kumar",
    entityType: "individual",
    sellerSubType: "trader",
    dateOfBirth: { day: 12, month: 4, year: 1985 },
    farmName: "Ravi Kumar Exports",
    country: "IN",
    region: "Kerala",
    farmSize: "",
    producerType: "",
    produce: ["tea", "spices", "cashew", "grains"],
    certifications: ["haccp", "iso22000"],
    bio: "Three generations growing on the same black-soil plots outside Kolar. Drip-irrigated, residue-tested every season, and packed the same day we pick.",
  },
}

/**
 * A second seller demo, alongside `demoSellerDraft` — the counterparty
 * behind the "Kashmir Valley Growers" apple listing (`seed-9` in
 * `listing-store.ts`) a buyer demo can already message and propose a deal
 * to. `email` has to match that listing's `sellerId` exactly, since that's
 * the only thing that ties this draft's identity to those apples and to
 * whatever conversation a buyer demo already started about them.
 */
const demoKashmirSellerDraft: OnboardingDraft = {
  role: "seller",
  buyer: {
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
  },
  seller: {
    email: "kashmir@amama.in",
    fullName: "Aamir Wani",
    entityType: "organization",
    sellerSubType: "producer",
    dateOfBirth: null,
    farmName: "Kashmir Valley Growers",
    country: "IN",
    region: "Shopian, Jammu & Kashmir",
    farmSize: "",
    producerType: "",
    produce: ["apple"],
    certifications: [],
    bio: "",
  },
}

function demoDraftFor(role: OnboardingRole): OnboardingDraft {
  return role === "buyer" ? demoBuyerDraft : demoSellerDraft
}

export { DEMO_BUYER_PREFERENCES, demoDraftFor, demoKashmirSellerDraft }
