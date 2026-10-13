"use client"

import * as React from "react"
import { CheckCircle2Icon, CircleDashedIcon, PauseCircleIcon, XCircleIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { QcReport } from "@/features/warehouse/warehouse-store"

const VERDICT: Record<QcReport["verdict"], { label: string; icon: React.ElementType; className: string }> = {
  passed: { label: "Passed", icon: CheckCircle2Icon, className: "text-amama-deep bg-amama-subtle" },
  hold: { label: "On hold", icon: PauseCircleIcon, className: "text-status-warning bg-status-warning/12" },
  rejected: { label: "Rejected", icon: XCircleIcon, className: "text-destructive bg-destructive/10" },
  pending: { label: "Pending", icon: CircleDashedIcon, className: "text-muted-foreground bg-muted" },
}

/** One QC report — who checked, when, what was measured, the verdict. */
function QcCard({ title, report }: { title: string; report: QcReport }) {
  const verdict = VERDICT[report.verdict]
  const Icon = verdict.icon
  return (
    <div className="rounded-[16px] bg-background p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[14px] font-semibold">{title}</p>
          <p className="text-[12.5px] text-muted-foreground">
            {report.verdict === "pending" ? "Not checked yet" : `${report.by} · ${new Date(report.at).toLocaleDateString("en", { day: "numeric", month: "short" })}`}
          </p>
        </div>
        <span className={cn("inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold", verdict.className)}>
          <Icon className="size-3.5" />
          {verdict.label}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2">
        {report.checks.map((check) => (
          <div key={check.label} className="rounded-xl bg-card px-2.5 py-2">
            <dt className="text-[11.5px] text-muted-foreground">{check.label}</dt>
            <dd className={cn("text-[14px] font-semibold tabular-nums", !check.ok && "text-destructive")}>{check.value}</dd>
          </div>
        ))}
      </dl>
      {report.note ? <p className="mt-2.5 text-[12.5px] text-muted-foreground">{report.note}</p> : null}
    </div>
  )
}

export { QcCard, VERDICT }
