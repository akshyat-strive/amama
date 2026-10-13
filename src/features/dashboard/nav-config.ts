import type { LucideIcon } from "lucide-react"
import {
  ClipboardListIcon,
  FileSignatureIcon,
  HouseIcon,
  LifeBuoyIcon,
  MessageCircleIcon,
  PackageIcon,
  SettingsIcon,
  ShieldCheckIcon,
  StoreIcon,
  SproutIcon,
  UserRoundIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react"

import type { OnboardingRole } from "@/features/onboarding/types"

export type DashboardNavGroup =
  | "overview"
  | "buying"
  | "selling"
  | "fulfilment"
  | "work"
  | "operations"
  | "team"
  | "general"

export type DashboardNavItem = {
  label: string
  href: string
  icon: LucideIcon
  group: DashboardNavGroup
}

/** "" means the group shows no label — Home needs none. */
export const dashboardNavGroupLabels: Record<DashboardNavGroup, string> = {
  overview: "",
  buying: "Buying",
  selling: "Selling",
  fulfilment: "Fulfilment",
  work: "Work",
  operations: "Operations",
  team: "Team",
  general: "Account",
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
    { label: "Home", href: "/buyer/dashboard", icon: HouseIcon, group: "overview" },
    { label: "Messages", href: "/buyer/dashboard/messages", icon: MessageCircleIcon, group: "overview" },
    { label: "Marketplace", href: "/buyer/dashboard/sourcing", icon: StoreIcon, group: "buying" },
    { label: "RFQs", href: "/buyer/dashboard/rfqs", icon: ClipboardListIcon, group: "buying" },
    { label: "Contracts", href: "/buyer/dashboard/contracts", icon: FileSignatureIcon, group: "buying" },
    { label: "Orders", href: "/buyer/dashboard/orders", icon: PackageIcon, group: "buying" },
    { label: "Verification", href: "/buyer/dashboard/verification", icon: ShieldCheckIcon, group: "general" },
    { label: "Support", href: "/buyer/dashboard/tickets", icon: LifeBuoyIcon, group: "general" },
    { label: "Profile", href: "/buyer/dashboard/profile", icon: UserRoundIcon, group: "general" },
    { label: "Settings", href: "/buyer/dashboard/settings", icon: SettingsIcon, group: "general" },
  ],
  seller: [
    { label: "Home", href: "/seller/dashboard", icon: HouseIcon, group: "overview" },
    { label: "Messages", href: "/seller/dashboard/messages", icon: MessageCircleIcon, group: "overview" },
    { label: "My listings", href: "/seller/dashboard/listings", icon: SproutIcon, group: "selling" },
    { label: "Buyers", href: "/seller/dashboard/buyers", icon: UsersIcon, group: "selling" },
    { label: "RFQs", href: "/seller/dashboard/rfqs", icon: ClipboardListIcon, group: "selling" },
    { label: "Contracts", href: "/seller/dashboard/contracts", icon: FileSignatureIcon, group: "selling" },
    { label: "Orders", href: "/seller/dashboard/orders", icon: PackageIcon, group: "fulfilment" },
    { label: "Payments", href: "/seller/dashboard/payments", icon: WalletIcon, group: "fulfilment" },
    { label: "Verification", href: "/seller/dashboard/verification", icon: ShieldCheckIcon, group: "general" },
    { label: "Support", href: "/seller/dashboard/tickets", icon: LifeBuoyIcon, group: "general" },
    { label: "Profile", href: "/seller/dashboard/profile", icon: UserRoundIcon, group: "general" },
    { label: "Settings", href: "/seller/dashboard/settings", icon: SettingsIcon, group: "general" },
  ],
}
