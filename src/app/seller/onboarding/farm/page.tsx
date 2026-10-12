"use client"

import { useRouter } from "next/navigation"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  FieldGroup,
  FieldGroupRow,
  FieldGroupInput,
} from "@/components/ui/field-group"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/features/i18n/i18n-context"
import { StepShell } from "@/features/onboarding/components/step-shell"
import { ChoiceChips } from "@/features/onboarding/components/selectable"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import {
  effectiveSteps,
  farmSizes,
  nextStep,
  previousStep,
  producerTypes,
  stepIndex,
} from "@/features/onboarding/steps"

const BIO_LIMIT = 500

/**
 * Everything about the farm on one screen: its name and region, who is
 * selling, how much land, and a few lines in the seller's own words — the
 * first thing a buyer reads when deciding whether to trust a new grower.
 */
export default function SellerFarmPage() {
  const router = useRouter()
  const { t } = useI18n()
  const { draft, updateSeller } = useOnboarding()
  const seller = draft.seller

  const canContinue =
    seller.farmName.trim().length >= 2 &&
    seller.producerType.length > 0 &&
    seller.farmSize.length > 0

  const target = nextStep("seller", "farm", seller.entityType)
  const back = previousStep("seller", "farm", seller.entityType)

  return (
    <StepShell
      step={stepIndex("seller", "farm", seller.entityType) + 1}
      totalSteps={effectiveSteps("seller", seller.entityType).length}
      backHref={back?.href ?? "/"}
      title={t("onboarding.farm.title")}
      description={t("onboarding.farm.description")}
      skipHref={target?.href}
      footer={
        <Button
          size="xl"
          className="w-full"
          disabled={!canContinue}
          onClick={() => target && router.push(target.href)}
        >
          {t("common.continue")}
          <ArrowRightIcon />
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <FieldGroup>
          <FieldGroupRow label={t("onboarding.farm.farmLabel")} htmlFor="farmName">
            <FieldGroupInput
              id="farmName"
              placeholder={t("onboarding.farm.farmPlaceholder")}
              value={seller.farmName}
              onChange={(event) => updateSeller({ farmName: event.target.value })}
            />
          </FieldGroupRow>
          <FieldGroupRow label={t("onboarding.farm.regionLabel")} htmlFor="region">
            <FieldGroupInput
              id="region"
              placeholder={t("onboarding.farm.regionPlaceholder")}
              value={seller.region}
              onChange={(event) => updateSeller({ region: event.target.value })}
            />
          </FieldGroupRow>
        </FieldGroup>

        <fieldset>
          <legend className="text-[14px] font-semibold">{t("onboarding.farm.sellingAsLegend")}</legend>
          <ChoiceChips
            label={t("onboarding.farm.sellingAsLegend")}
            className="mt-2.5 sm:grid-cols-3"
            value={seller.producerType}
            options={producerTypes.map((type) => ({ value: type, label: t(`onboarding.options.producerTypes.${type}`) }))}
            onChange={(producerType) => updateSeller({ producerType })}
          />
        </fieldset>

        <fieldset>
          <legend className="text-[14px] font-semibold">{t("onboarding.farm.landLegend")}</legend>
          <ChoiceChips
            label={t("onboarding.farm.landLegend")}
            className="mt-2.5 sm:grid-cols-3"
            value={seller.farmSize}
            options={farmSizes.map((size) => ({ value: size, label: t(`onboarding.options.farmSizes.${size}`) }))}
            onChange={(farmSize) => updateSeller({ farmSize })}
          />
        </fieldset>

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="farm-bio" className="text-[14px] font-semibold">
              About your farm <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <span className="text-[12px] text-muted-foreground tabular-nums" aria-live="polite">
              {seller.bio.length}/{BIO_LIMIT}
            </span>
          </div>
          <Textarea
            id="farm-bio"
            rows={4}
            maxLength={BIO_LIMIT}
            value={seller.bio}
            onChange={(event) => updateSeller({ bio: event.target.value })}
            placeholder="We've grown pomegranates in Dindori for three generations. Drip-irrigated, residue-tested every season, packed the same day we pick."
            className="mt-2.5 min-h-28 rounded-2xl text-[15px] leading-relaxed"
          />
        </div>
      </div>
    </StepShell>
  )
}
