"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  dashboardNavFooterGroup,
  dashboardNavGroupLabels,
  type DashboardNavGroup,
  type DashboardNavItem,
} from "@/features/dashboard/nav-config"

/**
 * The nav list itself, shared between the persistent desktop sidebar and the
 * mobile drawer so the two never drift out of sync — and, now, between the
 * two widths each can be shown at. It also owns the sidebar's own visual
 * surface (background, rounding, border) rather than the shell wrapping it
 * in one, because that surface itself changes shape between the two states:
 *
 *  - Expanded: one "island" — a single bordered, neutral-bg frame holding
 *    every group, `overflow-hidden` so its rounded corners clip whatever
 *    touches them. Each group is a fixed-height header (on the frame's own
 *    neutral background, striped rather than flat — the only place that
 *    background actually shows) followed by a full-bleed white panel of
 *    icon+label rows, so the neutral tone only peeks through at a group's
 *    top edge and in the hairline gaps between one panel and the next.
 *  - Collapsed: each group becomes its own free-floating "sub-island" — the
 *    same header-over-white-panel shape, just as its own separate bordered
 *    frame with a gap before the next one, instead of one shared frame.
 *
 * Every group's header row is the same fixed height in both states (a
 * label when expanded, three faded dots when collapsed, never nothing) —
 * that's deliberate: a header that only exists in one state is what used
 * to make the whole island jump height when toggling. Same reasoning is
 * why an expanded row is `h-11` instead of letting padding decide its
 * height — that makes it exactly as tall as a collapsed row's `size-11`
 * circle, so no single row's height changes either. See `GroupHeader`.
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
      <TooltipProvider>
        <div className="flex h-full flex-col gap-3">
          <nav className="flex flex-1 flex-col gap-3 overflow-y-auto">
            {regularGroups.map(({ group, items: groupItems }) => (
              <div key={group} className="flex flex-col overflow-hidden rounded-[24px] border border-border bg-muted">
                <GroupHeader group={group} expanded={false} />
                <div className="flex flex-col items-center gap-0.5 rounded-[20px] bg-card p-1">
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
              </div>
            ))}
          </nav>
          {footerGroup ? (
            <div className="flex shrink-0 flex-col items-center gap-0.5 rounded-[24px] border border-border bg-card p-1">
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
      </TooltipProvider>
    )
  }

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-[24px] border border-border bg-muted bg-[repeating-linear-gradient(-45deg,var(--surface-border)_0px,var(--surface-border)_1px,transparent_1px,transparent_7px)] shadow-lg"
    >
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {regularGroups.map(({ group, items: groupItems }) => (
          <div key={group} className="flex flex-col">
            <GroupHeader group={group} expanded />
            <div className="flex flex-col gap-0.5 rounded-[20px] bg-card p-1">
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
        <div className="mt-1 flex shrink-0 flex-col gap-0.5 rounded-[20px] bg-card p-1">
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

/**
 * A group's label, always rendered at the same height whether there's text
 * to show or not — collapsed swaps the label for three faded dots (with a
 * real hover/focus tooltip giving the label back, not a `title` attribute —
 * those turned out unreliable here) rather than rendering nothing, which is
 * what used to make the island's height jump on toggle. Sits directly on
 * the frame's own neutral background — this row is deliberately the only
 * place that background is meant to show.
 */
function GroupHeader({ group, expanded }: { group: DashboardNavGroup; expanded: boolean }) {
  const label = dashboardNavGroupLabels[group]

  if (expanded) {
    return (
      <div className="flex h-6 shrink-0 items-center px-3">
        <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">{label}</span>
      </div>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger
        aria-label={label}
        className="flex h-6 w-full shrink-0 items-center justify-center border-0 bg-transparent p-0 outline-none"
      >
        <span className="flex items-center gap-0.5" aria-hidden>
          <span className="size-1 rounded-full bg-muted-foreground/40" />
          <span className="size-1 rounded-full bg-muted-foreground/40" />
          <span className="size-1 rounded-full bg-muted-foreground/40" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
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
        expanded ? "h-11 gap-3 rounded-full ps-4 pe-3" : "size-11 justify-center rounded-full",
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
