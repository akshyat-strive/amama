import type { AdminRole } from "@/features/admin/admin-nav-config"

/**
 * Everything about the admin login screens that isn't the form itself —
 * imagery, routing, copy. Kept separate from `loginContent` (buyer/seller)
 * on purpose: those are public trader accounts with onboarding and social
 * sign-in behind them, these are internal staff accounts with neither, so
 * sharing one content shape would mean carrying fields that don't apply to
 * either side.
 */
type AdminLoginContent = {
  title: string
  description: string
  image: {
    src: string
    alt: string
    credit: { name: string; profileUrl: string }
  }
  homeHref: string
  otherRole: { href: string; label: string }
}

export const adminLoginContent: Record<AdminRole, AdminLoginContent> = {
  kam: {
    title: "KAM sign in",
    description:
      "Review onboarding applications and keep the marketplace's listings honest, one decision at a time.",
    image: {
      src: "https://images.unsplash.com/photo-1603796846097-bee99e4a601f",
      alt: "A hand annotating a printed document with a pen",
      credit: {
        name: "Romain Dancre",
        profileUrl: "https://unsplash.com/@romaindancre",
      },
    },
    homeHref: "/admin/kam",
    otherRole: { href: "/admin/master/login", label: "Master admin instead?" },
  },
  master: {
    title: "Master admin sign in",
    description: "Oversight across every KAM's queue and the marketplace as a whole.",
    image: {
      src: "https://images.unsplash.com/photo-1622675363311-3e1904dc1885",
      alt: "Four colleagues gathered around a laptop in a meeting",
      credit: {
        name: "Mapbox",
        profileUrl: "https://unsplash.com/@mapbox",
      },
    },
    homeHref: "/admin/master",
    otherRole: { href: "/admin/kam/login", label: "KAM instead?" },
  },
}
