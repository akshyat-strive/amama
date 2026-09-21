"use client"

import * as React from "react"
import Link from "next/link"
import {
  ChevronRightIcon,
  FileTextIcon,
  ImageIcon,
  MessagesSquareIcon,
  PaperclipIcon,
  ReceiptTextIcon,
  ScrollTextIcon,
  ShipIcon,
  SignatureIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { EntityChip, EntityLink } from "@/features/internal/entity-link"
import { relative } from "@/features/internal/shell-parts"
import {
  Dot,
  EmptyState,
  Group,
  Island,
  Metric,
  Metrics,
  PageHead,
  Pill,
  type Tone,
} from "@/features/internal/tower-ui"
import * as W from "@/features/tradechain/demo-world"

/**
 * Communication is where a trade actually starts, so this is the first
 * screen in the chain the rest of the product hangs off: the thread that
 * carries an RFQ into a term sheet, a term sheet into a PO, and a PO into
 * a live trade. Attachments are not files here — they are links to the
 * real records, so a term sheet mentioned in a message opens the term
 * sheet, not a PDF of one.
 *
 * The detail screen groups the stream by day. A negotiation is read as a
 * sequence of days, not as forty undifferentiated rows, and the day label
 * is the cheapest way to show where a conversation slept overnight and
 * where it moved in twenty minutes.
 */

const ROW =
  "flex items-center gap-3 rounded-[18px] px-3 py-2.5 transition-colors hover:bg-muted"

const ATTACHMENT_ICON = {
  spec: FileTextIcon,
  photo: ImageIcon,
  "term-sheet": SignatureIcon,
  quote: ScrollTextIcon,
  po: ReceiptTextIcon,
  document: FileTextIcon,
  report: FileTextIcon,
  booking: ShipIcon,
} as const

const KIND_LABEL: Record<W.ConversationKind, string> = {
  "buyer-kam": "Buyer ↔ KAM",
  "kam-seller": "KAM ↔ Grower",
  "buyer-seller": "Buyer ↔ Grower",
  internal: "Internal",
}

const KIND_TONE: Record<W.ConversationKind, Tone> = {
  "buyer-kam": "brand",
  "kam-seller": "brand",
  "buyer-seller": "brand",
  internal: "muted",
}

const dayLabel = (value: string): string =>
  new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value))

const clock = (value: string): string =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Kolkata",
  }).format(new Date(value))

function authorOf(message: W.Message): { name: string; kind: W.EntityKind | null } {
  if (message.authorKind === "system") return { name: "System", kind: null }
  if (message.authorKind === "internal") {
    return { name: W.userById(message.authorId)?.name ?? message.authorId, kind: "user" }
  }
  if (message.authorKind === "buyer") {
    const buyer = W.buyerById(message.authorId)
    return { name: buyer?.contact ?? message.authorId, kind: "buyer" }
  }
  const seller = W.sellerById(message.authorId)
  return { name: seller?.name ?? message.authorId, kind: "seller" }
}

/* ══════════════════════════════════════════════════════════════════════
   LIST
   ══════════════════════════════════════════════════════════════════════ */

function ConversationsView() {
  const threads = React.useMemo(
    () => [...W.CONVERSATIONS].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
    []
  )

  const pinned = threads.filter((thread) => thread.pinned)
  const rest = threads.filter((thread) => !thread.pinned)
  const unread = threads.reduce((sum, thread) => sum + thread.unread, 0)

  return (
    <>
      <PageHead title="Conversations" />

      <Metrics>
        <Metric label="Threads" value={threads.length} tone="brand" />
        <Metric label="Unread" value={unread} tone={unread > 0 ? "warn" : "plain"} />
        <Metric label="Pinned" value={pinned.length} />
        <Metric label="Messages" value={W.MESSAGES.length} />
      </Metrics>

      {pinned.length > 0 ? (
        <Group label="Pinned" count={pinned.length} pad="tight">
          <div className="flex flex-col gap-0.5">
            {pinned.map((thread) => (
              <ThreadRow key={thread.id} thread={thread} />
            ))}
          </div>
        </Group>
      ) : null}

      <Group label="All threads" count={rest.length} pad="tight">
        <div className="flex flex-col gap-0.5">
          {rest.map((thread) => (
            <ThreadRow key={thread.id} thread={thread} />
          ))}
        </div>
      </Group>
    </>
  )
}

function ThreadRow({ thread }: { thread: W.Conversation }) {
  const messages = W.messagesForConversation(thread.id)
  const last = messages[messages.length - 1]

  return (
    <Link href={`/internal/conversations/${thread.id}`} className={ROW}>
      <Dot tone={thread.unread > 0 ? "brand" : "muted"} />

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="truncate text-[13.5px] font-semibold">{thread.subject}</span>
          <Pill tone={KIND_TONE[thread.kind]}>{KIND_LABEL[thread.kind]}</Pill>
          {thread.unread > 0 ? <Pill tone="warn">{thread.unread} unread</Pill> : null}
        </span>
        {last ? (
          <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
            {authorOf(last).name}: {last.body}
          </span>
        ) : null}
      </span>

      <span className="hidden w-20 shrink-0 text-end sm:block">
        <span className="block text-[12px] font-medium tabular-nums">{messages.length}</span>
        <span className="block text-[11px] text-muted-foreground">messages</span>
      </span>

      <span className="hidden w-16 shrink-0 text-end text-[11px] text-muted-foreground sm:block">
        {relative(thread.lastMessageAt)}
      </span>

      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  )
}

/* ══════════════════════════════════════════════════════════════════════
   DETAIL
   ══════════════════════════════════════════════════════════════════════ */

/** The stream in calendar order, bucketed by the day it happened on in
 *  IST — which is the clock every timestamp in the record set is written
 *  against. */
function groupByDay(messages: W.Message[]): [string, W.Message[]][] {
  const buckets = new Map<string, W.Message[]>()
  for (const message of messages) {
    const key = message.at.slice(0, 10)
    const bucket = buckets.get(key)
    if (bucket) bucket.push(message)
    else buckets.set(key, [message])
  }
  return [...buckets.entries()]
}

function ConversationDetailView({ conversationId }: { conversationId: string }) {
  const conversation = W.conversationById(conversationId)
  const messages = W.messagesForConversation(conversationId)
  const days = groupByDay(messages)

  if (!conversation) {
    return (
      <Island>
        <EmptyState icon={MessagesSquareIcon} title="Thread not found" />
      </Island>
    )
  }

  return (
    <>
      <div className="px-1">
        <Link
          href="/internal/conversations"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
        >
          Conversations
        </Link>
      </div>

      <PageHead
        title={conversation.subject}
        meta={
          <>
            <Pill tone={KIND_TONE[conversation.kind]}>{KIND_LABEL[conversation.kind]}</Pill>
            <Pill tone="muted">{messages.length} messages</Pill>
            {conversation.unread > 0 ? <Pill tone="warn">{conversation.unread} unread</Pill> : null}
            {conversation.pinned ? <Pill tone="brand">Pinned</Pill> : null}
          </>
        }
        action={
          <>
            {conversation.rfqId ? <EntityLink kind="rfq" id={conversation.rfqId} /> : null}
            {conversation.tradeId ? <EntityLink kind="trade" id={conversation.tradeId} /> : null}
          </>
        }
      />

      <Group label="On this thread" count={conversation.participantIds.length}>
        <div className="flex flex-wrap gap-1.5">
          {conversation.participantIds.map((id) => {
            const kind: W.EntityKind = id.startsWith("u-") ? "user" : id.startsWith("b-") ? "buyer" : "seller"
            return <EntityChip key={id} kind={kind} id={id} label={W.resolveEntity({ kind, id })?.title ?? id} />
          })}
        </div>
      </Group>

      {days.map(([key, dayMessages]) => (
        <Group key={key} label={dayLabel(dayMessages[0].at)} count={dayMessages.length}>
          <div className="flex flex-col divide-y divide-border">
            {dayMessages.map((message) => (
              <MessageBlock key={message.id} message={message} />
            ))}
          </div>
        </Group>
      ))}
    </>
  )
}

function MessageBlock({ message }: { message: W.Message }) {
  const author = authorOf(message)
  const system = message.authorKind === "system"

  return (
    <article className="py-3 first:pt-0 last:pb-0">
      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {author.kind ? (
          <EntityLink
            kind={author.kind}
            id={message.authorId}
            mono={false}
            className="text-[13px] font-semibold no-underline hover:underline"
          >
            {author.name}
          </EntityLink>
        ) : (
          <span className="text-[13px] font-semibold text-muted-foreground">System</span>
        )}

        {message.authorKind === "internal" ? (
          <Pill tone="brand">{W.roleById(W.userById(message.authorId)?.role ?? "kam").label}</Pill>
        ) : message.authorKind === "buyer" ? (
          <Pill tone="muted">Buyer</Pill>
        ) : message.authorKind === "seller" ? (
          <Pill tone="muted">Grower</Pill>
        ) : (
          <Pill tone="muted">Automatic</Pill>
        )}

        <span className="ms-auto shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
          {clock(message.at)}
        </span>
      </header>

      <p
        className={cn(
          "mt-1 text-[13.5px] leading-relaxed",
          system ? "text-muted-foreground italic" : "text-foreground"
        )}
      >
        {message.body}
      </p>

      {message.attachments.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {message.attachments.map((attachment) => {
            const Icon = ATTACHMENT_ICON[attachment.kind] ?? PaperclipIcon
            if (!attachment.ref) {
              return (
                <span
                  key={attachment.label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[12px] text-muted-foreground"
                >
                  <Icon className="size-3.5 shrink-0" />
                  {attachment.label}
                </span>
              )
            }
            return (
              <EntityChip
                key={attachment.label}
                kind={attachment.ref.kind}
                id={attachment.ref.id}
                label={attachment.label}
                icon={Icon}
              />
            )
          })}
        </div>
      ) : null}
    </article>
  )
}

export { ConversationsView, ConversationDetailView }
