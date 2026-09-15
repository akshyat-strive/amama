import {
  HandshakeIcon,
  InboxIcon,
  LayoutDashboardIcon,
  MessageCircleIcon,
  MessagesSquareIcon,
  PackageSearchIcon,
} from "lucide-react"

import type { DashboardNavItem } from "@/features/dashboard/nav-config"

export type AdminRole = "kam" | "master"

/**
 * Sidebar contents per admin role — same shape as `dashboardNav`, one more
 * key per role rather than anything role-specific hardcoded in the shell.
 */
export const adminNav: Record<AdminRole, DashboardNavItem[]> = {
  kam: [
    { label: "Onboarding", href: "/admin/kam", icon: InboxIcon, group: "menu" },
    { label: "Deals", href: "/admin/kam/deals", icon: HandshakeIcon, group: "menu" },
    { label: "Listings", href: "/admin/kam/listings", icon: PackageSearchIcon, group: "menu" },
    { label: "Conversations", href: "/admin/kam/conversations", icon: MessageCircleIcon, group: "menu" },
    { label: "Team chat", href: "/admin/kam/chat", icon: MessagesSquareIcon, group: "menu" },
  ],
  master: [
    { label: "Overview", href: "/admin/master", icon: LayoutDashboardIcon, group: "menu" },
    { label: "Deals", href: "/admin/master/deals", icon: HandshakeIcon, group: "menu" },
    { label: "Team chat", href: "/admin/master/chat", icon: MessagesSquareIcon, group: "menu" },
  ],
}
