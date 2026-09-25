"use client"

import * as React from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"

type PageTab<T extends string> = { value: T; label: string; icon?: LucideIcon; count?: number }

/** Bottom padding every page using `PageTabs` adds to its own root, so the
 *  fixed mobile bar never sits on top of the last row of content. */
const PAGE_TABS_SPACE = "pb-24 md:pb-0"

/** Sits just below the shells' fixed 64px topbar. */
const STICK_AT = 68

function TabButtons<T extends string>({
  tabs,
  value,
  onChange,
  label,
  variant,
}: {
  tabs: PageTab<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  variant: "pill" | "bar"
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])
  const stacked = variant === "bar" && tabs.length > 3 && tabs.every((tab) => tab.icon)

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0
    if (!step) return
    event.preventDefault()
    const next = (index + step + tabs.length) % tabs.length
    refs.current[next]?.focus()
    onChange(tabs[next].value)
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "flex items-stretch gap-0.5 border border-border bg-card p-1",
        variant === "pill"
          ? "w-fit rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          : "w-full rounded-[22px] shadow-[0_12px_32px_-8px_rgba(0,0,0,0.28)]"
      )}
    >
      {tabs.map((tab, index) => {
        const active = tab.value === value
        const Icon = tab.icon
        return (
          <button
            key={tab.value}
            ref={(node) => {
              refs.current[index] = node
            }}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "flex min-w-0 items-center justify-center gap-1.5 font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-amama-deep/40",
              variant === "pill" ? "rounded-full px-3.5 py-1.5 text-[13px]" : "flex-1 rounded-[18px] px-2 py-2 text-[12.5px]",
              stacked && "flex-col gap-0.5 py-1.5 text-[10.5px]",
              active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {Icon ? <Icon aria-hidden className={cn("shrink-0", stacked ? "size-[18px]" : "size-3.5")} /> : null}
            <span className="truncate">{tab.label}</span>
            {tab.count !== undefined && !stacked ? (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[11px] tabular-nums",
                  active ? "bg-background/20 text-background" : "bg-muted text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

/**
 * The page-level view switch. On desktop it is a pill that sticks under
 * the transparent topbar once scrolled to, with a card-coloured fade
 * behind it so content passing underneath dissolves instead of colliding
 * with the chips; on a phone it becomes a bar fixed to the bottom edge,
 * in thumb reach. Labels are meant to be one word.
 */
function PageTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  className,
}: {
  tabs: PageTab<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
}) {
  const sentinel = React.useRef<HTMLDivElement>(null)
  const [stuck, setStuck] = React.useState(false)

  React.useEffect(() => {
    const node = sentinel.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting && entry.boundingClientRect.top < STICK_AT),
      { rootMargin: `-${STICK_AT}px 0px 0px 0px`, threshold: 0 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <div ref={sentinel} aria-hidden className="h-0" />
      <div className={cn("sticky z-20 hidden md:block", className)} style={{ top: STICK_AT }}>
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute -inset-x-4 -bottom-5 bg-gradient-to-b from-card via-card/90 to-transparent transition-opacity duration-200",
            stuck ? "opacity-100" : "opacity-0"
          )}
          style={{ top: -STICK_AT }}
        />
        <div className="relative">
          <TabButtons tabs={tabs} value={value} onChange={onChange} label={label} variant="pill" />
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 md:hidden">
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-transparent" />
        <div className="pointer-events-auto relative px-3 pt-6 pb-[max(env(safe-area-inset-bottom),12px)]">
          <TabButtons tabs={tabs} value={value} onChange={onChange} label={label} variant="bar" />
        </div>
      </div>
    </>
  )
}

export { PAGE_TABS_SPACE, PageTabs }
export type { PageTab }
