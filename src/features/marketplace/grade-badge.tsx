"use client"

import { InfoIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type GradeTier = { shortLabel: string; gradientClassName: string; description: string }

/** Every tier stays inside the brand's own green family — a lighter,
 *  brighter gradient for the top grade, dimming down through the lower
 *  ones, rather than reaching for gold or grey to tell them apart. */
const gradeTiers: Record<string, GradeTier> = {
  "Grade A+": {
    shortLabel: "A+",
    gradientClassName: "from-amama bg-gradient-to-r to-amama-deep",
    description:
      "Export premium — hand-sorted, under 1% defects, uniform sizing. What buyers pay top price for.",
  },
  "Grade A": {
    shortLabel: "A",
    gradientClassName: "from-amama-deep bg-gradient-to-r to-amama-deep-hover",
    description: "Solid commercial grade — lightly sorted, small natural variation in size or colour.",
  },
  "Grade B": {
    shortLabel: "B",
    gradientClassName: "from-muted-foreground bg-gradient-to-r to-foreground/60",
    description: "Standard grade — good for processing or blending; more visible variation than A grade.",
  },
}

const fallbackTier = gradeTiers["Grade B"]

/**
 * The info trigger on its own — used next to the grade badge wherever it
 * appears, and standalone next to the grade picker in the listing form,
 * since a seller choosing a grade needs the same explanation a buyer
 * reading one does.
 */
function GradeInfoTrigger({ grade, className }: { grade?: string; className?: string }) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        aria-label="What do grades mean?"
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded-full text-muted-foreground/60 outline-none transition-colors hover:text-foreground focus-visible:text-foreground",
          className
        )}
      >
        <InfoIcon className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <p className="text-[13px] font-semibold text-foreground">Grade guide</p>
        <ul className="mt-2.5 flex flex-col gap-2.5">
          {Object.entries(gradeTiers).map(([label, entry]) => (
            <li
              key={label}
              className={cn(
                "flex items-start gap-2.5 rounded-xl px-2 py-1.5",
                label === grade && "bg-muted"
              )}
            >
              <span
                className={cn(
                  "shrink-0 bg-clip-text text-[15px] font-extrabold text-transparent",
                  entry.gradientClassName
                )}
              >
                {entry.shortLabel}
              </span>
              <p className="text-[12px] leading-relaxed text-muted-foreground">{entry.description}</p>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

/** Just the letter, in a gradient, with a small info trigger beside it —
 *  no seal, no stars. The grade already means something to anyone trading
 *  in this market; the popover is there for whoever it doesn't. */
function GradeBadge({ grade, className }: { grade: string; className?: string }) {
  const tier = gradeTiers[grade] ?? fallbackTier

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <span className={cn("bg-clip-text text-[15px] font-extrabold text-transparent", tier.gradientClassName)}>
        {tier.shortLabel}
      </span>
      <GradeInfoTrigger grade={grade} />
    </span>
  )
}

export { GradeBadge, GradeInfoTrigger }
