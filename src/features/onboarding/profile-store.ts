"use client"

import { createPersistentStore } from "@/features/local-db/persistent-store"
import { emptyBuyer, emptySeller, type BuyerDraft, type OnboardingRole, type SellerDraft } from "@/features/onboarding/types"
import { SEED_BUYER_PROFILES, SEED_SELLER_PROFILES } from "@/features/verification/kyc-seed"

type Profiles = { buyer: Record<string, BuyerDraft>; seller: Record<string, SellerDraft> }

/**
 * Each buyer's and seller's saved profile, by email — what signing in
 * restores into the onboarding draft, and what the draft writes back to
 * whenever it changes, so edits made in one session are there next time.
 */
const profilesStore = createPersistentStore<Profiles>(
  "amama.profiles",
  () => ({
    buyer: Object.fromEntries(SEED_BUYER_PROFILES.map((profile) => [profile.email, profile])),
    seller: Object.fromEntries(SEED_SELLER_PROFILES.map((profile) => [profile.email, profile])),
  }),
  { buyer: {}, seller: {} }
)

function loadProfile(role: "buyer", email: string): BuyerDraft
function loadProfile(role: "seller", email: string): SellerDraft
function loadProfile(role: OnboardingRole, email: string): BuyerDraft | SellerDraft {
  const key = email.trim().toLowerCase()
  const saved = profilesStore.get()[role][key]
  return role === "buyer" ? { ...emptyBuyer, ...(saved as BuyerDraft | undefined), email: key } : { ...emptySeller, ...(saved as SellerDraft | undefined), email: key }
}

function saveProfile(role: OnboardingRole, profile: BuyerDraft | SellerDraft) {
  const key = profile.email.trim().toLowerCase()
  if (!key) return
  profilesStore.set((profiles) => ({ ...profiles, [role]: { ...profiles[role], [key]: { ...profile, email: key } } }))
}

export { loadProfile, saveProfile }
