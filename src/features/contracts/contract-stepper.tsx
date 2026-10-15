"use client"

import * as React from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { CONTRACT_STAGE_LABELS, CONTRACT_STAGE_ORDER, type Contract } from "@/features/contracts/contract-store"

/** Where the contract stands. On phones a one-line "Step 2 of 7" with a
 *  progress bar that expands to the full list; from `lg` the list is
 *  always shown, current step in dark type, done steps ticked green. */
function ContractStepper({ stage }: { stage: Contract["stage"] }) {
  const [open, setOpen] = React.useState(false)
  const currentIndex = CONTRACT_STAGE_ORDER.indexOf(stage)
  const total = CONTRACT_STAGE_ORDER.length
  const pct = Math.round(((currentIndex + 1) / total) * 100)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-start lg:pointer-events-none"
      >
        <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
          Step <span className="font-semibold text-foreground tabular-nums">{currentIndex + 1}</span> of {total} ·{" "}
          <span className="font-semibold text-foreground">{CONTRACT_STAGE_LABELS[stage]}</span>
        </span>
        <ChevronDownIcon aria-hidden className={cn("size-4 shrink-0 text-muted-foreground transition-transform lg:hidden", open && "rotate-180")} />
      </button>
      <div
        className="mt-2 h-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={currentIndex + 1}
        aria-valuemin={1}
        aria-valuemax={total}
      >
        <div className="h-full rounded-full bg-amama-deep transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      <ol className={cn("mt-3 flex-col gap-0.5", open ? "flex" : "hidden", "lg:flex")}>
        {CONTRACT_STAGE_ORDER.map((entry, index) => {
          const done = index < currentIndex
          const current = index === currentIndex
          return (
            <li key={entry} aria-current={current ? "step" : undefined} className="flex items-center gap-2.5 py-1 text-[13px]">
              <span
                className={cn(
                  "grid size-[18px] shrink-0 place-items-center rounded-full text-[10px] font-semibold tabular-nums",
                  done && "bg-amama-deep text-white",
                  current && "bg-foreground text-background",
                  !done && !current && "bg-muted text-muted-foreground"
                )}
              >
                {done ? <CheckIcon aria-hidden className="size-3" strokeWidth={3} /> : index + 1}
              </span>
              <span className={cn("truncate", current ? "font-semibold text-foreground" : done ? "text-foreground/80" : "text-muted-foreground")}>
                {CONTRACT_STAGE_LABELS[entry]}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export { ContractStepper }
