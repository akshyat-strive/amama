"use client"

import * as React from "react"
import { DownloadIcon, EyeIcon, FileTextIcon, HistoryIcon, Loader2Icon, SendIcon, UploadIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import type { Tone } from "@/features/admin/review-ui"
import { constraintFor, defaultConstraint, describeAccept, describeMaxSize, documentText, type DocumentId } from "@/features/documents/documents"
import { useI18n } from "@/features/i18n/i18n-context"
import { fileObjectUrl, putFile } from "@/features/local-db/file-store"
import type { DocumentReviewStatus, DocumentVersion, KycComment, KycDocument, ReviewStatus } from "@/features/verification/kyc-types"

export const applicationStatus: Record<ReviewStatus, { label: string; tone: Tone }> = {
  "not-submitted": { label: "Not submitted", tone: "neutral" },
  pending: { label: "In review", tone: "warning" },
  "changes-requested": { label: "Waiting on applicant", tone: "danger" },
  approved: { label: "Approved", tone: "success" },
}

export const documentStatus: Record<DocumentReviewStatus, { label: string; tone: Tone }> = {
  missing: { label: "Requested", tone: "info" },
  pending: { label: "In review", tone: "neutral" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Sent back", tone: "danger" },
}

/** A document's name — the catalog's translated label, or the label the
 *  KAM typed for one they asked for. */
function useDocumentLabel() {
  const { t } = useI18n()
  return React.useCallback((document: Pick<KycDocument, "id" | "label" | "hint">) => {
    if (document.label) return { label: document.label, hint: document.hint ?? "" }
    return documentText(document.id, t)
  }, [t])
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(new Date(iso))
}

/** Opens one stored upload — an image inline, a PDF in the browser's own
 *  viewer — fetched from IndexedDB only when the dialog opens. */
function FilePreview({ version, title, trigger }: { version: DocumentVersion; title: string; trigger?: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [url, setUrl] = React.useState<string | null>(null)
  const [type, setType] = React.useState<string>("")

  React.useEffect(() => {
    if (!open || !version.fileId) return
    let cancelled = false
    let created: string | null = null
    void fileObjectUrl(version.fileId).then(async (objectUrl) => {
      if (cancelled || !objectUrl) return
      created = objectUrl
      const blob = await fetch(objectUrl).then((response) => response.blob())
      if (cancelled) return
      setType(blob.type)
      setUrl(objectUrl)
    })
    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
      setUrl(null)
    }
  }, [open, version.fileId])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        disabled={!version.fileId}
        className="group/file inline-flex max-w-full items-center gap-1 text-[12px] text-muted-foreground outline-none hover:text-foreground focus-visible:underline disabled:pointer-events-none"
      >
        {trigger ?? (
          <>
            <span className="truncate underline decoration-border underline-offset-2 group-hover/file:decoration-foreground/40">{version.name}</span>
            <span className="shrink-0">· {formatBytes(version.size)}</span>
            {version.fileId ? <EyeIcon aria-hidden className="size-3.5 shrink-0" /> : null}
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate">{title}</DialogTitle>
        </DialogHeader>
        {!url ? (
          <div className="flex h-60 items-center justify-center text-[13px] text-muted-foreground">
            <Loader2Icon className="me-2 size-4 animate-spin" /> Opening…
          </div>
        ) : type.startsWith("image/") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={title} className="max-h-[65vh] w-full rounded-2xl border border-border object-contain" />
        ) : (
          <iframe src={url} title={title} className="h-[65vh] w-full rounded-2xl border border-border" />
        )}
        <DialogFooter>
          <a href={url ?? undefined} download={version.name} className={cn(buttonVariants({ variant: "outline" }), !url && "pointer-events-none opacity-50")}>
            <DownloadIcon className="size-4" />
            Download
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Every upload of one document, newest first — shown until approval
 *  keeps only the final one. */
function VersionHistory({ document, title }: { document: KycDocument; title: string }) {
  const [open, setOpen] = React.useState(false)
  if (document.versions.length < 2) return null
  const versions = [...document.versions].reverse()
  return (
    <div className="mt-1.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1 rounded-full text-[12px] font-medium text-muted-foreground hover:text-foreground"
      >
        <HistoryIcon aria-hidden className="size-3.5" />
        {document.versions.length} versions
      </button>
      {open ? (
        <ol className="mt-1.5 flex flex-col gap-1 border-s-2 border-border ps-3">
          {versions.map((version, index) => (
            <li key={version.id} className="flex flex-wrap items-center gap-x-2 text-[12px]">
              <span className={cn("font-semibold tabular-nums", index === 0 ? "text-foreground" : "text-muted-foreground")}>
                v{document.versions.length - index}
              </span>
              <FilePreview version={version} title={`${title} · v${document.versions.length - index}`} />
              <span className="text-muted-foreground">· {timeAgo(version.uploadedAt)}</span>
              {index === 0 ? <span className="rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">Current</span> : null}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  )
}

/** Picks a file, checks it, stores it in IndexedDB and hands back the
 *  version to record. */
function UploadVersionButton({
  documentId,
  label,
  onUploaded,
  variant = "primary",
}: {
  documentId: string
  label: string
  onUploaded: (file: { name: string; size: number; fileId: string }) => void
  variant?: "primary" | "quiet"
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [busy, setBusy] = React.useState(false)
  const constraint = documentId.startsWith("extra-") ? defaultConstraint : constraintFor(documentId as DocumentId)

  const handle = async (file: File | undefined) => {
    if (!file) return
    if (!constraint.accept.includes(file.type)) {
      toast.error(`Upload a ${describeAccept(constraint)} file`)
      return
    }
    if (file.size > constraint.maxBytes) {
      toast.error(`That file is over ${describeMaxSize(constraint)}`)
      return
    }
    setBusy(true)
    try {
      const fileId = await putFile(file)
      onUploaded({ name: file.name, size: file.size, fileId })
    } catch {
      toast.error("Couldn't save that file in this browser")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={constraint.accept.join(",")}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          void handle(event.target.files?.[0])
          event.target.value = ""
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-colors disabled:opacity-50",
          variant === "primary" ? "bg-amama-deep text-white hover:bg-amama-deep/90" : "border border-border bg-background text-foreground hover:bg-muted"
        )}
      >
        {busy ? <Loader2Icon aria-hidden className="size-3.5 animate-spin" /> : <UploadIcon aria-hidden className="size-3.5" />}
        {label}
      </button>
    </>
  )
}

/** The ticket's timeline: both sides' messages and what happened, oldest
 *  first, each tied to its document where it has one. */
function Timeline({
  comments,
  labelFor,
  viewer,
}: {
  comments: KycComment[]
  labelFor: (docId: string) => string | null
  viewer: "staff" | "applicant"
}) {
  if (comments.length === 0) return <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">Nothing here yet.</p>
  return (
    <ol className="flex flex-col gap-3 px-4 py-4">
      {comments.map((entry) => {
        const docLabel = entry.docId ? labelFor(entry.docId) : null
        if (entry.author.kind === "system") {
          return (
            <li key={entry.id} className="flex items-center gap-2 ps-1 text-[12px] text-muted-foreground">
              <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-border" />
              <span className="min-w-0">
                {entry.text}
                {docLabel && !entry.text.includes(docLabel) ? <> · {docLabel}</> : null}
                <span className="text-muted-foreground/70"> · {timeAgo(entry.at)}</span>
              </span>
            </li>
          )
        }
        const mine = entry.author.kind === viewer
        return (
          <li key={entry.id} className={cn("flex gap-2.5", mine && "flex-row-reverse")}>
            <span
              aria-hidden
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                entry.author.kind === "staff" ? "bg-amama-deep text-white" : "bg-muted text-foreground/75"
              )}
            >
              {entry.author.name.trim().charAt(0).toUpperCase()}
            </span>
            <div className={cn("min-w-0 max-w-[85%]", mine && "items-end text-end")}>
              <p className="text-[11.5px] text-muted-foreground">
                <span className="font-semibold text-foreground">{entry.author.name}</span>
                {entry.author.title ? ` · ${entry.author.title}` : entry.author.kind === "staff" ? " · amama" : ""} · {timeAgo(entry.at)}
              </p>
              <div
                className={cn(
                  "mt-1 inline-block rounded-2xl px-3 py-2 text-start text-[13.5px] leading-relaxed",
                  entry.author.kind === "staff" ? "bg-amama-subtle text-foreground" : "bg-muted text-foreground"
                )}
              >
                {docLabel ? (
                  <span className="mb-1 flex items-center gap-1 text-[11.5px] font-semibold text-muted-foreground">
                    <FileTextIcon aria-hidden className="size-3" />
                    {docLabel}
                  </span>
                ) : null}
                {entry.text}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** A message box with an optional "about which document" picker. */
function Composer({
  placeholder,
  documents,
  docId,
  onDocChange,
  onSend,
}: {
  placeholder: string
  documents: { id: string; label: string }[]
  docId: string | null
  onDocChange: (docId: string | null) => void
  onSend: (text: string, docId: string | null) => void
}) {
  const [text, setText] = React.useState("")
  const send = () => {
    if (!text.trim()) return
    onSend(text.trim(), docId)
    setText("")
  }
  return (
    <div className="border-t border-border p-3">
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) send()
        }}
        rows={2}
        placeholder={placeholder}
        className="min-h-16 resize-none rounded-xl border-border bg-card text-[13.5px]"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <label className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted-foreground">
          About
          <select
            value={docId ?? ""}
            onChange={(event) => onDocChange(event.target.value || null)}
            className="h-8 max-w-[220px] truncate rounded-full border border-border bg-background px-2.5 text-[12.5px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-amama-deep/30"
          >
            <option value="">The whole application</option>
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={!text.trim()}
          onClick={send}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-[12.5px] font-semibold text-background transition-opacity disabled:opacity-40"
        >
          <SendIcon aria-hidden className="size-3.5" />
          Send
        </button>
      </div>
    </div>
  )
}

export { useDocumentLabel, FilePreview, VersionHistory, UploadVersionButton, Timeline, Composer }
