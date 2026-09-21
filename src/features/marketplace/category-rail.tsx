"use client"

import Image from "next/image"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { cropImageUrl } from "@/features/onboarding/steps"

export type CategoryRailItem = {
  id: string
  label: string
  photo?: string | null
  icon: LucideIcon
}

/**
 * The marketplace's top browse layer, as a horizontally-scrolling strip of
 * round category avatars — the same "category strip" shape as any big
 * marketplace homepage. Deliberately buttons, not links: picking a category
 * here filters the product grid on the *same* page rather than navigating
 * away, so a buyer can flip between "Fruits" and "Spices" without losing
 * their place. No visible scrollbar; a rail this short reads as swipeable
 * on its own.
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
  return (
    <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pt-1 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] sm:gap-6 [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
        const Icon = item.icon
        const selected = item.id === selectedId
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-pressed={selected}
            className="group flex w-16 shrink-0 flex-col items-center gap-1.5 text-center sm:w-20"
          >
            <span
              className={cn(
                "relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-full bg-amama-subtle ring-1 transition-all duration-200 sm:size-20",
                selected
                  ? "ring-2 ring-amama-deep ring-offset-2 ring-offset-background"
                  : "ring-border group-hover:ring-amama-deep/40"
              )}
            >
              {item.photo ? (
                <Image
                  src={cropImageUrl(item.photo, 200)}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : (
                <Icon
                  className={cn("size-7 sm:size-8", selected ? "text-amama-deep" : "text-amama-deep/70")}
                  strokeWidth={1.75}
                />
              )}
            </span>
            <span
              className={cn(
                "line-clamp-2 text-[11px] leading-tight font-semibold sm:text-[12px]",
                selected ? "text-amama-deep" : "text-foreground"
              )}
            >
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export { CategoryRail }
