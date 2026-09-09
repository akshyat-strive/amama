"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { FieldGroup, FieldGroupRow } from "@/components/ui/field-group"
import { useI18n } from "@/features/i18n/i18n-context"
import { CountryCombobox } from "@/features/onboarding/components/country-select"
import { StepShell } from "@/features/onboarding/components/step-shell"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import { effectiveSteps, nextStep, stepIndex } from "@/features/onboarding/steps"
import type { OnboardingRole } from "@/features/onboarding/types"

/**
 * The very first onboarding question, ahead of even name and email. Which
 * fields and documents make sense later — GST vs. VAT, a land title vs. a
 * trade licence — all turn on where someone is trading from, so this has to
 * be settled before anything downstream can be asked correctly.
 */
function CountryStep({ role }: { role: OnboardingRole }) {
  const router = useRouter()
  const { t } = useI18n()
  const { draft, updateBuyer, updateSeller, setRole } = useOnboarding()
  const current = role === "buyer" ? draft.buyer : draft.seller
  const update = role === "buyer" ? updateBuyer : updateSeller

  // Land here from a shared link and the role may never have been set.
  React.useEffect(() => {
    if (draft.role !== role) setRole(role)
  }, [draft.role, role, setRole])

  const canContinue = current.country.trim().length > 0
  const target = nextStep(role, "country")

  const handleContinue = () => {
    if (!canContinue || !target) return
    router.push(target.href)
  }

  return (
    <StepShell
      step={stepIndex(role, "country") + 1}
      totalSteps={effectiveSteps(role).length}
      backHref="/"
      title={t("onboarding.country.title")}
      description={t("onboarding.country.description")}
      footer={
        <Button
          size="xl"
          className="w-full"
          disabled={!canContinue}
          onClick={handleContinue}
        >
          {t("common.continue")}
          <ArrowRightIcon />
        </Button>
      }
    >
      <FieldGroup>
        <FieldGroupRow label={t("onboarding.country.fieldLabel")} htmlFor="country">
          <CountryCombobox
            id="country"
            value={current.country}
            onValueChange={(country) => update({ country })}
          />
        </FieldGroupRow>
      </FieldGroup>
    </StepShell>
  )
}

export { CountryStep }
