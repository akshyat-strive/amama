"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import * as W from "@/features/tradechain/demo-world"
import { documentRegister, stageStateFor } from "@/features/tradechain/trade-file"
import type { TradePerspective } from "@/features/trades/trade-access"
import {
  DOC_STATUS_LABEL,
  DOC_STATUS_TONE,
  SCENARIO_TONE,
  SEVERITY_TONE,
  STAGE_STATE_LABEL,
  STAGE_STATE_TONE,
  formatStamp,
  pad2,
  scenarioMeta,
} from "@/features/trades/trade-format"
import { DocumentsInfo, ScenarioInfo, StageInfo } from "@/features/trades/trade-info"
import { Dot, Facts, Panel, Pill, Status } from "@/features/trades/trade-ui"

const STEP_BADGE: Record<W.ScenarioKey, string> = {
  A: "bg-amama-subtle text-amama-deep",
  B: "bg-status-warning/12 text-status-warning",
  C: "bg-destructive/10 text-destructive",
  D: "bg-foreground/[0.07] text-foreground",
  E: "bg-muted text-muted-foreground",
}

function StageRail({
  trade,
  selected,
  onSelect,
}: {
  trade: W.Trade
  selected: W.StageNo
  onSelect: (stage: W.StageNo) => void
}) {
  return (
    <nav aria-label="Stages" className="overflow-hidden rounded-[20px] border border-border bg-card py-1.5">
      {W.PHASES.map((phase) => (
        <div key={phase.id} className="px-1.5 pb-1">
          <p className="px-2.5 pt-2 pb-1 text-[11px] font-medium text-muted-foreground">{phase.label}</p>
          <ul>
            {W.STAGES.filter((stage) => stage.phase === phase.id).map((stage) => {
              const state = stageStateFor(trade, stage.n)
              const record = W.stageRecord(trade.id, stage.n)
              const active = stage.n === selected
              const now = stage.n === trade.currentStage && trade.status !== "closed"
              const exception = record && record.scenario !== "A" && state !== "pending" ? record.scenario : null
              return (
                <li key={stage.n}>
                  <button
                    type="button"
                    onClick={() => onSelect(stage.n)}
                    aria-current={active ? "step" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-[12px] px-2.5 py-1.5 text-start transition-colors",
                      active ? "bg-foreground text-background" : "hover:bg-muted"
                    )}
                  >
                    <Dot tone={active ? "muted" : STAGE_STATE_TONE[state]} className={active ? "bg-background/60" : undefined} />
                    <span className={cn("font-mono text-[11px] tabular-nums", active ? "text-background/70" : "text-muted-foreground")}>
                      {pad2(stage.n)}
                    </span>
                    <span className={cn("min-w-0 flex-1 truncate text-[13px]", state === "pending" && !active ? "text-muted-foreground" : "font-medium")}>
                      {stage.short}
                    </span>
                    {exception ? (
                      <span
                        className={cn(
                          "grid size-5 shrink-0 place-items-center rounded-full font-mono text-[10px] font-bold",
                          active ? "bg-background/15" : STEP_BADGE[exception]
                        )}
                      >
                        {exception}
                      </span>
                    ) : null}
                    {now ? <span className={cn("text-[10.5px] font-semibold", active ? "" : "text-amama-deep")}>Now</span> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function SlaResult({ met }: { met: boolean | null }) {
  if (met === null) return <span className="text-muted-foreground">Running</span>
  return met ? <span className="text-amama-deep">Met</span> : <span className="text-destructive">Missed</span>
}

/** What happened, in the trade's own words — clamped to three lines. */
function Outcome({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className="mt-4 border-t border-border pt-3.5">
      <p className="text-[12px] text-muted-foreground">What happened</p>
      <p className={cn("mt-0.5 text-[13px] leading-relaxed text-foreground", !open && "line-clamp-3")}>{text}</p>
      {text.length > 220 ? (
        <button type="button" onClick={() => setOpen(!open)} className="mt-1 text-[12px] font-medium text-amama-deep hover:underline">
          {open ? "Less" : "More"}
        </button>
      ) : null}
    </div>
  )
}

function StageDetail({ trade, stageNo, perspective }: { trade: W.Trade; stageNo: W.StageNo; perspective: TradePerspective }) {
  const stage = W.stageByNo(stageNo)
  const record = W.stageRecord(trade.id, stageNo)
  const state = stageStateFor(trade, stageNo)
  const reached = state !== "pending"
  const owner = record ? W.userById(record.ownerId) : undefined
  const documents = documentRegister(trade).filter((document) => document.stage === stageNo)
  const internal = perspective === "internal"
  const ran = reached && record ? record.scenario : null
  const chain = ran ? stage.scenarios[ran] : null

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Panel
        title={
          <>
            <span className="font-mono text-amama-deep">{pad2(stage.n)}</span> {stage.name}
          </>
        }
        info={<StageInfo stage={stage} />}
        action={<Status tone={STAGE_STATE_TONE[state]}>{STAGE_STATE_LABEL[state]}</Status>}
      >
        <Facts
          columns={3}
          rows={[
            {
              label: "Scenario",
              info: <ScenarioInfo scenario={ran ?? undefined} />,
              value: ran ? (
                <Pill tone={SCENARIO_TONE[ran]}>
                  {ran} · {scenarioMeta(ran).label}
                </Pill>
              ) : (
                <span className="text-muted-foreground">Not reached</span>
              ),
            },
            {
              label: "Owner",
              value: owner && reached ? owner.name : W.roleById(stage.ownerRole).label,
            },
            { label: "Team", value: W.roleById(stage.ownerRole).label },
            { label: "Started", value: formatStamp(record?.startedAt) },
            { label: "Completed", value: record?.completedAt ? formatStamp(record.completedAt) : "—" },
            { label: "SLA", value: reached ? <SlaResult met={record?.slaMet ?? null} /> : "—" },
          ]}
        />
        {reached && record ? <Outcome text={record.outcome} /> : null}
      </Panel>

      {chain && ran ? (
        <Panel
          title={`Chain ${ran} · ${scenarioMeta(ran).label}`}
          info={<ScenarioInfo scenario={ran} />}
          action={<span className="text-[12px] text-muted-foreground">{chain.steps.length} steps</span>}
        >
          <Facts
            columns={3}
            rows={[
              { label: "Trigger", value: chain.trigger, wide: true },
              { label: "Owner", value: W.roleById(chain.owner).label },
              { label: "SLA", value: chain.sla },
              ...(internal
                ? [
                    {
                      label: "Escalation",
                      value:
                        chain.escalation.length === 0 ? (
                          "None"
                        ) : (
                          <span className="flex flex-wrap items-center gap-1">
                            {chain.escalation.map((role, index) => (
                              <React.Fragment key={role}>
                                {index > 0 ? <span className="text-[11px] text-muted-foreground">→</span> : null}
                                <span>{W.roleById(role).label}</span>
                              </React.Fragment>
                            ))}
                          </span>
                        ),
                    },
                  ]
                : []),
            ]}
          />
          <ol className="mt-4 grid gap-1.5 border-t border-border pt-3.5 sm:grid-cols-2">
            {chain.steps.map((step, index) => (
              <li key={step} className="flex items-start gap-2.5">
                <span
                  className={cn(
                    "mt-px grid size-5 shrink-0 place-items-center rounded-full font-mono text-[10px] font-bold tabular-nums",
                    STEP_BADGE[ran]
                  )}
                >
                  {index + 1}
                </span>
                <span className="text-[13px] text-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </Panel>
      ) : null}

      {documents.length > 0 ? (
        <Panel title="Documents" info={<DocumentsInfo />} flush>
          <DocumentRows documents={documents} />
        </Panel>
      ) : null}

      {internal && stage.notifications.length > 0 ? (
        <Panel title="Alerts" flush>
          <ul className="divide-y divide-border">
            {stage.notifications.map((notification) => (
              <li key={notification.text} className="flex items-center gap-3 px-5 py-2.5">
                <Pill tone={SEVERITY_TONE[notification.level]} className="w-[4.75rem] justify-center">
                  {notification.level}
                </Pill>
                <span className="min-w-0 text-[13px] text-foreground">{notification.text}</span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  )
}

function DocumentRows({ documents }: { documents: W.TradeDocument[] }) {
  return (
    <ul className="divide-y divide-border">
      {documents.map((document) => (
        <li key={document.id} className="flex items-center gap-3 px-5 py-2.5">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-foreground">{document.name}</span>
            <span className="block truncate text-[12px] text-muted-foreground">
              {document.issuer}
              {document.requirement === "O" ? " · Optional" : ""}
              {document.blocks.length > 0 ? ` · Blocks ${document.blocks[0].toLowerCase()}` : ""}
            </span>
          </span>
          <Status tone={DOC_STATUS_TONE[document.status]}>{DOC_STATUS_LABEL[document.status]}</Status>
        </li>
      ))}
    </ul>
  )
}

function StagesPanel({
  trade,
  perspective,
  selected,
  onSelect,
}: {
  trade: W.Trade
  perspective: TradePerspective
  selected: W.StageNo
  onSelect: (stage: W.StageNo) => void
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:hidden">
        {W.STAGES.map((stage) => {
          const state = stageStateFor(trade, stage.n)
          const active = stage.n === selected
          return (
            <button
              key={stage.n}
              type="button"
              onClick={() => onSelect(stage.n)}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium",
                active ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground"
              )}
            >
              {!active ? <Dot tone={STAGE_STATE_TONE[state]} /> : null}
              <span className="font-mono tabular-nums">{pad2(stage.n)}</span>
              {stage.short}
            </button>
          )
        })}
      </div>
      <div className="hidden lg:sticky lg:top-[124px] lg:block">
        <StageRail trade={trade} selected={selected} onSelect={onSelect} />
      </div>
      <StageDetail key={`${trade.id}-${selected}`} trade={trade} stageNo={selected} perspective={perspective} />
    </div>
  )
}

export { DocumentRows, StagesPanel }
