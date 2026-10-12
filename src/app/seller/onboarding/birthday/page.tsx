import { redirect } from "next/navigation"

/** Sellers introduce their farm instead of giving a date of birth. */
export default function SellerBirthdayPage() {
  redirect("/seller/onboarding/about")
}
