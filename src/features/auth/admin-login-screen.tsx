"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRightIcon, EyeIcon, EyeOffIcon } from "lucide-react"

import {
  FieldGroup,
  FieldGroupRow,
  FieldGroupInput,
  FieldStatusIcon,
} from "@/components/ui/field-group"
import { Button } from "@/components/ui/button"
import { EditorialImage } from "@/components/ui/editorial-image"
import { adminLoginContent } from "@/features/auth/admin-login-content"
import { signInKam } from "@/features/admin/kam-identity"
import type { AdminRole } from "@/features/admin/admin-nav-config"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * The admin module's own sign-in — deliberately plainer than the buyer/
 * seller `LoginScreen`: no social providers, no "new here? get started"
 * (there's no public sign-up for staff accounts), no forgot-password link
 * yet. Same no-backend shortcut as the rest of the app, though: submitting
 * just drops the visitor straight into that role's console.
 */
function AdminLoginScreen({ role }: { role: AdminRole }) {
  const router = useRouter()
  const content = adminLoginContent[role]
  const [submitting, setSubmitting] = React.useState(false)
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)

  const enterConsole = () => router.push(content.homeHref)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    // A KAM's identity is whatever they just typed here — there's no
    // roster to check against, this sign-in *is* the roster entry (see
    // `signInKam`). Every later moderation/verification/deal action
    // attributes to this identity instead of a hardcoded name.
    if (role === "kam") signInKam(name.trim(), email.trim())
    window.setTimeout(enterConsole, 500)
  }

  const emailValid = EMAIL_PATTERN.test(email.trim())
  const emailStatus = email.length === 0 ? null : emailValid ? "valid" : "invalid"

  return (
    <div className="grid h-dvh grid-cols-1 overflow-hidden bg-background lg:grid-cols-2">
      <div className="flex h-full flex-col overflow-y-auto px-6 py-8 sm:px-12 lg:px-16 lg:py-12">
        <Link href="/" className="shrink-0 text-2xl font-bold tracking-tight text-amama-deep">
          amama
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
                {role === "kam" ? (
                  <FieldGroupRow label="Your name" htmlFor="admin-login-name">
                    <FieldGroupInput
                      id="admin-login-name"
                      type="text"
                      autoComplete="name"
                      required
                      placeholder="Priya Nair"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </FieldGroupRow>
                ) : null}
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
                    onChange={(event) => setEmail(event.target.value.toLowerCase())}
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

              <Button type="submit" size="lg" className="mt-1 w-full" disabled={submitting}>
                {submitting ? "Signing in…" : "Log in"}
                {!submitting && <ArrowRightIcon />}
              </Button>
            </form>

            <p className="mt-6 text-center text-[13px] text-muted-foreground">
              <Link href={content.otherRole.href} className="underline underline-offset-4 hover:text-foreground">
                {content.otherRole.label}
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
