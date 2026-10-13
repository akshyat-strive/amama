"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRightIcon, EyeIcon, EyeOffIcon, KeyRoundIcon, Loader2Icon } from "lucide-react"

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
import { signIn, signUp } from "@/features/auth/local-auth"
import { DEMO_PASSWORD } from "@/features/admin/staff-seed"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import { loadProfile } from "@/features/onboarding/profile-store"
import { emptyBuyer, emptySeller, type OnboardingRole } from "@/features/onboarding/types"
import { AmamaWordmark } from "@/components/brand/amama-wordmark"

// Provider names are brand names, not translated — only the surrounding
// "Continue with {provider}" template comes from the dictionary.
const oauthProviders = [
  { id: "google", name: "Google", Icon: GoogleIcon },
  { id: "microsoft", name: "Microsoft", Icon: MicrosoftIcon },
  { id: "apple", name: "Apple", Icon: AppleIcon },
] as const

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

const DEMO_ACCOUNTS: Record<OnboardingRole, { email: string; caption: string }> = {
  buyer: { email: "buyer@amama.in", caption: "buyer@amama.in — skips onboarding, already mid-deal" },
  seller: { email: "seller@amama.in", caption: "seller@amama.in — skips onboarding, already mid-deal" },
}

/** A second seller demo — the counterparty behind the "Kashmir Valley
 *  Growers" apple listing a buyer demo can already message. */
const KASHMIR_DEMO = {
  email: "kashmir@amama.in",
  label: "Continue as Kashmir Valley Growers",
  caption: "kashmir@amama.in — the apple listing a buyer demo can message",
}

/** Restores the account's saved profile into the onboarding draft, which
 *  is what every dashboard screen reads its identity from. */
function restoreDraft(
  role: OnboardingRole,
  email: string,
  loadDraft: ReturnType<typeof useOnboarding>["loadDraft"]
) {
  if (role === "buyer") loadDraft({ role, buyer: loadProfile("buyer", email), seller: emptySeller })
  else loadDraft({ role, buyer: emptyBuyer, seller: loadProfile("seller", email) })
}

function LoginScreen({ role }: { role: OnboardingRole }) {
  const router = useRouter()
  const { t } = useI18n()
  const { loadDraft } = useOnboarding()
  const content = loginContent[role]
  const [submitting, setSubmitting] = React.useState(false)
  // Which control triggered the in-flight sign-in — `submitting` alone
  // gates every button's `disabled`, but this is what tells each one
  // whether *it* should swap its own icon for a spinner, instead of every
  // button changing at once with no clue which was actually clicked.
  const [activeAction, setActiveAction] = React.useState<"form" | "demo" | "kashmir" | null>(null)
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // No auth backend behind these yet, so a provider button (no email to
  // check against) still just drops the visitor into onboarding.
  const enterApp = () => router.push(content.onboardingHref)

  /**
   * One form, two outcomes: sign in if the account exists, create it if it
   * doesn't — there's no separate "sign up" screen, so this is genuinely
   * how a brand-new buyer/seller gets an account. The dashboard's KYC gate
   * decides what a freshly created, nothing-submitted-yet account sees.
   */
  const enterDashboard = (attemptEmail: string, attemptPassword: string) => {
    setSubmitting(true)
    setError(null)
    const attempt = signIn(attemptEmail, attemptPassword, role)
    if (!attempt.ok && attempt.reason !== "no-account") {
      setSubmitting(false)
      setError(attempt.error)
      return
    }
    if (!attempt.ok) {
      const created = signUp({ kind: role, email: attemptEmail, password: attemptPassword, name: attemptEmail.split("@")[0] })
      if (!created.ok) {
        setSubmitting(false)
        setError(created.error)
        return
      }
    }
    restoreDraft(role, attemptEmail, loadDraft)
    router.push(`/${role}/dashboard`)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setActiveAction("form")
    enterDashboard(email.trim().toLowerCase(), password)
  }

  const handleDemoLogin = () => {
    setActiveAction("demo")
    enterDashboard(demo.email, DEMO_PASSWORD)
  }

  const handleKashmirLogin = () => {
    setActiveAction("kashmir")
    enterDashboard(KASHMIR_DEMO.email, DEMO_PASSWORD)
  }

  const emailValid = EMAIL_PATTERN.test(email.trim())
  const emailStatus = email.length === 0 ? null : emailValid ? "valid" : "invalid"

  const title = t(role === "buyer" ? "auth.buyerTitle" : "auth.sellerTitle")
  const description = t(role === "buyer" ? "auth.buyerDescription" : "auth.sellerDescription")
  const otherRoleLabel = t(role === "buyer" ? "auth.buyerOtherRole" : "auth.sellerOtherRole")
  const demo = DEMO_ACCOUNTS[role]

  return (
    // Fixed to the viewport height rather than just a minimum, so a long
    // left column scrolls *inside itself* — the grid row can never grow
    // past the viewport and drag the "full height" image taller with it.
    <div className="grid h-dvh grid-cols-1 overflow-hidden bg-background lg:grid-cols-2">
      <div className="flex h-full flex-col overflow-y-auto px-6 py-8 sm:px-12 lg:px-16 lg:py-12">
        <Link
          href="/"
          className="shrink-0 self-start text-amama-deep"
        >
          <AmamaWordmark className="h-[18px]" />
        </Link>

        <div className="flex flex-1 flex-col justify-end py-8">
          <div className="mx-auto w-full max-w-sm">
            <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-balance sm:text-[32px]">
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
                    onChange={(event) => {
                      setEmail(event.target.value.toLowerCase())
                      setError(null)
                    }}
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
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setError(null)
                    }}
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

              {error ? <p className="text-[13px] font-medium text-destructive">{error}</p> : null}

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
                {submitting && activeAction === "form" ? t("auth.signingIn") : t("auth.logIn")}
                {submitting && activeAction === "form" ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  !submitting && <ArrowRightIcon />
                )}
              </Button>
            </form>

            <button
              type="button"
              disabled={submitting}
              onClick={handleDemoLogin}
              className="mt-4 flex w-full items-center gap-3 rounded-[16px] border border-dashed border-border px-4 py-3 text-start transition-colors hover:border-foreground/30 hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amama-deep text-white">
                {submitting && activeAction === "demo" ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <KeyRoundIcon className="size-4" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-foreground">
                  Continue as demo {role}
                </span>
                <span className="block truncate text-[12px] text-muted-foreground">{demo.caption}</span>
              </span>
            </button>

            {role === "seller" ? (
              <button
                type="button"
                disabled={submitting}
                onClick={handleKashmirLogin}
                className="mt-2 flex w-full items-center gap-3 rounded-[16px] border border-dashed border-border px-4 py-3 text-start transition-colors hover:border-foreground/30 hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amama-deep text-white">
                  {submitting && activeAction === "kashmir" ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <KeyRoundIcon className="size-4" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-foreground">
                    {KASHMIR_DEMO.label}
                  </span>
                  <span className="block truncate text-[12px] text-muted-foreground">
                    {KASHMIR_DEMO.caption}
                  </span>
                </span>
              </button>
            ) : null}

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
