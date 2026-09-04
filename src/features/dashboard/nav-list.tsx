"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import type { DashboardNavItem } from "@/features/dashboard/nav-config"

/**
 * The nav list itself, shared between the persistent desktop sidebar and the
 * mobile drawer so the two never drift out of sync.
 */
function NavList({
  items,
  onNavigate,
}: {
  items: DashboardNavItem[]
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        // Overview's own href would otherwise prefix-match every other item.
        const active =
          item.href === pathname ||
          (item.label !== "Overview" && pathname.startsWith(item.href + "/"))

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors",
              active
                ? "bg-amama-subtle text-amama-deep"
                : "text-foreground/80 hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="size-[18px] shrink-0" strokeWidth={2.25} />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export { NavList }
