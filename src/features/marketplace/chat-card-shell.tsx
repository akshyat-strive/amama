"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount)
}

const toneStyles = {
  brand: "border-amama-deep/25 bg-amama-subtle",
  neutral: "border-border bg-card",
  success: "border-amama-deep/30 bg-amama-subtle",
  warning: "border-status-warning/30 bg-status-warning/5",
  danger: "border-destructive/25 bg-destructive/5",
} as const

export type CardTone = keyof typeof toneStyles

const iconToneStyles: Record<CardTone, string> = {
  brand: "bg-amama-deep text-white",
  neutral: "bg-muted text-foreground",
  success: "bg-amama-deep text-white",
  warning: "bg-status-warning text-white",
  danger: "bg-destructive text-white",
}

/** The card's own "ticket stub" spine — a solid bar across the top, the
 *  same cue a boarding pass or freight-load card uses to say "this is a
 *  document, not a chat bubble" before you've read a word of it. */
const barStyles: Record<CardTone, string> = {
  brand: "bg-amama-deep",
  neutral: "bg-border",
  success: "bg-amama-deep",
  warning: "bg-status-warning",
  danger: "bg-destructive",
}

/** The colored strip a `band` renders in — the same move as a freight
 *  card's price bar or a boarding pass's gate strip: the one number that
 *  matters gets its own solid-color band instead of sitting in the same
 *  neutral card as everything else. */
const bandStyles: Record<CardTone, string> = {
  brand: "bg-amama-deep text-white",
  neutral: "bg-foreground text-background",
  success: "bg-amama-deep text-white",
  warning: "bg-status-warning text-white",
  danger: "bg-destructive text-white",
}

/**
 * The frame every interactive card in a thread shares. Cards deliberately
 * don't look like message bubbles: a bubble is something someone said, a
 * card is something you can act on, and blurring the two is how people end
 * up scrolling past the thing that needs them. Styled like a boarding
 * pass or a freight load card on purpose — a top spine in the card's own
 * tone, and an optional solid-color `band` at the bottom for the one
 * number (and one button) that matters most, separated from the rest by
 * a dashed ticket-stub seam.
 *
 * Sized wider than a bubble's 75% because these carry tabular numbers that
 * shouldn't wrap.
 *
 * Lives apart from the cards themselves so the deal cards and the contract
 * cards can both use it without importing each other.
 */
function CardShell({
  icon: Icon,
  tone = "neutral",
  title,
  subtitle,
  children,
  footer,
  band,
}: {
  icon: React.ComponentType<{ className?: string }>
  tone?: CardTone
  title: string
  subtitle?: string | null
  children?: React.ReactNode
  footer?: React.ReactNode
  /** A solid-color strip pinned to the bottom, below a dashed seam — the
   *  headline number and primary action, given its own visual weight
   *  instead of blending into the neutral card above it. */
  band?: React.ReactNode
}) {
  return (
    <div className={cn("w-full max-w-[92%] overflow-hidden rounded-[20px] border sm:max-w-[420px]", toneStyles[tone])}>
      <span aria-hidden className={cn("block h-[3px] w-full", barStyles[tone])} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", iconToneStyles[tone])}>
            <Icon className="size-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-bold leading-tight text-foreground">{title}</p>
            {subtitle ? <p className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>
        {children ? <div className="mt-3.5">{children}</div> : null}
        {footer ? <div className="mt-3.5">{footer}</div> : null}
      </div>
      {band ? (
        <div className={cn("border-t border-dashed border-border/60 px-4 py-3.5", bandStyles[tone])}>{band}</div>
      ) : null}
    </div>
  )
}

/** A labelled number, big enough to read at a glance. Price and quantity
 *  are the two things a non-technical trader checks first, so they get
 *  headline treatment instead of sitting in a sentence. */
function Figure({ label, value, hint }: { label: string; value: string; hint?: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-[18px] font-extrabold tracking-tight text-foreground">{value}</p>
      {hint ? <p className="truncate text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/**
 * A slim progress bar with its own count beside it.
 *
 * `pending` colours an unfinished bar amber, which is right when the gap
 * is somebody's outstanding homework — a half-filled term sheet is a
 * nudge. It's wrong for a contract simply being early in its seven steps,
 * so that case passes `tone="neutral"` and stays brand green throughout:
 * nothing is late, it's just step one.
 */
function CardProgress({
  done,
  total,
  label,
  tone = "pending",
}: {
  done: number
  total: number
  label: string
  tone?: "pending" | "neutral"
}) {
  const complete = total > 0 && done === total
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            complete || tone === "neutral" ? "bg-amama-deep" : "bg-status-warning"
          )}
          style={{ width: `${total === 0 ? 100 : (done / total) * 100}%` }}
        />
      </div>
      <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">
        {done}/{total} {label}
      </span>
    </div>
  )
}

export { CardShell, CardProgress, Figure, formatUsd }
