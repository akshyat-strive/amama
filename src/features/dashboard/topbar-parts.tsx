"use client"

import type * as React from "react"
import Link from "next/link"

import { cn } from "@/lib/utils"
import { AmamaWordmark } from "@/components/brand/amama-wordmark"

const BAR =
  "absolute top-0 left-0 h-[2px] w-[18px] origin-left rounded-full bg-current transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"

/**
 * Three bars that are two different drawings. Collapsed, they are staggered
 * like a gantt chart and straighten into a full menu on hover — "open me".
 * Expanded, they fold into a left arrow that nudges left on hover —
 * "put me away". Transforms only, so the morph stays on the compositor.
 */
function SidebarGlyph({ open }: { open: boolean }) {
  return (
    <span aria-hidden className="relative block h-3.5 w-[18px]">
      <span
        className={cn(
          BAR,
          open
            ? "[transform:translate(0,6px)_rotate(-40deg)_scaleX(0.5)] group-hover:[transform:translate(-2px,6px)_rotate(-40deg)_scaleX(0.5)]"
            : "[transform:translate(0,0)_scaleX(0.56)] group-hover:[transform:translate(0,0)_scaleX(1)]"
        )}
      />
      <span
        className={cn(
          BAR,
          open
            ? "[transform:translate(0,6px)_scaleX(1)] group-hover:[transform:translate(-2px,6px)_scaleX(0.8)]"
            : "[transform:translate(4px,6px)_scaleX(0.78)] group-hover:[transform:translate(0,6px)_scaleX(1)]"
        )}
      />
      <span
        className={cn(
          BAR,
          open
            ? "[transform:translate(0,6px)_rotate(40deg)_scaleX(0.5)] group-hover:[transform:translate(-2px,6px)_rotate(40deg)_scaleX(0.5)]"
            : "[transform:translate(2px,12px)_scaleX(0.44)] group-hover:[transform:translate(0,12px)_scaleX(1)]"
        )}
      />
    </span>
  )
}

/** Sits exactly over the sidebar rail — same left inset (12px) and, from
 *  `md` up, the same width as the collapsed rail card — so the toggle and
 *  the sidebar read as one column. */
function SidebarToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? "Collapse navigation" : "Expand navigation"}
      aria-pressed={open}
      className={cn(
        "group grid size-11 shrink-0 place-items-center rounded-full md:w-[54px]",
        "border border-amama-foreground bg-amama text-amama-foreground shadow-sm",
        "transition-[background-color,color,transform] duration-200 hover:bg-amama-hover hover:text-white active:scale-[0.96]",
        "outline-none focus-visible:ring-2 focus-visible:ring-amama-deep/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
    >
      <SidebarGlyph open={open} />
    </button>
  )
}

/** The wordmark, and — where it adds something — which side of the
 *  platform this is, set as a quiet sub-brand after a hairline rule rather
 *  than a badge. */
function TopbarBrand({ href, role }: { href: string; role?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Link href={href} aria-label="amama home" className="text-amama-deep">
        <AmamaWordmark />
      </Link>
      {role ? (
        <>
          <span aria-hidden className="hidden h-4 w-px bg-foreground/15 sm:block" />
          <span className="hidden truncate text-[11px] leading-none font-semibold tracking-[0.18em] text-foreground/55 uppercase sm:block">
            {role}
          </span>
        </>
      ) : null}
    </div>
  )
}

/** The right-hand controls as one island, built like a sidebar group: a
 *  striped outer shell carrying the only shadow, a white inner tray, and
 *  flat items inside it. */
function TopbarActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="ms-auto rounded-full border border-border bg-muted bg-[repeating-linear-gradient(-45deg,var(--surface-border)_0px,var(--surface-border)_1px,transparent_1px,transparent_7px)] p-[3px] shadow-lg">
      <div className="flex items-center gap-1 rounded-full bg-card p-0.5">{children}</div>
    </div>
  )
}

export { SidebarToggle, TopbarActions, TopbarBrand }
