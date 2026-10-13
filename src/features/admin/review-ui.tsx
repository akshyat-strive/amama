"use client"

import * as React from "react"
import { CheckIcon, RotateCcwIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * One reviewable thing as an island: a muted shell carrying the header,
 * and a white tray inside it whose rows are separated by hairlines — the
 * same material as the sidebar groups and the topbar controls.
 */
function ReviewGroup({
  header,
  children,
  className,
}: {
  header?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-[22px] border border-border bg-muted p-1", className)}>
      {header ? <div className="px-3 pt-2 pb-2.5 sm:px-3.5">{header}</div> : null}
      <div className="divide-y divide-border overflow-hidden rounded-[18px] border border-border bg-card">{children}</div>
    </section>
  )
}

type Tone = "neutral" | "warning" | "success" | "danger" | "info"

const TONES: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  warning: "bg-status-warning/12 text-status-warning",
  success: "bg-amama-subtle text-amama-deep",
  danger: "bg-destructive/10 text-destructive",
  info: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
}

/** A status as a dot and a word — quieter than a filled badge. */
function StatusPill({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-semibold whitespace-nowrap",
        TONES[tone],
        className
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}

/** Just the tick — filled once it's done, an outline invite until then. */
function ApproveButton({
  label,
  done = false,
  disabled = false,
  onClick,
}: {
  label: string
  done?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            onClick={onClick}
            disabled={disabled || done}
            aria-label={done ? `${label} — done` : label}
            aria-pressed={done}
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-full border transition-[background-color,border-color,color,transform] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-amama-deep/40 active:scale-[0.94]",
              done
                ? "border-amama-deep bg-amama-deep text-white"
                : "border-border bg-card text-foreground/70 hover:border-amama-deep hover:bg-amama-subtle hover:text-amama-deep disabled:pointer-events-none disabled:opacity-40"
            )}
          />
        }
      >
        <CheckIcon aria-hidden className="size-4" strokeWidth={2.75} />
      </TooltipTrigger>
      <TooltipContent side="top">{done ? `${label} — done` : label}</TooltipContent>
    </Tooltip>
  )
}

function RequestAgainButton({
  active = false,
  disabled = false,
  label = "Request again",
  onClick,
}: {
  active?: boolean
  disabled?: boolean
  label?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-expanded={active}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-amama-deep/40 disabled:pointer-events-none disabled:opacity-40",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-card text-foreground hover:bg-muted"
      )}
    >
      <RotateCcwIcon aria-hidden className={cn("size-3.5 transition-transform duration-300", active && "-rotate-180")} />
      {label}
    </button>
  )
}

/** The note that goes with a "request again", opened in place under the
 *  row it's about rather than in a dialog. */
function RequestNote({
  id,
  prompt,
  placeholder,
  submitLabel = "Send request",
  required = true,
  onSubmit,
  onCancel,
}: {
  id: string
  prompt: string
  placeholder: string
  submitLabel?: string
  required?: boolean
  onSubmit: (note: string) => void
  onCancel: () => void
}) {
  const [note, setNote] = React.useState("")
  const ref = React.useRef<HTMLTextAreaElement>(null)
  React.useEffect(() => ref.current?.focus(), [])
  const ready = !required || note.trim().length > 0

  return (
    <div className="flex flex-col gap-2 bg-muted/50 px-4 py-3">
      <label htmlFor={id} className="text-[12px] font-semibold text-foreground">
        {prompt}
      </label>
      <Textarea
        ref={ref}
        id={id}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCancel()
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && ready) onSubmit(note.trim())
        }}
        placeholder={placeholder}
        rows={2}
        className="border-border bg-card"
      />
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-8 rounded-full px-3 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={() => onSubmit(note.trim())}
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-[12.5px] font-semibold text-background transition-opacity disabled:opacity-40"
        >
          <RotateCcwIcon aria-hidden className="size-3.5" />
          {submitLabel}
        </button>
      </div>
    </div>
  )
}

/** A reviewer's note already on record, shown under the row it's about. */
function RowNote({ tone = "danger", children }: { tone?: "danger" | "neutral" | "warning"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "px-4 py-2 text-[12.5px]",
        tone === "danger" && "bg-destructive/[0.06] text-destructive",
        tone === "warning" && "bg-status-warning/10 text-foreground",
        tone === "neutral" && "bg-muted/60 text-muted-foreground"
      )}
    >
      {children}
    </div>
  )
}

function Initials({ name, className }: { name: string; className?: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full border border-border bg-card text-[12px] font-bold text-foreground/75",
        className
      )}
    >
      {initials}
    </span>
  )
}

export { ApproveButton, Initials, RequestAgainButton, RequestNote, ReviewGroup, RowNote, StatusPill }
export type { Tone }
