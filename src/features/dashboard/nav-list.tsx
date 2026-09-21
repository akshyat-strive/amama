"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import {
  dashboardNavFooterGroup,
  dashboardNavGroupLabels,
  type DashboardNavGroup,
  type DashboardNavItem,
} from "@/features/dashboard/nav-config"

/**
 * Dashboard navigation
 *
 * UX structure:
 *
 * ┌─────────────────────────────┐
 * │                             │
 * │  scrollable navigation      │
 * │                             │
 * │  ┌───────────────────────┐  │
 * │  │ GROUP                 │  │
 * │  │ item                  │  │
 * │  │ item                  │  │
 * │  └───────────────────────┘  │
 * │                             │
 * │  ┌───────────────────────┐  │
 * │  │ single item           │  │
 * │  └───────────────────────┘  │
 * │                             │
 * │  ┌───────────────────────┐  │
 * │  │ GROUP                 │  │
 * │  │ item                  │  │
 * │  │ item                  │  │
 * │  └───────────────────────┘  │
 * │                             │
 * │          spacer             │
 * │                             │
 * │  ┌───────────────────────┐  │
 * │  │       FOOTER          │  │ ← sticky
 * │  └───────────────────────┘  │
 * └─────────────────────────────┘
 *
 * The entire sidebar is one scroll container.
 *
 * The footer lives INSIDE that container and is sticky to the bottom.
 *
 * A bottom spacer is added before the footer so navigation items can
 * scroll completely above the sticky footer instead of being hidden
 * behind it.
 *
 * Scrollbars are visually hidden while scrolling remains enabled.
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

  /**
   * Find the most specific active route.
   *
   * If both:
   *
   * /portal
   * /portal/orders
   *
   * match the current pathname, the longer href wins.
   */
  const activeHref = React.useMemo(() => {
    let best: DashboardNavItem | null = null

    for (const item of items) {
      const matches =
        pathname === item.href ||
        pathname.startsWith(item.href + "/")

      if (matches && (!best || item.href.length > best.href.length)) {
        best = item
      }
    }

    return best?.href ?? null
  }, [items, pathname])

  /**
   * Build navigation groups while preserving their original order.
   */
  const groups = React.useMemo(() => {
    const order: DashboardNavItem["group"][] = []

    const byGroup = new Map<
      DashboardNavItem["group"],
      DashboardNavItem[]
    >()

    for (const item of items) {
      if (!byGroup.has(item.group)) {
        byGroup.set(item.group, [])
        order.push(item.group)
      }

      byGroup.get(item.group)!.push(item)
    }

    return order.map((group) => ({
      group,
      items: byGroup.get(group)!,
    }))
  }, [items])

  const regularGroups = groups.filter(
    ({ group }) => group !== dashboardNavFooterGroup,
  )

  const footerGroup =
    groups.find(({ group }) => group === dashboardNavFooterGroup) ?? null

  return (
    <TooltipProvider>
      <div
        className={cn(
          "h-full min-h-0",
          "overflow-y-auto overflow-x-hidden",
          "scrollbar-none",
          "rounded-[24px] border border-border",
          "bg-muted",
          "bg-[repeating-linear-gradient(-45deg,var(--surface-border)_0px,var(--surface-border)_1px,transparent_1px,transparent_7px)]",
          "shadow-lg",
        )}
      >
        <div
          className={cn(
            "flex min-h-full flex-col",
            expanded ? "gap-3.5" : "gap-3",
          )}
        >
          {/* ============================================================
              REGULAR NAVIGATION
              ============================================================ */}

          <nav className="flex flex-col">
            <div
              className={cn(
                "flex flex-col",
                expanded ? "gap-3.5" : "gap-3",
              )}
            >
              {regularGroups.map(
                ({ group, items: groupItems }) => {
                  const isSingleItem = groupItems.length === 1

                  /**
                   * ======================================================
                   * SINGLE ITEM GROUP
                   * ======================================================
                   *
                   * The item itself becomes the island.
                   *
                   * No:
                   * - group label
                   * - three dots
                   * - header
                   * - additional top spacing
                   */
                  if (isSingleItem) {
                    const item = groupItems[0]

                    return (
                      <div
                        key={group}
                        className={cn(
                          "shrink-0",
                          "rounded-[24px]",
                          "bg-card",
                          "p-1",
                        )}
                      >
                        <NavItemLink
                          item={item}
                          active={item.href === activeHref}
                          expanded={expanded}
                          onNavigate={onNavigate}
                        />
                      </div>
                    )
                  }

                  /**
                   * ======================================================
                   * MULTI ITEM GROUP
                   * ======================================================
                   *
                   * Expanded:
                   *   label + white item panel
                   *
                   * Collapsed:
                   *   dots + white item panel
                   */
                  return (
                    <div
                      key={group}
                      className={cn(
                        "flex shrink-0 flex-col",
                        "overflow-hidden",
                        "rounded-[24px]",
                        expanded ? "bg-muted" : "border border-border bg-muted",
                      )}
                    >
                      <GroupHeader
                        group={group}
                        expanded={expanded}
                      />

                      <div
                        className={cn(
                          "flex flex-col gap-0.5",
                          "rounded-[24px]",
                          "bg-card p-1",
                          !expanded && "items-center",
                        )}
                      >
                        {groupItems.map((item) => (
                          <NavItemLink
                            key={item.href}
                            item={item}
                            active={item.href === activeHref}
                            expanded={expanded}
                            onNavigate={onNavigate}
                          />
                        ))}
                      </div>
                    </div>
                  )
                },
              )}
            </div>
          </nav>

          {/* ============================================================
              FOOTER SPACER
              ============================================================

              Two jobs in one element: `h-16` is scroll clearance (so the
              last regular island can scroll fully clear of the sticky
              footer instead of ending up hidden behind it), while
              `mt-auto` is what actually pins the footer to the rail's
              bottom edge whenever the nav items don't already fill the
              rail's height — a plain fixed-height spacer only reserves
              room *below* short content, it doesn't push anything down to
              the bottom on its own, which is what left the footer
              floating right under the nav items with bare striped rail
              underneath it. `mt-auto` claims exactly that leftover space;
              once real scrolling is happening (many nav items), there's no
              leftover space left to claim and this collapses to just the
              `h-16` clearance, letting `sticky bottom-0` on the footer
              itself take over.

              The footer itself is NOT outside the scroll container.
          */}
          {footerGroup ? (
            <div
              aria-hidden="true"
              className={cn(
                "mt-auto shrink-0",
                expanded ? "h-16" : "h-16",
              )}
            />
          ) : null}

          {/* ============================================================
              STICKY FOOTER
              ============================================================

              Footer is inside the same scroll container.

              `sticky bottom-0` keeps it visually attached to the bottom
              while the navigation behind it continues to scroll.
          */}
          {footerGroup ? (
            <div
              className={cn(
                "sticky bottom-0 z-20 shrink-0",
                "bg-transparent",
              )}
            >
              <div
                className={cn(
                  "bg-card",
                  expanded
                    ? "rounded-[20px] p-1"
                    : "rounded-[24px] border border-border p-1",
                )}
              >
                <div
                  className={cn(
                    "flex flex-col gap-0.5",
                    !expanded && "items-center",
                  )}
                >
                  {footerGroup.items.map((item) => (
                    <NavItemLink
                      key={item.href}
                      item={item}
                      active={item.href === activeHref}
                      expanded={expanded}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </TooltipProvider>
  )
}

/**
 * Group header
 *
 * Only rendered for groups containing more than one item.
 *
 * Expanded:
 *   Displays the group name.
 *
 * Collapsed:
 *   Displays three small dots.
 */
function GroupHeader({
  group,
  expanded,
}: {
  group: DashboardNavGroup
  expanded: boolean
}) {
  const label = dashboardNavGroupLabels[group]

  if (expanded) {
    return (
      <div className="flex h-6 shrink-0 items-center px-3">
        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
        </span>
      </div>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={label}
        className="
          flex h-6 w-full shrink-0
          items-center justify-center
          border-0 bg-transparent p-0
          outline-none
        "
      >
        <span
          className="flex items-center gap-0.5"
          aria-hidden
        >
          <span className="size-1 rounded-full bg-muted-foreground/40" />
          <span className="size-1 rounded-full bg-muted-foreground/40" />
          <span className="size-1 rounded-full bg-muted-foreground/40" />
        </span>
      </TooltipTrigger>

      <TooltipContent side="right">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Individual navigation item.
 */
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
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      className={cn(
        "flex items-center text-[14px] transition-colors cursor-pointer",
        expanded
          ? "h-11 gap-3 rounded-full ps-4 pe-3"
          : "size-11 justify-center rounded-full",
        active
          ? "border-1 border-amama-foreground bg-amama text-amama-foreground hover:bg-amama-hover hover:text-white"
          : "text-foreground/70 bg-muted/70 hover:bg-green-300 hover:text-foreground",
      )}
    >
      <item.icon
        className="size-[18px] shrink-0"
        strokeWidth={2.25}
      />

      {expanded ? (
        <span
          className={
            active
              ? "font-semibold"
              : "font-medium"
          }
        >
          {item.label}
        </span>
      ) : null}
    </Link>
  )

  /**
   * Expanded mode:
   * Label is already visible.
   */
  if (expanded) {
    return link
  }

  /**
   * Collapsed mode:
   * Icon only, therefore show tooltip.
   */
  return (
    <Tooltip>
      <TooltipTrigger render={link} />

      <TooltipContent side="right">
        {item.label}
      </TooltipContent>
    </Tooltip>
  )
}

export { NavList }
