"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import {
  dashboardNavGroupLabels,
  type DashboardNavItem,
} from "@/features/dashboard/nav-config"

/**
 * The nav list itself, shared between the persistent desktop sidebar and the
 * mobile drawer so the two never drift out of sync.
 *
 * The sidebar is a fixed near-black surface with white text — deliberately
 * not theme-aware (no `bg-card`/`text-foreground` here), so it reads the
 * same way in light or dark mode rather than flipping to a pale card. The
 * active item is filled with the brand's own bright green (`--amama`,
 * accent-only elsewhere in the app) rather than a generic dark pill — on
 * a black sidebar that's what actually reads as "this app's nav", not a
 * template's. `amama-foreground` is the near-black the brand green is
 * defined to pair with, not white — white-on-bright-green fails contrast.
 */
function NavList({
  items,
  onNavigate,
}: {
  items: DashboardNavItem[]
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  // The item whose own href is the longest match for the current path —
  // picking the single best match (rather than letting every ancestor
  // route's prefix also count) is what keeps a root nav item like
  // "Overview" or "Onboarding" from lighting up on every one of its own
  // sub-routes too.
  const activeHref = React.useMemo(() => {
    let best: DashboardNavItem | null = null
    for (const item of items) {
      const matches = pathname === item.href || pathname.startsWith(item.href + "/")
      if (matches && (!best || item.href.length > best.href.length)) best = item
    }
    return best?.href ?? null
  }, [items, pathname])

  const groups = React.useMemo(() => {
    const order: DashboardNavItem["group"][] = []
    const byGroup = new Map<DashboardNavItem["group"], DashboardNavItem[]>()
    for (const item of items) {
      if (!byGroup.has(item.group)) {
        byGroup.set(item.group, [])
        order.push(item.group)
      }
      byGroup.get(item.group)!.push(item)
    }
    return order.map((group) => ({ group, items: byGroup.get(group)! }))
  }, [items])

  return (
    <nav className="flex flex-1 flex-col overflow-y-auto">
      {groups.map(({ group, items: groupItems }) => (
        <div key={group} className="mt-5 first:mt-0">
          <p className="px-4 pb-1.5 text-[11px] font-semibold tracking-wider text-white/40 uppercase">
            {dashboardNavGroupLabels[group]}
          </p>
          <div className="flex flex-col gap-0.5">
            {groupItems.map((item) => {
              const active = item.href === activeHref

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl py-2.5 ps-4 pe-3 text-[14px] transition-colors",
                    active
                      ? "bg-amama text-amama-foreground"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <item.icon
                    className={cn("size-[18px] shrink-0", active ? "text-amama-foreground" : "text-white/60")}
                    strokeWidth={2.25}
                  />
                  <span className={active ? "font-semibold" : "font-medium"}>
                    {item.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

export { NavList }
