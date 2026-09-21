import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { LOGISTICS_STAGE_LABELS, LOGISTICS_STAGE_ORDER, type LogisticsStage } from "@/features/marketplace/deal-store"
import { LOGISTICS_PHASE_BAND_LABELS, phaseBandForStage } from "@/features/marketplace/logistics"

/**
 * The eleven-stage pipeline, phase-banded, current stage highlighted and
 * everything before it checked off — the one stepper `ShipmentTracker`,
 * the seller's dispatch checklist and the internal control tower's detail
 * pane all share, so a shipment reads as the same pipeline everywhere it
 * shows up rather than three different summaries of the same data.
 */
function LogisticsStageRail({ stage, compact = false }: { stage: LogisticsStage; compact?: boolean }) {
  const currentIndex = LOGISTICS_STAGE_ORDER.indexOf(stage)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {LOGISTICS_STAGE_ORDER.map((entry, index) => {
          const done = index < currentIndex
          const active = index === currentIndex
          const band = phaseBandForStage(entry)
          const showBandLabel = index === 0 || phaseBandForStage(LOGISTICS_STAGE_ORDER[index - 1]) !== band
          return (
            <div key={entry} className="flex shrink-0 flex-col items-center gap-1">
              {!compact && showBandLabel ? (
                <span className="mb-0.5 text-[9px] font-semibold tracking-wide text-muted-foreground uppercase">
                  {LOGISTICS_PHASE_BAND_LABELS[band]}
                </span>
              ) : null}
              <div className="flex items-center">
                {index > 0 ? (
                  <span aria-hidden className={cn("h-px w-3 sm:w-5", done || active ? "bg-amama-deep" : "bg-border")} />
                ) : null}
                <span
                  title={LOGISTICS_STAGE_LABELS[entry]}
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold",
                    done
                      ? "bg-amama-deep text-white"
                      : active
                        ? "border-2 border-amama-deep bg-amama-subtle text-amama-deep"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {done ? <CheckIcon className="size-3" /> : index + 1}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      {!compact ? (
        <p className="text-[13px] font-semibold text-foreground">{LOGISTICS_STAGE_LABELS[stage]}</p>
      ) : null}
    </div>
  )
}

export { LogisticsStageRail }
