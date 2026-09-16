"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import {
  dashboardNavFooterGroup,
  dashboardNavGroupLabels,
  type DashboardNavItem,
} from "@/features/dashboard/nav-config"

/**
 * The nav list itself, shared between the persistent desktop sidebar and the
 * mobile drawer so the two never drift out of sync — and, now, between the
 * two widths each can be shown at. It also owns the sidebar's own visual
 * surface (background, rounding, shadow) rather than the shell wrapping it
 * in one, because that surface itself changes shape between the two states:
 *
 *  - Expanded: one "island" — a single rounded card holding every group,
 *    with the footer group (profile/settings) pinned below a divider.
 *  - Collapsed: each group becomes its own free-floating "sub-island" — a
 *    pill of stacked circle buttons — rather than one tall card, since
 *    there's no group label left to visually separate them otherwise. The
 *    footer group gets its own pill too, pinned to the bottom of the rail.
 *
 * `expanded` is what switches between the two, same prop that already
 * switches icon+label vs. icon-only per item.
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

  const regularGroups = groups.filter(({ group }) => group !== dashboardNavFooterGroup)
  const footerGroup = groups.find(({ group }) => group === dashboardNavFooterGroup) ?? null

  if (!expanded) {
    return (
      <div className="flex h-full flex-col gap-3">
        <nav className="flex flex-1 flex-col gap-3 overflow-y-auto">
          {regularGroups.map(({ group, items: groupItems }) => (
            <div
              key={group}
              className="flex flex-col items-center rounded-[24px] bg-card p-1 border-1 border-border"
            >
              {groupItems.map((item) => (
                <NavItemLink
                  key={item.href}
                  item={item}
                  active={item.href === activeHref}
                  expanded={false}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ))}
        </nav>
        {footerGroup ? (
          <div className="flex shrink-0 flex-col items-center rounded-[24px] bg-card p-1 border-1 border-border">
            {footerGroup.items.map((item) => (
              <NavItemLink
                key={item.href}
                item={item}
                active={item.href === activeHref}
                expanded={false}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col rounded-[24px] bg-card p-1 shadow-lg border-1 border-border">
      <nav className="flex flex-1 flex-col overflow-y-auto">
        {regularGroups.map(({ group, items: groupItems }) => (
          <div key={group} className="mt-5 first:mt-0">
            <p className="px-4 pb-1.5 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {dashboardNavGroupLabels[group]}
            </p>
            <div className="flex flex-col gap-0.5">
              {groupItems.map((item) => (
                <NavItemLink
                  key={item.href}
                  item={item}
                  active={item.href === activeHref}
                  expanded
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
      {footerGroup ? (
        <div className="mt-1 flex shrink-0 flex-col gap-0.5 border-t border-border pt-2">
          {footerGroup.items.map((item) => (
            <NavItemLink
              key={item.href}
              item={item}
              active={item.href === activeHref}
              expanded
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function NavItemLink({
  item,
  active,
  expanded,
  onNavigate,
}: {
  item: DashboardNavItem
  active: boolean
  expanded: boolean
  onNavigate?: () => void
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      title={expanded ? undefined : item.label}
      className={cn(
        "flex items-center text-[14px] transition-colors",
        expanded ? "gap-3 rounded-full py-2.5 ps-4 pe-3" : "size-11 justify-center rounded-full",
        active
          ? "bg-amama text-amama-foreground hover:bg-amama-hover hover:text-white border-1 border-amama-foreground"
          : "text-foreground/70 hover:bg-muted hover:text-foreground"
      )}
    >
      <item.icon className="size-[18px] shrink-0" strokeWidth={2.25} />
      {expanded ? <span className={active ? "font-semibold" : "font-medium"}>{item.label}</span> : null}
    </Link>
  )
}

export { NavList }
