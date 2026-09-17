"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRightIcon, EyeIcon, EyeOffIcon, KeyRoundIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  FieldGroup,
  FieldGroupRow,
  FieldGroupInput,
  FieldStatusIcon,
} from "@/components/ui/field-group"
import { EditorialImage } from "@/components/ui/editorial-image"
import { useI18n } from "@/features/i18n/i18n-context"
import { GoogleIcon, MicrosoftIcon, AppleIcon } from "@/features/auth/oauth-icons"
import { loginContent } from "@/features/auth/login-content"
import { demoDraftFor } from "@/features/auth/demo-accounts"
import { seedAdminDemoData } from "@/features/admin/seed-data"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import type { OnboardingRole } from "@/features/onboarding/types"

// Provider names are brand names, not translated — only the surrounding
// "Continue with {provider}" template comes from the dictionary.
const oauthProviders = [
  { id: "google", name: "Google", Icon: GoogleIcon },
  { id: "microsoft", name: "Microsoft", Icon: MicrosoftIcon },
  { id: "apple", name: "Apple", Icon: AppleIcon },
] as const

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function LoginScreen({ role }: { role: OnboardingRole }) {
  const router = useRouter()
  const { t } = useI18n()
  const { loadDraft } = useOnboarding()
  const content = loginContent[role]
  const [submitting, setSubmitting] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)

  // No auth backend yet: every sign-in path (password or provider) drops the
  // visitor into onboarding, since there's nowhere else authenticated to send
  // them and nothing yet to say "this account already finished setup".
  const enterApp = () => router.push(content.onboardingHref)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    window.setTimeout(enterApp, 500)
  }

  // The one door a demo actually walks through: skip the form, skip the
  // wizard, land straight on a dashboard that's already mid-deal — loading
  // a finished draft and seeding its data (idempotent, safe to call from
  // here even if `/admin` was never visited first) before routing in.
  const demoDraft = demoDraftFor(role)
  const enterDemoAccount = () => {
    loadDraft(demoDraft)
    seedAdminDemoData()
    router.push(`/${role}/dashboard`)
  }

  const emailValid = EMAIL_PATTERN.test(email.trim())
  const emailStatus = email.length === 0 ? null : emailValid ? "valid" : "invalid"

  const title = t(role === "buyer" ? "auth.buyerTitle" : "auth.sellerTitle")
  const description = t(role === "buyer" ? "auth.buyerDescription" : "auth.sellerDescription")
  const otherRoleLabel = t(role === "buyer" ? "auth.buyerOtherRole" : "auth.sellerOtherRole")

  return (
    // Fixed to the viewport height rather than just a minimum, so a long
    // left column scrolls *inside itself* — the grid row can never grow
    // past the viewport and drag the "full height" image taller with it.
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
            <h1 className="mt-2 text-[28px] font-bold leading-tight tracking-tight text-balance sm:text-[32px]">
              {title}
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-pretty text-muted-foreground">
              {description}
            </p>

            {/* One line, not three: a label plus icon-only provider buttons —
                the row a screen reader announces exactly as "Continue with
                Google / Microsoft / Apple button" via each one's own label. */}
            <div className="mt-7 flex items-center justify-between gap-3">
              <span className="text-[14px] font-medium text-muted-foreground">
                {t("auth.continueWith")}
              </span>
              <div className="flex items-center gap-2">
                {oauthProviders.map(({ id, name, Icon }) => {
                  const label = t("auth.continueWithProvider", { provider: name })
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-label={label}
                      title={label}
                      onClick={enterApp}
                      className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
                    >
                      <Icon className="size-5" />
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="my-5 flex items-center gap-3" aria-hidden>
              <span className="h-px flex-1 bg-border" />
              <span className="text-[13px] text-muted-foreground">{t("auth.or")}</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {/* One grouped, hairline-divided list for email + password —
                  an inline label beside each field instead of a label
                  stacked over its own separate box. */}
              <FieldGroup>
                <FieldGroupRow label={t("auth.emailLabel")} htmlFor="login-email">
                  <FieldGroupInput
                    id="login-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    placeholder={t("auth.emailPlaceholder")}
                    value={email}
                    // Emails are case-insensitive by convention — forcing
                    // lowercase as you type avoids "Not.Me@x.com" vs
                    // "not.me@x.com" ever looking like two different accounts.
                    onChange={(event) =>
                      setEmail(event.target.value.toLowerCase())
                    }
                  />
                  <FieldStatusIcon status={emailStatus} />
                </FieldGroupRow>
                <FieldGroupRow label={t("auth.passwordLabel")} htmlFor="login-password">
                  <FieldGroupInput
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder={t("auth.passwordPlaceholder")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((shown) => !shown)}
                    aria-label={t(showPassword ? "auth.hidePassword" : "auth.showPassword")}
                    aria-pressed={showPassword}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="size-5" />
                    ) : (
                      <EyeIcon className="size-5" />
                    )}
                  </button>
                </FieldGroupRow>
              </FieldGroup>

              <Link
                href={`/${role}/forgot-password`}
                className="self-end text-[13px] font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                {t("auth.forgotLink")}
              </Link>

              <Button
                type="submit"
                size="lg"
                className="mt-1 w-full"
                disabled={submitting}
              >
                {submitting ? t("auth.signingIn") : t("auth.logIn")}
                {!submitting && <ArrowRightIcon />}
              </Button>
            </form>

            <button
              type="button"
              onClick={enterDemoAccount}
              className="mt-4 flex w-full items-center gap-3 rounded-[16px] border border-dashed border-border px-4 py-3 text-start transition-colors hover:border-foreground/30 hover:bg-muted"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amama-deep text-white">
                <KeyRoundIcon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-foreground">
                  Continue as demo {role}
                </span>
                <span className="block truncate text-[12px] text-muted-foreground">
                  {role === "buyer" ? demoDraft.buyer.email : demoDraft.seller.email} — skips onboarding, already mid-deal
                </span>
              </span>
            </button>

            <p className="mt-6 text-center text-[14px] text-muted-foreground">
              {t("auth.newToAmama")}{" "}
              <Link
                href={content.onboardingHref}
                className="font-semibold text-foreground underline underline-offset-4"
              >
                {t("auth.getStarted")}
              </Link>
            </p>
            <p className="mt-2 text-center text-[13px] text-muted-foreground">
              <Link
                href={content.otherRole.href}
                className="underline underline-offset-4 hover:text-foreground"
              >
                {otherRoleLabel}
              </Link>
            </p>
          </div>
        </div>
      </div>

      <EditorialImage
        src={content.image.src}
        alt={content.image.alt}
        credit={content.image.credit}
        priority
        className="hidden lg:block"
      />
    </div>
  )
}

export { LoginScreen }
