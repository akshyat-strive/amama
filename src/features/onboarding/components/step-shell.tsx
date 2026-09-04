"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

type StepShellProps = {
  /** 1-based position, used for the bar and the announcement. */
  step: number
  totalSteps: number
  backHref: string
  title: string
  description?: string
  children: React.ReactNode
  /** Rendered in the sticky footer, beside "Skip" — usually the primary CTA. */
  footer: React.ReactNode
  /** Optional secondary line under the footer, e.g. the terms notice. */
  footerNote?: React.ReactNode
  /**
   * Where "Skip" goes. Every step is optional — the details it asks for can
   * always be filled in later — so this is set on nearly every step; omit
   * only where skipping wouldn't make sense (there's nothing to come back
   * and set, e.g. the final "you're done" screen).
   */
  skipHref?: string
  className?: string
}

/** Dot-stepper: done steps are small filled dots, the current step grows
 *  into a short bar on mount, upcoming steps are hollow outlines. No
 *  animation library — a width transition triggered by a mount-flag flip
 *  is all "the dot becomes a bar" needs. */
function StepDots({ step, totalSteps }: { step: number; totalSteps: number }) {
  const [grown, setGrown] = React.useState(false)
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-valuenow={step}
      aria-valuetext={`Step ${step} of ${totalSteps}`}
      className="flex flex-1 items-center gap-1.5"
    >
      {Array.from({ length: totalSteps }, (_, index) => {
        const position = index + 1
        const done = position < step
        const current = position === step

        return (
          <span
            key={position}
            aria-hidden
            className={cn(
              "h-2 shrink-0 rounded-full transition-[width,background-color,border-color] duration-300 ease-out motion-reduce:transition-none",
              current
                ? cn("bg-amama-deep", grown ? "w-7" : "w-2")
                : "w-2",
              done && "bg-amama-deep",
              !done && !current && "border border-muted-foreground/30 bg-transparent"
            )}
          />
        )
      })}
    </div>
  )
}

/**
 * The frame every onboarding step shares: back affordance, dot progress, a
 * big friendly headline, then a footer that stays reachable with one thumb
 * on a phone and centres itself on a desktop. Plain white surface — the
 * onboarding flow isn't part of the dashboard shell, so it gets the same
 * clean, chrome-less feel as the login screens either side of it.
 */
function StepShell({
  step,
  totalSteps,
  backHref,
  title,
  description,
  children,
  footer,
  footerNote,
  skipHref,
  className,
}: StepShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-card">
      <header className="sticky top-0 z-20 bg-card/85 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-lg items-center gap-3 px-4 py-3">
          {/* A link is a link: styled with the button recipe rather than routed
              through <Button>, which would strip native anchor semantics. */}
          <Link
            href={backHref}
            aria-label="Go back"
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "-ms-2 shrink-0"
            )}
          >
            {/* Mirrors automatically in RTL. */}
            <ArrowLeftIcon className="rtl:-scale-x-100" />
          </Link>
          <StepDots step={step} totalSteps={totalSteps} />
          <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
            {step}/{totalSteps}
          </span>
        </div>
      </header>

      <main
        className={cn(
          "mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-6 pt-4",
          className
        )}
      >
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-balance text-foreground sm:text-[32px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-[15px] leading-relaxed text-pretty text-muted-foreground">
            {description}
          </p>
        ) : null}
        <div className="mt-7 flex-1">{children}</div>
      </main>

      {/* Inset from the edges rather than a full-bleed bar, rounded only where
          it meets the page content — the bottom edge sits flush against the
          viewport, so there's nothing to round there. */}
      <footer className="sticky bottom-0 z-20 px-3 sm:px-0">
        <div className="mx-auto w-full max-w-lg rounded-t-[40px] border border-b-0 border-border/60 bg-card/95 px-5 pt-4 pb-0 [max(1rem,env(safe-area-inset-bottom))] shadow-[0_-12px_24px_-16px_rgba(0,0,0,0.15)] backdrop-blur-sm">
          <div className="flex items-stretch gap-2">
            {skipHref ? (
              <Link
                href={skipHref}
                className={cn(buttonVariants({ variant: "outline", size: "xl" }))}
              >
                Skip
              </Link>
            ) : null}
            <div className="flex-1">{footer}</div>
          </div>
          {/* Fixed height whether or not a note is passed — the terms notice
              only appears on the account step, and without this the card (and
              the button inside it) would sit at a different height on every
              other step, reading as a layout jump between screens. */}
          <div className="flex h-9 items-center justify-center text-center">
            {footerNote}
          </div>
        </div>
      </footer>
    </div>
  )
}

export { StepShell }
