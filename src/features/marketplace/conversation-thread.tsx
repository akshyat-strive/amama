"use client"

import * as React from "react"
import { AlertTriangleIcon, PackageIcon, SendIcon, ShieldCheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { ContractStickyBar } from "@/features/contracts/contract-sticky-bar"
import { ChatCard } from "@/features/marketplace/chat-cards"
import { ChatComposerPopover, type ComposerParty } from "@/features/marketplace/chat-composer-popover"
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
  /** When it was sent — drives the name/time line and the day breaks. */
  at?: string
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
  counterpartName,
  conversationId,
  composerParties = [],
  onProposeDeal,
  renderMessageAction,
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
  /** The other side's name, shown over their messages when a message
   *  doesn't carry its own sender name. */
  counterpartName?: string
  /** Required for the "+" form-request picker — omit it (leave
   *  `composerParties` empty too) wherever there's no real conversation
   *  to attach a form to yet. */
  conversationId?: string
  /** Who a form sent from here can target — see `ChatComposerPopover`.
   *  Empty (the default) just hides the form templates from the "+"
   *  picker, leaving "Proposal" (if `onProposeDeal` is set) on its own. */
  composerParties?: ComposerParty[]
  /** Adds a "Proposal" tile to the "+" picker — only meaningful where the
   *  caller actually has a listing to propose terms against, so it's
   *  opt-in rather than always-on. */
  onProposeDeal?: () => void
  /** An extra affordance next to a plain typed bubble — used by the KAM
   *  console to offer "pin this number to a term sheet clause" without
   *  every other reader of this thread (a buyer, a seller) growing the
   *  same control. Omitted everywhere else. */
  renderMessageAction?: (message: ThreadMessage, index: number) => React.ReactNode
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
        <div className="shrink-0 border-b border-border px-4 py-3">{header}</div>
      ) : null}

      {conversationId ? <ContractStickyBar conversationId={conversationId} viewer={viewer} /> : null}
      {messages ? (
        <>
          <div ref={scrollRef} className="flex flex-1 flex-col overflow-y-auto px-5 py-4">
            {messages.map((message, index) => {
              const previous = index > 0 ? messages[index - 1] : undefined
              const newDay = !!message.at && (!previous?.at || dayKey(previous.at) !== dayKey(message.at))
              const body = message.card ? (
                <div className={cn("my-1.5 flex", message.from === "me" ? "justify-end" : "justify-start")}>
                  <ChatCard card={message.card} viewer={viewer} viewerName={viewerName} />
                </div>
              ) : message.from === "system" ? (
                <SystemLogLine message={message} onOpenDiff={setOpenDiff} />
              ) : (
                <div className={cn("flex items-end gap-1.5", message.from === "me" || message.from === "seller" ? "justify-end" : "justify-start")}>
                  <MessageBubble
                    message={message}
                    name={message.senderName ?? (message.from === "kam" ? "Account manager" : message.from === "me" ? viewerName : counterpartName)}
                    grouped={!newDay && !!previous && previous.from === message.from && !previous.card && withinMinutes(previous.at, message.at, 5)}
                  />
                  {renderMessageAction ? renderMessageAction(message, index) : null}
                </div>
              )
              return (
                <React.Fragment key={index}>
                  {newDay && message.at ? <p className="my-3 text-center text-[12.5px] font-medium text-muted-foreground">{dayLabel(message.at)}</p> : null}
                  {body}
                </React.Fragment>
              )
            })}
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
                {conversationId ? (
                  <ChatComposerPopover
                    conversationId={conversationId}
                    viewer={viewer}
                    viewerName={viewerName}
                    parties={composerParties}
                    onProposeDeal={onProposeDeal}
                  />
                ) : null}
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
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-graphite text-white transition-colors hover:bg-black disabled:pointer-events-none disabled:opacity-40"
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

function dayKey(at: string) {
  return new Date(at).toDateString()
}

function withinMinutes(a: string | undefined, b: string | undefined, minutes: number) {
  if (!a || !b) return true
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) <= minutes * 60_000
}

/** "Today" / "Yesterday" / "Monday, Oct 12" — the break between days. */
function dayLabel(at: string) {
  const date = new Date(at)
  const today = new Date()
  const days = Math.round((new Date(today.toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 86_400_000)
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
  return date.toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" })
}

/** The time beside a name: just the clock today, the weekday this week,
 *  the date before that. */
function stampLabel(at: string) {
  const date = new Date(at)
  const time = date.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })
  const days = Math.round((new Date(new Date().toDateString()).getTime() - new Date(date.toDateString()).getTime()) / 86_400_000)
  if (days === 0) return time
  if (days < 7) return `${date.toLocaleDateString("en", { weekday: "short" })} ${time}`
  return `${date.toLocaleDateString("en", { month: "short", day: "numeric" })}, ${time}`
}

/**
 * A message the way a work chat shows it: the first in a run gets an
 * avatar, the sender's name and the time; the rest of the run tucks in
 * under it. Your own messages sit on the right with just the time.
 */
function MessageBubble({ message, name, grouped }: { message: ThreadMessage; name?: string; grouped: boolean }) {
  const alignRight = message.from === "me" || message.from === "seller"
  // The account manager is a third voice in what was a two-party thread,
  // so they get the platform's own tint rather than the counterparty's
  // grey — a buyer should never mistake their KAM for the seller.
  const isKam = message.from === "kam"
  const showName = !alignRight || message.from === "seller"
  return (
    <div className={cn("flex max-w-[80%] gap-3", alignRight && "flex-row-reverse", grouped ? "mt-0.5" : "mt-3 first:mt-0")}>
      {!alignRight ? (
        grouped ? (
          <span aria-hidden className="w-9 shrink-0" />
        ) : (
          <span
            aria-hidden
            className={cn("mt-6 grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-semibold", isKam ? "bg-amama-subtle text-amama-deep" : "bg-graphite text-white")}
          >
            {isKam ? <ShieldCheckIcon className="size-4" /> : (name?.trim().charAt(0).toUpperCase() ?? "?")}
          </span>
        )
      ) : null}
      <div className={cn("flex min-w-0 flex-col", alignRight ? "items-end" : "items-start")}>
        {!grouped && (showName || message.at) ? (
          <p className={cn("mb-1 flex items-baseline gap-2 px-1", alignRight && "flex-row-reverse")}>
            {showName && name ? <span className="text-[13px] font-semibold text-foreground">{name}</span> : null}
            {message.at ? <span className="text-[12px] text-muted-foreground">{stampLabel(message.at)}</span> : null}
          </p>
        ) : null}
        <p
          className={cn(
            "rounded-[20px] px-4 py-2.5 text-[14px] leading-relaxed break-words whitespace-pre-line",
            isKam ? "bg-amama-subtle text-foreground" : alignRight ? "bg-amama-deep text-white" : "bg-muted text-foreground"
          )}
        >
          {message.text}
        </p>
      </div>
    </div>
  )
}

export { ConversationThread }
