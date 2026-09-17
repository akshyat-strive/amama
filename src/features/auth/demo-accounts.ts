import type { OnboardingDraft, OnboardingRole } from "@/features/onboarding/types"

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
  },
}

function demoDraftFor(role: OnboardingRole): OnboardingDraft {
  return role === "buyer" ? demoBuyerDraft : demoSellerDraft
}

export { demoDraftFor }
