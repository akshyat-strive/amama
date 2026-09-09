"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, ArrowRightIcon, MailCheckIcon } from "lucide-react"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  FieldGroup,
  FieldGroupRow,
  FieldGroupInput,
  FieldStatusIcon,
} from "@/components/ui/field-group"
import { EditorialImage } from "@/components/ui/editorial-image"
import { useI18n } from "@/features/i18n/i18n-context"
import { loginContent } from "@/features/auth/login-content"
import type { OnboardingRole } from "@/features/onboarding/types"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function ForgotPasswordScreen({ role }: { role: OnboardingRole }) {
  const { t } = useI18n()
  const content = loginContent[role]
  const [email, setEmail] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [sent, setSent] = React.useState(false)

  const emailValid = EMAIL_PATTERN.test(email.trim())
  const emailStatus = email.length === 0 ? null : emailValid ? "valid" : "invalid"

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!emailValid) return
    setSubmitting(true)
    // No auth backend yet — this always "succeeds" after a beat, same as
    // login. A real implementation must still show this same confirmation
    // regardless of whether the address is registered, so as not to leak
    // which emails have accounts.
    window.setTimeout(() => {
      setSubmitting(false)
      setSent(true)
    }, 500)
  }

  return (
    <div className="grid h-dvh grid-cols-1 overflow-hidden bg-background lg:grid-cols-2">
      <div className="flex h-full flex-col overflow-y-auto px-6 py-8 sm:px-12 lg:px-16 lg:py-12">
        <Link
          href="/"
          className="shrink-0 text-2xl font-bold tracking-tight text-amama-deep"
        >
          amama
        </Link>

        <div className="flex flex-1 flex-col justify-end py-8">
          <div className="mx-auto w-full max-w-sm">
            <Link
              href={`/${role}/login`}
              className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftIcon className="size-4" />
              {t("auth.backToLogin")}
            </Link>

            {sent ? (
              <>
                <span className="grid size-12 place-items-center rounded-full bg-amama-subtle text-amama-deep">
                  <MailCheckIcon className="size-5" strokeWidth={2.25} />
                </span>
                <h1 className="mt-4 text-[28px] font-bold leading-tight tracking-tight text-balance sm:text-[32px]">
                  {t("auth.checkEmailTitle")}
                </h1>
                <p className="mt-2 text-[15px] leading-relaxed text-pretty text-muted-foreground">
                  {t("auth.checkEmailDescription", { email })}
                </p>
                <Link
                  href={`/${role}/login`}
                  className={cn(buttonVariants({ size: "lg" }), "mt-6 w-full")}
                >
                  {t("auth.backToLogin")}
                </Link>
              </>
            ) : (
              <>
                <h1 className="text-[28px] font-bold leading-tight tracking-tight text-balance sm:text-[32px]">
                  {t("auth.resetTitle")}
                </h1>
                <p className="mt-2 text-[15px] leading-relaxed text-pretty text-muted-foreground">
                  {t("auth.resetDescription")}
                </p>

                <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-3">
                  <FieldGroup>
                    <FieldGroupRow label={t("auth.emailLabel")} htmlFor="forgot-email">
                      <FieldGroupInput
                        id="forgot-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        required
                        placeholder={t("auth.emailPlaceholder")}
                        value={email}
                        onChange={(event) =>
                          setEmail(event.target.value.toLowerCase())
                        }
                      />
                      <FieldStatusIcon status={emailStatus} />
                    </FieldGroupRow>
                  </FieldGroup>

                  <Button
                    type="submit"
                    size="lg"
                    className="mt-1 w-full"
                    disabled={submitting || !emailValid}
                  >
                    {submitting ? t("auth.sendingLabel") : t("auth.sendResetLink")}
                    {!submitting && <ArrowRightIcon />}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      <EditorialImage
        src={content.image.src}
        alt={content.image.alt}
        credit={content.image.credit}
        className="hidden lg:block"
      />
    </div>
  )
}

export { ForgotPasswordScreen }
