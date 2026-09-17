import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboardIcon,
  MessageCircleIcon,
  PackageIcon,
  SettingsIcon,
  ShipIcon,
  StoreIcon,
  SproutIcon,
  UserRoundIcon,
  WalletIcon,
} from "lucide-react"

import type { OnboardingRole } from "@/features/onboarding/types"

export type DashboardNavGroup = "activity" | "menu" | "general"

export type DashboardNavItem = {
  label: string
  href: string
  icon: LucideIcon
  group: DashboardNavGroup
}

export const dashboardNavGroupLabels: Record<DashboardNavGroup, string> = {
  // Wherever new listings and new messages actually show up — the two
  // pages whose content changes without the person doing anything, so
  // they lead the sidebar instead of sitting alphabetically among the
  // static ones.
  activity: "Activity",
  menu: "Menu",
  general: "General",
}

/** `NavList` pins this one group to the very bottom of the sidebar — its
 *  own row below the scrollable groups when expanded, its own separate
 *  pill below theirs when collapsed — rather than scrolling with the rest.
 *  Every role's account-level items (profile, settings) belong here. */
export const dashboardNavFooterGroup: DashboardNavGroup = "general"

/**
 * Sidebar contents per role. Adding a role later (this is buyer/seller only
 * for now, more are coming) means adding one more key here — the shell and
 * every route under `/[role]/dashboard` read from this, nothing role-specific
 * is hardcoded in the layout itself.
 */
export const dashboardNav: Record<OnboardingRole, DashboardNavItem[]> = {
  buyer: [
    { label: "Marketplace", href: "/buyer/dashboard/sourcing", icon: StoreIcon, group: "activity" },
    {
      label: "Messages",
      href: "/buyer/dashboard/messages",
      icon: MessageCircleIcon,
      group: "activity",
    },
    { label: "Overview", href: "/buyer/dashboard", icon: LayoutDashboardIcon, group: "menu" },
    { label: "Orders", href: "/buyer/dashboard/orders", icon: PackageIcon, group: "menu" },
    { label: "Shipments", href: "/buyer/dashboard/shipments", icon: ShipIcon, group: "menu" },
    { label: "Profile", href: "/buyer/dashboard/profile", icon: UserRoundIcon, group: "general" },
    {
      label: "Settings",
      href: "/buyer/dashboard/settings",
      icon: SettingsIcon,
      group: "general",
    },
  ],
  seller: [
    { label: "Listings", href: "/seller/dashboard/listings", icon: SproutIcon, group: "activity" },
    {
      label: "Messages",
      href: "/seller/dashboard/messages",
      icon: MessageCircleIcon,
      group: "activity",
    },
    { label: "Overview", href: "/seller/dashboard", icon: LayoutDashboardIcon, group: "menu" },
    { label: "Orders", href: "/seller/dashboard/orders", icon: PackageIcon, group: "menu" },
    { label: "Shipments", href: "/seller/dashboard/shipments", icon: ShipIcon, group: "menu" },
    { label: "Payments", href: "/seller/dashboard/payments", icon: WalletIcon, group: "menu" },
    { label: "Profile", href: "/seller/dashboard/profile", icon: UserRoundIcon, group: "general" },
    {
      label: "Settings",
      href: "/seller/dashboard/settings",
      icon: SettingsIcon,
      group: "general",
    },
  ],
}
