import { InboxIcon, MessageCircleIcon, PackageSearchIcon } from "lucide-react"

import type { DashboardNavItem } from "@/features/dashboard/nav-config"

export const kamNav: DashboardNavItem[] = [
  { label: "Onboarding", href: "/kam", icon: InboxIcon, group: "menu" },
  { label: "Listings", href: "/kam/listings", icon: PackageSearchIcon, group: "menu" },
  { label: "Conversations", href: "/kam/conversations", icon: MessageCircleIcon, group: "menu" },
]
