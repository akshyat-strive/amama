"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Buttons joined into one control, Material 3's connected button group:
 * a 2px gap between segments, full rounding on the outer corners and
 * tight corners where segments meet. The selected segment fills green.
 */
function ButtonGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  size = "md",
  className,
}: {
  label: string
  options: readonly { value: T; label: React.ReactNode; icon?: React.ElementType }[]
  value: T
  onChange: (value: T) => void
  size?: "sm" | "md"
  className?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex gap-0.5", className)}>
      {options.map((option, index) => {
        const on = option.value === value
        const Icon = option.icon
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center gap-1.5 font-medium transition-[background-color,color,border-radius] duration-200",
              size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-[14px]",
              "rounded-[6px]",
              index === 0 && (size === "sm" ? "rounded-s-[10px]" : "rounded-s-xl"),
              index === options.length - 1 && (size === "sm" ? "rounded-e-[10px]" : "rounded-e-xl"),
              on ? "bg-amama text-white" : "bg-background text-foreground hover:bg-muted"
            )}
          >
            {Icon ? <Icon aria-hidden className="size-4" /> : null}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export { ButtonGroup }
