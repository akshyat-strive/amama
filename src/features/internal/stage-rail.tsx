"use client"

import Link from "next/link"

import { cn } from "@/lib/utils"
import { Eyebrow } from "@/features/internal/tower-ui"
import * as W from "@/features/tradechain/demo-world"

const PHASE_BAR: Record<W.PhaseId, string> = {
  commercial: "bg-amama-deep",
  "farm-gate": "bg-status-success",
  "cold-chain": "bg-chart-4",
  export: "bg-status-warning",
  transit: "bg-destructive",
}

const STATE_DOT: Record<W.StageState, string> = {
  complete: "bg-status-success",
  "in-progress": "bg-amama-deep animate-pulse",
  blocked: "bg-destructive",
  pending: "bg-muted-foreground/30",
}

/**
 * The 16-stage explorer, grouped by its five phases.
 *
 * Reused verbatim from the control tower: the grouping is not decoration —
 * permissions, dashboards and escalation paths all follow phases rather
 * than individual stages, so the phase a stage sits in is load-bearing
 * information, not a heading.
 *
 * When `tradeId` is given each stage carries that trade's actual state, so
 * the same component is both a map of the process and a live status rail.
 */
function StageRail({
  tradeId,
  current,
  className,
  orientation = "vertical",
}: {
  tradeId?: string
  current?: W.StageNo
  className?: string
  orientation?: "vertical" | "horizontal"
}) {
  const records = tradeId ? W.stageRecordsForTrade(tradeId) : []
  const stateFor = (n: W.StageNo): W.StageState | null =>
    records.find((record) => record.stage === n)?.state ?? null

  if (orientation === "horizontal") {
    return (
      <div className={cn("flex gap-1 overflow-x-auto pb-1 scrollbar-none", className)}>
        {W.STAGES.map((stage) => {
          const state = stateFor(stage.n)
          const active = stage.n === current
          return (
            <Link
              key={stage.n}
              href={tradeId ? `/internal/trades/${tradeId}/stage/${stage.n}` : `/internal/trades?stage=${stage.n}`}
              aria-current={active ? "step" : undefined}
              title={`${String(stage.n).padStart(2, "0")} — ${stage.name}`}
              className={cn(
                "flex min-w-[7.5rem] shrink-0 flex-col gap-1.5 rounded-[14px] px-2.5 py-2 transition-colors",
                active ? "bg-amama text-amama-foreground" : "hover:bg-muted"
              )}
            >
              <span aria-hidden className={cn("h-1 w-full rounded-full", PHASE_BAR[stage.phase])} />
              <span className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] opacity-70 tabular-nums">
                  {String(stage.n).padStart(2, "0")}
                </span>
                {state ? <span aria-hidden className={cn("size-1.5 rounded-full", STATE_DOT[state])} /> : null}
              </span>
              <span className="truncate text-[11px] leading-tight font-medium">{stage.short}</span>
            </Link>
          )
        })}
      </div>
    )
  }

  return (
    <nav aria-label="Trade stages" className={cn("flex flex-col gap-3", className)}>
      {W.PHASES.map((phase) => {
        const stages = W.STAGES.filter((stage) => stage.phase === phase.id)
        return (
          <div key={phase.id}>
            <Eyebrow className="px-2">{phase.label}</Eyebrow>
            <div className="mt-1 flex flex-col">
              {stages.map((stage) => {
                const state = stateFor(stage.n)
                const active = stage.n === current
                return (
                  <Link
                    key={stage.n}
                    href={tradeId ? `/internal/trades/${tradeId}/stage/${stage.n}` : `/internal/trades?stage=${stage.n}`}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-full px-2.5 py-1.5 transition-colors",
                      active
                        ? "border border-amama-foreground bg-amama text-amama-foreground"
                        : "text-foreground/80 hover:bg-muted"
                    )}
                  >
                    <span className="font-mono text-[11px] opacity-60 tabular-nums">
                      {String(stage.n).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">{stage.short}</span>
                    {state ? <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", STATE_DOT[state])} /> : null}
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </nav>
  )
}

export { StageRail }
