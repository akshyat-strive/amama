"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronLeftIcon, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** The page below the topbar (80px) and above the shell's bottom inset
 *  (none on a phone, 12px from `sm`) — the chat fills exactly that, and
 *  each column scrolls itself. */
const FULL_HEIGHT = "h-[calc(100dvh-80px)] sm:h-[calc(100dvh-92px)]"

/**
 * Which conversation is open lives in the URL (`?conversation=`), so on a
 * phone "open a chat" is a real navigation: the browser's back gesture
 * returns to the list, and a link can open a thread directly.
 */
function useChatSelection(param = "conversation") {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get(param)

  const href = (id: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (id) params.set(param, id)
    else params.delete(param)
    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  return {
    selectedId,
    select: (id: string) => router.push(href(id), { scroll: false }),
    clear: () => router.replace(href(null), { scroll: false }),
  }
}

/**
 * The messaging layout every role shares, modelled on Google Chat and
 * Spotify's panels.
 *
 * Desktop: next to the app's sidebar, the chat list — its own card, with
 * a "Chats" header and its own scroll — takes the full width. Opening a
 * conversation brings in a third card, the message window, with its own
 * header for who it's with and what can be done; the list narrows to a
 * column to make room.
 *
 * Phone (< 768px): one column. The list is page one; opening a
 * conversation drills into page two, whose header carries a back button.
 */
function ChatLayout({
  title = "Chats",
  listAction,
  list,
  open,
  windowHeader,
  windowActions,
  windowBody,
  onClose,
  heightClassName = FULL_HEIGHT,
}: {
  title?: string
  /** Sits beside the "Chats" title — a filter or tab switch. */
  listAction?: React.ReactNode
  list: React.ReactNode
  /** Whether a conversation is open. */
  open: boolean
  /** Who the conversation is with — name, avatar, context. */
  windowHeader?: React.ReactNode
  /** Buttons on the right of the window header. */
  windowActions?: React.ReactNode
  windowBody?: React.ReactNode
  onClose: () => void
  /** Overrides the full-viewport height, for a layout under a page title. */
  heightClassName?: string
}) {
  return (
    <div className={cn("flex gap-3", heightClassName)}>
      <section
        aria-label={title}
        className={cn(
          "flex min-w-0 flex-col overflow-hidden rounded-[24px] bg-background p-2 transition-[width] duration-300 ease-out",
          open ? "hidden md:flex md:w-[300px] md:shrink-0 lg:w-[340px]" : "w-full flex-1"
        )}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 px-3 pt-2 pb-3">
          <h1 className="text-[24px] font-semibold tracking-[-0.025em]">{title}</h1>
          {listAction}
        </header>
        {/* The list scrolls inside a white panel, so rows read on white
            and the mist column keeps the same 8px margin all round. */}
        <div className="min-h-0 flex-1 overflow-y-auto rounded-[16px] bg-background p-1.5">{list}</div>
      </section>

      {open ? (
        <section
          aria-label="Conversation"
          className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[24px] bg-background p-2 animate-in fade-in slide-in-from-right-3 duration-300"
        >
          <header className="flex shrink-0 items-center gap-2 px-2 pt-1 pb-2.5">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back to chats"
              className="-ms-1 grid size-9 shrink-0 place-items-center rounded-xl text-foreground/75 hover:bg-muted md:hidden"
            >
              <ChevronLeftIcon className="size-5 rtl:-scale-x-100" />
            </button>
            <div className="min-w-0 flex-1">{windowHeader}</div>
            {windowActions}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close conversation"
              className="hidden size-9 shrink-0 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground md:grid"
            >
              <XIcon className="size-4" />
            </button>
          </header>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[16px] bg-background">{windowBody}</div>
        </section>
      ) : null}
    </div>
  )
}

/** One row of the chat list: avatar, name, a line of preview, and an
 *  optional time — selected rows take the green fill. */
function ChatListRow({
  active,
  onClick,
  avatar,
  title,
  preview,
  meta,
}: {
  active: boolean
  onClick: () => void
  avatar: React.ReactNode
  title: string
  preview: string
  meta?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-start transition-colors",
        active ? "bg-amama text-white" : "text-foreground hover:bg-card"
      )}
    >
      {avatar}
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[13.5px] font-semibold">{title}</span>
          {meta ? <span className={cn("shrink-0 text-[11px]", active ? "text-white/70" : "text-muted-foreground")}>{meta}</span> : null}
        </span>
        <span className={cn("block truncate text-[12.5px]", active ? "text-white/75" : "text-muted-foreground")}>{preview}</span>
      </span>
    </button>
  )
}

/** A round avatar — initials, or an icon for a channel. */
function ChatAvatar({ label, icon: Icon, active, tone = "green" }: { label?: string; icon?: React.ElementType; active?: boolean; tone?: "green" | "graphite" | "mist" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full text-[13px] font-semibold",
        active
          ? "bg-sun text-sun-foreground"
          : tone === "green"
            ? "bg-amama-subtle text-amama-deep"
            : tone === "graphite"
              ? "bg-graphite text-white"
              : "bg-muted text-foreground"
      )}
    >
      {Icon ? <Icon className="size-[18px]" /> : (label?.trim().charAt(0).toUpperCase() ?? "?")}
    </span>
  )
}

export { ChatLayout, ChatListRow, ChatAvatar, useChatSelection }
