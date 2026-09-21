"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { usePeek } from "@/features/internal/peek-context"
import { resolveEntity, type EntityKind, type EntityRef } from "@/features/tradechain/demo-world"

/**
 * The single way an entity id is rendered anywhere in the internal product.
 *
 * Every trade number, lot id, container number, document name, person,
 * buyer, seller, RFQ, quote, term sheet and PO goes through this. That is
 * what makes the whole thing feel joined up: if it looks like an id, it
 * opens. An id that does not resolve renders as plain text rather than a
 * dead link — so a typo is visible rather than silently clickable.
 */
function EntityLink({
  kind,
  id,
  children,
  className,
  mono = true,
}: {
  kind: EntityKind
  id: string
  children?: React.ReactNode
  className?: string
  /** Ids are monospaced by default; names (a person, a company) are not. */
  mono?: boolean
}) {
  const { open } = usePeek()
  const ref: EntityRef = React.useMemo(() => ({ kind, id }), [kind, id])
  const resolved = React.useMemo(() => resolveEntity(ref), [ref])
  const label = children ?? resolved?.title ?? id

  if (!resolved) {
    return <span className={cn(mono && "font-mono text-[12px]", className)}>{label}</span>
  }

  return (
    <button
      type="button"
      onClick={() => open(ref)}
      title={`${resolved.title} — ${resolved.subtitle}`}
      className={cn(
        "inline text-start underline decoration-dotted underline-offset-[3px] transition-colors hover:text-amama-deep focus-visible:text-amama-deep focus-visible:outline-none",
        mono && "font-mono text-[12px] tracking-tight tabular-nums",
        className
      )}
    >
      {label}
    </button>
  )
}

/** A chip form for attachments and inline references, where the link needs
 *  to read as an object rather than as text in a sentence. */
function EntityChip({
  kind,
  id,
  label,
  icon: Icon,
  className,
}: {
  kind: EntityKind
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}) {
  const { open } = usePeek()
  const resolved = resolveEntity({ kind, id })

  return (
    <button
      type="button"
      disabled={!resolved}
      onClick={() => open({ kind, id })}
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[12px] font-medium text-foreground transition-colors",
        resolved ? "hover:bg-amama-subtle hover:text-amama-deep" : "opacity-60",
        className
      )}
    >
      {Icon ? <Icon className="size-3.5 shrink-0 text-muted-foreground" /> : null}
      <span className="truncate">{label}</span>
    </button>
  )
}

export { EntityLink, EntityChip }
