import {
  HandshakeIcon,
  InboxIcon,
  MegaphoneIcon,
  MessagesSquareIcon,
  PackageSearchIcon,
  SettingsIcon,
  UsersRoundIcon,
  UserRoundIcon,
} from "lucide-react"

import type { Permission } from "@/features/admin/permissions"
import type { DashboardNavItem } from "@/features/dashboard/nav-config"

type AdminNavItem = DashboardNavItem & {
  /** Omitted = always shown to any signed-in admin. An array means "any
   *  of these" — `visibleAdminNav` is the only thing that reads this. */
  permission?: Permission | Permission[]
}

/**
 * One flat list now, not one per role — which items actually show is
 * decided by `visibleAdminNav` filtering against the signed-in user's real
 * permissions, not by which URL prefix they're under. "Chat" and
 * "Announcements" fold what used to be three separate surfaces (read-only
 * buyer/seller oversight, staff DM/Team, the broadcast feed) into two;
 * neither is gated — every signed-in admin gets both, since access itself
 * isn't the thing being restricted here, posting/assigning/managing is.
 */
const adminNavItems: AdminNavItem[] = [
  { label: "Chat", href: "/admin/chat", icon: MessagesSquareIcon, group: "activity" },
  { label: "Announcements", href: "/admin/announcements", icon: MegaphoneIcon, group: "activity" },
  { label: "Home", href: "/admin", icon: InboxIcon, group: "menu" },
  { label: "Deals", href: "/admin/deals", icon: HandshakeIcon, group: "menu", permission: ["deals.work", "deals.viewAll"] },
  { label: "Listings", href: "/admin/listings", icon: PackageSearchIcon, group: "menu", permission: "listings.moderate" },
  { label: "Team", href: "/admin/team", icon: UsersRoundIcon, group: "general", permission: ["users.manage", "roles.manage"] },
  { label: "Profile", href: "/admin/profile", icon: UserRoundIcon, group: "general" },
  { label: "Settings", href: "/admin/settings", icon: SettingsIcon, group: "general" },
]

function visibleAdminNav(can: (permission: Permission) => boolean): DashboardNavItem[] {
  return adminNavItems.filter((item) => {
    if (!item.permission) return true
    return Array.isArray(item.permission) ? item.permission.some(can) : can(item.permission)
  })
}

export { visibleAdminNav }
