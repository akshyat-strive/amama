"use client"

import * as React from "react"
import Link from "next/link"
import { AlertCircle, FileText, Hourglass, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { useI18n } from "@/features/i18n/i18n-context"
import { useVerification } from "@/features/verification/verification-context"
import type { OnboardingRole } from "@/features/onboarding/types"

/**
 * Stands between finishing onboarding and the dashboard itself. An account
 * whose KYC documents a Key Account Manager hasn't checked yet is a request
 * for an account, not an account — so rather than letting someone into a
 * dashboard full of controls that would fail server-side anyway, this shows
 * them exactly where their application sits.
 *
 * It wraps *outside* the dashboard shell on purpose: showing the nav for a
 * dashboard you can't use yet is worse than not showing it at all.
 */
function ReviewGate({
  role,
  children,
}: {
  role: OnboardingRole
  children: React.ReactNode
}) {
  const { t, locale } = useI18n()
  const { statusFor, submissions } = useVerification()
  const status = statusFor(role)
  const submission = submissions[role]

  if (status === "approved") return <>{children}</>

  // A KAM can reject one document without touching the submission's overall
  // status (see `setDocumentStatus` — it's meant to be usable one document
  // at a time, independent of the whole application). Left as plain
  // "pending" here, the applicant would see "we're checking your
  // documents" forever with no way to fix anything. Treating it the same as
  // a full `requestChanges` — same screen, same "go fix it" link — is what
  // actually gets them back to the one document that needs re-uploading.
  const rejectedDocuments = submission?.documents.filter(
    (document) => document.reviewStatus === "rejected"
  )
  const effectiveStatus =
    status === "pending" && rejectedDocuments && rejectedDocuments.length > 0
      ? "changes-requested"
      : status

  const variants: Record<
    "pending" | "changes-requested" | "not-submitted",
    { icon: LucideIcon; tone: string; title: string; description: string }
  > = {
    pending: {
      icon: Hourglass,
      tone: "bg-amama-subtle text-amama-deep",
      title: t("review.pendingTitle"),
      description: t("review.pendingDescription"),
    },
    "changes-requested": {
      icon: AlertCircle,
      tone: "bg-status-warning/15 text-status-warning",
      title: t("review.changesTitle"),
      description: t("review.changesDescription"),
    },
    "not-submitted": {
      icon: FileText,
      tone: "bg-muted text-muted-foreground",
      title: t("review.notSubmittedTitle"),
      description: t("review.notSubmittedDescription"),
    },
  }

  const variant = variants[effectiveStatus]
  const Icon = variant.icon

  const submittedOn = submission?.submittedAt
    ? new Intl.DateTimeFormat(locale.tag, { dateStyle: "medium" }).format(
        new Date(submission.submittedAt)
      )
    : null

  return (
    <div className="flex min-h-dvh flex-col bg-card">
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-12">
        <span
          aria-hidden
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-full",
            variant.tone
          )}
        >
          <Icon className="size-5" strokeWidth={2.25} />
        </span>

        <h1 className="mt-5 text-[28px] font-bold leading-tight tracking-tight text-balance sm:text-[32px]">
          {variant.title}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-pretty text-muted-foreground">
          {variant.description}
        </p>

        {/* The KAM's own words, not a paraphrase — someone sent back for a
            blurry land record needs to know it was the land record. Shown
            for a whole-application send-back; a single rejected document
            gets its own note inline in the list below instead, since that's
            the more specific reason. */}
        {effectiveStatus === "changes-requested" && submission?.reviewerNote ? (
          <blockquote className="mt-4 rounded-2xl border border-status-warning/30 bg-status-warning/5 px-4 py-3 text-[14px] leading-relaxed text-foreground">
            {submission.reviewerNote}
          </blockquote>
        ) : null}

        {submission && submission.documents.length > 0 ? (
          <section className="mt-7">
            <h2 className="text-[13px] font-semibold text-foreground">
              {t("review.submittedDocuments")}
              {submittedOn ? (
                <span className="font-normal text-muted-foreground"> · {submittedOn}</span>
              ) : null}
            </h2>
            <ul className="mt-2 flex flex-col gap-1.5">
              {submission.documents.map((document) => {
                const rejected = document.reviewStatus === "rejected"
                return (
                  <li
                    key={document.id}
                    className={cn(
                      "flex flex-col gap-1.5 rounded-xl border px-3 py-2.5",
                      rejected ? "border-destructive/30 bg-destructive/5" : "border-border"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText
                        aria-hidden
                        className={cn(
                          "size-4 shrink-0",
                          rejected ? "text-destructive" : "text-muted-foreground"
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                        {t(`onboarding.options.documents.${document.id}.label`)}
                      </span>
                      <span className="shrink-0 truncate text-[12px] text-muted-foreground">
                        {document.name}
                      </span>
                    </div>
                    {rejected && document.reviewNote ? (
                      <p className="text-[12px] leading-relaxed text-destructive">
                        {document.reviewNote}
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        {effectiveStatus !== "pending" ? (
          <Link
            href={
              effectiveStatus === "changes-requested"
                ? `/${role}/onboarding/documents`
                : `/${role}/onboarding/country`
            }
            className={cn(buttonVariants({ size: "xl" }), "mt-7 w-full")}
          >
            {t(
              effectiveStatus === "changes-requested"
                ? "review.fixDocuments"
                : "review.finishOnboarding"
            )}
          </Link>
        ) : null}
      </main>
    </div>
  )
}

export { ReviewGate }
