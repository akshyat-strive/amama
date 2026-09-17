"use client"

import * as React from "react"
import { ChevronLeftIcon, MessageCircleIcon, UsersIcon, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { ADMIN_SELECTED_CLASS } from "@/features/admin/admin-ui"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import { useUsers } from "@/features/admin/user-store"
import { StaffChatThread } from "@/features/admin/staff-chat-thread"
import {
  STAFF_GROUP_CHANNEL_ID,
  sendStaffMessage,
  staffDmChannelId,
  useStaffChannel,
  useStaffChatStore,
  type StaffChatSender,
} from "@/features/admin/staff-chat-store"
import { ConversationThread } from "@/features/marketplace/conversation-thread"
import {
  sendMessage,
  toThreadMessages,
  useConversations,
  type Conversation,
} from "@/features/marketplace/conversation-store"
import { conversationIsAgreed, useDeals } from "@/features/marketplace/deal-store"

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
type Tab = "external" | "internal"

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?"
}

/**
 * A single sliding unit, not two independent buttons — the highlight is
 * one shared element that moves to whichever label is active (an
 * absolutely-positioned pill animating its own position) rather than each
 * button toggling its own background on click. That's what makes it read
 * as one toggle switching state instead of two buttons that happen to
 * sit next to each other.
 */
function ChatTabSwitch({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <div className="relative flex shrink-0 rounded-full bg-card p-1">
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-amama-deep shadow-sm transition-all duration-200 ease-out",
          tab === "external" ? "left-1" : "left-1/2"
        )}
      />
      <button
        type="button"
        onClick={() => onChange("external")}
        className={cn(
          "relative z-10 flex-1 rounded-full py-1.5 text-center text-[13px] font-medium transition-colors",
          tab === "external" ? "text-white" : "text-muted-foreground hover:text-foreground"
        )}
      >
        External
      </button>
      <button
        type="button"
        onClick={() => onChange("internal")}
        className={cn(
          "relative z-10 flex-1 rounded-full py-1.5 text-center text-[13px] font-medium transition-colors",
          tab === "internal" ? "text-white" : "text-muted-foreground hover:text-foreground"
        )}
      >
        Internal
      </button>
    </div>
  )
}

/**
 * One inbox, split by an External/Internal tab rather than two separate
 * pages — External is read-only buyer/seller oversight (`ConversationThread`,
 * with its contact-info guard); Internal is the team's own DM/Team channels
 * (`StaffChatThread`, no guard — staff can share contact details with each
 * other freely). Announcements isn't a third tab here — it's its own page
 * (`announcements-view.tsx`), since a broadcast feed is something you
 * check, not a thread you pick out of an inbox.
 */
function ChatView() {
  const admin = useCurrentAdmin()
  const users = useUsers()
  const conversations = useConversations()
  const deals = useDeals()
  const staffStore = useStaffChatStore()
  const [tab, setTab] = React.useState<Tab>("external")
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const mentionCandidates = React.useMemo(() => users.map((user) => ({ id: user.id, name: user.name })), [users])
  if (!admin) return null

  const sender: StaffChatSender = { id: admin.user.id, name: admin.user.name, role: admin.role.name }

  const staffChannels: StaffChannel[] = [
    { kind: "staff", id: STAFF_GROUP_CHANNEL_ID, title: "Team", subtitle: "Everyone signed in", icon: UsersIcon },
    ...users
      .filter((user) => user.id !== admin.user.id)
      .map(
        (user): StaffChannel => ({
          kind: "staff",
          id: staffDmChannelId(admin.user.id, user.id),
          title: user.name,
          subtitle: "Direct message",
          icon: UsersIcon,
        })
      ),
  ]

  // The privacy gate. Two parties haggling over a price are doing it
  // between themselves; the desk only gets the thread once they've shaken
  // hands on it and there's an actual deal to manage. Everything before
  // that — including declined attempts that never became a deal — stays
  // off this list entirely.
  const conversationRows: ConversationRow[] = conversations
    .filter((conversation) => conversationIsAgreed(deals, conversation.id))
    .map((conversation) => ({
      kind: "conversation",
      id: conversation.id,
      conversation,
    }))

  const items: ChatItem[] = tab === "external" ? conversationRows : staffChannels
  // What to *render* in the thread pane — falls back to the tab's first
  // item so desktop (which shows both panes at once) never sits on an
  // empty pane.
  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null
  // Whether a chat has actually been *picked* — separate from `selected`
  // above because this, not the fallback, is what decides which pane shows
  // on mobile. Falling back to item 0 for that too would open a thread the
  // moment the page loads, defeating the point of splitting the two panes.
  const threadOpenOnMobile = selectedId !== null && items.some((item) => item.id === selectedId)

  const switchTab = (next: Tab) => {
    setTab(next)
    setSelectedId(null)
  }

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
      <div className="mt-6 flex flex-col gap-4 lg:h-[calc(100vh-158px)] lg:flex-row">
        <div
          className={cn(
            "flex flex-col gap-2 overflow-hidden rounded-[20px] border border-border bg-muted p-2 lg:flex lg:h-full lg:w-[300px] lg:shrink-0",
            threadOpenOnMobile && "hidden"
          )}
        >
          <ChatTabSwitch tab={tab} onChange={switchTab} />

          <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-4 text-[13px] text-muted-foreground">
                {tab === "external"
                  ? "No agreed deals yet. Buyer–seller conversations open to the desk once both sides accept a deal."
                  : "Nobody else has signed in yet."}
              </p>
            ) : tab === "external" ? (
              conversationRows.map((row) => (
                <ConversationRowButton
                  key={row.id}
                  row={row}
                  active={selected?.id === row.id}
                  onClick={() => setSelectedId(row.id)}
                />
              ))
            ) : (
              staffChannels.map((channel) => (
                <StaffChannelRowButton
                  key={channel.id}
                  channel={channel}
                  lastMessage={staffStore[channel.id]?.at(-1)?.text}
                  active={selected?.id === channel.id}
                  onClick={() => setSelectedId(channel.id)}
                />
              ))
            )}
          </div>
        </div>

        <div
          className={cn(
            "flex-1 overflow-hidden rounded-[20px] border border-border lg:flex lg:h-full",
            !threadOpenOnMobile && "hidden lg:flex"
          )}
        >
          {selected?.kind === "conversation" ? (
            <ConversationPane
              conversation={selected.conversation}
              kamName={admin.user.name}
              backButton={backButton}
            />
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

/**
 * The KAM's seat in a buyer–seller thread. They only ever reach this for a
 * deal both sides have already agreed (see the filter in `ChatView`), and
 * at that point they're not an observer any more — they're the person who
 * has to drive the contract, so the composer is live and everything they
 * post lands as the account manager rather than as either party.
 */
function ConversationPane({
  conversation,
  kamName,
  backButton,
}: {
  conversation: Conversation
  kamName: string
  backButton: React.ReactNode
}) {
  // Neither trading party is "you" here — this is a KAM in someone else's
  // conversation — so buyer and seller each get a fixed, named side
  // (buyer left, seller right) instead of the "me"/"them" a first-person
  // inbox would use. `toThreadMessages` also drops anything scoped away
  // from the KAM, and carries the interactive cards through.
  const messages = toThreadMessages(conversation.messages, "kam").map((message) => {
    if (message.from === "system") {
      const side = message.text.startsWith(conversation.buyerName)
        ? ("left" as const)
        : message.text.startsWith(conversation.sellerName)
          ? ("right" as const)
          : undefined
      return { ...message, side }
    }
    if (message.from === "buyer" || message.from === "seller") {
      return {
        ...message,
        senderName: message.from === "buyer" ? conversation.buyerName : conversation.sellerName,
      }
    }
    return message
  })

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
      viewer="kam"
      viewerName={kamName}
      placeholder="Message both sides…"
      onSend={(text) => sendMessage(conversation.id, "kam", text, { fromName: kamName })}
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
