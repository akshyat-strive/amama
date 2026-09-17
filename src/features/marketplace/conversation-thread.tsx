"use client"

import * as React from "react"
import { AlertTriangleIcon, PackageIcon, SendIcon, ShieldCheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { ChatCard } from "@/features/marketplace/chat-cards"
import {
  containsContactInfo,
  type ChatParty,
  type ConversationCard,
  type ListingDiff,
} from "@/features/marketplace/conversation-store"
import { ListingDiffDialog } from "@/features/marketplace/listing-diff-dialog"

export type ThreadMessage = {
  /** `me`/`them` is the two-party self view (a buyer or seller reading
   *  their own inbox — one side is always "you"). `buyer`/`seller` is the
   *  third-party observer view (a KAM reading someone else's
   *  conversation) — neither side is "you", so it names them directly and
   *  fixes buyer-left/seller-right instead. Both alias to the same
   *  left/right styling in `MessageBubble` (`them`≈`buyer`, `me`≈`seller`).
   *  `kam` is the account manager seen by a buyer or seller — a third
   *  voice in what was a two-party thread, so it gets its own treatment
   *  rather than being flattened into "them". */
  from: "me" | "them" | "kam" | "buyer" | "seller" | "system"
  text: string
  diff?: ListingDiff
  /** An interactive widget to render in place of a plain bubble. */
  card?: ConversationCard
  /** A small caption above the first bubble in a run — only meaningful
   *  for the third-party `buyer`/`seller` view, which (unlike `me`/`them`)
   *  has no other way to say who's speaking. */
  senderName?: string
  /** Which side a system log line anchors to, so it reads as a reply from
   *  whichever party actually did the thing — `undefined` keeps the
   *  neutral centered pill used by the two-party self view. */
  side?: "left" | "right"
}

/**
 * The message surface itself — header, scrollable bubble list, composer —
 * shared by the inbox, a buyer's product page, and a seller's per-buyer
 * view, since a conversation looks the same no matter which of those three
 * places it's being read from. Fills whatever height its parent gives it
 * (the callers size that to the viewport) rather than growing with content,
 * which is what makes it read as a real messaging surface instead of a
 * card with a chat glued inside it.
 */
function ConversationThread({
  header,
  messages,
  onSend,
  placeholder = "Write a message…",
  emptyState,
  readOnly = false,
  viewer = "buyer",
  viewerName = "",
  className,
}: {
  header?: React.ReactNode
  messages: ThreadMessage[] | null
  onSend: (text: string) => void
  placeholder?: string
  emptyState?: React.ReactNode
  /** Hides the composer entirely — the KAM console's oversight view reads
   *  every conversation but never replies from inside it. */
  readOnly?: boolean
  /** Who is reading, which decides what a card lets them actually do:
   *  the same proposal card offers Accept to the side being asked and a
   *  "waiting…" line to the side that asked. */
  viewer?: ChatParty
  viewerName?: string
  className?: string
}) {
  const [draftText, setDraftText] = React.useState("")
  const [blocked, setBlocked] = React.useState(false)
  const [openDiff, setOpenDiff] = React.useState<ListingDiff | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages])

  const send = () => {
    const text = draftText.trim()
    if (!text || !messages) return
    if (containsContactInfo(text)) {
      setBlocked(true)
      return
    }
    onSend(text)
    setDraftText("")
  }

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {header ? (
        <div className="shrink-0 border-b border-border bg-muted/40 px-5 py-3.5">{header}</div>
      ) : null}

      {messages ? (
        <>
          <div ref={scrollRef} className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 py-4">
            {messages.map((message, index) =>
              message.card ? (
                <div
                  key={index}
                  className={cn("my-1.5 flex", message.from === "me" ? "justify-end" : "justify-start")}
                >
                  <ChatCard card={message.card} viewer={viewer} viewerName={viewerName} />
                </div>
              ) : message.from === "system" ? (
                <SystemLogLine key={index} message={message} onOpenDiff={setOpenDiff} />
              ) : (
                <MessageBubble
                  key={index}
                  message={message}
                  grouped={index > 0 && messages[index - 1].from === message.from && !messages[index - 1].card}
                />
              )
            )}
          </div>
          {readOnly ? null : (
            <>
              {blocked ? (
                <p className="flex shrink-0 items-center gap-1.5 px-5 pb-2 text-[12px] font-medium text-status-warning">
                  <AlertTriangleIcon className="size-3.5 shrink-0" />
                  Phone numbers and emails can&apos;t be shared here — everything stays
                  on-platform until you&apos;re ready to trade.
                </p>
              ) : null}
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  send()
                }}
                className="flex shrink-0 items-center gap-2 border-t border-border p-3"
              >
                <input
                  value={draftText}
                  onChange={(event) => {
                    setDraftText(event.target.value)
                    setBlocked(false)
                  }}
                  placeholder={placeholder}
                  className="h-10 flex-1 rounded-full border border-border bg-transparent px-4 text-[14px] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                />
                <button
                  type="submit"
                  disabled={draftText.trim().length === 0}
                  aria-label="Send message"
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-amama-deep text-white transition-colors hover:bg-amama-deep-hover disabled:pointer-events-none disabled:opacity-40"
                >
                  <SendIcon className="size-4 rtl:-scale-x-100" />
                </button>
              </form>
            </>
          )}
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center p-6 text-center">{emptyState}</div>
      )}

      <ListingDiffDialog open={!!openDiff} onOpenChange={(open) => !open && setOpenDiff(null)} diff={openDiff} />
    </div>
  )
}

/** The platform's own voice in a thread — a listing changed, or a deal
 *  moved, not either party typing — so it's a pill rather than a bubble.
 *  In the two-party self view (`side` unset) that pill floats centered,
 *  neutral to both sides. In the third-party `buyer`/`seller` view it
 *  instead anchors to whichever side actually did the thing — a buyer's
 *  proposal reads as a beat from the left, a seller's decline or accept
 *  replies to it from the right — tinted to match that side's bubble
 *  color so the connection reads at a glance. Clickable straight through
 *  to the before/after when there is one. */
function SystemLogLine({
  message,
  onOpenDiff,
}: {
  message: ThreadMessage
  onOpenDiff: (diff: ListingDiff) => void
}) {
  return (
    <div
      className={cn(
        "my-2 flex",
        message.side === "left" ? "justify-start" : message.side === "right" ? "justify-end" : "justify-center"
      )}
    >
      <button
        type="button"
        disabled={!message.diff}
        onClick={() => message.diff && onOpenDiff(message.diff)}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium",
          message.side === "right"
            ? "bg-amama-subtle text-amama-deep"
            : "bg-muted text-muted-foreground",
          message.diff && "cursor-pointer transition-colors hover:brightness-95"
        )}
      >
        <PackageIcon className="size-3.5 shrink-0" />
        {message.text}
      </button>
    </div>
  )
}

/** Apple Messages' own trick for a run of bubbles from the same side: only
 *  the last one in the run needs the usual gap above it, so a burst of
 *  three messages reads as one breath, not three separate turns. */
function MessageBubble({ message, grouped }: { message: ThreadMessage; grouped: boolean }) {
  const alignRight = message.from === "me" || message.from === "seller"
  // The account manager is a third voice in what was a two-party thread,
  // so they get the platform's own tint rather than the counterparty's
  // grey — a buyer should never mistake their KAM for the seller.
  const isKam = message.from === "kam"
  return (
    <div className={cn("flex flex-col", alignRight ? "items-end" : "items-start", grouped ? "mt-0.5" : "mt-2 first:mt-0")}>
      {(message.senderName || isKam) && !grouped ? (
        <p className="mb-1 flex items-center gap-1 px-1 text-[11px] font-medium text-muted-foreground">
          {isKam ? <ShieldCheckIcon className="size-3" /> : null}
          {message.senderName ?? "Account manager"}
        </p>
      ) : null}
      <p
        className={cn(
          "max-w-[75%] rounded-3xl px-4 py-2 text-[14px] leading-relaxed",
          isKam
            ? "bg-amama-subtle text-foreground"
            : alignRight
              ? "bg-amama-deep text-white"
              : "bg-muted text-foreground"
        )}
      >
        {message.text}
      </p>
    </div>
  )
}

export { ConversationThread }
