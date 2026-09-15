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
 * mobile drawer so the two never drift out of sync — and, now, between the
 * two widths each can be shown at.
 *
 * `expanded` controls icon+label vs. icon-only rendering. It's a rendering
 * concern only: which *width* a collapsed sidebar resolves to (a narrow
 * desktop rail vs. fully hidden on mobile) is the shell's problem, not
 * this component's — `NavList` just draws whichever of the two the shell
 * asks for.
 */
function NavList({
  items,
  expanded = true,
  onNavigate,
}: {
  items: DashboardNavItem[]
  expanded?: boolean
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
          {expanded ? (
            <p className="px-4 pb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {dashboardNavGroupLabels[group]}
            </p>
          ) : null}
          <div className="flex flex-col gap-0.5">
            {groupItems.map((item) => {
              const active = item.href === activeHref

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  aria-label={item.label}
                  title={expanded ? undefined : item.label}
                  className={cn(
                    "flex items-center text-[14px] transition-colors",
                    expanded
                      ? "gap-3 rounded-xl py-2.5 ps-4 pe-3"
                      : "size-10 justify-center self-center rounded-full",
                    active
                      ? "bg-amama-deep text-white"
                      : "text-foreground/70 hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon
                    className={cn("size-[18px] shrink-0", active ? "text-white" : "text-foreground/60")}
                    strokeWidth={2.25}
                  />
                  {expanded ? (
                    <span className={active ? "font-semibold" : "font-medium"}>{item.label}</span>
                  ) : null}
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
