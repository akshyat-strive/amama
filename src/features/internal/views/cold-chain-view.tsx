"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"
import { EntityLink } from "@/features/internal/entity-link"
import {
  Dot,
  Eyebrow,
  Facts,
  Group,
  Metric,
  Metrics,
  Mono,
  PageHead,
  Pill,
  Row,
  Rows,
  TableHead,
  type Tone,
} from "@/features/internal/tower-ui"
import * as W from "@/features/tradechain/demo-world"

/**
 * Cold chain.
 *
 * Temperature is the only thing on this platform that cannot be corrected
 * after the fact. A missing document can be refiled; four hours at 6 °C is
 * shelf life that is simply gone, and the argument about who pays for it
 * happens weeks later against whatever record exists. So this screen is
 * built around the record: every excursion carries its cause, its debit in
 * days, the decision taken and the person who took it — computed at the
 * time and never recomputed.
 *
 * The chart is deliberately one `<svg>` and no library. 226 hourly samples
 * against a moving set point is a line and a dashed line; anything more is
 * chrome on top of the only two facts that matter. It now draws straight
 * onto the white island — the grid is the island's own hairline border
 * colour, so the plot reads as part of the card rather than as a picture
 * pasted into it.
 */

const LEG_LABEL: Record<W.TempSample["leg"], string> = {
  orchard: "Orchard",
  road: "Road",
  "pre-cool": "Pre-cool",
  "cold-store": "Cold store",
  stuffing: "Stuffing",
  "port-run": "Port run",
  terminal: "Terminal",
}

const CONTAINER_TONE: Record<W.Container["state"], Tone> = {
  booked: "muted",
  stuffing: "warn",
  sealed: "warn",
  "at-terminal": "warn",
  "gated-in": "ok",
  sailed: "ok",
  discharged: "ok",
  delivered: "ok",
}

const stamp = (value: string): string =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value))

const shortDay = (value: string): string =>
  new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(new Date(value))

/* ── chart geometry, derived once from a static stream ────────────── */

const SAMPLES = W.TEMPERATURE_STREAM
const WIDTH = 720
const HEIGHT = 200
const PAD = { left: 34, right: 10, top: 14, bottom: 24 }
const PLOT_W = WIDTH - PAD.left - PAD.right
const PLOT_H = HEIGHT - PAD.top - PAD.bottom

const MAX_C = Math.ceil(Math.max(...SAMPLES.map((sample) => sample.tempC)) / 5) * 5
const MIN_C = Math.min(0, Math.floor(Math.min(...SAMPLES.map((sample) => sample.tempC))))

const xAt = (index: number): number => PAD.left + (index / (SAMPLES.length - 1)) * PLOT_W
const yAt = (tempC: number): number => PAD.top + (1 - (tempC - MIN_C) / (MAX_C - MIN_C)) * PLOT_H

const GRID_LINES: number[] = []
for (let value = MIN_C; value <= MAX_C; value += 5) GRID_LINES.push(value)

/** Contiguous runs of one leg — the stream is already ordered, so this is
 *  seven entries, not a group-by. */
type LegRun = { leg: W.TempSample["leg"]; start: number; end: number }

const LEG_RUNS: LegRun[] = []
for (const [index, sample] of SAMPLES.entries()) {
  const last = LEG_RUNS[LEG_RUNS.length - 1]
  if (last && last.leg === sample.leg) last.end = index
  else LEG_RUNS.push({ leg: sample.leg, start: index, end: index })
}

/** Contiguous runs of excursion samples, so the tint is one band rather
 *  than a row of disconnected dots. */
const EXCURSION_RUNS: { start: number; end: number }[] = []
for (const [index, sample] of SAMPLES.entries()) {
  if (!sample.excursion) continue
  const last = EXCURSION_RUNS[EXCURSION_RUNS.length - 1]
  if (last && last.end === index - 1) last.end = index
  else EXCURSION_RUNS.push({ start: index, end: index })
}

const TEMP_POINTS = SAMPLES.map((sample, index) => `${xAt(index).toFixed(1)},${yAt(sample.tempC).toFixed(1)}`).join(" ")
const SETPOINT_POINTS = SAMPLES.map(
  (sample, index) => `${xAt(index).toFixed(1)},${yAt(sample.setpointC).toFixed(1)}`
).join(" ")

const TIME_TICKS = [
  0,
  Math.round(SAMPLES.length * 0.25),
  Math.round(SAMPLES.length * 0.5),
  Math.round(SAMPLES.length * 0.75),
  SAMPLES.length - 1,
]

function TemperatureChart() {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-auto w-full"
      role="img"
      aria-label={`Temperature against set point across ${SAMPLES.length} hourly samples, harvest to terminal plug-in`}
    >
      {/* Grid sits on the island's own hairline colour, so it recedes
          against white instead of banding the way a muted fill did. */}
      {GRID_LINES.map((value) => (
        <g key={value}>
          <line
            x1={PAD.left}
            x2={WIDTH - PAD.right}
            y1={yAt(value)}
            y2={yAt(value)}
            className="stroke-border"
            strokeWidth={1}
          />
          <text x={PAD.left - 6} y={yAt(value) + 3} textAnchor="end" className="fill-muted-foreground text-[9px]">
            {value}°
          </text>
        </g>
      ))}

      {LEG_RUNS.slice(1).map((run) => (
        <line
          key={run.leg + run.start}
          x1={xAt(run.start)}
          x2={xAt(run.start)}
          y1={PAD.top}
          y2={PAD.top + PLOT_H}
          className="stroke-border"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
      ))}

      {EXCURSION_RUNS.map((run) => (
        <rect
          key={run.start}
          x={xAt(run.start) - 1.5}
          y={PAD.top}
          width={Math.max(xAt(run.end) - xAt(run.start) + 3, 3)}
          height={PLOT_H}
          className="fill-destructive/12"
        />
      ))}

      <polyline
        points={SETPOINT_POINTS}
        className="fill-none stroke-muted-foreground/70"
        strokeWidth={1.25}
        strokeDasharray="5 4"
      />
      <polyline points={TEMP_POINTS} className="fill-none stroke-amama-deep" strokeWidth={1.75} strokeLinejoin="round" />

      {SAMPLES.map((sample, index) =>
        sample.excursion ? (
          <circle key={sample.at} cx={xAt(index)} cy={yAt(sample.tempC)} r={2.2} className="fill-destructive" />
        ) : null
      )}

      {TIME_TICKS.map((index) => (
        <text
          key={index}
          x={xAt(index)}
          y={HEIGHT - 8}
          textAnchor={index === 0 ? "start" : index === SAMPLES.length - 1 ? "end" : "middle"}
          className="fill-muted-foreground text-[9px]"
        >
          {shortDay(SAMPLES[index].at)}
        </text>
      ))}
    </svg>
  )
}

/* ── excursions ───────────────────────────────────────────────────── */

function ExcursionRow({ excursion }: { excursion: W.Excursion }) {
  const severe = excursion.shelfLifeDebitDays >= 3

  return (
    <Row className="items-start">
      <Dot tone={severe ? "crit" : "warn"} className="mt-2" />

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Mono className="font-semibold">{excursion.id}</Mono>
          <Pill tone={severe ? "crit" : "warn"}>{excursion.shelfLifeDebitDays} d shelf life</Pill>
          <EntityLink kind="trade" id={excursion.tradeId} />
          {excursion.lotId ? <EntityLink kind="lot" id={excursion.lotId} /> : null}
        </span>

        <span className="mt-1 block text-[13px] leading-relaxed text-foreground">{excursion.cause}</span>

        <span className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted-foreground tabular-nums">
          <span>Started {stamp(excursion.startedAt)}</span>
          <span>{excursion.durationMin} min</span>
          <span>
            Peak {excursion.peakTempC} °C against {excursion.setpointC} °C
          </span>
        </span>

        <span className="mt-1.5 block text-[12.5px] leading-relaxed text-muted-foreground">{excursion.decision}</span>

        <span className="mt-1 block text-[12px] text-muted-foreground">
          Acknowledged by{" "}
          <EntityLink kind="user" id={excursion.acknowledgedBy} mono={false} className="text-[12px]" />
        </span>
      </span>
    </Row>
  )
}

/* ── containers ───────────────────────────────────────────────────── */

function ContainerRow({ container, selected }: { container: W.Container; selected: boolean }) {
  return (
    <div className={cn("rounded-[18px]", selected && "bg-muted")}>
      <Row className="items-start">
        <Dot tone={CONTAINER_TONE[container.state]} className="mt-2" />

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <EntityLink kind="container" id={container.id} className="text-[13px] font-semibold" />
            <Pill tone={CONTAINER_TONE[container.state]}>{container.state}</Pill>
            <EntityLink kind="trade" id={container.tradeId} />
          </span>

          <span className="mt-0.5 block text-[12px] text-muted-foreground">
            {container.type} · {container.line} {container.vessel} {container.voyage} · {container.setpointC} °C · vent{" "}
            {container.ventCbmPerHr} CBM/hr · {container.humidityPct}% RH
          </span>

          <span className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted-foreground tabular-nums">
            <span>Gate-in {stamp(container.cutoffGateIn)}</span>
            <span>VGM {stamp(container.cutoffVgm)}</span>
            <span>SI {stamp(container.cutoffSi)}</span>
          </span>
        </span>
      </Row>

      {selected ? (
        <div className="px-3 pb-3">
          <Facts
            columns={3}
            rows={[
              { label: "Booking", value: <Mono>{container.bookingRef}</Mono> },
              {
                label: "Backup sailing",
                value: container.backupBookingRef ? (
                  <Mono>
                    {container.backupBookingRef}
                    {container.backupEtd ? ` · ${stamp(container.backupEtd)}` : ""}
                  </Mono>
                ) : (
                  "None held"
                ),
              },
              { label: "Seal", value: container.sealNo ? <Mono>{container.sealNo}</Mono> : "Not sealed" },
              { label: "PTI", value: <Mono>{container.ptiRef}</Mono> },
              {
                label: "VGM",
                value: container.vgmKg ? (
                  <span className="tabular-nums">
                    {container.vgmKg.toLocaleString("en-US")} kg · {stamp(container.vgmFiledAt)}
                  </span>
                ) : (
                  "Not filed"
                ),
              },
              {
                label: "Stuffed",
                value: container.stuffedAt ? <span className="tabular-nums">{stamp(container.stuffedAt)}</span> : "—",
              },
              {
                label: "Door close",
                value: container.doorCloseAt ? (
                  <span className="tabular-nums">{stamp(container.doorCloseAt)}</span>
                ) : (
                  "—"
                ),
              },
              {
                label: "Genset off",
                value: container.gensetOffAt ? (
                  <span className="tabular-nums">{stamp(container.gensetOffAt)}</span>
                ) : (
                  "—"
                ),
              },
              {
                label: "Terminal plug-in",
                value: container.terminalPlugInAt ? (
                  <span className="tabular-nums">{stamp(container.terminalPlugInAt)}</span>
                ) : (
                  "Not plugged in"
                ),
              },
              {
                label: "Gate-in",
                value: container.gateInAt ? (
                  <span className="tabular-nums">{stamp(container.gateInAt)}</span>
                ) : (
                  "Not gated in"
                ),
              },
              {
                label: "ETD → ETA",
                value: (
                  <span className="tabular-nums">
                    {stamp(container.etd)} → {stamp(container.eta)}
                  </span>
                ),
              },
              { label: "Pallets", value: <span className="tabular-nums">{container.palletIds.length}</span> },
            ]}
          />
        </div>
      ) : null}
    </div>
  )
}

/* ── the screen ───────────────────────────────────────────────────── */

function ColdChainMonitor() {
  const searchParams = useSearchParams()
  const containerId = searchParams.get("container")
  const trade = W.primaryTrade()
  const product = W.productById(trade.productId)
  const totalDebit = W.EXCURSIONS.reduce((sum, excursion) => sum + excursion.shelfLifeDebitDays, 0)
  const excursionSamples = SAMPLES.filter((sample) => sample.excursion).length

  return (
    <>
      <PageHead
        title="Cold Chain"
        meta={
          <>
            <Pill tone="warn">{W.EXCURSIONS.length} excursions</Pill>
            <Pill tone="crit">{totalDebit.toFixed(1)} d debited</Pill>
          </>
        }
      />

      <Metrics>
        <Metric label="Excursions" value={W.EXCURSIONS.length} tone="warn" />
        <Metric label="Shelf life debited" value={totalDebit.toFixed(1)} unit="d" tone="crit" />
        <Metric label="Containers" value={W.CONTAINERS.length} />
        <Metric label="Samples" value={SAMPLES.length} foot={`${trade.id} · hourly`} tone="brand" />
        <Metric
          label="Out of tolerance"
          value={excursionSamples}
          unit="h"
          tone={excursionSamples > 0 ? "crit" : "plain"}
        />
      </Metrics>

      <Group label="Excursions" count={W.EXCURSIONS.length} pad="tight">
        <Rows>
          {W.EXCURSIONS.map((excursion) => (
            <ExcursionRow key={excursion.id} excursion={excursion} />
          ))}
        </Rows>
      </Group>

      <Group label="Containers" count={W.CONTAINERS.length} pad="tight">
        <div className="flex flex-wrap gap-1.5 p-2">
          {W.CONTAINERS.map((container) => (
            <Link
              key={container.id}
              href={
                containerId === container.id
                  ? "/internal/cold-chain"
                  : `/internal/cold-chain?container=${encodeURIComponent(container.id)}`
              }
              className={cn(
                "rounded-full px-3 py-1.5 font-mono text-[12px] tabular-nums transition-colors",
                containerId === container.id ? "bg-amama text-amama-foreground" : "bg-muted hover:bg-amama-subtle"
              )}
            >
              {container.id}
            </Link>
          ))}
        </div>

        <Rows>
          {W.CONTAINERS.map((container) => (
            <ContainerRow key={container.id} container={container} selected={containerId === container.id} />
          ))}
        </Rows>
      </Group>

      <Group
        label="Temperature — harvest to terminal"
        count={`${SAMPLES.length} samples`}
        action={
          product ? (
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {product.label} · {product.shelfLifeDays} d shelf life
            </span>
          ) : null
        }
      >
        <TemperatureChart />

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span aria-hidden className="h-0.5 w-5 rounded-full bg-amama-deep" />
            Pulp temperature
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span aria-hidden className="h-0.5 w-5 rounded-full bg-muted-foreground/70" />
            Set point
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span aria-hidden className="size-2 rounded-full bg-destructive" />
            Excursion
          </span>
        </div>
      </Group>

      <Group label="Legs" count={LEG_RUNS.length} pad="tight">
        <TableHead className="pt-2">
          <Eyebrow className="min-w-0 flex-1 basis-40">Leg</Eyebrow>
          <Eyebrow className="w-20 shrink-0 text-end">Hours</Eyebrow>
          <Eyebrow className="w-36 shrink-0 text-end">Range</Eyebrow>
          <Eyebrow className="hidden w-24 shrink-0 text-end sm:block">Set point</Eyebrow>
        </TableHead>

        <Rows>
          {LEG_RUNS.map((run) => {
            const slice = SAMPLES.slice(run.start, run.end + 1)
            const temps = slice.map((sample) => sample.tempC)
            const excursions = slice.filter((sample) => sample.excursion).length
            return (
              <Row key={run.leg + run.start}>
                <Dot tone={excursions > 0 ? "crit" : "ok"} />
                <span className="min-w-0 flex-1 basis-40">
                  <span className="text-[13px] font-semibold">{LEG_LABEL[run.leg]}</span>
                  {excursions > 0 ? (
                    <Pill tone="crit" className="ms-2">
                      {excursions} h out
                    </Pill>
                  ) : null}
                </span>
                <span className="w-20 shrink-0 text-end text-[12px] text-muted-foreground tabular-nums">
                  {slice.length} h
                </span>
                <span className="w-36 shrink-0 text-end text-[12px] text-muted-foreground tabular-nums">
                  {Math.min(...temps).toFixed(1)} – {Math.max(...temps).toFixed(1)} °C
                </span>
                <span className="hidden w-24 shrink-0 text-end text-[12px] text-muted-foreground tabular-nums sm:block">
                  {slice[0].setpointC} °C
                </span>
              </Row>
            )
          })}
        </Rows>
      </Group>
    </>
  )
}

/** `useSearchParams` reads `?container=`, so the tree below carries its own
 *  Suspense boundary rather than depending on the route to supply one. */
function ColdChainView() {
  return (
    <React.Suspense fallback={<div className="h-64 animate-pulse rounded-[24px] bg-card" />}>
      <ColdChainMonitor />
    </React.Suspense>
  )
}

export { ColdChainView }
