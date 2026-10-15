"use client"

import * as React from "react"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { COLUMN_HEIGHT, OnWhite, useOnWhite } from "@/components/ui/column-card"

/**
 * Which record a list page has open, as a real address: a nested route
 * segment (`/contracts/[contractId]`) when the page has one, otherwise a
 * query parameter. Opening is a navigation, so back returns to the list.
 */
function useDetailRoute({ segment, query }: { segment?: string; query: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const params = useParams<Record<string, string | undefined>>()
  const fromPath = segment ? params[segment] : undefined
  const selectedId = fromPath ? decodeURIComponent(fromPath) : searchParams.get(query)
  const base = fromPath ? pathname.slice(0, pathname.lastIndexOf("/")) : pathname

  const withQuery = (next: Record<string, string | null>) => {
    const search = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value === null) search.delete(key)
      else search.set(key, value)
    }
    const text = search.toString()
    return text ? `?${text}` : ""
  }

  return {
    selectedId,
    open: (id: string) =>
      router.push(segment ? `${base}/${encodeURIComponent(id)}${withQuery({ [query]: null })}` : `${base}${withQuery({ [query]: id })}`, { scroll: true }),
    close: () => router.push(`${base}${withQuery({ [query]: null })}`, { scroll: false }),
  }
}

/** A record's own page inside a section, in the same full-height white
 *  column as the chat and order pages: back to the list, the record's
 *  name (the last step of the trail) and state, an inset hairline, then
 *  the record scrolling inside. Replaces the old side sheets. */
function DetailPage({
  backLabel,
  onBack,
  trail,
  meta,
  status,
  children,
}: {
  backLabel: string
  onBack: () => void
  trail: string[]
  meta?: React.ReactNode
  status?: React.ReactNode
  children: React.ReactNode
}) {
  const title = trail[trail.length - 1] ?? backLabel
  // Every step before the record is a way back, in small type above it —
  // the same trail the marketplace's record pages carry.
  const crumbs = trail.slice(0, -1)
  // Already inside a white column (a list embedded in another page's
  // card): no second card, just the header and the record.
  const embedded = useOnWhite()
  const back = (
    <button
      type="button"
      onClick={onBack}
      aria-label={`Back to ${backLabel.toLowerCase()}`}
      title={backLabel}
      className="grid size-9 shrink-0 place-items-center rounded-xl text-foreground/75 transition-colors hover:bg-muted"
    >
      <ChevronLeftIcon aria-hidden className="size-5 rtl:-scale-x-100" />
    </button>
  )
  if (embedded) {
    return (
      <div>
        <div className="flex items-center gap-2.5 px-1 pb-3">
          {back}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[17px] leading-tight font-semibold tracking-[-0.02em]">{title}</h2>
            {meta ? <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{meta}</p> : null}
          </div>
          {status ? <div className="shrink-0 ps-2">{status}</div> : null}
        </div>
        <div aria-hidden className="mx-2 h-px bg-border" />
        <div className="px-2 pt-4 pb-2">{children}</div>
      </div>
    )
  }
  return (
    <OnWhite>
      <section aria-label={title} className={cn("flex min-w-0 flex-col overflow-hidden rounded-[24px] bg-background p-2", COLUMN_HEIGHT)}>
        <header className="flex shrink-0 items-center gap-2.5 px-2 pt-1.5 pb-3">
          {back}
          <div className="min-w-0 flex-1">
            {crumbs.length ? (
              <nav aria-label="Breadcrumb" className="min-w-0">
                <ol className="flex items-center gap-1 overflow-hidden text-[11.5px] leading-none whitespace-nowrap text-muted-foreground">
                  {crumbs.map((crumb, index) => (
                    <li key={`${crumb}-${index}`} className="flex min-w-0 shrink-0 items-center gap-1 last:shrink">
                      {index === 0 ? (
                        <button type="button" onClick={onBack} className="truncate transition-colors hover:text-foreground">
                          {crumb}
                        </button>
                      ) : (
                        <span className="truncate">{crumb}</span>
                      )}
                      <ChevronRightIcon aria-hidden className="size-3 shrink-0 text-muted-foreground/60 rtl:-scale-x-100" />
                    </li>
                  ))}
                </ol>
              </nav>
            ) : null}
            <h1 className={cn("truncate leading-tight font-semibold tracking-[-0.02em]", crumbs.length ? "mt-1 text-[20px]" : "text-[17px]")}>{title}</h1>
            {meta ? <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{meta}</p> : null}
          </div>
          {status ? <div className="shrink-0 ps-2">{status}</div> : null}
        </header>
        <div aria-hidden className="mx-3 h-px shrink-0 bg-border" />
        <div data-scroll-root className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pt-4 pb-3 sm:px-4">
          {children}
        </div>
      </section>
    </OnWhite>
  )
}

export { DetailPage, useDetailRoute }
