"use client"

import * as React from "react"
import { ClipboardListIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CardProgress, CardShell, type CardTone } from "@/features/marketplace/chat-card-shell"
import { FormRequestDialog } from "@/features/marketplace/form-request-dialog"
import {
  cancelFormRequest,
  findFormRequest,
  formProgress,
  useFormRequests,
} from "@/features/marketplace/form-request-store"
import type { ChatParty } from "@/features/marketplace/conversation-store"

/**
 * The chat card for a `form-request` — conversation-scoped twin of
 * contracts' `RequestCard`, same shell and progress line, just reading
 * from `form-request-store.ts` instead of a contract's own requests list.
 */
function FormRequestCard({
  requestId,
  viewer,
  viewerName,
}: {
  requestId: string
  viewer: ChatParty
  viewerName: string
}) {
  useFormRequests() // subscribes so this re-renders as the request changes
  const [open, setOpen] = React.useState(false)
  const request = findFormRequest(requestId)
  if (!request) return null

  const progress = formProgress(request)
  const submitted = request.status === "submitted"
  const cancelled = request.status === "cancelled"
  const isRecipient = viewer === request.targetParty
  const isSender = request.createdBy === viewer
  const tone: CardTone = submitted ? "success" : "warning"

  return (
    <>
      <CardShell
        icon={ClipboardListIcon}
        tone={tone}
        title={request.title}
        subtitle={
          isRecipient
            ? submitted
              ? `Sent to ${request.createdByName}`
              : `${request.createdByName} needs these details`
            : `Asked of ${request.targetName}`
        }
        cancelled={cancelled && request.cancelledAt && request.cancelledBy ? { at: request.cancelledAt, byName: request.cancelledBy } : null}
        footer={
          <div className="flex flex-col gap-2">
            <Button
              size="sm"
              variant={submitted ? "outline" : "default"}
              onClick={() => setOpen(true)}
              className="w-full"
            >
              {submitted ? "View what was sent" : isRecipient ? "Fill this in" : "View progress"}
            </Button>
            {!submitted && isSender ? (
              <Button
                size="sm"
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => cancelFormRequest(request.id, viewerName)}
              >
                Cancel request
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="flex flex-col gap-2 rounded-2xl bg-muted p-3">
          <CardProgress done={progress.done} total={progress.total} label="done" />
          <p className="text-[12px] text-muted-foreground">
            {request.fields.length} {request.fields.length === 1 ? "question" : "questions"} ·{" "}
            {request.documents.length} {request.documents.length === 1 ? "document" : "documents"}
            {submitted ? "" : " · saves as you go"}
          </p>
        </div>
        {request.note ? (
          <p className="mt-2.5 rounded-2xl bg-muted px-3 py-2 text-[13px] leading-relaxed text-foreground">
            “{request.note}”
          </p>
        ) : null}
      </CardShell>

      <FormRequestDialog
        open={open}
        onOpenChange={setOpen}
        request={request}
        partyName={viewerName}
        readOnly={!isRecipient}
      />
    </>
  )
}

export { FormRequestCard }
