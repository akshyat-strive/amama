import type { BuyerDraft, SellerDraft } from "@/features/onboarding/types"

/**
 * The marketplace and its conversations need a stable id per person, and
 * onboarding never collects one on purpose — email is the closest thing to
 * one already on the draft. Falling back to a fixed `"you"` (rather than a
 * generated id) keeps a half-finished draft usable in the demo instead of
 * quietly losing every listing or thread the moment the email field is
 * empty.
 */
function buyerIdentity(buyer: BuyerDraft) {
  return {
    id: buyer.email.trim().toLowerCase() || "you",
    name: buyer.fullName.trim() || buyer.companyName.trim() || "You",
  }
}

function sellerIdentity(seller: SellerDraft) {
  return {
    id: seller.email.trim().toLowerCase() || "you",
    name: seller.farmName.trim() || seller.fullName.trim() || "Your farm",
  }
}

export { buyerIdentity, sellerIdentity }
