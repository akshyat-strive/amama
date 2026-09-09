import type { OnboardingRole } from "@/features/onboarding/types"

/**
 * Everything about the login/forgot-password screens that isn't translatable
 * prose — imagery and routing. The actual copy (title, description, the
 * "selling/buying instead?" label) lives in the i18n dictionaries under
 * `auth.buyer`/`auth.seller` instead, keyed by role the same way this is.
 */
type LoginContent = {
  eyebrow: string
  image: {
    src: string
    alt: string
    credit: { name: string; profileUrl: string }
  }
  onboardingHref: string
  otherRole: { href: string }
}

export const loginContent: Record<OnboardingRole, LoginContent> = {
  buyer: {
    eyebrow: "Buyer sign in",
    image: {
      src: "https://images.unsplash.com/photo-1601897690942-bcacbad33e55?q=80&w=2076&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      alt: "Shipping containers stacked at a port, cranes overhead",
      credit: {
        name: "Paul .T",
        profileUrl: "https://unsplash.com/@hooverpaul55?ref=amamacrm",
      },
    },
    onboardingHref: "/buyer/onboarding/account",
    otherRole: { href: "/seller/login" },
  },
  seller: {
    eyebrow: "Seller sign in",
    image: {
      src: "https://images.unsplash.com/photo-1620901433789-1d2f85a93653",
      alt: "A farmer plowing a field with two oxen",
      credit: {
        name: "Saikiran Kesari",
        profileUrl: "https://unsplash.com/@saikirankesari",
      },
    },
    onboardingHref: "/seller/onboarding/account",
    otherRole: { href: "/buyer/login" },
  },
}
