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
import { StepShell } from "@/features/onboarding/components/step-shell"
import {
  SelectableGroup,
  SelectableRow,
} from "@/features/onboarding/components/selectable"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import {
  effectiveSteps,
  nextStep,
  stepIndex,
} from "@/features/onboarding/steps"
import type { OnboardingRole } from "@/features/onboarding/types"

const copy: Record<
  OnboardingRole,
  {
    title: string
    description: string
    namePlaceholder: string
    emailPlaceholder: string
  }
> = {
  buyer: {
    title: "Let's set up your buying account",
    description:
      "We'll use this to send quotes, shipping updates and contract documents.",
    namePlaceholder: "John Doe",
    emailPlaceholder: "john.doe@domain.com",
  },
  seller: {
    title: "Let's set up your seller account",
    description:
      "We'll use this to send buyer enquiries and payment confirmations.",
    namePlaceholder: "Arjun Patel",
    emailPlaceholder: "arjun@greenfieldfarms.in",
  },
}

function AccountStep({ role }: { role: OnboardingRole }) {
  const router = useRouter()
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
  const accountTypeChosen = current.accountType.length > 0
  const canContinue = emailValid && nameValid && accountTypeChosen

  const target = nextStep(role, "account", current.accountType)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setTouched(true)
    if (!canContinue || !target) return
    router.push(target.href)
  }

  const showEmailError = touched && !emailValid && current.email.length > 0
  const emailStatus =
    current.email.length === 0 ? null : emailValid ? "valid" : "invalid"

  return (
    <form onSubmit={handleSubmit} className="contents">
      <StepShell
        step={stepIndex(role, "account", current.accountType) + 1}
        totalSteps={effectiveSteps(role, current.accountType).length}
        backHref="/"
        title={copy[role].title}
        description={copy[role].description}
        footer={
          <Button type="submit" size="xl" className="w-full" disabled={!canContinue}>
            Continue
            <ArrowRightIcon className="rtl:-scale-x-100" />
          </Button>
        }
        footerNote={
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            By continuing you agree to amama&apos;s Terms and Privacy Policy.
          </p>
        }
      >
        {/* One grouped, hairline-divided list instead of two separate boxes —
            matches the login screen's field treatment. */}
        <FieldGroup>
          <FieldGroupRow label="Name" htmlFor="fullName">
            <FieldGroupInput
              id="fullName"
              name="fullName"
              autoComplete="name"
              placeholder={copy[role].namePlaceholder}
              value={current.fullName}
              onChange={(event) => update({ fullName: event.target.value })}
            />
          </FieldGroupRow>
          <FieldGroupRow label="Email" htmlFor="email">
            <FieldGroupInput
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder={copy[role].emailPlaceholder}
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
            That email doesn&apos;t look right yet.
          </p>
        ) : null}

        {/* Drives whether the next step can ask for a date of birth at all —
            a business account has no personal birthday to give. */}
        <fieldset className="mt-6 flex flex-col gap-2">
          <legend className="mb-1 text-[14px] font-semibold">
            Setting this up as
          </legend>
          <SelectableGroup>
            <SelectableRow
              name="accountType"
              label="An individual"
              hint="You, trading under your own name"
              selected={current.accountType === "individual"}
              onSelect={() => update({ accountType: "individual" })}
            />
            <SelectableRow
              name="accountType"
              label="A business or organisation"
              hint="Company, cooperative, or trading entity"
              selected={current.accountType === "business"}
              onSelect={() => update({ accountType: "business" })}
            />
          </SelectableGroup>
        </fieldset>
      </StepShell>
    </form>
  )
}

export { AccountStep }
