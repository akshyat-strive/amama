import { redirect } from "next/navigation"

/** The farm bio now lives on the "Tell us about your farm" step. */
export default function SellerAboutPage() {
  redirect("/seller/onboarding/farm")
}
