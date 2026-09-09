"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ArrowRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  FieldGroup,
  FieldGroupRow,
  FieldGroupInput,
  FieldStatusIcon,
} from "@/components/ui/field-group"
import { useI18n } from "@/features/i18n/i18n-context"
import { StepShell } from "@/features/onboarding/components/step-shell"
import {
  SelectableGroup,
  SelectableRow,
} from "@/features/onboarding/components/selectable"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import {
  effectiveSteps,
  nextStep,
  previousStep,
  stepIndex,
} from "@/features/onboarding/steps"
import type { OnboardingRole } from "@/features/onboarding/types"

function AccountStep({ role }: { role: OnboardingRole }) {
  const router = useRouter()
  const { t } = useI18n()
  const { draft, updateBuyer, updateSeller, setRole } = useOnboarding()
  const current = role === "buyer" ? draft.buyer : draft.seller
  const update = role === "buyer" ? updateBuyer : updateSeller

  const [touched, setTouched] = React.useState(false)

  // Land here from a shared link and the role may never have been set.
  React.useEffect(() => {
    if (draft.role !== role) setRole(role)
  }, [draft.role, role, setRole])

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(current.email.trim())
  const nameValid = current.fullName.trim().length >= 2
  const entityTypeChosen = current.entityType.length > 0
  // A seller also has to say whether they grow what they sell or trade in
  // others' produce — that split drives which documents come later, so it's
  // just as required as the entity type itself.
  const sellerSubTypeChosen =
    role !== "seller" || draft.seller.sellerSubType.length > 0
  const canContinue = emailValid && nameValid && entityTypeChosen && sellerSubTypeChosen

  const target = nextStep(role, "account", current.entityType)
  const back = previousStep(role, "account", current.entityType)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (!canContinue || !target) return
    router.push(target.href)
  }

  const showEmailError = touched && !emailValid && current.email.length > 0
  const emailStatus =
    current.email.length === 0 ? null : emailValid ? "valid" : "invalid"

  const title =
    role === "buyer" ? t("onboarding.account.buyerTitle") : t("onboarding.account.sellerTitle")
  const description =
    role === "buyer"
      ? t("onboarding.account.buyerDescription")
      : t("onboarding.account.sellerDescription")
  const namePlaceholder =
    role === "buyer"
      ? t("onboarding.account.buyerNamePlaceholder")
      : t("onboarding.account.sellerNamePlaceholder")
  const emailPlaceholder =
    role === "buyer"
      ? t("onboarding.account.buyerEmailPlaceholder")
      : t("onboarding.account.sellerEmailPlaceholder")

  return (
    <form onSubmit={handleSubmit} className="contents">
      <StepShell
        step={stepIndex(role, "account", current.entityType) + 1}
        totalSteps={effectiveSteps(role, current.entityType).length}
        backHref={back?.href ?? "/"}
        title={title}
        description={description}
        footer={
          <Button type="submit" size="xl" className="w-full" disabled={!canContinue}>
            {t("common.continue")}
            <ArrowRightIcon />
          </Button>
        }
        footerNote={
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            {t("onboarding.account.termsNotice")}
          </p>
        }
      >
        {/* One grouped, hairline-divided list instead of two separate boxes —
            matches the login screen's field treatment. */}
        <FieldGroup>
          <FieldGroupRow label={t("onboarding.account.nameLabel")} htmlFor="fullName">
            <FieldGroupInput
              id="fullName"
              name="fullName"
              autoComplete="name"
              placeholder={namePlaceholder}
              value={current.fullName}
              onChange={(event) => update({ fullName: event.target.value })}
            />
          </FieldGroupRow>
          <FieldGroupRow label={t("onboarding.account.emailLabel")} htmlFor="email">
            <FieldGroupInput
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={emailPlaceholder}
              aria-invalid={showEmailError}
              aria-describedby={showEmailError ? "email-error" : undefined}
              value={current.email}
              onChange={(event) => update({ email: event.target.value })}
            />
            <FieldStatusIcon status={emailStatus} />
          </FieldGroupRow>
        </FieldGroup>
        {showEmailError ? (
          <p id="email-error" className="mt-2 text-[13px] text-destructive">
            {t("onboarding.account.emailError")}
          </p>
        ) : null}

        {/* Drives whether the next step can ask for a date of birth at all —
            an organisation has no personal birthday to give — and later,
            which documents get requested (a land title vs. a trade
            licence). */}
        <fieldset className="mt-6 flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-semibold">
            {t("onboarding.account.settingUpAsLegend")}
          </legend>
          <SelectableGroup>
            <SelectableRow
              name="entityType"
              label={t("onboarding.account.individual")}
              hint={t("onboarding.account.individualHint")}
              selected={current.entityType === "individual"}
              onSelect={() => update({ entityType: "individual" })}
            />
            <SelectableRow
              name="entityType"
              label={t("onboarding.account.organization")}
              hint={t("onboarding.account.organizationHint")}
              selected={current.entityType === "organization"}
              onSelect={() => update({ entityType: "organization" })}
            />
          </SelectableGroup>
        </fieldset>

        {/* Sellers only — this decides whether the documents ask for a land
            title (someone who grows) or an import-export code (someone who
            trades), so it needs settling as early as the entity type does. */}
        {role === "seller" ? (
          <fieldset className="mt-6 flex flex-col gap-2">
            <legend className="mb-1 text-[14px] font-semibold">
              {t("onboarding.account.youAreALegend")}
            </legend>
            <SelectableGroup>
              <SelectableRow
                name="sellerSubType"
                label={t("onboarding.account.producer")}
                hint={t("onboarding.account.producerHint")}
                selected={draft.seller.sellerSubType === "producer"}
                onSelect={() => updateSeller({ sellerSubType: "producer" })}
              />
              <SelectableRow
                name="sellerSubType"
                label={t("onboarding.account.trader")}
                hint={t("onboarding.account.traderHint")}
                selected={draft.seller.sellerSubType === "trader"}
                onSelect={() => updateSeller({ sellerSubType: "trader" })}
              />
            </SelectableGroup>
          </fieldset>
        ) : null}
      </StepShell>
    </form>
  )
}

export { AccountStep }
