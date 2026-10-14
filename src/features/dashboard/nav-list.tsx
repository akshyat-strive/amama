"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LockIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  dashboardNavFooterGroup,
  dashboardNavGroupLabels,
  type DashboardNavItem,
} from "@/features/dashboard/nav-config"

/**
 * The sidebar: no card of its own — plain groups straight on the mist
 * page, a quiet label, then compact rows. Only the selected row carries
 * colour: lime, with charcoal text. Account items pin to the bottom.
 *
 * Collapsed, it's an icon rail: groups split by hairlines, labels in
 * tooltips.
 *
 * `locked` hrefs render greyed with a lock and don't navigate — what a
 * buyer or seller sees while their KYC is still in review.
 */
function NavList({
  items,
  expanded = true,
  onNavigate,
  locked,
  attention,
}: {
  items: DashboardNavItem[]
  expanded?: boolean
  onNavigate?: () => void
  /** Hrefs that can't be opened yet. */
  locked?: ReadonlySet<string>
  /** Hrefs that get a small amber dot — something there needs action. */
  attention?: ReadonlySet<string>
}) {
  const pathname = usePathname()

  // The most specific match wins: `/portal/orders` over `/portal`.
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

  const renderItem = (item: DashboardNavItem) => (
    <NavItemLink
      key={item.href}
      item={item}
      active={item.href === activeHref}
      expanded={expanded}
      locked={locked?.has(item.href) ?? false}
      attention={attention?.has(item.href) ?? false}
      onNavigate={onNavigate}
    />
  )

  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 flex-col overflow-hidden text-foreground">
        <nav aria-label="Main" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden scrollbar-none">
          {regularGroups.map(({ group, items: groupItems }, index) => (
            <div key={group} className={cn(index > 0 && (expanded ? "mt-3" : "mt-2 border-t border-foreground/10 pt-2"))}>
              {expanded && dashboardNavGroupLabels[group] ? (
                <p className="px-3 pb-1 text-[11px] font-medium text-muted-foreground">{dashboardNavGroupLabels[group]}</p>
              ) : null}
              <div className={cn("flex flex-col gap-0.5", !expanded && "items-center")}>{groupItems.map(renderItem)}</div>
            </div>
          ))}
        </nav>

        {footerGroup ? (
          <div className="shrink-0 border-t border-foreground/10 pt-2">
            <div className={cn("flex flex-col gap-0.5", !expanded && "items-center")}>{footerGroup.items.map(renderItem)}</div>
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  )
}

function NavItemLink({
  item,
  active,
  expanded,
  locked,
  attention,
  onNavigate,
}: {
  item: DashboardNavItem
  active: boolean
  expanded: boolean
  locked: boolean
  attention: boolean
  onNavigate?: () => void
}) {
  const className = cn(
    "group/nav relative flex shrink-0 items-center text-[13.5px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-amama-deep/40",
    expanded ? "h-9 w-full gap-2.5 rounded-[10px] px-2.5" : "size-9 justify-center rounded-[10px]",
    locked
      ? "cursor-not-allowed text-foreground/30"
      : active
        ? "bg-lime font-semibold text-lime-foreground"
        : "text-foreground/70 hover:bg-foreground/[0.06] hover:text-foreground"
  )

  const body = (
    <>
      <item.icon aria-hidden className="size-[17px] shrink-0" strokeWidth={2} />
      {expanded ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}
      {locked && expanded ? <LockIcon aria-hidden className="size-3.5 shrink-0" /> : null}
      {attention && !locked ? (
        <span aria-hidden className={cn("size-2 shrink-0 rounded-full bg-status-warning", !expanded && "absolute end-1.5 top-1.5")} />
      ) : null}
    </>
  )

  const element = locked ? (
    <span role="link" aria-disabled="true" aria-label={`${item.label} — unlocks after KYC approval`} className={className}>
      {body}
    </span>
  ) : (
    <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} aria-label={item.label} className={className}>
      {body}
    </Link>
  )

  if (expanded && !locked) return element

  return (
    <Tooltip>
      <TooltipTrigger render={element} />
      <TooltipContent side="right">{locked ? `${item.label} · unlocks after KYC approval` : item.label}</TooltipContent>
    </Tooltip>
  )
}

export { NavList }
