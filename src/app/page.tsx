import type { Metadata } from "next"

import { LandingPage } from "@/features/landing/landing-page"

export const metadata: Metadata = {
  title: "amama — cross-border produce trade",
  description: "amama connects growers and importers, brings in an account manager when it matters, and tracks every lot from farm to buyer.",
}

/** The front door: what amama is, and the three ways in — buyer, seller,
 *  and the amama team — each to its own sign-in. */
export default function Home() {
  return <LandingPage />
}
