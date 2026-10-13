import {
  FileSignatureIcon,
  HandshakeIcon,
  HouseIcon,
  MegaphoneIcon,
  MessagesSquareIcon,
  PackageSearchIcon,
  SettingsIcon,
  ShipIcon,
  TicketIcon,
  UsersRoundIcon,
  UserRoundIcon,
  WalletIcon,
  WarehouseIcon,
  WaypointsIcon,
} from "lucide-react"

import type { Permission } from "@/features/admin/permissions"
import type { DashboardNavItem } from "@/features/dashboard/nav-config"

type AdminNavItem = DashboardNavItem & {
  /** Omitted = always shown to any signed-in admin. An array means "any
   *  of these" — `visibleAdminNav` is the only thing that reads this. */
  permission?: Permission | Permission[]
}

/**
 * One flat list — which items show is decided by `visibleAdminNav`
 * filtering against the signed-in staff member's permissions. A domain's
 * pages need that domain's `.view` (or an action permission), so
 * executives, who hold every `.view`, see all of them; Chat, Announcements,
 * Profile and Settings are open to everyone.
 */
const adminNavItems: AdminNavItem[] = [
  { label: "Home", href: "/internal", icon: HouseIcon, group: "overview" },
  { label: "Chat", href: "/internal/chat", icon: MessagesSquareIcon, group: "overview" },
  { label: "Tickets", href: "/internal/tickets", icon: TicketIcon, group: "work" },
  { label: "Deals", href: "/internal/deals", icon: HandshakeIcon, group: "work", permission: ["deals.work", "deals.viewAll"] },
  { label: "Contracts", href: "/internal/contracts", icon: FileSignatureIcon, group: "work", permission: ["deals.work", "deals.viewAll"] },
  { label: "Listings", href: "/internal/listings", icon: PackageSearchIcon, group: "work", permission: ["listings.moderate", "onboarding.viewAll", "deals.viewAll"] },
  { label: "Trades", href: "/internal/trade-desk", icon: WaypointsIcon, group: "operations", permission: ["deals.work", "deals.viewAll", "logistics.view"] },
  { label: "Warehouse", href: "/internal/warehouse", icon: WarehouseIcon, group: "operations", permission: ["logistics.view", "logistics.manage"] },
  { label: "Logistics", href: "/internal/logistics", icon: ShipIcon, group: "operations", permission: ["logistics.view", "logistics.manage"] },
  { label: "Finance", href: "/internal/finance", icon: WalletIcon, group: "operations", permission: ["finance.view", "finance.manage", "finops.view", "finops.manage"] },
  { label: "Announcements", href: "/internal/announcements", icon: MegaphoneIcon, group: "team" },
  { label: "Team", href: "/internal/team", icon: UsersRoundIcon, group: "team", permission: ["team.view", "users.manage", "roles.manage"] },
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
