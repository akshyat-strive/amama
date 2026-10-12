"use client"

import { useRouter } from "next/navigation"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/features/i18n/i18n-context"
import { StepShell } from "@/features/onboarding/components/step-shell"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import { effectiveSteps, nextStep, previousStep, stepIndex } from "@/features/onboarding/steps"

const LIMIT = 500

/**
 * A short introduction in the seller's own words — who farms, for how
 * long, what makes the produce theirs. Optional, but it is the first thing
 * a buyer reads when deciding whether to trust a new grower.
 */
export default function SellerAboutPage() {
  const router = useRouter()
  const { t } = useI18n()
  const { draft, updateSeller } = useOnboarding()
  const seller = draft.seller

  const target = nextStep("seller", "about", seller.entityType)
  const back = previousStep("seller", "about", seller.entityType)

  return (
    <StepShell
      step={stepIndex("seller", "about", seller.entityType) + 1}
      totalSteps={effectiveSteps("seller", seller.entityType).length}
      backHref={back?.href ?? "/"}
      title="Tell us about your farm"
      description="A few lines for buyers — who you are and what you grow. Optional, but it builds trust."
      skipHref={target?.href}
      footer={
        <Button size="xl" className="w-full" onClick={() => target && router.push(target.href)}>
          {t("common.continue")}
          <ArrowRightIcon />
        </Button>
      }
    >
      <label htmlFor="farm-bio" className="sr-only">
        About your farm
      </label>
      <Textarea
        id="farm-bio"
        rows={7}
        maxLength={LIMIT}
        value={seller.bio}
        onChange={(event) => updateSeller({ bio: event.target.value })}
        placeholder="We've grown pomegranates in Dindori for three generations. Drip-irrigated, residue-tested every season, packed the same day we pick."
        className="min-h-40 rounded-2xl text-[15px] leading-relaxed"
      />
      <p className="mt-2 text-end text-[12px] text-muted-foreground tabular-nums" aria-live="polite">
        {seller.bio.length}/{LIMIT}
      </p>
    </StepShell>
  )
}
