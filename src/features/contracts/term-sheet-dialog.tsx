"use client"

import * as React from "react"
import { CheckCircle2Icon, FileTextIcon, PaperclipIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  attachFile,
  removeFile,
  requestProgress,
  saveRequestDraft,
  submitRequest,
  type TermSheetField,
  type TermSheetRequest,
} from "@/features/contracts/contract-store"

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * One party's term-sheet form, opened from its card in the chat.
 *
 * Progressive by design: someone can fill two boxes, shut it, and pick the
 * rest up tomorrow. Submitting is a separate act from saving, and only
 * unlocks once everything marked required is actually there.
 */
function TermSheetDialog({
  open,
  onOpenChange,
  contractId,
  request,
  partyName,
  readOnly = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractId: string
  request: TermSheetRequest
  partyName: string
  /** The KAM opening someone else's form to see how far they've got. */
  readOnly?: boolean
}) {
  const locked = readOnly || request.status === "submitted"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{request.title}</DialogTitle>
          <DialogDescription>
            {request.status === "submitted"
              ? "Completed and sent to your account manager."
              : request.note ??
                "Fill in what you can — your answers are saved as you go, so you can come back to this any time."}
          </DialogDescription>
        </DialogHeader>

        {request.status === "submitted" ? (
          <div className="flex items-center gap-2 rounded-2xl bg-amama-subtle px-4 py-3 text-[13px] font-medium text-amama-deep">
            <CheckCircle2Icon className="size-4 shrink-0" />
            Submitted{request.submittedAt ? ` on ${new Date(request.submittedAt).toLocaleDateString()}` : ""}.
          </div>
        ) : null}

        {/* Mounted only while open: a fresh mount reads whatever has been
            saved so far through `useState` initializers, so there's no
            effect racing to reset the fields each time it reopens. */}
        {open ? (
          <RequestFields
            contractId={contractId}
            request={request}
            partyName={partyName}
            locked={locked}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function RequestFields({
  contractId,
  request,
  partyName,
  locked,
  onClose,
}: {
  contractId: string
  request: TermSheetRequest
  partyName: string
  locked: boolean
  onClose: () => void
}) {
  const [values, setValues] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(request.fields.map((field) => [field.id, field.value ?? ""]))
  )

  // Whatever has been typed is written when this goes away — by the Save
  // button, by Escape, or by the close X. Saving on unmount covers all
  // three at once, so no exit path can silently drop someone's work.
  const latest = React.useRef(values)
  React.useEffect(() => {
    latest.current = values
  }, [values])

  React.useEffect(() => {
    if (locked) return
    return () => {
      saveRequestDraft(contractId, request.id, latest.current)
    }
  }, [contractId, request.id, locked])

  const progress = requestProgress(request)

  return (
    <>
      <div className="flex flex-col gap-4">
        {request.fields.length > 0 ? (
          <section className="flex flex-col gap-3">
            {request.fields.map((field) => (
              <FieldInput
                key={field.id}
                field={field}
                value={values[field.id] ?? ""}
                disabled={locked}
                onChange={(value) => setValues((current) => ({ ...current, [field.id]: value }))}
              />
            ))}
          </section>
        ) : null}

        {request.documents.length > 0 ? (
          <section className="flex flex-col gap-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Documents
            </p>
            {request.documents.map((document) => (
              <div key={document.id} className="rounded-2xl border border-border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-foreground">
                      {document.label}
                      {document.required ? <span className="text-destructive"> *</span> : null}
                    </p>
                    {document.help ? (
                      <p className="mt-0.5 text-[12px] text-muted-foreground">{document.help}</p>
                    ) : null}
                  </div>
                  {locked ? null : (
                    <label className="shrink-0 cursor-pointer rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-muted">
                      <PaperclipIcon className="me-1 inline size-3.5" />
                      Add file
                      <input
                        type="file"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) {
                            attachFile(contractId, request.id, document.id, {
                              name: file.name,
                              size: file.size,
                            })
                          }
                          // Let the same file be picked again after a remove.
                          event.target.value = ""
                        }}
                      />
                    </label>
                  )}
                </div>

                {document.files.length > 0 ? (
                  <ul className="mt-2.5 flex flex-col gap-1.5">
                    {document.files.map((file) => (
                      <li
                        key={file.id}
                        className="flex items-center gap-2 rounded-xl bg-muted px-2.5 py-2 text-[12px]"
                      >
                        <FileTextIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{file.name}</span>
                        <span className="shrink-0 text-muted-foreground">{formatBytes(file.size)}</span>
                        {locked ? null : (
                          <button
                            type="button"
                            aria-label={`Remove ${file.name}`}
                            onClick={() => removeFile(contractId, request.id, document.id, file.id)}
                            className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-card hover:text-destructive"
                          >
                            <XIcon className="size-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </section>
        ) : null}
      </div>

      {locked ? null : (
        <DialogFooter>
          <div className="flex w-full flex-col gap-2.5">
            <p className="text-[12px] text-muted-foreground">
              {progress.complete
                ? "Everything required is in — you can send this to your account manager."
                : `${progress.total - progress.done} required ${
                    progress.total - progress.done === 1 ? "item" : "items"
                  } still to go. Save now and finish later if you need to.`}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Save &amp; close
              </Button>
              <Button
                className="flex-1"
                disabled={!progress.complete}
                onClick={() => {
                  saveRequestDraft(contractId, request.id, values)
                  submitRequest(contractId, request.id, partyName)
                  onClose()
                }}
              >
                Submit
              </Button>
            </div>
          </div>
        </DialogFooter>
      )}
    </>
  )
}

function FieldInput({
  field,
  value,
  disabled,
  onChange,
}: {
  field: TermSheetField
  value: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", disabled && "opacity-70")}>
      <span className="text-[13px] font-medium text-foreground">
        {field.label}
        {field.required ? <span className="text-destructive"> *</span> : null}
      </span>
      {field.help ? <span className="-mt-1 text-[12px] text-muted-foreground">{field.help}</span> : null}

      {field.type === "select" ? (
        <Select value={value || null} onValueChange={(next) => onChange(next ?? "")} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="Choose one" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : field.type === "textarea" ? (
        <Textarea
          rows={3}
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  )
}

export { TermSheetDialog, formatBytes }
