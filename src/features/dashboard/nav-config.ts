import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboardIcon,
  MessageCircleIcon,
  PackageIcon,
  SearchIcon,
  SettingsIcon,
  ShipIcon,
  SproutIcon,
  WalletIcon,
} from "lucide-react"

import type { OnboardingRole } from "@/features/onboarding/types"

export type DashboardNavItem = {
  label: string
  href: string
  icon: LucideIcon
}

/**
 * Sidebar contents per role. Adding a role later (this is buyer/seller only
 * for now, more are coming) means adding one more key here — the shell and
 * every route under `/[role]/dashboard` read from this, nothing role-specific
 * is hardcoded in the layout itself.
 */
export const dashboardNav: Record<OnboardingRole, DashboardNavItem[]> = {
  buyer: [
    { label: "Overview", href: "/buyer/dashboard", icon: LayoutDashboardIcon },
    { label: "Sourcing", href: "/buyer/dashboard/sourcing", icon: SearchIcon },
    { label: "Orders", href: "/buyer/dashboard/orders", icon: PackageIcon },
    { label: "Shipments", href: "/buyer/dashboard/shipments", icon: ShipIcon },
    {
      label: "Messages",
      href: "/buyer/dashboard/messages",
      icon: MessageCircleIcon,
    },
    { label: "Settings", href: "/buyer/dashboard/settings", icon: SettingsIcon },
  ],
  seller: [
    { label: "Overview", href: "/seller/dashboard", icon: LayoutDashboardIcon },
    { label: "Listings", href: "/seller/dashboard/listings", icon: SproutIcon },
    { label: "Orders", href: "/seller/dashboard/orders", icon: PackageIcon },
    { label: "Payments", href: "/seller/dashboard/payments", icon: WalletIcon },
    {
      label: "Messages",
      href: "/seller/dashboard/messages",
      icon: MessageCircleIcon,
    },
    {
      label: "Settings",
      href: "/seller/dashboard/settings",
      icon: SettingsIcon,
    },
  ],
}
