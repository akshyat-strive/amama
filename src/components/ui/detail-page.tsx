"use client"

import * as React from "react"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeftIcon, ChevronRightIcon } from "lucide-react"

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

/** A record's own page inside a section: back to the list, where you are,
 *  then the record in a mist frame. Replaces the old side sheets. */
function DetailPage({
  backLabel,
  onBack,
  trail,
  children,
}: {
  backLabel: string
  onBack: () => void
  trail: string[]
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-input bg-background px-3 text-[13.5px] font-medium hover:bg-card"
        >
          <ArrowLeftIcon className="size-4 rtl:-scale-x-100" />
          {backLabel}
        </button>
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-[14px]">
            {trail.map((step, index) => (
              <li key={`${step}-${index}`} className="flex items-center gap-1">
                {index > 0 ? <ChevronRightIcon aria-hidden className="size-3.5 text-muted-foreground/70" /> : null}
                <span className={index === trail.length - 1 ? "font-medium text-foreground" : "text-muted-foreground"}>{step}</span>
              </li>
            ))}
          </ol>
        </nav>
      </div>
      <div className="mt-4 rounded-[24px] bg-background p-2">
        <div className="rounded-[16px] bg-background p-4 sm:p-6">{children}</div>
      </div>
    </div>
  )
}

export { DetailPage, useDetailRoute }
