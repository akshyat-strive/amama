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
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EditorialImage } from "@/components/ui/editorial-image"
import { adminLoginContent } from "@/features/auth/admin-login-content"
import { signIn } from "@/features/auth/local-auth"
import { useDemoDirectory, type DemoDirectoryEntry } from "@/features/admin/demo-directory"
import { DOMAINS } from "@/features/admin/permissions"
import { DEMO_PASSWORD } from "@/features/admin/staff-seed"
import { AmamaWordmark } from "@/components/brand/amama-wordmark"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * The admin module's own sign-in — deliberately plainer than the buyer/
 * seller `LoginScreen`: no social providers, no "new here? get started"
 * (there's no public sign-up for staff accounts), no forgot-password link
 * yet. One door for every business-side role, checked against the staff
 * accounts kept in this browser.
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

  const attemptSignIn = (attemptEmail: string, attemptPassword: string) => {
    setSubmitting(true)
    setError(null)
    const result = signIn(attemptEmail, attemptPassword, "admin")
    if (!result.ok) {
      setSubmitting(false)
      setError(result.error)
      return
    }
    enterConsole()
  }

  // Quick login follows the org: executives first, then each domain's
  // Master KAM and the KAMs who report to them.
  const LEVEL_ORDER = { executive: 0, lead: 1, member: 2 } as const
  const groups: { label: string; people: DemoDirectoryEntry[] }[] = [
    { label: "Executives", people: directory.filter((user) => user.level === "executive").sort((a, b) => (a.domain === "all" ? -1 : b.domain === "all" ? 1 : 0)) },
    ...DOMAINS.map((domain) => ({
      label: domain.label,
      people: directory
        .filter((user) => user.level !== "executive" && user.domain === domain.id)
        .sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]),
    })),
  ].filter((group) => group.people.length > 0)

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
            <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.03em] text-balance sm:text-[32px]">
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

            <button
              type="button"
              onClick={() => setQuickLoginOpen(true)}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-medium text-amama-deep transition-colors hover:bg-amama-subtle"
            >
              <KeyRoundIcon className="size-3.5" />
              Quick login as a demo account
            </button>

            <Dialog open={quickLoginOpen} onOpenChange={setQuickLoginOpen}>
              <DialogContent className="max-h-[85dvh] gap-4 overflow-hidden p-0 sm:max-w-lg">
                <DialogHeader className="px-6 pt-6">
                  <DialogTitle>Sign in as</DialogTitle>
                  <DialogDescription>Every demo account uses the password {DEMO_PASSWORD}.</DialogDescription>
                </DialogHeader>
                <div className="flex max-h-[calc(85dvh-7rem)] flex-col gap-4 overflow-y-auto px-4 pb-5">
                  {groups.map((group) => (
                    <section key={group.label} aria-label={group.label}>
                      <h3 className="px-2 pb-1.5 text-[12px] font-medium text-muted-foreground">{group.label}</h3>
                      <div className="overflow-hidden rounded-2xl bg-muted">
                        {group.people.map((user, index) => (
                          <button
                            key={user.id}
                            type="button"
                            disabled={submitting}
                            onClick={() => {
                              setActiveAction(user.id)
                              attemptSignIn(user.email, DEMO_PASSWORD)
                            }}
                            className={cn(
                              "flex w-full items-center gap-3 px-3.5 py-2.5 text-start transition-colors hover:bg-[#ebebef] disabled:pointer-events-none disabled:opacity-50 dark:hover:bg-card",
                              index > 0 && "border-t border-background",
                              user.level === "member" && "ps-9"
                            )}
                          >
                            <span
                              className={cn(
                                "grid size-8 shrink-0 place-items-center rounded-full text-[12px] font-semibold",
                                user.level === "executive" ? "bg-amama text-sun" : user.level === "lead" ? "bg-graphite text-white" : "bg-card text-foreground"
                              )}
                            >
                              {submitting && activeAction === user.id ? <Loader2Icon className="size-3.5 animate-spin" /> : user.name.trim().charAt(0).toUpperCase() || "?"}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13.5px] font-semibold text-foreground">{user.name}</span>
                              <span className="block truncate text-[12px] text-muted-foreground">
                                {user.level === "executive" && user.domain !== "all" ? `${user.domainLabel} Executive` : user.roleName}
                                {user.reportsTo ? ` · reports to ${user.reportsTo}` : ""}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </DialogContent>
            </Dialog>

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
