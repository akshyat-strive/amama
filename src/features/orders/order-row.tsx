import * as React from "react"
import Link from "next/link"
import { ChevronRightIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** Wide rows split into columns once the list itself is wide enough —
 *  measured on the list (a container query), not the window, so an open
 *  sidebar can't push the columns past the card's edge. */
const WIDE_COLUMNS = "@3xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_5rem_minmax(0,9rem)_minmax(0,7rem)_1rem]"

/** The column labels above a list of `OrderRow`s, shown only when the
 *  rows have room for columns. */
function OrderRowsHeader({ counterparty }: { counterparty: string }) {
  return (
    <div className={cn("hidden gap-4 px-3 pt-1 pb-2 text-[11.5px] text-muted-foreground @3xl:grid", WIDE_COLUMNS)}>
      <span>Order</span>
      <span>{counterparty}</span>
      <span>Quantity</span>
      <span>Status</span>
      <span>Date</span>
      <span />
    </div>
  )
}

/** A list of order rows, inset hairlines between them. */
function OrderRows({ counterparty, children }: { counterparty: string; children: React.ReactNode }) {
  return (
    <div className="@container">
      <OrderRowsHeader counterparty={counterparty} />
      <ul>{children}</ul>
    </div>
  )
}

/**
 * One order in a list: what and which, who it's with, how much, where it
 * stands, when, and a chevron into its page. On a narrow list the middle
 * columns fold into the second line.
 */
function OrderRow({
  href,
  title,
  orderId,
  counterparty,
  quantity,
  status,
  stage,
  when,
  whenClassName,
  signals,
}: {
  href: string
  title: string
  orderId: string
  counterparty: string
  quantity: string
  /** The status pill. */
  status: React.ReactNode
  /** Where it is, under the pill. */
  stage?: string
  when: string
  whenClassName?: string
  /** Small warning icons beside the id. */
  signals?: React.ReactNode
}) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "chat-row grid grid-cols-[minmax(0,1fr)_auto_1rem] items-center gap-x-4 gap-y-0.5 rounded-xl px-3 py-3 transition-colors [--row-inset:0.75rem] hover:bg-card",
          WIDE_COLUMNS
        )}
      >
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-semibold text-foreground">{title}</span>
          <span className="flex min-w-0 items-center gap-2 text-[12px] text-muted-foreground">
            <span className="truncate">
              <span className="font-mono text-[11.5px] tabular-nums">{orderId}</span>
              <span className="@3xl:hidden">
                {" "}
                · {quantity} · {counterparty}
              </span>
            </span>
            {signals}
          </span>
        </span>
        <span className="hidden min-w-0 truncate text-[13px] text-foreground @3xl:block" title={counterparty}>
          {counterparty}
        </span>
        <span className="hidden truncate text-[13px] text-foreground tabular-nums @3xl:block">{quantity}</span>
        <span className="flex min-w-0 flex-col items-end gap-0.5 @3xl:items-start">
          {status}
          {stage ? <span className="hidden max-w-full truncate text-[11.5px] text-muted-foreground @3xl:block">{stage}</span> : null}
        </span>
        <span className={cn("hidden truncate text-[12.5px] text-muted-foreground tabular-nums @3xl:block", whenClassName)}>{when}</span>
        <ChevronRightIcon aria-hidden className="size-4 text-muted-foreground rtl:-scale-x-100" />
      </Link>
    </li>
  )
}

export { OrderRow, OrderRows }
