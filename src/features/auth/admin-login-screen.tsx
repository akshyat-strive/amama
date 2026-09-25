"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRightIcon, EyeIcon, EyeOffIcon, KeyRoundIcon, Loader2Icon } from "lucide-react"

import {
  FieldGroup,
  FieldGroupRow,
  FieldGroupInput,
  FieldStatusIcon,
} from "@/components/ui/field-group"
import { Button } from "@/components/ui/button"
import { EditorialImage } from "@/components/ui/editorial-image"
import { adminLoginContent } from "@/features/auth/admin-login-content"
import { authClient } from "@/lib/auth/client"
import { invalidateCurrentAdmin } from "@/features/admin/current-admin"
import { useDemoDirectory } from "@/features/admin/demo-directory"
import { DEMO_PASSWORD } from "@/features/admin/user-store"
import { AmamaWordmark } from "@/components/brand/amama-wordmark"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * The admin module's own sign-in — deliberately plainer than the buyer/
 * seller `LoginScreen`: no social providers, no "new here? get started"
 * (there's no public sign-up for staff accounts), no forgot-password link
 * yet. One door for every business-side role now, checked against a real
 * Managed Better Auth credential — no more typing whatever name you want.
 */
function AdminLoginScreen() {
  const router = useRouter()
  const content = adminLoginContent
  const directory = useDemoDirectory()
  const [submitting, setSubmitting] = React.useState(false)
  // "form", or the quick-login user id that's mid sign-in — tells that
  // one row's own avatar to swap in a spinner, rather than every row
  // dimming at once with no sign of which one was actually clicked.
  const [activeAction, setActiveAction] = React.useState<string | null>(null)
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [quickLoginOpen, setQuickLoginOpen] = React.useState(false)

  const enterConsole = () => router.push(content.homeHref)

  const attemptSignIn = async (attemptEmail: string, attemptPassword: string) => {
    setSubmitting(true)
    setError(null)
    // Some failures throw rather than resolve `{ data, error }` — either
    // shape means the same thing here.
    try {
      const { error: signInError } = await authClient.signIn.email({ email: attemptEmail, password: attemptPassword })
      if (signInError) throw signInError
      await invalidateCurrentAdmin()
      enterConsole()
    } catch (error) {
      setSubmitting(false)
      setError(error instanceof Error ? error.message : "That email or password isn't right.")
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setActiveAction("form")
    attemptSignIn(email.trim(), password)
  }

  const emailValid = EMAIL_PATTERN.test(email.trim())
  const emailStatus = email.length === 0 ? null : emailValid ? "valid" : "invalid"

  return (
    <div className="grid h-dvh grid-cols-1 overflow-hidden bg-background lg:grid-cols-2">
      <div className="flex h-full flex-col overflow-y-auto px-6 py-8 sm:px-12 lg:px-16 lg:py-12">
        <Link href="/" className="shrink-0 self-start text-amama-deep">
          <AmamaWordmark className="h-[18px]" />
        </Link>

        <div className="flex flex-1 flex-col justify-end py-8">
          <div className="mx-auto w-full max-w-sm">
            <h1 className="mt-2 text-[28px] font-bold leading-tight tracking-tight text-balance sm:text-[32px]">
              {content.title}
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-pretty text-muted-foreground">
              {content.description}
            </p>

            <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-3">
              <FieldGroup>
                <FieldGroupRow label="Email" htmlFor="admin-login-email">
                  <FieldGroupInput
                    id="admin-login-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    placeholder="you@amama.com"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value.toLowerCase())
                      setError(null)
                    }}
                  />
                  <FieldStatusIcon status={emailStatus} />
                </FieldGroupRow>
                <FieldGroupRow label="Password" htmlFor="admin-login-password">
                  <FieldGroupInput
                    id="admin-login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setError(null)
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((shown) => !shown)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
                  </button>
                </FieldGroupRow>
              </FieldGroup>

              {error ? <p className="text-[13px] font-medium text-destructive">{error}</p> : null}

              <Button type="submit" size="lg" className="mt-1 w-full" disabled={submitting}>
                {submitting && activeAction === "form" ? "Signing in…" : "Log in"}
                {submitting && activeAction === "form" ? (
                  <Loader2Icon className="animate-spin" />
                ) : (
                  !submitting && <ArrowRightIcon />
                )}
              </Button>
            </form>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => setQuickLoginOpen((open) => !open)}
                aria-expanded={quickLoginOpen}
                className="flex w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-border py-2.5 text-[13px] font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                <KeyRoundIcon className="size-3.5" />
                Quick login as a demo account
              </button>

              {quickLoginOpen ? (
                <div className="mt-2 flex flex-col gap-1 rounded-[16px] border border-border bg-card p-1.5">
                  {directory.map((user) => {
                    return (
                      <button
                        key={user.id}
                        type="button"
                        disabled={submitting}
                        onClick={() => {
                          setActiveAction(user.id)
                          attemptSignIn(user.email, DEMO_PASSWORD)
                        }}
                        className="flex items-center gap-3 rounded-[12px] px-3 py-2 text-start transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-amama-deep text-[12px] font-semibold text-white">
                          {submitting && activeAction === user.id ? (
                            <Loader2Icon className="size-3.5 animate-spin" />
                          ) : (
                            user.name.trim().charAt(0).toUpperCase() || "?"
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-foreground">
                            {user.name}
                          </span>
                          <span className="block truncate text-[12px] text-muted-foreground">
                            {user.roleName} · {user.email}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>

            <p className="mt-6 text-center text-[13px] text-muted-foreground">
              <Link href="/creds" className="underline underline-offset-4 hover:text-foreground">
                View every demo account&apos;s credentials
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

export { AdminLoginScreen }
