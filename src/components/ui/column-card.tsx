"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** The page below the topbar and above the shell's bottom inset — the
 *  same height the chat columns fill, so a list or record page reads as
 *  one card that scrolls itself. */
const COLUMN_HEIGHT = "h-[calc(100dvh-72px)] sm:h-[calc(100dvh-76px)]"

/** Inside a white column card, blocks that sat white-on-mist turn mist so
 *  they still read as groups. */
const OnWhiteContext = React.createContext(false)

function OnWhite({ children }: { children: React.ReactNode }) {
  return <OnWhiteContext.Provider value>{children}</OnWhiteContext.Provider>
}

function useOnWhite() {
  return React.useContext(OnWhiteContext)
}

/** The fill a grouped block takes: white on the mist page, mist inside a
 *  white card. */
function useBlockFill() {
  return useOnWhite() ? "bg-card" : "bg-background"
}

/**
 * A list page as one white column, like the chat list: the title (and
 * whatever switches sit beside it) in the card's header, an optional
 * toolbar, then the rows scrolling inside.
 */
function ColumnCard({
  title,
  heading,
  action,
  toolbar,
  children,
  className,
}: {
  title: string
  /** Replaces the visible title — a search field, say. `title` stays as
   *  the page's accessible name. With a heading slot the action is for
   *  wide screens only; the heading carries its own phone controls. */
  heading?: React.ReactNode
  action?: React.ReactNode
  toolbar?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <OnWhite>
      <section aria-label={title} className={cn("flex min-w-0 flex-col overflow-hidden rounded-[24px] bg-background p-2", COLUMN_HEIGHT, className)}>
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-3 pt-1 pb-3">
          {heading ? (
            <>
              <h1 className="sr-only">{title}</h1>
              <div className="min-w-[min(100%,15rem)] flex-1">{heading}</div>
            </>
          ) : (
            <h1 className="text-[28px] font-semibold tracking-[-0.025em]">{title}</h1>
          )}
          {action ? <div className={cn(heading && "max-sm:hidden")}>{action}</div> : null}
        </header>
        {toolbar ? <div className="-mt-1 shrink-0 px-3 pb-2.5">{toolbar}</div> : null}
        {/* The header stays put and the rows scroll under it — an inset
            hairline marks where one ends and the other begins. */}
        <div aria-hidden className="mx-3 h-px shrink-0 bg-border" />
        <div data-scroll-root className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto rounded-[16px] bg-background p-1.5">
          {children}
        </div>
      </section>
    </OnWhite>
  )
}

export type Crumb = { label: string; href: string }

/** Where you are, in small type above the heading: Marketplace › Apple ›
 *  Each step is a way back, and the trail ends in a chevron because the
 *  heading beneath it is the next step. */
function RecordCrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex items-center gap-1 overflow-hidden text-[11.5px] leading-none whitespace-nowrap text-muted-foreground">
        {crumbs.map((crumb, index) => (
          <li key={`${crumb.href}-${index}`} className="flex min-w-0 shrink-0 items-center gap-1 last:shrink">
            <Link href={crumb.href} className="truncate transition-colors hover:text-foreground">
              {crumb.label}
            </Link>
            <ChevronRightIcon aria-hidden className="size-3 shrink-0 text-muted-foreground/60 rtl:-scale-x-100" />
          </li>
        ))}
      </ol>
    </nav>
  )
}

/**
 * One record's page in the same white column: back to the list, the
 * record's name and state, an inset hairline, then the record scrolling
 * inside.
 */
function DetailColumnCard({
  backHref,
  backLabel,
  title,
  meta,
  status,
  crumbs,
  action,
  children,
}: {
  backHref: string
  backLabel: string
  title: React.ReactNode
  meta?: React.ReactNode
  status?: React.ReactNode
  /** The trail above the heading. */
  crumbs?: Crumb[]
  /** Controls that belong to the heading — a sort, a filter — kept above
   *  the divider; on a phone they drop to their own row. */
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <OnWhite>
      <section className={cn("flex min-w-0 flex-col overflow-hidden rounded-[24px] bg-background p-2", COLUMN_HEIGHT)}>
        <header className="flex shrink-0 flex-wrap items-center gap-x-2.5 gap-y-2.5 px-2 pt-1.5 pb-3">
          <Link
            href={backHref}
            aria-label={`Back to ${backLabel.toLowerCase()}`}
            title={backLabel}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-foreground/75 transition-colors hover:bg-muted"
          >
            <ChevronLeftIcon aria-hidden className="size-5 rtl:-scale-x-100" />
          </Link>
          <div className="min-w-0 flex-1">
            {crumbs?.length ? <RecordCrumbs crumbs={crumbs} /> : null}
            <h1 className={cn("truncate font-semibold tracking-[-0.02em]", crumbs?.length ? "mt-1 text-[20px] leading-tight" : "text-[17px] leading-tight")}>{title}</h1>
            {meta ? <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{meta}</p> : null}
          </div>
          {status ? <div className="shrink-0 ps-2">{status}</div> : null}
          {action ? <div className="max-sm:order-last max-sm:w-full sm:shrink-0 sm:ps-2">{action}</div> : null}
        </header>
        <div aria-hidden className="mx-3 h-px shrink-0 bg-border" />
        <div data-scroll-root className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 pt-3 pb-2">
          {children}
        </div>
      </section>
    </OnWhite>
  )
}

export { COLUMN_HEIGHT, ColumnCard, DetailColumnCard, OnWhite, RecordCrumbs, useBlockFill, useOnWhite }
