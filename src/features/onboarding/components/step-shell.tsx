"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { AmamaWordmark } from "@/components/brand/amama-wordmark"
import { buttonVariants } from "@/components/ui/button"
import { useI18n } from "@/features/i18n/i18n-context"
import { OnboardingAside } from "@/features/onboarding/components/onboarding-aside"

type StepShellProps = {
  /** 1-based position, used for the bar and the announcement. */
  step: number
  totalSteps: number
  backHref: string
  title: string
  description?: string
  children: React.ReactNode
  /** Rendered in the footer, beside "Skip" — usually the primary CTA. */
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

/** One segment per step: finished steps filled, the current one filling
 *  in on mount, upcoming ones a pale track. A width transition triggered
 *  by a mount-flag flip is all the motion it needs. */
function StepProgress({ step, totalSteps }: { step: number; totalSteps: number }) {
  const [filled, setFilled] = React.useState(false)
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setFilled(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-valuenow={step}
      aria-valuetext={`Step ${step} of ${totalSteps}`}
      className="flex flex-1 items-center gap-1"
    >
      {Array.from({ length: totalSteps }, (_, index) => {
        const position = index + 1
        return (
          <span key={position} aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <span
              className={cn(
                "block h-full rounded-full bg-amama-deep transition-[width] duration-500 ease-out motion-reduce:transition-none",
                position < step || (position === step && filled) ? "w-full" : "w-0"
              )}
            />
          </span>
        )
      })}
    </div>
  )
}

function BackLink({ href, className }: { href: string; className?: string }) {
  const { t } = useI18n()
  return (
    // A link is a link: styled with the button recipe rather than routed
    // through <Button>, which would strip native anchor semantics.
    <Link href={href} aria-label={t("common.goBack")} className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "shrink-0", className)}>
      {/* Mirrors automatically in RTL. */}
      <ArrowLeftIcon />
    </Link>
  )
}

/**
 * The frame every onboarding step shares. On a phone: back arrow and
 * progress pinned on top, a big headline, and a footer reachable with one
 * thumb. On a desktop it splits 4:3 — the brand mark top-left, the step
 * left-aligned on a generous margin with its buttons right under it, and
 * a full-bleed photo with a live profile preview filling the right edge.
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
  const { t } = useI18n()

  return (
    // Fixed to the viewport on a desktop, so a long step scrolls inside the
    // left column and the photo stays put beside it.
    <div className="min-h-dvh bg-card lg:grid lg:h-dvh lg:grid-cols-[4fr_3fr] lg:overflow-hidden">
      <div className="flex min-h-dvh flex-col lg:min-h-0 lg:overflow-y-auto lg:px-16 xl:px-24">
        {/* Phone header. Extra end padding reserves room for the fixed
            `[en]` language switcher pinned to the same corner on every
            screen — there's no outer gutter for it to float in otherwise.
            On a desktop the switcher floats over the photo instead. */}
        <header className="sticky top-0 z-20 bg-card/85 backdrop-blur-sm lg:hidden">
          <div className="mx-auto flex w-full max-w-lg items-center gap-3 ps-4 pe-28 py-3">
            <BackLink href={backHref} className="-ms-2" />
            <StepProgress step={step} totalSteps={totalSteps} />
            <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
              {step}/{totalSteps}
            </span>
          </div>
        </header>

        <div className="hidden shrink-0 pt-10 lg:block">
          <Link href="/" aria-label="amama home" className="inline-flex text-amama-deep">
            <AmamaWordmark className="h-5" />
          </Link>
        </div>

        <div className="flex flex-1 flex-col lg:justify-center lg:py-14">
          <main
            className={cn(
              "mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-6 pt-4 lg:mx-0 lg:max-w-[560px] lg:flex-none lg:p-0",
              className
            )}
          >
            <div className="mb-10 hidden items-center gap-4 lg:flex">
              <BackLink href={backHref} className="-ms-2.5 rounded-full" />
              <StepProgress step={step} totalSteps={totalSteps} />
              <span className="shrink-0 text-[13px] font-medium tabular-nums text-muted-foreground">
                Step {step} of {totalSteps}
              </span>
            </div>
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-balance text-foreground sm:text-[32px] lg:text-[36px]">
              {title}
            </h1>
            {description ? (
              <p className="mt-2 text-[15px] leading-relaxed text-pretty text-muted-foreground lg:mt-3 lg:text-[16px]">
                {description}
              </p>
            ) : null}
            <div className="mt-7 flex-1 lg:mt-9">{children}</div>
          </main>

          {/* On a phone: inset from the edges rather than a full-bleed bar,
              rounded only where it meets the page content. On a desktop:
              the buttons sit inline right under the step — Continue first,
              Skip as a quieter text button beside it — still sticky for
              steps taller than the viewport. */}
          <footer className="sticky bottom-0 z-20 px-3 sm:px-0">
            <div className="mx-auto w-full max-w-lg rounded-t-[40px] border border-b-0 border-border/60 bg-card/95 px-5 pt-4 pb-0 shadow-[0_-12px_24px_-16px_rgba(0,0,0,0.15)] backdrop-blur-sm lg:mx-0 lg:max-w-[560px] lg:rounded-none lg:border-0 lg:bg-card lg:px-0 lg:pt-8 lg:shadow-none lg:backdrop-blur-none">
              <div className="flex items-stretch gap-2 lg:flex-row-reverse lg:items-center lg:justify-end lg:gap-3">
                {skipHref ? (
                  <Link
                    href={skipHref}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "xl" }),
                      "lg:border-transparent lg:bg-transparent lg:px-5 lg:text-muted-foreground lg:shadow-none lg:hover:bg-muted lg:hover:text-foreground"
                    )}
                  >
                    {t("common.skip")}
                  </Link>
                ) : null}
                <div className="flex-1 lg:min-w-60 lg:flex-none">{footer}</div>
              </div>
              {/* Fixed height whether or not a note is passed — the terms notice
                  only appears on the account step, and without this the card (and
                  the button inside it) would sit at a different height on every
                  other step, reading as a layout jump between screens. */}
              <div className="flex h-9 items-center justify-center text-center lg:mt-2 lg:h-auto lg:min-h-9 lg:justify-start lg:text-start">
                {footerNote}
              </div>
            </div>
          </footer>
        </div>
      </div>

      <OnboardingAside step={step} />
    </div>
  )
}

export { StepShell }
