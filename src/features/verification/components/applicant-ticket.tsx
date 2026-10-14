"use client"

import * as React from "react"
import Link from "next/link"
import { FileTextIcon, SendIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { COLUMN_HEIGHT } from "@/components/ui/column-card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useChatSelection } from "@/features/chat/chat-layout"
import { useOnboarding } from "@/features/onboarding/onboarding-context"
import type { OnboardingRole } from "@/features/onboarding/types"
import { DocumentsColumn } from "@/features/verification/components/applicant-documents"
import { TicketDetailColumn, TicketListColumn } from "@/features/verification/components/applicant-tickets"
import { formatBytes, useDocumentLabel } from "@/features/verification/components/kyc-ticket-parts"
import { UploadDocumentDialog, type PickedUpload } from "@/features/verification/components/upload-document-dialog"
import {
  addApplicantComment,
  discardDraftUpdate,
  stageDocumentUpdate,
  submitDraftUpdates,
  submitStartedApplication,
  uploadDocumentVersion,
  uploadTarget,
} from "@/features/verification/kyc-store"
import type { KycApplication } from "@/features/verification/kyc-types"
import { useVerification } from "@/features/verification/verification-context"

/**
 * The applicant's KYC, as full-height white columns like the chat:
 * Documents on the left — what's on file, what needs action, what's ready
 * to send — and the account's KYC tickets beside it, each opening into its
 * own column with the documents on it and the conversation with the KAM.
 * On a phone it's one column at a time. Shown in place of every dashboard
 * page until approval, and at Verification for good.
 */
function ApplicantKycTicket({ role }: { role: OnboardingRole }) {
  return (
    <React.Suspense fallback={null}>
      <KycWorkspace role={role} />
    </React.Suspense>
  )
}

function KycWorkspace({ role }: { role: OnboardingRole }) {
  const { applicationFor, isLoaded } = useVerification()
  const application = applicationFor(role)
  if (!isLoaded()) return null
  if (!application) return <NotStarted role={role} />
  return <Workspace role={role} application={application} />
}

function Workspace({ role, application }: { role: OnboardingRole; application: KycApplication }) {
  const { draft } = useOnboarding()
  const labelOf = useDocumentLabel()
  const { selectedId, select, clear } = useChatSelection("ticket")
  const [pane, setPane] = React.useState<"documents" | "tickets">("documents")
  const [uploadFor, setUploadFor] = React.useState<string | null>(null)
  const [finalising, setFinalising] = React.useState(false)
  const name = (role === "buyer" ? draft.buyer.fullName : draft.seller.fullName) || application.fullName || "You"
  const selected = application.tickets.find((ticket) => ticket.id === selectedId) ?? null
  const openTickets = application.tickets.filter((ticket) => ticket.status !== "resolved").length

  const switcher = (
    <ButtonGroup
      label="Show"
      size="sm"
      className="lg:hidden"
      value={pane}
      onChange={setPane}
      options={[
        { value: "documents", label: "Documents" },
        { value: "tickets", label: openTickets > 0 ? `Tickets · ${openTickets}` : "Tickets" },
      ]}
    />
  )

  const uploading = uploadFor ? application.documents.find((document) => document.id === uploadFor) ?? null : null
  const target = uploading ? uploadTarget(application, uploading.id) : null
  const staged = uploading ? application.drafts.find((entry) => entry.docId === uploading.id) : undefined
  const current = uploading?.versions.at(-1)

  const handleUpload = (upload: PickedUpload) => {
    if (!uploading || !target) return
    const { label } = labelOf(uploading)
    if (target.kind === "draft") {
      stageDocumentUpdate(role, application.userId, uploading.id, upload)
      toast.success(`${label} added to your changes`, { description: "Finalise & submit when you're done." })
      return
    }
    uploadDocumentVersion(role, application.userId, uploading.id, upload, name)
    toast.success(target.kind === "ticket" ? `${label} sent to ${target.ticket.id}` : `${label} saved`)
  }

  const finalise = (note: string) => {
    const id = submitDraftUpdates(role, application.userId, name, note)
    setFinalising(false)
    toast.success(id ? `Ticket ${id} raised` : "Changes submitted", { description: "Your KAM will review them." })
    if (id) {
      setPane("tickets")
      select(id)
    }
  }

  return (
    <div className={cn("flex gap-3", COLUMN_HEIGHT)}>
      <DocumentsColumn
        application={application}
        className={cn("flex-1", selected || pane === "tickets" ? "hidden lg:flex" : "flex")}
        switcher={switcher}
        onUpload={setUploadFor}
        onOpenTicket={(id) => {
          setPane("tickets")
          select(id)
        }}
        onFinalise={() => setFinalising(true)}
        onSubmitFirst={() => {
          submitStartedApplication(role, application.userId)
          toast.success("Sent for review")
        }}
        onDiscardDraft={(docId) => discardDraftUpdate(role, application.userId, docId)}
      />
      <TicketListColumn
        application={application}
        selectedId={selected?.id ?? null}
        onSelect={select}
        switcher={switcher}
        className={cn("w-full shrink-0 lg:w-[380px] 2xl:w-[340px]", selected ? "hidden 2xl:flex" : pane === "tickets" ? "flex" : "hidden lg:flex")}
      />
      {selected ? (
        <TicketDetailColumn
          key={selected.id}
          application={application}
          ticket={selected}
          className="flex w-full shrink-0 lg:w-[460px] xl:w-[520px] 2xl:w-[500px]"
          onBack={clear}
          onClose={clear}
          onUpload={setUploadFor}
          onSend={(text, docId) => addApplicantComment(role, application.userId, text, docId, name, selected.id)}
        />
      ) : null}

      {uploading && target ? (
        <UploadDocumentDialog
          open
          onOpenChange={(open) => !open && setUploadFor(null)}
          documentId={uploading.id}
          title={`${current || staged ? "Update" : "Upload"} ${labelOf(uploading).label}`}
          destination={
            target.kind === "ticket"
              ? `Goes straight to ${target.ticket.id} — ${target.ticket.assignee?.name ?? "your KAM"} reviews it next.`
              : target.kind === "direct"
                ? "Saved to your application. Submit everything for review when you're ready."
                : "Added to your changes. Nothing is sent until you finalise and submit."
          }
          context={
            uploading.reviewNote && uploading.reviewStatus !== "approved" ? (
              <>
                <span className="font-semibold">{uploading.requestedBy?.name ?? uploading.reviewedBy?.name ?? "Your KAM"}:</span> {uploading.reviewNote}
              </>
            ) : current ? (
              <span className="text-muted-foreground">
                Replaces <span className="font-medium text-foreground">{current.name}</span> (v{uploading.versions.length}, {formatBytes(current.size)}). The old copy stays on record.
              </span>
            ) : labelOf(uploading).hint ? (
              <span className="text-muted-foreground">{labelOf(uploading).hint}</span>
            ) : undefined
          }
          submitLabel={target.kind === "ticket" ? "Submit" : target.kind === "direct" ? "Save" : "Add to changes"}
          onSubmit={handleUpload}
        />
      ) : null}

      <FinaliseDialog application={application} open={finalising} onOpenChange={setFinalising} onSubmit={finalise} />
    </div>
  )
}

/** "Finalise & submit": the changes going in, an optional note for the
 *  KAM, and what happens next. */
function FinaliseDialog({
  application,
  open,
  onOpenChange,
  onSubmit,
}: {
  application: KycApplication
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (note: string) => void
}) {
  const labelOf = useDocumentLabel()
  const [note, setNote] = React.useState("")
  // Keep showing what was submitted while the dialog animates out.
  const [drafts, setDrafts] = React.useState(application.drafts)
  if (application.drafts.length > 0 && application.drafts !== drafts) setDrafts(application.drafts)
  const kam = application.tickets.find((ticket) => ticket.assignee?.id === application.assigneeId)?.assignee?.name

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setNote("")
        onOpenChange(next)
      }}
    >
      <DialogContent className="gap-5 sm:max-w-lg">
        <DialogHeader className="pe-10">
          <DialogTitle className="text-[19px] font-semibold tracking-[-0.02em]">Finalise & submit</DialogTitle>
          <DialogDescription className="text-[13px]">
            This raises a new KYC ticket{kam ? ` for ${kam}, your KAM,` : ""} to review. Your current documents stay valid until the new ones are approved.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-1.5">
          {drafts.map((entry) => {
            const document = application.documents.find((candidate) => candidate.id === entry.docId)
            if (!document) return null
            return (
              <li key={entry.docId} className="flex items-center gap-3 rounded-2xl bg-card px-3 py-2.5">
                <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-background text-amama-deep">
                  <FileTextIcon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold">{labelOf(document).label}</span>
                  <span className="block truncate text-[12px] text-muted-foreground">
                    {entry.version.name} · {formatBytes(entry.version.size)}
                  </span>
                </span>
                <span className="shrink-0 text-[12px] text-muted-foreground tabular-nums">v{document.versions.length + 1}</span>
              </li>
            )
          })}
        </ul>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold">
            Note for your KAM <span className="font-normal text-muted-foreground">(optional)</span>
          </span>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder="What changed — a renewed licence, a new bank account…"
            className="resize-none rounded-xl bg-card text-[13.5px]"
          />
        </label>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onSubmit(note)} disabled={application.drafts.length === 0}>
            <SendIcon />
            Submit {drafts.length} change{drafts.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Before onboarding is finished there's nothing to show but the way back. */
function NotStarted({ role }: { role: OnboardingRole }) {
  return (
    <section className={cn("flex flex-col items-center justify-center gap-3 rounded-[24px] bg-background p-8 text-center", COLUMN_HEIGHT)}>
      <span aria-hidden className="grid size-14 place-items-center rounded-full bg-card text-muted-foreground">
        <FileTextIcon className="size-6" />
      </span>
      <h1 className="text-[28px] font-semibold tracking-[-0.025em]">Finish onboarding first</h1>
      <p className="max-w-md text-[14.5px] leading-relaxed text-pretty text-muted-foreground">
        Your KYC starts with the documents step of onboarding. Once you submit them, everything about your verification lives here.
      </p>
      <Link href={`/${role}/onboarding/country`} className={cn(buttonVariants({ size: "lg" }), "mt-3")}>
        Continue onboarding
      </Link>
    </section>
  )
}

export { ApplicantKycTicket }
