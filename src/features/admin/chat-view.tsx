"use client"

import * as React from "react"
import { MessageCircleIcon, PinIcon, UsersIcon, type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChatAvatar, ChatLayout, ChatListRow, useChatSelection } from "@/features/chat/chat-layout"
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
import { proposeClause, useContracts, type Contract } from "@/features/contracts/contract-store"
import { useDeals } from "@/features/marketplace/deal-store"
import { conversationNeedsKam, useRfqs } from "@/features/marketplace/rfq-store"

/** A rough first pass at "the number in this message" — the amount, the
 *  unit if there is one right after it — good enough to pre-fill a clause
 *  proposal that the KAM still reviews and can edit before sending. */
function extractFirstNumberLike(text: string): string | null {
  const match = text.match(/[$₹€]?\s?[\d][\d,]*(?:\.\d+)?\s?(?:MT|t\b|kg|USD|INR|%|days?)?/i)
  return match ? match[0].trim() : null
}

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
    <div className="relative flex w-[180px] shrink-0 rounded-full bg-muted p-0.5">
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0.5 w-[calc(50%-2px)] rounded-full bg-amama transition-all duration-200 ease-out",
          tab === "external" ? "left-0.5" : "left-1/2"
        )}
      />
      <button
        type="button"
        onClick={() => onChange("external")}
        className={cn(
          "relative z-10 flex-1 rounded-full py-1 text-center text-[12.5px] font-medium transition-colors",
          tab === "external" ? "text-white" : "text-muted-foreground hover:text-foreground"
        )}
      >
        External
      </button>
      <button
        type="button"
        onClick={() => onChange("internal")}
        className={cn(
          "relative z-10 flex-1 rounded-full py-1 text-center text-[12.5px] font-medium transition-colors",
          tab === "internal" ? "text-white" : "text-muted-foreground hover:text-foreground"
        )}
      >
        Internal
      </button>
    </div>
  )
}

/**
 * One inbox on the shared `ChatLayout`, split by an External/Internal tab
 * rather than two separate pages — External is read-only buyer/seller oversight (`ConversationThread`,
 * with its contact-info guard); Internal is the team's own DM/Team channels
 * (`StaffChatThread`, no guard — staff can share contact details with each
 * other freely). Announcements isn't a third tab here — it's its own page
 * (`announcements-view.tsx`), since a broadcast feed is something you
 * check, not a thread you pick out of an inbox.
 */
function ChatView() {
  // `useSearchParams` (the open conversation) needs a boundary to keep the
  // route statically renderable.
  return (
    <React.Suspense fallback={null}>
      <ChatViewInner />
    </React.Suspense>
  )
}

function ChatViewInner() {
  const admin = useCurrentAdmin()
  const users = useUsers()
  const conversations = useConversations()
  const deals = useDeals()
  const rfqs = useRfqs()
  const staffStore = useStaffChatStore()
  const [tab, setTab] = React.useState<Tab>("external")
  const { selectedId, select, clear } = useChatSelection()
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
  // between themselves; the desk only gets the thread once there's real
  // business for it to manage — either an agreed deal, or a buyer having
  // formalized enough intent to publish an RFQ (see `conversationNeedsKam`).
  // Everything before that — including declined attempts that never became
  // a deal — stays off this list entirely.
  const conversationRows: ConversationRow[] = conversations
    .filter((conversation) => conversationNeedsKam(deals, rfqs, conversation))
    .map((conversation) => ({
      kind: "conversation",
      id: conversation.id,
      conversation,
    }))

  // An open conversation from the other tab (a deep link, say) still
  // shows — and its tab follows it.
  const all: ChatItem[] = [...conversationRows, ...staffChannels]
  const selected = all.find((item) => item.id === selectedId) ?? null
  const shownTab: Tab = selected ? (selected.kind === "staff" ? "internal" : "external") : tab

  const switchTab = (next: Tab) => {
    setTab(next)
    clear()
  }

  return (
    <ChatLayout
      open={!!selected}
      onClose={clear}
      listAction={<ChatTabSwitch tab={shownTab} onChange={switchTab} />}
      list={
        (shownTab === "external" ? conversationRows : staffChannels).length === 0 ? (
          <p className="px-3 py-4 text-[13px] text-muted-foreground">
            {shownTab === "external"
              ? "Nothing yet. Buyer–seller conversations open to the desk once a deal is agreed or a buyer publishes an RFQ."
              : "Nobody else has signed in yet."}
          </p>
        ) : shownTab === "external" ? (
          conversationRows.map((row) => {
            const last = row.conversation.messages.at(-1)
            return (
              <ChatListRow
                key={row.id}
                active={selected?.id === row.id}
                onClick={() => select(row.id)}
                title={`${row.conversation.buyerName} ↔ ${row.conversation.sellerName}`}
                preview={last ? last.text : row.conversation.listingTitle}
                avatar={<ChatAvatar icon={MessageCircleIcon} active={selected?.id === row.id} tone="mist" />}
              />
            )
          })
        ) : (
          staffChannels.map((channel) => (
            <ChatListRow
              key={channel.id}
              active={selected?.id === channel.id}
              onClick={() => select(channel.id)}
              title={channel.title}
              preview={staffStore[channel.id]?.at(-1)?.text ?? channel.subtitle}
              avatar={
                <ChatAvatar
                  label={channel.title}
                  icon={channel.id === STAFF_GROUP_CHANNEL_ID ? UsersIcon : undefined}
                  active={selected?.id === channel.id}
                  tone={channel.id === STAFF_GROUP_CHANNEL_ID ? "green" : "graphite"}
                />
              }
            />
          ))
        )
      }
      windowHeader={
        selected?.kind === "conversation" ? (
          <div className="flex min-w-0 items-center gap-2.5">
            <ChatAvatar icon={MessageCircleIcon} tone="mist" />
            <div className="min-w-0">
              <p className="truncate text-[14.5px] font-semibold">
                {selected.conversation.buyerName} → {selected.conversation.sellerName}
              </p>
              <p className="truncate text-[12px] text-muted-foreground">{selected.conversation.listingTitle}</p>
            </div>
          </div>
        ) : selected?.kind === "staff" ? (
          <div className="flex min-w-0 items-center gap-2.5">
            <ChatAvatar label={selected.title} icon={selected.id === STAFF_GROUP_CHANNEL_ID ? UsersIcon : undefined} tone={selected.id === STAFF_GROUP_CHANNEL_ID ? "green" : "graphite"} />
            <div className="min-w-0">
              <p className="truncate text-[14.5px] font-semibold">{selected.title}</p>
              <p className="truncate text-[12px] text-muted-foreground">{selected.subtitle}</p>
            </div>
          </div>
        ) : null
      }
      windowBody={
        selected?.kind === "conversation" ? (
          <ConversationPane conversation={selected.conversation} kamName={admin.user.name} />
        ) : selected?.kind === "staff" ? (
          <StaffChannelPane channel={selected} sender={sender} mentionCandidates={mentionCandidates} />
        ) : null
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
function ConversationPane({ conversation, kamName }: { conversation: Conversation; kamName: string }) {
  // Neither trading party is "you" here — this is a KAM in someone else's
  // conversation — so buyer and seller each get a fixed, named side
  // (buyer left, seller right) instead of the "me"/"them" a first-person
  // inbox would use. `toThreadMessages` also drops anything scoped away
  // from the KAM, and carries the interactive cards through.
  const contracts = useContracts()
  const contract = contracts.find((entry) => entry.conversationId === conversation.id) ?? null

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
      messages={messages}
      viewer="kam"
      viewerName={kamName}
      placeholder="Message both sides…"
      onSend={(text) => sendMessage(conversation.id, "kam", text, { fromName: kamName })}
      conversationId={conversation.id}
      composerParties={[
        { party: "buyer", name: conversation.buyerName },
        { party: "seller", name: conversation.sellerName },
      ]}
      renderMessageAction={
        contract && contract.clauses.length > 0
          ? (message) =>
              message.from === "buyer" || message.from === "seller" ? (
                <PinToClauseButton contract={contract} text={message.text} kamName={kamName} />
              ) : null
          : undefined
      }
      className="min-h-0 flex-1"
    />
  )
}

/** The "one-click extract" the KAM gets on any buyer/seller message once a
 *  contract's term sheet exists — pick which clause a number in the chat
 *  belongs to, edit it if the guess isn't quite right, and send it as a
 *  proposal without retyping it from scratch. Still just a proposal: both
 *  sides still have to actually agree it (see `proposeClause`). */
function PinToClauseButton({
  contract,
  text,
  kamName,
}: {
  contract: Contract
  text: string
  kamName: string
}) {
  const [open, setOpen] = React.useState(false)
  const [clauseId, setClauseId] = React.useState(contract.clauses[0]?.id ?? "")
  const [value, setValue] = React.useState("")

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setValue(extractFirstNumberLike(text) ?? text)
      }}
    >
      <PopoverTrigger
        aria-label="Use in term sheet"
        className="grid size-7 shrink-0 place-items-center self-center rounded-full text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
      >
        <PinIcon className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent side="top" className="w-[260px] p-3">
        <p className="px-1 pb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Use in term sheet
        </p>
        <div className="flex flex-col gap-2">
          <Select value={clauseId} onValueChange={(next) => next && setClauseId(next)}>
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {contract.clauses.map((clause) => (
                <SelectItem key={clause.id} value={clause.id}>
                  {clause.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input value={value} onChange={(event) => setValue(event.target.value)} className="h-8 text-[12px]" />
          <Button
            size="sm"
            disabled={!value.trim()}
            onClick={() => {
              proposeClause(contract.id, clauseId, value.trim(), "kam", kamName, text)
              setOpen(false)
            }}
          >
            Propose this value
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function StaffChannelPane({
  channel,
  sender,
  mentionCandidates,
}: {
  channel: StaffChannel
  sender: StaffChatSender
  mentionCandidates: { id: string; name: string }[]
}) {
  const messages = useStaffChannel(channel.id)

  return (
    <StaffChatThread
      messages={messages}
      currentSenderId={sender.id}
      mentionCandidates={mentionCandidates}
      placeholder={`Message ${channel.title}…`}
      onSend={(text, mentions) => sendStaffMessage(channel.id, sender, text, mentions)}
      emptyState={<p className="text-[13px] text-muted-foreground">No messages yet — say hello.</p>}
      className="min-h-0 flex-1"
    />
  )
}

export { ChatView }
