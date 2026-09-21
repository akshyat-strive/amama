/**
 * Everything about the admin login screen that isn't the form itself —
 * imagery, copy. One block now, not one per role — signing in used to mean
 * picking which console you wanted; now every business-side user (KAM,
 * Master Admin, Compliance, whoever else gets a role later) signs into the
 * same door, and what they see past it is decided by their permissions,
 * not which login page they happened to load.
 */
export type AdminLoginContent = {
  title: string
  description: string
  image: {
    src: string
    alt: string
    credit: { name: string; profileUrl: string }
  }
  homeHref: string
}

export const adminLoginContent: AdminLoginContent = {
  title: "Team sign in",
  description: "Onboarding review, listings, deals, and the team's own chat — all in one place.",
  image: {
    src: "https://images.unsplash.com/photo-1622675363311-3e1904dc1885",
    alt: "Four colleagues gathered around a laptop in a meeting",
    credit: {
      name: "Mapbox",
      profileUrl: "https://unsplash.com/@mapbox",
    },
  },
  homeHref: "/internal",
}
