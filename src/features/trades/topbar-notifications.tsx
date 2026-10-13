"use client"

import * as React from "react"
import Link from "next/link"
import { BellIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import * as W from "@/features/tradechain/demo-world"
import { useLiveWorld } from "@/features/tradechain/live-world"
import { tradesFor, type TradePerspective } from "@/features/trades/trade-access"
import { formatStamp } from "@/features/trades/trade-format"

const READ_KEY = "amama.notifications.read"

/** Roles whose alerts are internal housekeeping (margins, KYC of other
 *  parties, desk escalations) rather than something a buyer or seller
 *  acts on. */
const INTERNAL_ONLY: W.InternalRoleId[] = ["finance", "compliance", "master-kam", "master-admin", "admin"]

const LEVEL_DOT: Record<W.Severity, string> = {
  INFO: "bg-muted-foreground/40",
  ACTION: "bg-foreground",
  WARNING: "bg-status-warning",
  CRITICAL: "bg-destructive",
  URGENT: "bg-destructive",
}

const listeners = new Set<() => void>()
let cachedRaw: string | null = null
let cachedIds: Set<string> = new Set()
const EMPTY: Set<string> = new Set()

function readSnapshot(): Set<string> {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(READ_KEY)
  } catch {
    return EMPTY
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw
    try {
      cachedIds = new Set(JSON.parse(raw ?? "[]") as string[])
    } catch {
      cachedIds = new Set()
    }
  }
  return cachedIds
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function markRead(ids: string[]) {
  try {
    window.localStorage.setItem(READ_KEY, JSON.stringify([...new Set([...readSnapshot(), ...ids])]))
  } catch {
    // Best-effort.
  }
  listeners.forEach((listener) => listener())
}

/** The alerts raised on this viewer's own trades, newest first, with an
 *  unread count. "Read" is a per-browser convenience, nothing more. */
function TopbarNotifications({ perspective, email, basePath }: { perspective: TradePerspective; email: string; basePath: string }) {
  const read = React.useSyncExternalStore(subscribe, readSnapshot, () => EMPTY)
  // Actions on a trade raise notifications of their own.
  const world = useLiveWorld()

  const items = React.useMemo(() => {
    const ids = new Set(tradesFor(perspective, email).map((trade) => trade.id))
    return W.NOTIFICATIONS.filter(
      (notification) =>
        notification.tradeId !== null &&
        ids.has(notification.tradeId) &&
        (perspective === "internal" || !INTERNAL_ONLY.includes(notification.ownerRole))
    ).sort((a, b) => b.at.localeCompare(a.at))
    // `world` is the live-world version: the list is re-read when it moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perspective, email, world])

  const unread = items.filter((item) => !item.read && !read.has(item.id)).length

  const markAll = () => markRead(items.map((item) => item.id))

  return (
    <Popover>
      <PopoverTrigger
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative grid size-8 shrink-0 place-items-center rounded-full bg-muted/70 text-foreground/80 transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <BellIcon aria-hidden className="size-4" />
        {unread > 0 ? (
          <span className="absolute -end-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold text-white tabular-nums">
            {unread}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p className="text-[13px] font-semibold text-foreground">Notifications</p>
          {unread > 0 ? (
            <button type="button" onClick={markAll} className="text-[12px] font-medium text-amama-deep hover:underline">
              Mark all read
            </button>
          ) : null}
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">Nothing new</p>
        ) : (
          <ul className="max-h-[22rem] divide-y divide-border overflow-y-auto">
            {items.map((item) => {
              const isUnread = !item.read && !read.has(item.id)
              return (
                <li key={item.id}>
                  <Link href={`${basePath}/${item.tradeId}`} className="flex gap-3 px-4 py-2.5 transition-colors hover:bg-muted">
                    <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", LEVEL_DOT[item.level])} />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-[13px] leading-snug", isUnread ? "font-semibold text-foreground" : "text-foreground/80")}>{item.title}</span>
                      <span className="block text-[11.5px] text-muted-foreground tabular-nums">
                        {item.tradeId} · {formatStamp(item.at)}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}

export { TopbarNotifications }
