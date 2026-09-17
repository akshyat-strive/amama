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

export type CardTone = "brand" | "neutral" | "success" | "warning" | "danger"

/** The icon badge's fill. Neutral in every case but one: a plain light-gray
 *  circle with a black icon, the same restrained mark a clean dashboard
 *  uses for "Google" or "Send" or "Request" regardless of what the action
 *  actually does. Color is reserved for the one state that's genuinely a
 *  problem — declined, delayed — and even then it's a solid red disc with
 *  a white icon, not a tint. Tinting every icon by its "type" is exactly
 *  the generic-SaaS tell this was rebuilt to get away from. */
const iconToneStyles: Record<CardTone, string> = {
  brand: "bg-muted text-foreground",
  neutral: "bg-muted text-foreground",
  success: "bg-muted text-foreground",
  warning: "bg-muted text-foreground",
  danger: "bg-destructive text-white",
}

/**
 * The frame every interactive card in a thread shares. Cards deliberately
 * don't look like message bubbles: a bubble is something someone said, a
 * card is something you can act on, and blurring the two is how people end
 * up scrolling past the thing that needs them.
 *
 * Plain white card, one thin neutral border. No tinted background wash and
 * no colored top spine — a card that announces "I am a brand-colored
 * object" before you've read a word of it is what makes a UI feel
 * AI-generated. The only color left is the icon badge's, and only for a
 * real danger state.
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
}: {
  icon: React.ComponentType<{ className?: string }>
  tone?: CardTone
  title: string
  subtitle?: string | null
  children?: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="w-full max-w-[92%] overflow-hidden rounded-[20px] border border-border bg-card sm:max-w-[420px]">
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
    </div>
  )
}

/** A labelled number, big enough to read at a glance. Price and quantity
 *  are the two things a non-technical trader checks first, so they get
 *  headline treatment instead of sitting in a sentence. `size="hero"` is
 *  for the one figure on the card that matters most — sized like the big
 *  bare number on a clean analytics card, not boxed or tinted, just bold
 *  black type given room to be the first thing you read. */
function Figure({
  label,
  value,
  hint,
  size = "default",
}: {
  label: string
  value: string
  hint?: string | null
  size?: "default" | "hero"
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "truncate font-extrabold tracking-tight text-foreground",
          size === "hero" ? "text-[26px]" : "text-[18px]"
        )}
      >
        {value}
      </p>
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
