"use client"

import * as React from "react"
import Link from "next/link"
import { AlertCircleIcon, BadgeCheckIcon, FileTextIcon, HourglassIcon, type LucideIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { StatusPill } from "@/features/admin/review-ui"
import { useI18n } from "@/features/i18n/i18n-context"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import type { OnboardingRole } from "@/features/onboarding/types"
import {
  Composer,
  FilePreview,
  Timeline,
  UploadVersionButton,
  VersionHistory,
  documentStatus,
  useDocumentLabel,
} from "@/features/verification/components/kyc-ticket-parts"
import { addApplicantComment, uploadDocumentVersion } from "@/features/verification/kyc-store"
import type { KycDocument } from "@/features/verification/kyc-types"
import { kycTicketId } from "@/features/verification/ticket"
import { useVerification } from "@/features/verification/verification-context"

/**
 * The applicant's side of their KYC ticket: where it stands, what amama
 * needs from them, every document with its upload history, and the
 * conversation with their KAM. Shown in place of every dashboard page
 * until approval, and at Verification for good.
 */
function ApplicantKycTicket({ role }: { role: OnboardingRole }) {
  const { t } = useI18n()
  const { applicationFor } = useVerification()
  const { draft } = useOnboarding()
  const labelOf = useDocumentLabel()
  const application = applicationFor(role)
  const [docId, setDocId] = React.useState<string | null>(null)
  const name = (role === "buyer" ? draft.buyer.fullName : draft.seller.fullName) || application?.fullName || "You"

  if (!application) {
    return (
      <StatusHeader
        icon={FileTextIcon}
        tone="bg-muted text-muted-foreground"
        title={t("review.notSubmittedTitle")}
        description={t("review.notSubmittedDescription")}
      >
        <Link href={`/${role}/onboarding/country`} className={cn(buttonVariants({ size: "lg" }), "mt-6")}>
          {t("review.finishOnboarding")}
        </Link>
      </StatusHeader>
    )
  }

  const status = application.reviewStatus
  const owed = application.documents.filter((document) => document.reviewStatus === "rejected" || document.reviewStatus === "missing")
  const labelForId = (id: string) => {
    const document = application.documents.find((entry) => entry.id === id)
    return document ? labelOf(document).label : null
  }

  const upload = (document: KycDocument) => (file: { name: string; size: number; fileId: string }) => {
    uploadDocumentVersion(role, application.userId, document.id, file, name)
    toast.success(`${labelOf(document).label} uploaded`)
  }

  const header =
    status === "approved"
      ? { icon: BadgeCheckIcon, tone: "bg-amama-subtle text-amama-deep", title: "You're verified", description: "Your KYC is approved. Everything below is kept on record." }
      : status === "changes-requested"
        ? { icon: AlertCircleIcon, tone: "bg-status-warning/15 text-status-warning", title: t("review.changesTitle"), description: t("review.changesDescription") }
        : { icon: HourglassIcon, tone: "bg-amama-subtle text-amama-deep", title: t("review.pendingTitle"), description: t("review.pendingDescription") }

  return (
    <div className="flex flex-col gap-5">
      <StatusHeader {...header}>
        <KycProgress
          ticket={kycTicketId(role, application.email)}
          stage={status === "approved" ? 2 : 0}
          needsAction={status === "changes-requested"}
          labels={[t("review.stepSubmitted"), t("review.stepReview"), t("review.stepVerified")]}
        />
      </StatusHeader>

      {application.reviewerNote ? (
        <blockquote className="rounded-2xl border border-status-warning/30 bg-status-warning/5 px-4 py-3 text-[14px] leading-relaxed">
          <span className="font-semibold">{application.reviewedByName ?? "Your KAM"}:</span> {application.reviewerNote}
        </blockquote>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-start">
        <div className="flex flex-col gap-5">
          {owed.length > 0 ? (
            <section aria-label="Needs your attention" className="overflow-hidden rounded-[20px] border border-status-warning/40 bg-card">
              <h2 className="border-b border-border bg-status-warning/5 px-4 py-3 text-[14px] font-semibold">
                Needs your attention · {owed.length}
              </h2>
              <ul className="divide-y divide-border">
                {owed.map((document) => (
                  <li key={document.id} className="flex flex-wrap items-start gap-3 px-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold">{labelOf(document).label}</p>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                        {document.reviewStatus === "missing"
                          ? `${document.requestedBy?.name ?? "Your KAM"} asked for this.${document.hint ? ` ${document.hint}.` : ""}`
                          : document.reviewNote ?? "Please upload this again."}
                      </p>
                    </div>
                    <UploadVersionButton documentId={document.id} label={document.versions.length > 0 ? "Upload new version" : "Upload"} onUploaded={upload(document)} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-label="Your documents" className="overflow-hidden rounded-[20px] border border-border bg-card">
            <h2 className="border-b border-border px-4 py-3 text-[14px] font-semibold">Your documents</h2>
            <ul className="divide-y divide-border">
              {application.documents.map((document) => {
                const current = document.versions.at(-1)
                const { label } = labelOf(document)
                const style = documentStatus[document.reviewStatus]
                return (
                  <li key={document.id} className="flex items-start gap-3 px-4 py-3">
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg",
                        document.reviewStatus === "approved" ? "bg-amama-subtle text-amama-deep" : "bg-muted text-muted-foreground"
                      )}
                    >
                      <FileTextIcon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold">
                        {label}
                        {document.required ? null : <span className="font-normal text-muted-foreground"> · optional</span>}
                      </p>
                      {current ? <FilePreview version={current} title={label} /> : <p className="text-[12px] text-muted-foreground">Not uploaded yet</p>}
                      <VersionHistory document={document} title={label} />
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <StatusPill tone={style.tone}>{style.label}</StatusPill>
                      {status !== "approved" && document.reviewStatus === "pending" ? (
                        <UploadVersionButton documentId={document.id} label="Replace" variant="quiet" onUploaded={upload(document)} />
                      ) : null}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>

        <section aria-label="Conversation with amama" className="overflow-hidden rounded-[20px] border border-border bg-card lg:sticky lg:top-20">
          <h2 className="border-b border-border px-4 py-3 text-[14px] font-semibold">Conversation</h2>
          <div className="max-h-[480px] overflow-y-auto">
            <Timeline comments={application.comments} labelFor={labelForId} viewer="applicant" />
          </div>
          {status !== "approved" ? (
            <Composer
              placeholder="Ask your KAM a question or explain an upload…"
              documents={application.documents.map((document) => ({ id: document.id, label: labelOf(document).label }))}
              docId={docId}
              onDocChange={setDocId}
              onSend={(text, about) => addApplicantComment(role, application.userId, text, about, name)}
            />
          ) : null}
        </section>
      </div>
    </div>
  )
}

function StatusHeader({
  icon: Icon,
  tone,
  title,
  description,
  children,
}: {
  icon: LucideIcon
  tone: string
  title: string
  description: string
  children?: React.ReactNode
}) {
  return (
    <header>
      <div className="flex items-start gap-4">
        <span aria-hidden className={cn("grid size-11 shrink-0 place-items-center rounded-full", tone)}>
          <Icon className="size-5" strokeWidth={2.25} />
        </span>
        <div className="min-w-0">
          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-balance">{title}</h1>
          <p className="mt-1 max-w-2xl text-[14.5px] leading-relaxed text-pretty text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </header>
  )
}

/** Submitted, in review, verified — with the ticket number either side
 *  can quote. */
function KycProgress({ ticket, stage, labels, needsAction }: { ticket: string; stage: number; labels: string[]; needsAction: boolean }) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl border border-border bg-card px-4 py-3">
      <p className="text-[12.5px] text-muted-foreground">
        Ticket <span className="font-mono font-medium text-foreground">{ticket}</span>
      </p>
      <ol className="grid min-w-[240px] flex-1 grid-cols-3 gap-2">
        {labels.map((label, index) => {
          const done = index <= stage
          const current = index === stage + 1
          return (
            <li key={label} className="flex flex-col gap-1.5">
              <span
                aria-hidden
                className={cn("h-1.5 rounded-full", done ? "bg-amama-deep" : current ? (needsAction ? "bg-status-warning" : "bg-amama/40") : "bg-border")}
              />
              <span className={cn("text-[12px]", done || current ? "font-medium text-foreground" : "text-muted-foreground")}>{label}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export { ApplicantKycTicket }
