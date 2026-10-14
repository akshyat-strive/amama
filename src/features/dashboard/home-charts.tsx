"use client"

import * as React from "react"

import { EChartsAreaChart } from "@/components/evilcharts/charts/echarts-area-chart"
import { EChartsBarChart } from "@/components/evilcharts/charts/echarts-bar-chart"
import { EChartsComposedChart } from "@/components/evilcharts/charts/echarts-composed-chart"
import { EChartsPieChart } from "@/components/evilcharts/charts/echarts-pie-chart"
import { EChartsRadialChart } from "@/components/evilcharts/charts/echarts-radial-chart"
import { EChartsSankeyChart } from "@/components/evilcharts/charts/echarts-sankey-chart"
import type { ChartConfig } from "@/components/evilcharts/ui/echarts-chart"

/** A full, bright palette — each chart takes its own colours rather than
 *  every series being a shade of the brand green. */
const PALETTE = {
  green: ["#0b7a43", "#25d366"],
  lime: ["#25d366"],
  blue: ["#3b82f6"],
  sky: ["#38bdf8"],
  violet: ["#8b5cf6"],
  pink: ["#ec4899"],
  orange: ["#f97316"],
  amber: ["#f59e0b"],
  teal: ["#14b8a6"],
  rose: ["#f43f5e"],
  slate: ["#94a3b8"],
} as const

/** Softer tints for the stalled ends, so the main road stays loudest. */
const DROP = ["#cbd5e1", "#c4b5fd", "#fdba74", "#f9a8d4", "#99f6e4"]

export type Tone = keyof typeof PALETTE
const ORDER: Tone[] = ["green", "blue", "violet", "orange", "pink", "teal", "amber", "sky", "rose"]

function colors(tone: Tone) {
  return { light: [...PALETTE[tone]] }
}

export type Series = { key: string; label: string; tone: Tone }
type Row = Record<string, string | number>

/* ── pipeline: a deal's road as a flow ─────────────────────────────────── */

export type Stage = { label: string; value: number; dropLabel?: string }

/**
 * The pipeline as a Sankey: each stage flows into the next, and what
 * doesn't move on peels off into its own named end ("Still chatting",
 * "Awaiting PO"…), so where deals stall is the picture.
 */
function PipelineFlow({ stages }: { stages: Stage[] }) {
  const { data, config } = React.useMemo(() => {
    // Node names double as CSS variable keys, so they stay identifier-safe;
    // the readable text rides along as each node's label.
    const nodes = stages.map((_, index) => ({ name: `stage${index}` }))
    const links: { source: number; target: number; value: number }[] = []
    const config: ChartConfig = {}
    stages.forEach((stage, index) => {
      config[`stage${index}`] = { label: stage.label, colors: colors(ORDER[index % ORDER.length]) }
      const next = stages[index + 1]
      if (!next) return
      links.push({ source: index, target: index + 1, value: next.value })
      const dropped = stage.value - next.value
      if (dropped > 0 && stage.dropLabel) {
        nodes.push({ name: `drop${index}` })
        config[`drop${index}`] = { label: stage.dropLabel, colors: { light: [DROP[index % DROP.length]] } }
        links.push({ source: index, target: nodes.length - 1, value: dropped })
      }
    })
    return { data: { nodes, links }, config }
  }, [stages])

  return (
    <EChartsSankeyChart data={data} config={config} className="h-[320px] w-full" nodeWidth={12} nodePadding={18} linkCurvature={0.5} align="left" sort={false} renderer="svg">
      <EChartsSankeyChart.Tooltip variant="frosted-glass" roundness="lg" />
      <EChartsSankeyChart.Link variant="gradient" />
      <EChartsSankeyChart.Node radius={5}>
        <EChartsSankeyChart.NodeLabel position="outside" showValues />
      </EChartsSankeyChart.Node>
    </EChartsSankeyChart>
  )
}

/* ── composed: striped bars with a line over them ──────────────────────── */

function StripedComposed({ data, xKey, bar, line }: { data: Row[]; xKey: string; bar: Series; line: Series }) {
  const config = React.useMemo<ChartConfig>(
    () => ({ [bar.key]: { label: bar.label, colors: colors(bar.tone) }, [line.key]: { label: line.label, colors: colors(line.tone) } }),
    [bar, line]
  )
  return (
    <EChartsComposedChart data={data} config={config} xDataKey={xKey} className="h-[260px] w-full" curveType="monotoneX">
      <EChartsComposedChart.Grid />
      <EChartsComposedChart.XAxis dataKey={xKey} />
      <EChartsComposedChart.Legend variant="rounded-square" align="left" verticalAlign="top" isClickable />
      <EChartsComposedChart.Tooltip variant="frosted-glass" roundness="lg" />
      <EChartsComposedChart.Bar dataKey={bar.key} variant="stripped" radius={6} enableHoverHighlight isClickable />
      <EChartsComposedChart.Line dataKey={line.key} strokeVariant="animated-dashed" glow isClickable>
        <EChartsComposedChart.Dot variant="border" />
      </EChartsComposedChart.Line>
    </EChartsComposedChart>
  )
}

/* ── bars: hover highlight, glow, a variant per series ─────────────────── */

type BarVariant = "default" | "hatched" | "duotone" | "duotone-reverse" | "gradient" | "stripped" | "blocks" | "expandable"

function HoverBars({
  data,
  xKey,
  series,
  variant = "gradient",
  layout = "vertical",
  stacked = false,
}: {
  data: Row[]
  xKey: string
  series: Series[]
  variant?: BarVariant
  layout?: "vertical" | "horizontal"
  stacked?: boolean
}) {
  const config = React.useMemo<ChartConfig>(() => Object.fromEntries(series.map((entry) => [entry.key, { label: entry.label, colors: colors(entry.tone) }])), [series])
  return (
    <EChartsBarChart data={data} config={config} xDataKey={xKey} layout={layout} stackType={stacked ? "stacked" : "default"} barRadius={8} className="h-[260px] w-full" animationType="left-to-right" enableMaxValueHighlight={series.length === 1}>
      <EChartsBarChart.Grid />
      {layout === "horizontal" ? <EChartsBarChart.YAxis dataKey={xKey} /> : <EChartsBarChart.XAxis dataKey={xKey} />}
      {series.length > 1 ? <EChartsBarChart.Legend variant="rounded-square" align="left" verticalAlign="top" isClickable /> : null}
      <EChartsBarChart.Tooltip variant="frosted-glass" roundness="lg" />
      {series.map((entry, index) => (
        <EChartsBarChart.Bar key={entry.key} dataKey={entry.key} variant={index === 0 ? variant : "hatched"} enableHoverHighlight glowing={index === 0} isClickable />
      ))}
    </EChartsBarChart>
  )
}

/* ── area: hover reveals up to the pointer ─────────────────────────────── */

function RevealArea({ data, xKey, series }: { data: Row[]; xKey: string; series: Series[] }) {
  const config = React.useMemo<ChartConfig>(() => Object.fromEntries(series.map((entry) => [entry.key, { label: entry.label, colors: colors(entry.tone) }])), [series])
  return (
    <EChartsAreaChart data={data} config={config} xDataKey={xKey} className="h-[260px] w-full" curveType="monotoneX" enableHoverReveal>
      <EChartsAreaChart.Grid />
      <EChartsAreaChart.XAxis dataKey={xKey} />
      <EChartsAreaChart.Legend variant="rounded-square" align="left" verticalAlign="top" isClickable />
      <EChartsAreaChart.Tooltip variant="frosted-glass" roundness="lg" />
      {series.map((entry, index) => (
        <EChartsAreaChart.Area key={entry.key} dataKey={entry.key} variant={index === 0 ? "gradient" : "dotted"} strokeVariant={index === 0 ? "solid" : "dashed"} enableBufferLine={index === 0} isClickable />
      ))}
    </EChartsAreaChart>
  )
}

/* ── shares: padded donut and half-circle radial ───────────────────────── */

export type Slice = { name: string; value: number }

/** Config keys become CSS variable names — letters and digits only. */
function slugOf(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "")
}

function sliceConfig(slices: Slice[]): ChartConfig {
  return Object.fromEntries(slices.map((slice, index) => [slugOf(slice.name), { label: slice.name, colors: colors(ORDER[index % ORDER.length]) }]))
}

function PaddedDonut({ slices }: { slices: Slice[] }) {
  const config = React.useMemo(() => sliceConfig(slices), [slices])
  const data = React.useMemo(() => slices.map((slice) => ({ ...slice, name: slugOf(slice.name) })), [slices])
  return (
    <EChartsPieChart data={data} dataKey="value" nameKey="name" config={config} className="h-[260px] w-full">
      <EChartsPieChart.Pie innerRadius="58%" outerRadius="86%" cornerRadius={8} paddingAngle={3} isClickable />
      <EChartsPieChart.Legend variant="circle" align="center" verticalAlign="bottom" isClickable />
      <EChartsPieChart.Tooltip variant="frosted-glass" roundness="lg" />
    </EChartsPieChart>
  )
}

function SemiRadial({ slices }: { slices: Slice[] }) {
  const config = React.useMemo(() => sliceConfig(slices), [slices])
  const data = React.useMemo(() => slices.map((slice) => ({ ...slice, name: slugOf(slice.name) })), [slices])
  return (
    <EChartsRadialChart data={data} nameKey="name" config={config} variant="semi" className="h-[260px] w-full">
      <EChartsRadialChart.RadialBar dataKey="value" cornerRadius={10} showBackground isClickable />
      <EChartsRadialChart.Legend variant="circle" align="center" verticalAlign="bottom" isClickable />
      <EChartsRadialChart.Tooltip variant="frosted-glass" roundness="lg" />
    </EChartsRadialChart>
  )
}

/* ── stat cards: a tiny patterned trend, no axes ───────────────────────── */

export type SparkFill = "gradient" | "hatched" | "dotted" | "lines"

/** The trend under a headline number — just the shape, filled with a
 *  pattern of its own so the four cards don't read as one chart four times. */
function StatSpark({ points, tone, fill }: { points: number[]; tone: Tone; fill: SparkFill }) {
  const data = React.useMemo(() => points.map((value, index) => ({ step: String(index), value })), [points])
  const config = React.useMemo<ChartConfig>(() => ({ value: { label: "Trend", colors: colors(tone) } }), [tone])
  return (
    <EChartsAreaChart data={data} config={config} xDataKey="step" className="h-16 w-full" curveType="monotoneX" chartOptions={{ grid: { left: 0, right: 0, top: 6, bottom: 0 }, yAxis: { show: false, min: (range: { min: number; max: number }) => Math.floor(range.min - (range.max - range.min) * 0.6) } }}>
      <EChartsAreaChart.Area dataKey="value" variant={fill} strokeVariant="solid" strokeWidth={2} />
    </EChartsAreaChart>
  )
}

export { StatSpark, PipelineFlow, StripedComposed, HoverBars, RevealArea, PaddedDonut, SemiRadial }
