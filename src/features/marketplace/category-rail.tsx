"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { CropImage } from "@/features/marketplace/crop-image"

export type CategoryRailItem = {
  id: string
  label: string
  /** Up to three photos, fanned like cards held in a hand. */
  photos: string[]
  count: number
}

/** Where each card sits in the hand — outer cards tilt out and drop a
 *  little lower, so the three read as an arc rather than a row. */
const FAN: Record<number, { rest: string[]; open: string[] }> = {
  1: { rest: ["rotate(-3deg)"], open: ["rotate(0deg) translateY(-4px)"] },
  2: {
    rest: ["translateX(-13px) rotate(-9deg) translateY(3px)", "translateX(13px) rotate(9deg) translateY(3px)"],
    open: ["translateX(-19px) rotate(-14deg) translateY(1px)", "translateX(19px) rotate(14deg) translateY(1px)"],
  },
  3: {
    rest: [
      "translateX(-22px) rotate(-14deg) translateY(7px)",
      "translateY(-2px)",
      "translateX(22px) rotate(14deg) translateY(7px)",
    ],
    open: [
      "translateX(-31px) rotate(-20deg) translateY(6px)",
      "translateY(-7px)",
      "translateX(31px) rotate(20deg) translateY(6px)",
    ],
  },
}

function Fan({ photos, open, size }: { photos: string[]; open: boolean; size: "lg" | "sm" }) {
  const cards = photos.slice(0, 3)
  const layout = FAN[Math.max(1, cards.length)]
  const hand = (
    <span className="relative block h-[86px] w-[120px]">
      {cards.map((photo, index) => (
        <span
          key={`${photo}-${index}`}
          className="absolute bottom-0 left-1/2 -ms-[29px] size-[58px] overflow-hidden rounded-[14px] border-2 border-card bg-muted shadow-[0_6px_14px_-6px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none"
          style={{
            transform: (open ? layout.open : layout.rest)[index],
            transformOrigin: "50% 100%",
            zIndex: index === 1 ? 2 : 1,
          }}
        >
          <CropImage photo={photo} width={160} alt="" sizes="64px" />
        </span>
      ))}
    </span>
  )
  if (size === "lg") return hand
  return (
    <span aria-hidden className="relative block h-7 w-10 shrink-0">
      <span className="absolute bottom-0 left-1/2 origin-bottom -translate-x-1/2 scale-[0.34]">{hand}</span>
    </span>
  )
}

/**
 * The marketplace's category strip: every category as a small hand of
 * cards — two or three real listing photos fanned out — that spreads
 * further on hover and when chosen. Buttons, not links: picking one
 * filters the grid on this same page.
 */
function CategoryRail({
  items,
  selectedId,
  onSelect,
}: {
  items: CategoryRailItem[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  const [hovered, setHovered] = React.useState<string | null>(null)
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pt-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
        const selected = item.id === selectedId
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            onPointerEnter={() => setHovered(item.id)}
            onPointerLeave={() => setHovered(null)}
            aria-pressed={selected}
            className={cn(
              "flex w-[136px] shrink-0 flex-col items-center gap-2 rounded-[22px] px-2 pt-3 pb-2.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-amama-deep/40",
              selected ? "bg-amama-subtle" : "hover:bg-muted/70"
            )}
          >
            <Fan photos={item.photos} open={selected || hovered === item.id} size="lg" />
            <span className="flex flex-col items-center">
              <span className={cn("text-[13px] leading-tight font-semibold", selected ? "text-amama-deep" : "text-foreground")}>
                {item.label}
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {item.count} {item.count === 1 ? "listing" : "listings"}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** The same categories as a slim chip slider — what stays pinned under
 *  the topbar once the full rail has scrolled away. */
function CategoryChips({
  items,
  selectedId,
  onSelect,
}: {
  items: CategoryRailItem[]
  selectedId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto rounded-full border border-border bg-card/95 p-1 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.3)] backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
        const selected = item.id === selectedId
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-pressed={selected}
            className={cn(
              "flex h-9 shrink-0 items-center gap-2 rounded-full ps-1.5 pe-3.5 text-[12.5px] font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-amama-deep/40",
              selected ? "bg-foreground text-background" : "text-foreground/80 hover:bg-muted"
            )}
          >
            <Fan photos={item.photos} open={selected} size="sm" />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

export { CategoryChips, CategoryRail }
