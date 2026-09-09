"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DateOfBirthPicker,
  type DateParts,
} from "@/components/ui/date-of-birth-picker"
import { useI18n } from "@/features/i18n/i18n-context"
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
  const { locale, t } = useI18n()
  const { draft, updateBuyer, updateSeller } = useOnboarding()
  const current = role === "buyer" ? draft.buyer : draft.seller
  const update = role === "buyer" ? updateBuyer : updateSeller

  // An organisation account has no personal birthday to give — this step
  // isn't part of that flow at all (see `effectiveSteps`), not merely
  // skippable. An organisation draft only ever lands here via the back
  // button or a stale bookmark, in which case it's bounced straight past.
  const isOrganization = current.entityType === "organization"
  const target = nextStep(role, "birthday", current.entityType)
  // "account" always precedes "birthday" positionally regardless of entity
  // type, so this doesn't need the entityType-filtered lookup.
  const back = previousStep(role, "birthday")

  React.useEffect(() => {
    if (isOrganization && target) router.replace(target.href)
  }, [isOrganization, target, router])

  // Driven straight off the draft — every spin is saved, so leaving the step
  // and coming back returns the wheels exactly where they were left.
  const fallback = React.useMemo(() => defaultDate(), [])
  const value = current.dateOfBirth ?? fallback
  const setValue = (next: DateParts) => update({ dateOfBirth: next })

  const handleContinue = () => {
    update({ dateOfBirth: value })
    if (target) router.push(target.href)
  }

  const readable = new Intl.DateTimeFormat(locale.tag, { dateStyle: "long" }).format(
    new Date(value.year, value.month - 1, value.day)
  )

  // Redirecting away — render nothing rather than a birthday screen that's
  // about to disappear.
  if (isOrganization) return null

  return (
    <StepShell
      step={stepIndex(role, "birthday", current.entityType) + 1}
      totalSteps={effectiveSteps(role, current.entityType).length}
      backHref={back?.href ?? "/"}
      title={t("onboarding.birthday.title")}
      description={t("onboarding.birthday.description", { minAge: MIN_AGE })}
      footer={
        <Button size="xl" className="w-full" onClick={handleContinue}>
          {t("common.continue")}
          <ArrowRightIcon />
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
          {t("onboarding.birthday.hint")}
        </p>
      </div>
    </StepShell>
  )
}

export { BirthdayStep }
