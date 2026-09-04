"use client"

import * as React from "react"
import { AlertCircleIcon, CheckCircle2Icon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * An iOS Settings–style grouped list: one rounded, hairline-bordered
 * container holding several label/value rows separated by dividers, instead
 * of each field getting its own separate box.
 */
function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "divide-y divide-border overflow-hidden rounded-2xl border border-border bg-transparent",
        className
      )}
      {...props}
    />
  )
}

/**
 * One row: an inline label to the start, the control filling the rest.
 *
 * Deliberately has no focus ring — the group's own rounded border is the
 * boundary, and a ring inside it would double up on that framing rather than
 * clarify anything. Focus is instead a quiet background tint on the row
 * itself via `has-[:focus]:`, which needs no JS.
 */
function FieldGroupRow({
  label,
  htmlFor,
  children,
  className,
}: {
  label: React.ReactNode
  htmlFor: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 transition-colors has-[:focus]:bg-muted/50",
        className
      )}
    >
      <label
        htmlFor={htmlFor}
        className="w-24 shrink-0 text-[15px] font-medium text-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  )
}

const fieldGroupInputClassName =
  "min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] text-foreground outline-none placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0"

/** A bare `<input>` pre-styled to sit inside a `FieldGroupRow`. */
function FieldGroupInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input className={cn(fieldGroupInputClassName, className)} {...props} />
  )
}

/**
 * A trailing "this is fine" / "this needs another look" icon for a
 * `FieldGroupRow`, e.g. live email validation. Every time `status` changes
 * it swaps to a freshly-mounted icon (via `key`), which is what makes the
 * blur/scale entrance replay on every change rather than only once.
 */
function FieldStatusIcon({ status }: { status: "valid" | "invalid" | null }) {
  if (!status) return null
  return <AnimatedStatusIcon key={status} status={status} />
}

function AnimatedStatusIcon({ status }: { status: "valid" | "invalid" }) {
  const [shown, setShown] = React.useState(false)

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const Icon = status === "valid" ? CheckCircle2Icon : AlertCircleIcon

  return (
    <Icon
      aria-hidden
      className={cn(
        "size-5 shrink-0 transition-[filter,transform,opacity] duration-300 ease-out motion-reduce:transition-none motion-reduce:blur-none motion-reduce:scale-100 motion-reduce:opacity-100",
        status === "valid" ? "text-status-success" : "text-status-warning",
        shown ? "scale-100 opacity-100 blur-none" : "scale-50 opacity-0 blur-sm"
      )}
    />
  )
}

export {
  FieldGroup,
  FieldGroupRow,
  FieldGroupInput,
  FieldStatusIcon,
  fieldGroupInputClassName,
}
