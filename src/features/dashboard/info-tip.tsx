"use client"

import * as React from "react"
import { InfoIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

/**
 * A small (i) that opens a short explanation — the place for "what does
 * this mean" copy, so the screen itself can stay to labels and values.
 * `rows` renders a compact label/value list under the text.
 */
function InfoTip({
  title,
  children,
  rows,
  className,
  side = "bottom",
}: {
  title: string
  children?: React.ReactNode
  rows?: { label: string; value: React.ReactNode }[]
  className?: string
  side?: "top" | "bottom" | "left" | "right"
}) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`About ${title}`}
        className={cn(
          "inline-grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-amama-deep/40",
          className
        )}
      >
        <InfoIcon aria-hidden className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent side={side} align="start" className="w-80">
        <p className="text-[13px] font-semibold text-foreground">{title}</p>
        {children ? <div className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{children}</div> : null}
        {rows && rows.length > 0 ? (
          <dl className="mt-2.5 divide-y divide-border border-t border-border">
            {rows.map((row) => (
              <div key={row.label} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 py-1.5 text-[12px]">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="font-medium text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

export { InfoTip }
