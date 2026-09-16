"use client"

import * as React from "react"
import { SendIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { parseMentions, type StaffChatMessage } from "@/features/admin/staff-chat-store"

/**
 * A purpose-built chat surface for internal staff, not a reuse of the
 * marketplace's `ConversationThread` — that component hardcodes a 2-party
 * "me"/"them" union into its bubble alignment, and its composer calls
 * `containsContactInfo` directly (a buyer/seller trust rule that's actively
 * wrong here — staff should be free to share contact details with each
 * other). This one is N-party (shows sender names) and has no such filter.
 */
function StaffChatThread({
  header,
  messages,
  currentSenderId,
  mentionCandidates,
  onSend,
  placeholder = "Write a message…",
  readOnly = false,
  emptyState,
  className,
}: {
  header?: React.ReactNode
  messages: StaffChatMessage[]
  currentSenderId: string
  mentionCandidates: { id: string; name: string }[]
  onSend?: (text: string, mentions: string[]) => void
  placeholder?: string
  readOnly?: boolean
  emptyState?: React.ReactNode
  className?: string
}) {
  const [draftText, setDraftText] = React.useState("")
  const [mentionQuery, setMentionQuery] = React.useState<string | null>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages])

  const handleChange = (value: string) => {
    setDraftText(value)
    // Anchored to the end of the input, not the caret — a deliberate
    // simplification. Real caret-aware mention popovers need to measure
    // text width; not worth it for a prototype's composer.
    const match = value.match(/@([^\s@]*)$/)
    setMentionQuery(match ? match[1] : null)
  }

  const filteredCandidates =
    mentionQuery !== null
      ? mentionCandidates.filter((candidate) => candidate.name.toLowerCase().includes(mentionQuery.toLowerCase()))
      : []

  const pickMention = (name: string) => {
    setDraftText((text) => text.replace(/@([^\s@]*)$/, `@${name} `))
    setMentionQuery(null)
  }

  const send = () => {
    const text = draftText.trim()
    if (!text) return
    onSend?.(text, parseMentions(text, mentionCandidates))
    setDraftText("")
    setMentionQuery(null)
  }

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {header ? <div className="shrink-0 border-b border-border bg-muted/40 px-5 py-3.5">{header}</div> : null}

      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center">{emptyState}</div>
      ) : (
        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          className="flex flex-1 flex-col gap-2 overflow-y-auto px-5 py-4"
        >
          {messages.map((message, index) => (
            <StaffMessageBubble
              key={message.id}
              message={message}
              mine={message.from.id === currentSenderId}
              grouped={index > 0 && messages[index - 1].from.id === message.from.id}
              mentionCandidates={mentionCandidates}
            />
          ))}
        </div>
      )}

      {readOnly ? null : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            send()
          }}
          className="relative shrink-0 p-3"
        >
          {mentionQuery !== null && filteredCandidates.length > 0 ? (
            <div className="absolute inset-x-3 bottom-full mb-2 max-h-40 overflow-y-auto rounded-[16px] border border-border bg-card p-1.5 shadow-lg">
              {filteredCandidates.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => pickMention(candidate.name)}
                  className="block w-full rounded-lg px-3 py-1.5 text-start text-[13px] text-foreground hover:bg-muted"
                >
                  {candidate.name}
                </button>
              ))}
            </div>
          ) : null}
          {/* One filled pill housing both the text and the send affordance —
              no border, no focus ring; the fill itself is the only chrome,
              same shape a lot of chat composers (Google Chat, DeepSeek) use
              instead of an outlined field that glows on focus. */}
          <div className="flex items-center gap-1 rounded-[24px] bg-muted ps-4 pe-1.5">
            <label htmlFor="staff-chat-composer" className="sr-only">
              Message
            </label>
            <input
              id="staff-chat-composer"
              value={draftText}
              onChange={(event) => handleChange(event.target.value)}
              placeholder={placeholder}
              autoComplete="off"
              className="h-11 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              disabled={draftText.trim().length === 0}
              aria-label="Send message"
              className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors enabled:bg-amama-deep enabled:text-white enabled:hover:bg-amama-deep-hover disabled:opacity-50"
            >
              <SendIcon className="size-4 rtl:-scale-x-100" />
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

/** Splits a message's text around any `@Name` that matches a real
 *  candidate and renders each as a highlighted, genuinely clickable
 *  button — honest about being interactive even though nothing's wired
 *  to the click yet (no per-person profile page exists to jump to). */
function renderMentionText(text: string, candidates: { id: string; name: string }[], mine: boolean) {
  if (candidates.length === 0) return text
  const sorted = [...candidates].sort((a, b) => b.name.length - a.name.length)
  const escaped = sorted.map((candidate) => candidate.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  const pattern = new RegExp(`(@(?:${escaped.join("|")}))`, "gi")
  const parts = text.split(pattern)

  return parts.map((part, index) => {
    const isMention = sorted.some((candidate) => part.slice(1).toLowerCase() === candidate.name.toLowerCase())
    if (part.startsWith("@") && isMention) {
      return (
        <button
          key={index}
          type="button"
          className={cn("font-semibold underline-offset-2 hover:underline", mine ? "text-white" : "text-amama-deep")}
        >
          {part}
        </button>
      )
    }
    return <React.Fragment key={index}>{part}</React.Fragment>
  })
}

function StaffMessageBubble({
  message,
  mine,
  grouped,
  mentionCandidates,
}: {
  message: StaffChatMessage
  mine: boolean
  grouped: boolean
  mentionCandidates: { id: string; name: string }[]
}) {
  return (
    <div className={cn("flex flex-col", mine && "items-end", grouped ? "mt-0.5" : "mt-2 first:mt-0")}>
      {!grouped ? (
        <p className={cn("mb-1 text-[11px] font-medium text-muted-foreground", mine && "text-end")}>
          {message.from.name}
        </p>
      ) : null}
      <p
        className={cn(
          "max-w-[75%] rounded-3xl px-4 py-2 text-[14px] leading-relaxed",
          mine ? "bg-amama-deep text-white" : "bg-muted text-foreground"
        )}
      >
        {renderMentionText(message.text, mentionCandidates, mine)}
      </p>
    </div>
  )
}

export { StaffChatThread }
