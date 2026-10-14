"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowDownRightIcon, ArrowUpRightIcon, ChevronRightIcon, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { StatSpark, type SparkFill, type Tone } from "@/features/dashboard/home-charts"

/* ── page frame ────────────────────────────────────────────────────────── */

/** Every home starts the same way: just the page's name. */
function HomeHeader() {
  return <h1 className="page-title text-[28px] font-semibold tracking-[-0.025em]">Home</h1>
}

/* ── the four numbers ──────────────────────────────────────────────────── */

export type Stat = { label: string; value: string; caption: string; trend: number[]; icon: LucideIcon; href: string; tone?: "green" | "graphite" }

/** The header sits on the card's own ground; the number and trend sit on
 *  an inner white panel — on hover the ground tints and the panel reads
 *  as a rounded inset. */
function StatCard({ stat, tone, fill }: { stat: Stat; tone: Tone; fill: SparkFill }) {
  const first = stat.trend[0] || 1
  const change = Math.round(((stat.trend[stat.trend.length - 1] - first) / first) * 100)
  const Icon = stat.icon
  return (
    <Link href={stat.href} className="group flex flex-col rounded-[20px] bg-background p-2 transition-colors hover:bg-muted/60">
      <div className="flex items-center gap-2 px-2 pt-1.5 pb-2 text-[13px] font-medium text-foreground/80">
        <Icon aria-hidden className="size-4 text-amama-deep" />
        {stat.label}
        <span className={cn("ms-auto inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold tabular-nums", change >= 0 ? "bg-amama-subtle text-amama-deep" : "bg-destructive/10 text-destructive")}>
          {change >= 0 ? <ArrowUpRightIcon className="size-3" /> : <ArrowDownRightIcon className="size-3" />}
          {Math.abs(change)}%
        </span>
      </div>
      <div className="rounded-[14px] bg-background px-3.5 pt-3 pb-2">
        <p className="text-[26px] font-semibold tracking-[-0.025em] tabular-nums">{stat.value}</p>
        <p className="truncate text-[12.5px] text-muted-foreground">{stat.caption}</p>
        <div className="mt-2">
          <StatSpark points={stat.trend} tone={tone} fill={fill} />
        </div>
      </div>
    </Link>
  )
}

const STAT_TONES: Tone[] = ["green", "violet", "orange", "blue"]
const STAT_FILLS: SparkFill[] = ["gradient", "hatched", "dotted", "lines"]

function StatRow({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat, index) => (
        <StatCard key={stat.label} stat={stat} tone={STAT_TONES[index % STAT_TONES.length]} fill={STAT_FILLS[index % STAT_FILLS.length]} />
      ))}
    </div>
  )
}

/* ── the big cards ─────────────────────────────────────────────────────── */

/** A big white card with room to breathe: a title, one headline figure,
 *  then the chart or list doing the explaining. */
function HomeCard({
  title,
  subtitle,
  href,
  linkLabel = "View all",
  figure,
  figureCaption,
  children,
  className,
}: {
  title: string
  subtitle?: string
  href?: string
  linkLabel?: string
  figure?: string
  figureCaption?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-[28px] bg-background p-6", className)}>
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold tracking-[-0.02em]">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p> : null}
        </div>
        {href ? (
          <Link href={href} className="inline-flex shrink-0 items-center gap-0.5 rounded-lg px-2 py-1 text-[13px] font-medium text-amama-deep transition-colors hover:bg-amama-subtle">
            {linkLabel}
            <ChevronRightIcon aria-hidden className="size-3.5 rtl:-scale-x-100" />
          </Link>
        ) : null}
      </header>
      {figure ? (
        <p className="mt-4 flex items-baseline gap-2">
          <span className="text-[32px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{figure}</span>
          {figureCaption ? <span className="text-[13px] text-muted-foreground">{figureCaption}</span> : null}
        </p>
      ) : null}
      <div className="mt-4 min-h-0 flex-1">{children}</div>
    </section>
  )
}

export type Task = { title: string; detail: string; tag: string; href: string; icon: LucideIcon; urgent?: boolean }

/** What to do next — one line each, inset hairlines between, the
 *  document type as a quiet tag. */
function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <ul className="-mx-3 divide-inset">
      {tasks.map((task) => {
        const Icon = task.icon
        return (
          <li key={task.title}>
            <Link href={task.href} className="group flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-card">
              <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", task.urgent ? "bg-amama text-white" : "bg-card text-foreground/75")}>
                <Icon aria-hidden className="size-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-medium">{task.title}</span>
                <span className="block truncate text-[12.5px] text-muted-foreground">{task.detail}</span>
              </span>
              <span className="shrink-0 rounded-md bg-card px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground">{task.tag}</span>
              <ChevronRightIcon aria-hidden className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100" />
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/* ── demo series ───────────────────────────────────────────────────────── */

/** A small, stable pseudo-random series from a seed — demo trends that
 *  don't jump around on every render. */
function series(seed: number, length: number, base: number, swing: number) {
  let value = seed % 97
  return Array.from({ length }, (_, index) => {
    value = (value * 37 + 11 + index * 7) % 97
    return Math.max(0, Math.round(base + ((value / 97) * 2 - 1) * swing + index * (swing / length)))
  })
}

function seedOf(text: string) {
  let hash = 7
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) % 100_003
  return hash
}

/** The last `count` week labels, oldest first ("W32"…). */
function weekLabels(count: number, date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 1)
  const week = Math.ceil(((date.getTime() - start.getTime()) / 86_400_000 + start.getDay() + 1) / 7)
  return Array.from({ length: count }, (_, index) => `W${week - count + 1 + index}`)
}

function monthLabels(count: number, date = new Date()) {
  return Array.from({ length: count }, (_, index) => new Date(date.getFullYear(), date.getMonth() - count + 1 + index, 1).toLocaleDateString("en", { month: "short" }))
}

export { HomeHeader, StatRow, HomeCard, TaskList, series, seedOf, weekLabels, monthLabels }
