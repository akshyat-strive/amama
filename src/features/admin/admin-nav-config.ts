import {
  HandshakeIcon,
  InboxIcon,
  LayoutDashboardIcon,
  MegaphoneIcon,
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
 *
 * "Chat" folds what used to be two separate items — read-only buyer/seller
 * conversation oversight and the staff DM/Team channels — into one unified
 * inbox (see `chat-view.tsx`); "Announcements" is pulled back out as its
 * own item since it's a broadcast feed people check on its own, not a
 * conversation to pick out of a list.
 */
export const adminNav: Record<AdminRole, DashboardNavItem[]> = {
  kam: [
    // Same "activity" split as the buyer/seller dashboard — wherever
    // someone else's message shows up without this KAM doing anything.
    { label: "Chat", href: "/admin/kam/chat", icon: MessagesSquareIcon, group: "activity" },
    { label: "Announcements", href: "/admin/kam/announcements", icon: MegaphoneIcon, group: "activity" },
    { label: "Onboarding", href: "/admin/kam", icon: InboxIcon, group: "menu" },
    { label: "Deals", href: "/admin/kam/deals", icon: HandshakeIcon, group: "menu" },
    { label: "Listings", href: "/admin/kam/listings", icon: PackageSearchIcon, group: "menu" },
    { label: "Profile", href: "/admin/kam/profile", icon: UserRoundIcon, group: "general" },
    { label: "Settings", href: "/admin/kam/settings", icon: SettingsIcon, group: "general" },
  ],
  master: [
    { label: "Chat", href: "/admin/master/chat", icon: MessagesSquareIcon, group: "activity" },
    { label: "Announcements", href: "/admin/master/announcements", icon: MegaphoneIcon, group: "activity" },
    { label: "Overview", href: "/admin/master", icon: LayoutDashboardIcon, group: "menu" },
    { label: "Deals", href: "/admin/master/deals", icon: HandshakeIcon, group: "menu" },
    { label: "Profile", href: "/admin/master/profile", icon: UserRoundIcon, group: "general" },
    { label: "Settings", href: "/admin/master/settings", icon: SettingsIcon, group: "general" },
  ],
}
