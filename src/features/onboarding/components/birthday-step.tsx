"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DateOfBirthPicker,
  type DateParts,
} from "@/components/ui/date-of-birth-picker"
import { StepShell } from "@/features/onboarding/components/step-shell"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import {
  effectiveSteps,
  nextStep,
  previousStep,
  stepIndex,
} from "@/features/onboarding/steps"
import type { OnboardingRole } from "@/features/onboarding/types"

const MIN_AGE = 18

/** Opens on a plausible adult rather than today's date, so most people
 *  travel a short distance instead of spinning through decades. */
function defaultDate(): DateParts {
  return { day: 1, month: 1, year: new Date().getFullYear() - 30 }
}

function BirthdayStep({ role }: { role: OnboardingRole }) {
  const router = useRouter()
  const { draft, updateBuyer, updateSeller } = useOnboarding()
  const current = role === "buyer" ? draft.buyer : draft.seller
  const update = role === "buyer" ? updateBuyer : updateSeller

  // A business/organisation account has no personal birthday to give — this
  // step isn't part of that flow at all (see `effectiveSteps`), not merely
  // skippable. A business draft only ever lands here via the back button or
  // a stale bookmark, in which case it's bounced straight past.
  const isBusiness = current.accountType === "business"
  const target = nextStep(role, "birthday", current.accountType)
  // "account" always precedes "birthday" positionally regardless of account
  // type, so this doesn't need the accountType-filtered lookup.
  const back = previousStep(role, "birthday")

  React.useEffect(() => {
    if (isBusiness && target) router.replace(target.href)
  }, [isBusiness, target, router])

  // Driven straight off the draft — every spin is saved, so leaving the step
  // and coming back returns the wheels exactly where they were left.
  const fallback = React.useMemo(() => defaultDate(), [])
  const value = current.dateOfBirth ?? fallback
  const setValue = (next: DateParts) => update({ dateOfBirth: next })

  const handleContinue = () => {
    update({ dateOfBirth: value })
    if (target) router.push(target.href)
  }

  const readable = new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(
    new Date(value.year, value.month - 1, value.day)
  )

  // Redirecting away — render nothing rather than a birthday screen that's
  // about to disappear.
  if (isBusiness) return null

  return (
    <StepShell
      step={stepIndex(role, "birthday", current.accountType) + 1}
      totalSteps={effectiveSteps(role, current.accountType).length}
      backHref={back?.href ?? "/"}
      title="When were you born?"
      description={`Cross-border trade accounts are ${MIN_AGE}+. We only ever show your age bracket, never the date.`}
      footer={
        <Button size="xl" className="w-full" onClick={handleContinue}>
          Continue
          <ArrowRightIcon className="rtl:-scale-x-100" />
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        {/* The masthead date: large, left-set and tabular, so it reads like a
            magazine dateline rather than a quiet form-field echo. */}
        <p className="text-start text-[42px] font-bold leading-[1.05] tracking-tight tabular-nums text-foreground sm:text-[48px]">
          {readable}
        </p>
        <DateOfBirthPicker
          value={value}
          onValueChange={setValue}
          minAge={MIN_AGE}
        />
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Spin the wheels, or focus one and use the arrow keys.
        </p>
      </div>
    </StepShell>
  )
}

export { BirthdayStep }
