import {
  HandshakeIcon,
  InboxIcon,
  LayoutDashboardIcon,
  MessageCircleIcon,
  MessagesSquareIcon,
  PackageSearchIcon,
  SettingsIcon,
  UserRoundIcon,
} from "lucide-react"

import type { DashboardNavItem } from "@/features/dashboard/nav-config"

export type AdminRole = "kam" | "master"

/**
 * Sidebar contents per admin role — same shape as `dashboardNav`, one more
 * key per role rather than anything role-specific hardcoded in the shell.
 */
export const adminNav: Record<AdminRole, DashboardNavItem[]> = {
  kam: [
    // Same "activity" split as the buyer/seller dashboard — wherever
    // someone else's message shows up without this KAM doing anything.
    { label: "Conversations", href: "/admin/kam/conversations", icon: MessageCircleIcon, group: "activity" },
    { label: "Team chat", href: "/admin/kam/chat", icon: MessagesSquareIcon, group: "activity" },
    { label: "Onboarding", href: "/admin/kam", icon: InboxIcon, group: "menu" },
    { label: "Deals", href: "/admin/kam/deals", icon: HandshakeIcon, group: "menu" },
    { label: "Listings", href: "/admin/kam/listings", icon: PackageSearchIcon, group: "menu" },
    { label: "Profile", href: "/admin/kam/profile", icon: UserRoundIcon, group: "general" },
    { label: "Settings", href: "/admin/kam/settings", icon: SettingsIcon, group: "general" },
  ],
  master: [
    { label: "Team chat", href: "/admin/master/chat", icon: MessagesSquareIcon, group: "activity" },
    { label: "Overview", href: "/admin/master", icon: LayoutDashboardIcon, group: "menu" },
    { label: "Deals", href: "/admin/master/deals", icon: HandshakeIcon, group: "menu" },
    { label: "Profile", href: "/admin/master/profile", icon: UserRoundIcon, group: "general" },
    { label: "Settings", href: "/admin/master/settings", icon: SettingsIcon, group: "general" },
  ],
}
