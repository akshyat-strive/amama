"use client"

import * as React from "react"
import { ChevronLeftIcon, MessageCircleIcon, UsersIcon, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { ADMIN_SELECTED_CLASS } from "@/features/admin/admin-ui"
import { useKamIdentity } from "@/features/admin/kam-identity"
import { useKamRoster } from "@/features/admin/kam-roster-store"
import { StaffChatThread } from "@/features/admin/staff-chat-thread"
import {
  MASTER_ADMIN_MENTION_CANDIDATE,
  STAFF_GROUP_CHANNEL_ID,
  sendStaffMessage,
  staffDmChannelId,
  useStaffChannel,
  useStaffChatStore,
  type StaffChatSender,
} from "@/features/admin/staff-chat-store"
import { ConversationThread } from "@/features/marketplace/conversation-thread"
import { useConversations, type Conversation } from "@/features/marketplace/conversation-store"

type StaffChannel = {
  kind: "staff"
  id: string
  title: string
  subtitle: string
  icon: LucideIcon
}

type ConversationRow = {
  kind: "conversation"
  id: string
  conversation: Conversation
}

type ChatItem = StaffChannel | ConversationRow

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?"
}

/**
 * One inbox, not two — a KAM used to have a separate "Conversations" page
 * for read-only buyer/seller oversight and a separate "Team chat" page for
 * DMs/Team. Folded together here because they're the same *kind* of thing
 * (a list of threads, pick one, read it) even though what's inside differs:
 * a conversation is always read-only and renders through `ConversationThread`
 * (the marketplace's own, with its contact-info guard); a staff channel is
 * interactive and renders through `StaffChatThread` (mentions, no guard —
 * staff can share contact details with each other). Announcements used to
 * live in this same list as a third channel; it's its own page now
 * (`announcements-view.tsx`) since a broadcast feed isn't really a
 * "conversation" to pick out of an inbox — it's something you check.
 */
function ChatView({ role }: { role: "kam" | "master" }) {
  const identity = useKamIdentity()
  const roster = useKamRoster()
  const conversations = useConversations()
  const staffStore = useStaffChatStore()
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const sender: StaffChatSender =
    role === "master"
      ? { id: MASTER_ADMIN_MENTION_CANDIDATE.id, name: MASTER_ADMIN_MENTION_CANDIDATE.name, role: "master" }
      : { id: identity?.id ?? "kam", name: identity?.name ?? "KAM", role: "kam" }

  const staffChannels: StaffChannel[] =
    role === "kam"
      ? [
          {
            kind: "staff",
            id: staffDmChannelId(sender.id),
            title: "Master Admin",
            subtitle: "Direct message",
            icon: UsersIcon,
          },
          { kind: "staff", id: STAFF_GROUP_CHANNEL_ID, title: "Team", subtitle: "Every KAM", icon: UsersIcon },
        ]
      : [
          { kind: "staff", id: STAFF_GROUP_CHANNEL_ID, title: "Team", subtitle: "Every KAM", icon: UsersIcon },
          ...roster.map(
            (kam): StaffChannel => ({
              kind: "staff",
              id: staffDmChannelId(kam.id),
              title: kam.name,
              subtitle: "Direct message",
              icon: UsersIcon,
            })
          ),
        ]

  const conversationRows: ConversationRow[] = conversations.map((conversation) => ({
    kind: "conversation",
    id: conversation.id,
    conversation,
  }))

  const items: ChatItem[] = [...conversationRows, ...staffChannels]
  // What to *render* in the thread pane — falls back to the first item so
  // desktop (which shows both panes at once) never sits on an empty pane.
  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null
  // Whether a chat has actually been *picked* — separate from `selected`
  // above because this, not the fallback, is what decides which pane shows
  // on mobile. Falling back to item 0 for that too would open a thread the
  // moment the page loads, defeating the point of splitting the two panes.
  const threadOpenOnMobile = selectedId !== null

  const mentionCandidates = React.useMemo(
    () => [MASTER_ADMIN_MENTION_CANDIDATE, ...roster.map((kam) => ({ id: kam.id, name: kam.name }))],
    [roster]
  )

  const backButton = (
    <button
      type="button"
      onClick={() => setSelectedId(null)}
      aria-label="Back to chat list"
      className="mr-1 -ml-1.5 grid size-8 shrink-0 place-items-center rounded-full text-foreground/70 transition-colors hover:bg-muted lg:hidden"
    >
      <ChevronLeftIcon className="size-5 rtl:-scale-x-100" />
    </button>
  )

  return (
    <div>
      <h1 className="text-[28px] font-bold tracking-tight">Chat</h1>

      {/* Two genuinely separate cards, not one box split by an internal
          divider — on mobile only one of them is ever on screen at a time
          (the list, or the open thread with a way back), which a single
          shared box can't do cleanly. */}
      <div className="mt-6 flex flex-col gap-4 lg:h-[calc(100vh-160px)] lg:flex-row">
        <div
          className={cn(
            "flex flex-col gap-3 overflow-y-auto rounded-[20px] border border-border bg-muted p-2 lg:flex lg:h-full lg:w-[300px] lg:shrink-0",
            threadOpenOnMobile && "hidden"
          )}
        >
          {conversationRows.length > 0 ? (
            <ChatSection title="Conversations">
              {conversationRows.map((row) => (
                <ConversationRowButton
                  key={row.id}
                  row={row}
                  active={selected?.id === row.id}
                  onClick={() => setSelectedId(row.id)}
                />
              ))}
            </ChatSection>
          ) : null}

          <ChatSection title="Team">
            {staffChannels.map((channel) => (
              <StaffChannelRowButton
                key={channel.id}
                channel={channel}
                lastMessage={staffStore[channel.id]?.at(-1)?.text}
                active={selected?.id === channel.id}
                onClick={() => setSelectedId(channel.id)}
              />
            ))}
          </ChatSection>
        </div>

        <div
          className={cn(
            "flex-1 overflow-hidden rounded-[20px] border border-border lg:flex lg:h-full",
            !threadOpenOnMobile && "hidden lg:flex"
          )}
        >
          {selected?.kind === "conversation" ? (
            <ConversationPane conversation={selected.conversation} backButton={backButton} />
          ) : selected?.kind === "staff" ? (
            <StaffChannelPane
              channel={selected}
              sender={sender}
              mentionCandidates={mentionCandidates}
              backButton={backButton}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center bg-card p-6 text-center text-[13px] text-muted-foreground">
              Nothing to show yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ChatSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-3 pb-1 pt-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        {title}
      </p>
      {children}
    </div>
  )
}

function RowShell({
  active,
  onClick,
  avatar,
  title,
  preview,
}: {
  active: boolean
  onClick: () => void
  avatar: React.ReactNode
  title: string
  preview: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-[14px] border px-3 py-2.5 text-start transition-colors",
        active ? ADMIN_SELECTED_CLASS : "border-transparent text-foreground hover:bg-card"
      )}
    >
      {avatar}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold">{title}</span>
        <span
          className={cn("block truncate text-[12px]", active ? "text-amama-foreground/70" : "text-muted-foreground")}
        >
          {preview}
        </span>
      </span>
    </button>
  )
}

function ConversationRowButton({
  row,
  active,
  onClick,
}: {
  row: ConversationRow
  active: boolean
  onClick: () => void
}) {
  const { conversation } = row
  const last = conversation.messages[conversation.messages.length - 1]
  return (
    <RowShell
      active={active}
      onClick={onClick}
      title={`${conversation.buyerName} ↔ ${conversation.sellerName}`}
      preview={last ? last.text : conversation.listingTitle}
      avatar={
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-full",
            active ? "bg-white/50" : "bg-card"
          )}
        >
          <MessageCircleIcon className="size-4" />
        </span>
      }
    />
  )
}

function StaffChannelRowButton({
  channel,
  lastMessage,
  active,
  onClick,
}: {
  channel: StaffChannel
  lastMessage: string | undefined
  active: boolean
  onClick: () => void
}) {
  const isGroup = channel.id === STAFF_GROUP_CHANNEL_ID
  return (
    <RowShell
      active={active}
      onClick={onClick}
      title={channel.title}
      preview={lastMessage ?? channel.subtitle}
      avatar={
        isGroup ? (
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full",
              active ? "bg-white/50" : "bg-card"
            )}
          >
            <channel.icon className="size-4" />
          </span>
        ) : (
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amama-deep text-[12px] font-semibold text-white">
            {initial(channel.title)}
          </span>
        )
      }
    />
  )
}

/** Read-only, on purpose — a KAM or master admin can see every product
 *  conversation to step in if something looks wrong, but this isn't
 *  another inbox to reply from. */
function ConversationPane({
  conversation,
  backButton,
}: {
  conversation: Conversation
  backButton: React.ReactNode
}) {
  const messages = conversation.messages.map((message) => ({
    from: message.from === "system" ? ("system" as const) : ("them" as const),
    text:
      message.from === "system"
        ? message.text
        : `${message.from === "buyer" ? conversation.buyerName : conversation.sellerName}: ${message.text}`,
    diff: message.diff,
  }))

  return (
    <ConversationThread
      header={
        <div className="flex items-center">
          {backButton}
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-foreground">
              {conversation.buyerName} → {conversation.sellerName}
            </p>
            <p className="truncate text-[12px] text-muted-foreground">{conversation.listingTitle}</p>
          </div>
        </div>
      }
      messages={messages}
      onSend={() => {}}
      readOnly
      className="min-h-[420px] flex-1 bg-card lg:min-h-0"
    />
  )
}

function StaffChannelPane({
  channel,
  sender,
  mentionCandidates,
  backButton,
}: {
  channel: StaffChannel
  sender: StaffChatSender
  mentionCandidates: { id: string; name: string }[]
  backButton: React.ReactNode
}) {
  const messages = useStaffChannel(channel.id)

  return (
    <StaffChatThread
      header={
        <div className="flex items-center">
          {backButton}
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-foreground">{channel.title}</p>
            <p className="truncate text-[12px] text-muted-foreground">{channel.subtitle}</p>
          </div>
        </div>
      }
      messages={messages}
      currentSenderId={sender.id}
      mentionCandidates={mentionCandidates}
      placeholder={`Message ${channel.title}…`}
      onSend={(text, mentions) => sendStaffMessage(channel.id, sender, text, mentions)}
      emptyState={<p className="text-[13px] text-muted-foreground">No messages yet — say hello.</p>}
      className="min-h-[420px] flex-1 bg-card lg:min-h-0"
    />
  )
}

export { ChatView }
