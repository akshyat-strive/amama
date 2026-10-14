"use client"

import * as React from "react"
import { CalendarIcon, FileTextIcon, ImageIcon, Loader2Icon, RefreshCwIcon, UploadCloudIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { constraintFor, defaultConstraint, describeAccept, describeMaxSize, type DocumentId } from "@/features/documents/documents"
import { putFile } from "@/features/local-db/file-store"
import { formatBytes } from "@/features/verification/components/kyc-ticket-parts"

export type PickedUpload = { name: string; size: number; fileId: string; expiresAt: string | null }

/**
 * Uploading one KYC document, in two steps: drop a file (or browse for
 * one), then check it — an image previews inline, a PDF shows its name and
 * size — with the option to swap it or add an expiry date before
 * submitting. The bytes only go to IndexedDB on submit, so a cancelled
 * pick leaves nothing behind.
 */
function UploadDocumentDialog({
  open,
  onOpenChange,
  documentId,
  title,
  context,
  destination,
  submitLabel,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentId: string
  title: string
  /** Why it's needed — the KAM's request, or what it replaces. */
  context?: React.ReactNode
  /** Where it ends up, said plainly under the title. */
  destination: string
  submitLabel: string
  onSubmit: (upload: PickedUpload) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-lg">
        {open ? (
          <UploadSteps
            documentId={documentId}
            title={title}
            context={context}
            destination={destination}
            submitLabel={submitLabel}
            onCancel={() => onOpenChange(false)}
            onSubmit={(upload) => {
              onSubmit(upload)
              onOpenChange(false)
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/** Mounted only while the dialog is open, so every opening starts fresh. */
function UploadSteps({
  documentId,
  title,
  context,
  destination,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  documentId: string
  title: string
  context?: React.ReactNode
  destination: string
  submitLabel: string
  onCancel: () => void
  onSubmit: (upload: PickedUpload) => void
}) {
  const constraint = documentId.startsWith("extra-") ? defaultConstraint : constraintFor(documentId as DocumentId)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [picked, setPicked] = React.useState<{ file: File; previewUrl: string | null } | null>(null)
  const file = picked?.file ?? null
  const previewUrl = picked?.previewUrl ?? null
  const [error, setError] = React.useState<string | null>(null)
  const [dragging, setDragging] = React.useState(false)
  const [expiresAt, setExpiresAt] = React.useState("")
  const [busy, setBusy] = React.useState(false)

  // An image's preview URL lives as long as that pick.
  React.useEffect(() => {
    const url = picked?.previewUrl
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [picked])

  const pick = (next: File | undefined) => {
    if (!next) return
    if (!constraint.accept.includes(next.type)) {
      setError(`That's not a file we can take — upload a ${describeAccept(constraint)}.`)
      return
    }
    if (next.size > constraint.maxBytes) {
      setError(`That file is ${formatBytes(next.size)} — the limit is ${describeMaxSize(constraint)}.`)
      return
    }
    setError(null)
    setPicked({ file: next, previewUrl: next.type.startsWith("image/") ? URL.createObjectURL(next) : null })
  }

  const submit = async () => {
    if (!file) return
    setBusy(true)
    try {
      const fileId = await putFile(file)
      onSubmit({ name: file.name, size: file.size, fileId, expiresAt: expiresAt ? new Date(`${expiresAt}T00:00:00`).toISOString() : null })
    } catch {
      setError("Couldn't save that file in this browser. Try again, or use a smaller file.")
      setBusy(false)
    }
  }

  const step = file ? 2 : 1

  return (
    <>
      <DialogHeader className="pe-10">
        <DialogTitle className="text-[19px] font-semibold tracking-[-0.02em]">{title}</DialogTitle>
        <DialogDescription className="text-[13px]">{destination}</DialogDescription>
      </DialogHeader>

      <ol aria-label="Steps" className="grid grid-cols-2 gap-2">
        {["Choose a file", "Check & submit"].map((label, index) => {
          const done = index + 1 < step
          const current = index + 1 === step
          return (
            <li key={label} className="flex flex-col gap-1.5" aria-current={current ? "step" : undefined}>
              <span aria-hidden className={cn("h-1 rounded-full", done || current ? "bg-amama-deep" : "bg-muted")} />
              <span className={cn("text-[12px]", current ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {index + 1}. {label}
              </span>
            </li>
          )
        })}
      </ol>

      {context ? <div className="rounded-2xl bg-card px-3.5 py-3 text-[13px] leading-relaxed">{context}</div> : null}

      <input
        ref={inputRef}
        type="file"
        accept={constraint.accept.join(",")}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          pick(event.target.files?.[0])
          event.target.value = ""
        }}
      />

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            pick(event.dataTransfer.files?.[0])
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed px-6 py-10 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-amama-deep/40",
            dragging ? "border-amama-deep bg-amama-subtle" : "border-border bg-card hover:border-amama-deep/50"
          )}
        >
          <span aria-hidden className={cn("grid size-12 place-items-center rounded-full transition-colors", dragging ? "bg-amama-deep text-white" : "bg-background text-amama-deep")}>
            <UploadCloudIcon className="size-6" />
          </span>
          <span>
            <span className="block text-[15px] font-semibold">{dragging ? "Drop it here" : "Drag a file here"}</span>
            <span className="mt-0.5 block text-[13px] text-muted-foreground">
              or <span className="font-semibold text-amama-deep underline underline-offset-2">browse your files</span>
            </span>
          </span>
          <span className="text-[12px] text-muted-foreground">
            {describeAccept(constraint)} · up to {describeMaxSize(constraint)}
          </span>
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="overflow-hidden rounded-[20px] bg-card">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt={`Preview of ${file.name}`} className="max-h-72 w-full bg-muted object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 px-6 py-8">
                <span aria-hidden className="grid size-14 place-items-center rounded-2xl bg-background text-destructive">
                  <FileTextIcon className="size-7" />
                </span>
                <span className="text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">PDF document</span>
              </div>
            )}
            <div className="flex items-center gap-3 px-3.5 py-3">
              <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-xl bg-background text-muted-foreground">
                {file.type.startsWith("image/") ? <ImageIcon className="size-4" /> : <FileTextIcon className="size-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold">{file.name}</span>
                <span className="block text-[12px] text-muted-foreground">
                  {(file.type.split("/")[1] ?? "file").toUpperCase()} · {formatBytes(file.size)}
                </span>
              </span>
              <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={busy}>
                <RefreshCwIcon />
                Replace
              </Button>
              <button
                type="button"
                onClick={() => setPicked(null)}
                disabled={busy}
                aria-label="Remove this file"
                className="grid size-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          </div>

          <label className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl bg-card px-3.5 py-2.5">
            <CalendarIcon aria-hidden className="size-4 text-muted-foreground" />
            <span className="me-auto text-[13px]">
              Valid until <span className="text-muted-foreground">(if it expires)</span>
            </span>
            <input
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="h-9 rounded-xl bg-background px-2.5 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-amama-deep/30"
            />
          </label>
        </div>
      )}

      {error ? (
        <p role="alert" className="rounded-2xl bg-destructive/10 px-3.5 py-2.5 text-[13px] text-destructive">
          {error}
        </p>
      ) : null}

      <DialogFooter className="gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={() => void submit()} disabled={!file || busy}>
          {busy ? <Loader2Icon className="animate-spin" /> : null}
          {submitLabel}
        </Button>
      </DialogFooter>
    </>
  )
}

export { UploadDocumentDialog }
