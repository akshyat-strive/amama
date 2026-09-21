import {
  FileSignatureIcon,
  HandshakeIcon,
  HouseIcon,
  MegaphoneIcon,
  MessagesSquareIcon,
  PackageSearchIcon,
  SettingsIcon,
  ShipIcon,
  StoreIcon,
  UsersRoundIcon,
  UserRoundCheckIcon,
  UserRoundIcon,
  WalletIcon,
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
  { label: "Chat", href: "/internal/chat", icon: MessagesSquareIcon, group: "activity" },
  { label: "Announcements", href: "/internal/announcements", icon: MegaphoneIcon, group: "activity" },
  { label: "Home", href: "/internal", icon: HouseIcon, group: "menu" },
  { label: "Buyer queue", href: "/internal/review-queue/buyer", icon: UserRoundCheckIcon, group: "menu", permission: "onboarding.review" },
  { label: "Seller queue", href: "/internal/review-queue/seller", icon: StoreIcon, group: "menu", permission: "onboarding.review" },
  { label: "Deals", href: "/internal/deals", icon: HandshakeIcon, group: "menu", permission: ["deals.work", "deals.viewAll"] },
  { label: "Contracts", href: "/internal/contracts", icon: FileSignatureIcon, group: "menu", permission: "deals.work" },
  { label: "Listings", href: "/internal/listings", icon: PackageSearchIcon, group: "menu", permission: "listings.moderate" },
  { label: "Logistics", href: "/internal/logistics", icon: ShipIcon, group: "logistics", permission: ["deals.work", "deals.viewAll"] },
  { label: "Finance", href: "/internal/finance", icon: WalletIcon, group: "finance", permission: ["deals.work", "deals.viewAll"] },
  { label: "Team", href: "/internal/team", icon: UsersRoundIcon, group: "general", permission: ["users.manage", "roles.manage"] },
  { label: "Profile", href: "/internal/profile", icon: UserRoundIcon, group: "general" },
  { label: "Settings", href: "/internal/settings", icon: SettingsIcon, group: "general" },
]

function visibleAdminNav(can: (permission: Permission) => boolean): DashboardNavItem[] {
  return adminNavItems.filter((item) => {
    if (!item.permission) return true
    return Array.isArray(item.permission) ? item.permission.some(can) : can(item.permission)
  })
}

export { visibleAdminNav }
