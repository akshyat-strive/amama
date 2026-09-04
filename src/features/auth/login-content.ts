import type { OnboardingRole } from "@/features/onboarding/types"

type LoginContent = {
  eyebrow: string
  title: string
  description: string
  image: {
    src: string
    alt: string
    credit: { name: string; profileUrl: string }
  }
  onboardingHref: string
  otherRole: { label: string; href: string }
}

export const loginContent: Record<OnboardingRole, LoginContent> = {
  buyer: {
    eyebrow: "Buyer sign in",
    title: "Source direct from origin",
    description:
      "Verified growers, transparent pricing, and shipment tracking from farm to port — one account, every trade.",
    image: {
      src: "https://images.unsplash.com/photo-1601897690942-bcacbad33e55?q=80&w=2076&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      alt: "Shipping containers stacked at a port, cranes overhead",
      credit: {
        name: "Paul .T",
        profileUrl: "https://unsplash.com/@hooverpaul55?ref=amamacrm",
      },
    },
    onboardingHref: "/buyer/onboarding/account",
    otherRole: { label: "Selling instead?", href: "/seller/login" },
  },
  seller: {
    eyebrow: "Seller sign in",
    title: "Reach buyers, skip the middlemen",
    description:
      "List your harvest, talk to verified importers directly, and get paid on the terms you agree to.",
    image: {
      src: "https://images.unsplash.com/photo-1620901433789-1d2f85a93653",
      alt: "A farmer plowing a field with two oxen",
      credit: {
        name: "Saikiran Kesari",
        profileUrl: "https://unsplash.com/@saikirankesari",
      },
    },
    onboardingHref: "/seller/onboarding/account",
    otherRole: { label: "Buying instead?", href: "/buyer/login" },
  },
}
