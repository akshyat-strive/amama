"use client"

import * as React from "react"
import {
  Expand,
  FileCheck2,
  RefreshCw,
  UploadCloud,
  X,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  constraintFor,
  describeAccept,
  describeMaxSize,
  type DocumentId,
} from "@/features/documents/documents"
import { useI18n } from "@/features/i18n/i18n-context"

/** ponytail: never store the raw `File` — a data URL under `PREVIEW_CAP_BYTES`
 *  instead, so a KAM reviewing from a completely different tab/session can
 *  actually see and download what was uploaded (the `File` object itself
 *  can't cross that boundary — `document-draft-store.ts`/`verification-
 *  context.tsx` are `sessionStorage`/`localStorage`, plain strings only).
 *  Above the cap, `dataUrl` is left `undefined` and review just shows name
 *  + size with no preview — a real build would swap this for actual
 *  storage (S3, a blob endpoint) with no size ceiling at all. */
export type UploadedFile = { name: string; size: number; dataUrl?: string }

/** However generous `constraintFor`'s own per-document limit is (up to
 *  10 MB), a base64 data URL runs ~33% larger than the file itself, and
 *  several of these land in the one shared `localStorage` quota every
 *  other store on the origin uses too — so the preview cap is deliberately
 *  much tighter than the upload cap. */
const PREVIEW_CAP_BYTES = 2 * 1024 * 1024

function readAsDataUrl(file: File): Promise<string | undefined> {
  if (file.size > PREVIEW_CAP_BYTES) return Promise.resolve(undefined)
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : undefined)
    reader.onerror = () => resolve(undefined)
    reader.readAsDataURL(file)
  })
}

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; file: File; progress: number }
  | { status: "uploaded"; file: File; previewUrl: string | null; dataUrl?: string }
  /** Seeded from a previous visit — the applicant picked this file before
   *  (this session or an earlier one), but the real `File` couldn't survive
   *  a reload, so there's no in-page preview, only the name, size, and
   *  (if it was under the cap) the data URL that were saved alongside it.
   *  Behaves like `uploaded` everywhere it's rendered. */
  | { status: "restored"; name: string; size: number; dataUrl?: string }

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Replace / remove, in the two treatments they need: floating over an
 *  image preview, or sitting quietly beside a file row. */
function ActionButton({
  onClick,
  label,
  icon: Glyph,
  tone,
}: {
  onClick: () => void
  label: string
  icon: LucideIcon
  tone: "overlay" | "plain"
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "grid place-items-center rounded-full outline-none transition-colors",
        tone === "overlay"
          ? "size-6 bg-black/55 text-white hover:bg-black/75 focus-visible:ring-2 focus-visible:ring-white"
          : "size-7 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <Glyph className="size-3.5" />
    </button>
  )
}

/**
 * There's no backend behind any of this yet — "uploading" is a timed
 * simulation, not a real request. It exists so the interaction (drag a
 * file, watch it process, get a preview, swap it out) can be designed and
 * tried now rather than blocked on that backend existing first.
 *
 * The file checks, though, are real: `accept` only filters the OS picker
 * and does nothing at all for a dragged file, so type and size are both
 * re-checked here against the same central constraint the attribute came
 * from.
 */
function DocumentUploadCard({
  documentId,
  label,
  hint,
  required,
  icon: Icon,
  initialFile = null,
  onChange,
}: {
  documentId: DocumentId
  label: string
  hint: string
  required: boolean
  icon: LucideIcon
  /** A file already on record for this document — from an earlier visit
   *  this session, an earlier session (a saved draft), or a document a KAM
   *  already approved. Seeds the card straight into its "done" state
   *  instead of making the applicant redo work that's already saved. */
  initialFile?: UploadedFile | null
  onChange?: (file: UploadedFile | null) => void
}) {
  const { t } = useI18n()
  const inputId = React.useId()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [state, setState] = React.useState<UploadState>(() =>
    initialFile
      ? { status: "restored", name: initialFile.name, size: initialFile.size, dataUrl: initialFile.dataUrl }
      : { status: "idle" }
  )
  const [dragging, setDragging] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const constraint = constraintFor(documentId)
  const maxSize = describeMaxSize(constraint)

  // Covers the one case the lazy initializer above can't: `initialFile`
  // arriving *after* this card has already mounted idle — restoring from
  // `localStorage` only resolves once React has hydrated, one render later
  // than this component's own first paint. Queued as a microtask rather
  // than set synchronously in the effect body (same trick `StepDots` uses
  // for its own post-mount state flip) — deferring means it's a reaction to
  // that late arrival, not an effect re-deriving state React already had.
  // Guarded to `idle` only, so it can never clobber a file the visitor is
  // actively picking or has already picked in this same session.
  React.useEffect(() => {
    if (!initialFile) return
    queueMicrotask(() => {
      setState((current) =>
        current.status === "idle"
          ? { status: "restored", name: initialFile.name, size: initialFile.size, dataUrl: initialFile.dataUrl }
          : current
      )
    })
  }, [initialFile])

  // `onChange` is called from an effect rather than inline so the parent
  // hears about the upload finishing on a timer, which no click handler
  // covers. Deliberately one-directional — it only ever reports a file
  // *arriving* (freshly uploaded, or restored from a previous visit), never
  // an absence. Reporting "nothing here" from this same effect would fire
  // the instant this card mounts idle, before the restoration effect above
  // has had a chance to run — and against a store that persists what it's
  // told (`useDocumentDraft`), that transient "nothing yet" would be read
  // as "the applicant removed this document" and overwrite the real save.
  // A removal is a real user action instead: `remove()` below reports it
  // directly, synchronously with the click.
  const onChangeRef = React.useRef(onChange)
  React.useEffect(() => {
    onChangeRef.current = onChange
  })
  React.useEffect(() => {
    if (state.status === "uploaded") {
      onChangeRef.current?.({ name: state.file.name, size: state.file.size, dataUrl: state.dataUrl })
    } else if (state.status === "restored") {
      onChangeRef.current?.({ name: state.name, size: state.size, dataUrl: state.dataUrl })
    }
  }, [state])

  // Advances the simulated progress a random, uneven amount every tick — a
  // perfectly linear fill reads as fake in a way an uneven one doesn't. The
  // transition to "uploaded" happens inside the same timer callback rather
  // than as a separate synchronous branch in the effect body, so every
  // `setState` here runs from a callback reacting to the timer, not from
  // the effect's own execution.
  React.useEffect(() => {
    if (state.status !== "uploading") return
    const timeout = setTimeout(() => {
      setState((prev) => {
        if (prev.status !== "uploading") return prev
        const progress = Math.min(100, prev.progress + 10 + Math.random() * 18)
        if (progress < 100) return { ...prev, progress }
        const isImage = prev.file.type.startsWith("image/")
        return {
          status: "uploaded",
          file: prev.file,
          previewUrl: isImage ? URL.createObjectURL(prev.file) : null,
        }
      })
    }, 150)
    return () => clearTimeout(timeout)
  }, [state])

  // Reads the file into a data URL once it's actually "uploaded" — kept out
  // of the timer above so a slow read never delays the progress bar itself.
  // Guarded so a stale read landing after the visitor replaced or removed
  // the file can't attach itself to the wrong one.
  React.useEffect(() => {
    if (state.status !== "uploaded" || state.dataUrl !== undefined) return
    const { file } = state
    let cancelled = false
    readAsDataUrl(file).then((dataUrl) => {
      if (cancelled || !dataUrl) return
      setState((prev) => (prev.status === "uploaded" && prev.file === file ? { ...prev, dataUrl } : prev))
    })
    return () => {
      cancelled = true
    }
  }, [state])

  // The object URL is only ever referenced by this one card, so it's this
  // card's job to release it — both when swapped for a new file and on
  // unmount, not just one or the other.
  React.useEffect(() => {
    return () => {
      if (state.status === "uploaded" && state.previewUrl) {
        URL.revokeObjectURL(state.previewUrl)
      }
    }
  }, [state])

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    if (!constraint.accept.includes(file.type)) {
      setError(t("onboarding.documents.wrongType", { types: describeAccept(constraint) }))
      return
    }
    if (file.size > constraint.maxBytes) {
      setError(t("onboarding.documents.tooLarge", { size: maxSize }))
      return
    }
    setError(null)
    setState({ status: "uploading", file, progress: 0 })
  }

  const remove = () => {
    setError(null)
    setState({ status: "idle" })
    onChange?.(null)
  }
  const replace = () => inputRef.current?.click()

  const fileInfo =
    state.status === "uploaded"
      ? { name: state.file.name, size: state.file.size }
      : state.status === "restored"
        ? { name: state.name, size: state.size }
        : null

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="mb-2.5 flex items-start gap-2.5">
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-foreground/70"
        >
          <Icon className="size-4" strokeWidth={2.25} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-foreground">
            {label}
            {/* A required field is marked the way a form field normally is —
                a trailing asterisk, not a separate badge competing with the
                uploaded-file details for the same small strip of space. */}
            {required ? (
              <span aria-hidden className="text-destructive">
                {" "}
                *
              </span>
            ) : null}
            {required ? <span className="sr-only"> ({t("onboarding.documents.requiredLabel")})</span> : null}
          </p>
          <p className="truncate text-[12px] text-muted-foreground">{hint}</p>
        </div>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={constraint.accept.join(",")}
        className="sr-only"
        onChange={(event) => {
          handleFiles(event.target.files)
          // Without this, picking the same file twice in a row (upload,
          // remove, re-pick) wouldn't fire onChange the second time.
          event.target.value = ""
        }}
      />

      {state.status === "idle" ? (
        <label
          htmlFor={inputId}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            handleFiles(event.dataTransfer.files)
          }}
          className={cn(
            "flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-center transition-colors",
            dragging
              ? "border-amama-deep bg-amama-subtle"
              : "border-border hover:border-muted-foreground/40 hover:bg-muted/40"
          )}
        >
          <UploadCloud aria-hidden className="size-4.5 text-muted-foreground" />
          <span className="px-2 text-[12px] font-medium text-muted-foreground">
            {t("onboarding.documents.dropHint")}
          </span>
          <span className="px-2 text-[11px] text-muted-foreground/80">
            {describeAccept(constraint)} · {t("onboarding.documents.upTo", { size: maxSize })}
          </span>
        </label>
      ) : null}

      {state.status === "uploading" ? (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(state.progress)}
          aria-label={t("onboarding.documents.uploading", { file: state.file.name })}
          className="upload-aurora relative flex h-24 items-center justify-center overflow-hidden rounded-xl"
        >
          <span className="relative z-10 text-[24px] font-bold tracking-tight text-white tabular-nums [text-shadow:0_1px_10px_rgb(0_0_0_/_0.4)]">
            {Math.round(state.progress)}%
          </span>
        </div>
      ) : null}

      {state.status === "uploaded" && state.previewUrl ? (
        <div className="relative h-24 overflow-hidden rounded-xl bg-muted">
          <Dialog>
            <DialogTrigger
              render={
                <button
                  type="button"
                  aria-label={t("onboarding.documents.enlarge")}
                  className="group absolute inset-0 cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                />
              }
            >
              {/* A local blob: preview of a file the visitor just picked —
                  not a remote asset, so this skips next/image's optimizer
                  entirely rather than fighting its remote-source
                  assumptions. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.previewUrl}
                alt={label}
                className="absolute inset-0 size-full object-cover"
              />
              <span
                aria-hidden
                className="absolute inset-0 grid place-items-center bg-black/0 text-white/0 transition-all group-hover:bg-black/35 group-hover:text-white"
              >
                <Expand className="size-5" />
              </span>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogTitle className="text-[15px]">{label}</DialogTitle>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={state.previewUrl}
                alt={label}
                className="max-h-[70vh] w-full rounded-2xl object-contain"
              />
              <p className="text-[12px] text-muted-foreground">
                {state.file.name} · {formatBytes(state.file.size)}
              </p>
            </DialogContent>
          </Dialog>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-2 pt-5 pb-1.5">
            <span className="truncate text-[11px] font-medium text-white">
              {state.file.name}
            </span>
            <span className="shrink-0 text-[10px] text-white/85">
              {formatBytes(state.file.size)}
            </span>
          </div>
          <div className="absolute end-1.5 top-1.5 flex gap-1">
            <ActionButton
              onClick={replace}
              label={t("onboarding.documents.replace")}
              icon={RefreshCw}
              tone="overlay"
            />
            <ActionButton
              onClick={remove}
              label={t("onboarding.documents.remove")}
              icon={X}
              tone="overlay"
            />
          </div>
        </div>
      ) : null}

      {(state.status === "uploaded" && !state.previewUrl) || state.status === "restored" ? (
        <div className="flex h-24 items-center gap-2.5 rounded-xl border border-border bg-muted/40 px-3">
          <span
            aria-hidden
            className="grid size-8 shrink-0 place-items-center rounded-full bg-amama-subtle text-amama-deep"
          >
            <FileCheck2 className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-foreground">
              {fileInfo!.name}
            </p>
            <p className="text-[11px] text-muted-foreground">{formatBytes(fileInfo!.size)}</p>
          </div>
          <div className="flex shrink-0 gap-1">
            <ActionButton
              onClick={replace}
              label={t("onboarding.documents.replace")}
              icon={RefreshCw}
              tone="plain"
            />
            <ActionButton
              onClick={remove}
              label={t("onboarding.documents.remove")}
              icon={X}
              tone="plain"
            />
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-[12px] text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export { DocumentUploadCard }
