"use client"

import * as React from "react"
import { CheckIcon, FileSignatureIcon, HandCoinsIcon, LifeBuoyIcon, ShieldCheckIcon, TruckIcon, UserPlusIcon, WheatIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useCurrentAdmin } from "@/features/admin/current-admin"
import { CardShell } from "@/features/marketplace/chat-card-shell"
import { postCard, replaceCard, sendMessage, useConversations, type ChatParty, type ConversationCard } from "@/features/marketplace/conversation-store"
import { latestDealForConversation, requestContract, useDeals } from "@/features/marketplace/deal-store"
import { sendToKam } from "@/features/marketplace/kam-thread-store"

type KamAssist = Extract<ConversationCard, { kind: "kam-assist" }>

/** What a trader can ask a KAM in for, in the order a deal meets them.
 *  "contract" only shows once both sides have agreed terms. */
const TOPICS = [
  { id: "contract", label: "Turn our agreed deal into a contract", hint: "The KAM opens the term sheet and runs signing", icon: FileSignatureIcon },
  { id: "price", label: "Help agreeing price or quantity", hint: "A neutral voice when the numbers are stuck", icon: HandCoinsIcon },
  { id: "quality", label: "Quality, grade or specs", hint: "Lab reports, grading, sampling", icon: WheatIcon },
  { id: "logistics", label: "Logistics and delivery", hint: "Pickup, warehouse slot, shipping window", icon: TruckIcon },
  { id: "other", label: "Something else", hint: "Tell the KAM in a line", icon: LifeBuoyIcon },
] as const

type TopicId = (typeof TOPICS)[number]["id"]

function topicLabel(id: string) {
  return TOPICS.find((topic) => topic.id === id)?.label ?? id
}

/* ── store side ────────────────────────────────────────────────────────── */

/** The newest assist request in a conversation, if any. */
function latestAssist(cards: (ConversationCard | undefined)[]): KamAssist | null {
  for (let index = cards.length - 1; index >= 0; index--) {
    const card = cards[index]
    if (card?.kind === "kam-assist") return card
  }
  return null
}

/**
 * Brings a KAM into the chat. An agreed deal asking for a contract goes
 * down the existing contract path (card, sticky bar, KAM queue); anything
 * else posts an assist card into the thread and pings the person's own
 * KAM channel, so it lands in both places a KAM looks.
 */
function requestKamAssist(input: {
  conversationId: string
  listingTitle: string
  party: "buyer" | "seller"
  partyId: string
  partyName: string
  topic: TopicId
  note: string
  dealId: string | null
}) {
  if (input.topic === "contract" && input.dealId) {
    requestContract(input.dealId, input.party, input.partyName)
  } else {
    const card: KamAssist = {
      kind: "kam-assist",
      requestId: `ka-${Date.now().toString(36)}`,
      topic: input.topic,
      note: input.note.trim() || null,
      requestedBy: input.party,
      requestedByName: input.partyName,
      requestedAt: new Date().toISOString(),
      joinedByName: null,
      joinedAt: null,
    }
    postCard({
      conversationId: input.conversationId,
      from: input.party,
      fromName: input.partyName,
      text: `${input.partyName} asked an account manager to help: ${topicLabel(input.topic).toLowerCase()}.`,
      card,
    })
  }
  sendToKam(input.partyId, input.party, `I've asked for help on ${input.listingTitle}: ${topicLabel(input.topic).toLowerCase()}.${input.note.trim() ? ` ${input.note.trim()}` : ""}`)
}

/** A KAM steps in: the card flips to "helping", and their hello lands in
 *  the thread for both sides. */
function joinKamAssist(conversationId: string, card: KamAssist, kamName: string) {
  replaceCard(conversationId, (entry) => entry.kind === "kam-assist" && entry.requestId === card.requestId, {
    text: `${kamName} joined to help: ${topicLabel(card.topic).toLowerCase()}.`,
    card: { ...card, joinedByName: kamName, joinedAt: new Date().toISOString() },
  })
  sendMessage(conversationId, "kam", `Hi both, I'm ${kamName}, your account manager. I'll help with ${topicLabel(card.topic).toLowerCase()} from here.`, { fromName: kamName })
}

/* ── the button and dialog ─────────────────────────────────────────────── */

/**
 * "Ask KAM" in a chat's header. Shows where things stand once asked —
 * waiting, or who's helping — so nobody asks twice.
 */
function RequestKamButton({
  conversationId,
  listingTitle,
  party,
  partyId,
  partyName,
}: {
  conversationId: string
  listingTitle: string
  party: "buyer" | "seller"
  partyId: string
  partyName: string
}) {
  const conversations = useConversations()
  const deals = useDeals()
  const conversation = conversations.find((entry) => entry.id === conversationId)
  const deal = conversation ? latestDealForConversation(deals, conversationId) : null
  const assist = conversation ? latestAssist(conversation.messages.map((message) => message.card)) : null
  const contractAsked = !!deal?.contractRequestedAt && deal.status !== "declined"
  const canContract = !!deal && deal.status === "active" && !deal.contractRequestedAt

  const [open, setOpen] = React.useState(false)
  const [topic, setTopic] = React.useState<TopicId>(canContract ? "contract" : "price")
  const [note, setNote] = React.useState("")

  // Once a contract is underway the sticky contract bar is the KAM's door.
  if (contractAsked) return null

  if (assist && !assist.joinedByName) {
    return (
      <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-status-warning/12 px-3 text-[12.5px] font-medium text-status-warning">
        <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-status-warning" />
        KAM requested
      </span>
    )
  }

  const start = () => {
    setTopic(canContract ? "contract" : "price")
    setNote("")
    setOpen(true)
  }

  const submit = () => {
    requestKamAssist({ conversationId, listingTitle, party, partyId, partyName, topic, note, dealId: deal?.id ?? null })
    setOpen(false)
    toast.success("An account manager has been asked to join")
  }

  return (
    <>
      <Button size="sm" variant={assist ? "outline" : "default"} onClick={start}>
        <UserPlusIcon />
        {assist ? "Ask KAM again" : "Ask KAM"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bring in an account manager</DialogTitle>
            <DialogDescription>An amama KAM joins this chat with you and the {party === "buyer" ? "seller" : "buyer"}.</DialogDescription>
          </DialogHeader>

          <div role="radiogroup" aria-label="What do you need help with?" className="flex flex-col gap-1.5">
            {TOPICS.filter((entry) => entry.id !== "contract" || canContract).map((entry) => {
              const selected = topic === entry.id
              const Icon = entry.icon
              return (
                <button
                  key={entry.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setTopic(entry.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-start transition-colors",
                    selected ? "bg-amama-subtle ring-1 ring-amama-deep/40" : "bg-card hover:bg-muted"
                  )}
                >
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", selected ? "bg-amama-deep text-white" : "bg-background text-foreground/75")}>
                    <Icon className="size-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-semibold">{entry.label}</span>
                    <span className="block text-[12px] text-muted-foreground">{entry.hint}</span>
                  </span>
                  {selected ? <CheckIcon className="size-4 shrink-0 text-amama-deep" /> : null}
                </button>
              )
            })}
          </div>

          <label className="flex flex-col gap-1.5 text-[13px] font-medium">
            Anything the KAM should know?
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional" rows={3} />
          </label>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>
              <UserPlusIcon />
              Ask KAM
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/* ── the card in the thread ────────────────────────────────────────────── */

function KamAssistCard({ card, viewer }: { card: KamAssist; viewer: ChatParty }) {
  const when = new Date(card.requestedAt).toLocaleString("en", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
  if (card.joinedByName) {
    return (
      <CardShell icon={ShieldCheckIcon} tone="success" title={`${card.joinedByName} is helping`} subtitle={`${topicLabel(card.topic)} · asked by ${card.requestedByName}`}>
        {card.note ? <p className="text-[13px] leading-relaxed text-foreground">&ldquo;{card.note}&rdquo;</p> : null}
      </CardShell>
    )
  }
  return (
    <CardShell
      icon={UserPlusIcon}
      tone="warning"
      title="KAM assistance requested"
      subtitle={`${card.requestedByName} · ${when}`}
      footer={viewer === "kam" ? <JoinRow card={card} /> : <p className="text-[12px] text-muted-foreground">An account manager will join this chat shortly.</p>}
    >
      <p className="text-[13.5px] font-semibold text-foreground">{topicLabel(card.topic)}</p>
      {card.note ? <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">&ldquo;{card.note}&rdquo;</p> : null}
    </CardShell>
  )
}

/** Mounted only for the KAM viewer, so the admin hook never runs for a
 *  buyer or seller reading the same card. */
function JoinRow({ card }: { card: KamAssist }) {
  const admin = useCurrentAdmin()
  const conversations = useConversations()
  if (!admin) return null
  const conversation = conversations.find((entry) => entry.messages.some((message) => message.card?.kind === "kam-assist" && message.card.requestId === card.requestId))
  if (!conversation) return null
  return (
    <Button size="sm" onClick={() => joinKamAssist(conversation.id, card, admin.user.name)}>
      <ShieldCheckIcon />
      Join and help
    </Button>
  )
}

export { RequestKamButton, KamAssistCard }
