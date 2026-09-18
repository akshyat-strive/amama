"use client"

import * as React from "react"

import type { Listing } from "@/features/marketplace/listing-store"

export type ListingDiff = { before: Listing; after: Listing }

/** The three kinds of participant a thread can have. A KAM only ever joins
 *  after the two sides have agreed a deal (see `kamCanSeeConversation`), so
 *  for most of a thread's life only `buyer` and `seller` appear. */
export type ChatParty = "buyer" | "seller" | "kam"

/**
 * An interactive widget attached to a message.
 *
 * Every variant stores *ids only*, never a snapshot of the thing it points
 * at, so a card always renders the live record: a proposal card shows the
 * round's current outcome, a contract card shows the contract's current
 * stage. Re-reading an old thread therefore shows today's truth rather than
 * a stale copy of the moment it was posted, and the Contracts page and the
 * chat widget can never disagree.
 *
 * The plain `text` on the message stays the fallback: it's a full sentence
 * describing what happened, so the thread is still readable as words alone
 * for someone who can't or won't engage with the widget.
 */
export type ConversationCard =
  /** One round of the price/quantity negotiation — the offer, and its
   *  accept/decline/counter outcome once there is one. */
  | { kind: "proposal"; dealId: string; roundId: string }
  /** The contract a KAM opened off an agreed deal. */
  | { kind: "contract"; contractId: string }
  /** A term-sheet form and/or document checklist the KAM is asking one
   *  party to complete. Always paired with a `visibleTo` of that one party
   *  plus `kam`. */
  | { kind: "request"; contractId: string; requestId: string }
  /** The finished draft, needing a yes from both sides. */
  | { kind: "final-draft"; contractId: string }
  /** Shipment date options the KAM can actually honour, for the buyer to
   *  pick from. */
  | { kind: "shipment-dates"; contractId: string }

export type ConversationMessage = {
  /** `system` is the platform itself speaking — a listing-change log line,
   *  not either party — so it renders (and reads) differently from a
   *  message either side actually typed. */
  from: ChatParty | "system"
  text: string
  at: string
  diff?: ListingDiff
  /** The interactive widget this message carries, if any. */
  card?: ConversationCard
  /** Who may read this message. `undefined` — the overwhelmingly common
   *  case — means everyone in the thread. It is narrowed only for the
   *  KAM's term-sheet chases, where what the buyer was asked to supply is
   *  deliberately not the seller's business (and vice versa), even though
   *  both chases live in the same thread. */
  visibleTo?: ChatParty[]
  /** Author display name. Only needed for `kam` messages — buyer and
   *  seller names already live on the conversation itself. */
  fromName?: string
}

export type Conversation = {
  id: string
  buyerId: string
  buyerName: string
  sellerId: string
  sellerName: string
  listingId: string
  listingTitle: string
  messages: ConversationMessage[]
}

const STORAGE_KEY = "amama.marketplace.conversations"

let snapshot: Conversation[] = []
let restored = false
const listeners = new Set<() => void>()
const emptyConversations: Conversation[] = []

function restoreOnce() {
  if (restored || typeof window === "undefined") return
  restored = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) snapshot = JSON.parse(raw)
  } catch {
    // Private mode or blocked storage — carry on with nothing started.
  }
}

function subscribe(listener: () => void) {
  restoreOnce()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  restoreOnce()
  return snapshot
}

function getServerSnapshot() {
  return emptyConversations
}

function write(next: Conversation[]) {
  snapshot = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Persistence is best-effort.
  }
  listeners.forEach((listener) => listener())
}

/** One thread per buyer/seller/*listing* — like OLX, not like a generic
 *  DM inbox. The same buyer messaging the same seller about two different
 *  products gets two separate conversations, each scoped to the product
 *  actually being discussed (price, quantity, terms — none of which
 *  transfers to a different item from the same seller). */
function conversationId(buyerId: string, sellerId: string, listingId: string) {
  return `${buyerId}::${sellerId}::${listingId}`
}

/** Every conversation a buyer or seller is party to; each dashboard's
 *  Messages view filters this down to its own side. */
function useConversations(): Conversation[] {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** Seeds a fixed batch of conversations, but only if the store is
 *  genuinely empty — see `seed-data.ts`. */
function seedConversationsIfEmpty(conversations: Conversation[]) {
  restoreOnce()
  if (snapshot.length > 0) return
  write(conversations)
}

/**
 * "Contact seller" is idempotent — clicking it again from another listing,
 * or after a reload, finds the existing thread with that seller rather than
 * starting a duplicate one. Returns the conversation id either way, so the
 * caller can navigate straight to it.
 *
 * `openingMessageFrom` defaults to `"buyer"` — a buyer contacting a seller
 * off a product page is the common case — but a seller reaching out first
 * to a buyer lead (see `buyer-leads.ts`) passes `"seller"` so the very
 * first bubble in the thread attributes to whoever actually sent it.
 */
function startConversation(input: {
  buyerId: string
  buyerName: string
  sellerId: string
  sellerName: string
  listingId: string
  listingTitle: string
  openingMessage: string
  openingMessageFrom?: "buyer" | "seller"
}): string {
  restoreOnce()
  const id = conversationId(input.buyerId, input.sellerId, input.listingId)
  const existing = snapshot.find((conversation) => conversation.id === id)
  if (existing) return existing.id

  const conversation: Conversation = {
    id,
    buyerId: input.buyerId,
    buyerName: input.buyerName,
    sellerId: input.sellerId,
    sellerName: input.sellerName,
    listingId: input.listingId,
    listingTitle: input.listingTitle,
    messages: [
      {
        from: input.openingMessageFrom ?? "buyer",
        text: input.openingMessage,
        at: new Date().toISOString(),
      },
    ],
  }
  write([conversation, ...snapshot])
  return id
}

/** The one write path every message goes through — typed chat, system log
 *  lines, and interactive cards alike — so ordering and persistence only
 *  have to be right in one place. */
function appendMessage(id: string, message: ConversationMessage) {
  restoreOnce()
  write(
    snapshot.map((conversation) =>
      conversation.id === id
        ? { ...conversation, messages: [...conversation.messages, message] }
        : conversation
    )
  )
}

function sendMessage(
  id: string,
  from: ChatParty,
  text: string,
  options: { fromName?: string; visibleTo?: ChatParty[] } = {}
) {
  appendMessage(id, { from, text, at: new Date().toISOString(), ...options })
}

/**
 * Posts an interactive widget into a thread. `text` is not a caption for
 * the card — it's the same event written out as a plain sentence, so the
 * thread still makes sense to someone reading it as words. The card is the
 * shortcut, not the only route.
 */
function postCard(input: {
  conversationId: string
  from: ChatParty | "system"
  text: string
  card: ConversationCard
  fromName?: string
  visibleTo?: ChatParty[]
}) {
  const { conversationId: id, ...message } = input
  appendMessage(id, { ...message, at: new Date().toISOString() })
}

/**
 * Replaces the newest card matching `match` with a fresh one, rather than
 * stacking a second widget below it. Used when a request is superseded —
 * a re-issued term sheet shouldn't leave the old form sitting in the
 * thread still looking fillable.
 */
function replaceCard(
  conversationId: string,
  match: (card: ConversationCard) => boolean,
  next: { text: string; card: ConversationCard }
) {
  restoreOnce()
  write(
    snapshot.map((conversation) => {
      if (conversation.id !== conversationId) return conversation
      const index = conversation.messages.findLastIndex((message) => message.card && match(message.card))
      if (index === -1) return conversation
      const messages = [...conversation.messages]
      messages[index] = { ...messages[index], text: next.text, card: next.card, at: new Date().toISOString() }
      return { ...conversation, messages }
    })
  )
}

/**
 * Broadcasts an edit to a listing into every open conversation about it —
 * a buyer mid-negotiation on a price or quantity needs to see that it
 * changed underneath them, not discover it by re-reading the product page.
 * Every affected conversation gets its own copy of the log line, each
 * clickable to the same before/after.
 */
function logListingChange(listingId: string, text: string, diff: ListingDiff) {
  restoreOnce()
  write(
    snapshot.map((conversation) =>
      conversation.listingId === listingId
        ? {
            ...conversation,
            messages: [
              ...conversation.messages,
              { from: "system", text, at: new Date().toISOString(), diff },
            ],
          }
        : conversation
    )
  )
}

/** Same idea as `logListingChange` but for events with no before/after to
 *  show — a listing being removed, say. */
function logSystemMessage(listingId: string, text: string) {
  restoreOnce()
  write(
    snapshot.map((conversation) =>
      conversation.listingId === listingId
        ? {
            ...conversation,
            messages: [...conversation.messages, { from: "system", text, at: new Date().toISOString() }],
          }
        : conversation
    )
  )
}

/** Same idea again, but scoped to exactly *one* conversation rather than
 *  every thread about a listing — for events that only concern the two
 *  parties actually in that thread, like a deal being proposed or
 *  confirmed. A seller can have many buyers messaging about the same
 *  listing; a deal only ever involves the one conversation it came from. */
function logSystemMessageForConversation(id: string, text: string, visibleTo?: ChatParty[]) {
  appendMessage(id, { from: "system", text, at: new Date().toISOString(), visibleTo })
}

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/

/**
 * Whether a message looks like it's trying to hand over a phone number or
 * email — the platform's whole trust model runs on every deal staying
 * on-platform (KAM-mediated) until it's ready to trade, so the composer
 * blocks sending these rather than just discouraging it.
 *
 * This is a best-effort heuristic, not a bulletproof filter: a real trust &
 * safety layer would run server-side with far more nuance (and would still
 * lose the odd cat-and-mouse round). It exists to demonstrate the product
 * rule, not to be adversarially robust — the ten-digit floor is there so it
 * doesn't trip over an order or lot number quoted in chat.
 */
function containsContactInfo(text: string): boolean {
  if (EMAIL_PATTERN.test(text)) return true
  const digitRun = text.match(/\d[\d\-\s().]{7,}\d/)
  if (!digitRun) return false
  const digitCount = (digitRun[0].match(/\d/g) ?? []).length
  return digitCount >= 10
}

/** Whether a given participant is allowed to read a message. The default —
 *  no `visibleTo` at all — is "everyone", so privacy is opt-in per message
 *  and a forgotten field can never accidentally hide the main negotiation
 *  from one of the two parties having it. */
function canSee(message: ConversationMessage, viewer: ChatParty): boolean {
  return !message.visibleTo || message.visibleTo.includes(viewer)
}

/**
 * Reframes a conversation's messages for whichever participant is reading,
 * dropping anything that participant isn't party to.
 *
 * Buyer and seller each read a two-party thread where their own side is
 * "me" and the other is "them". A KAM reads the same thread as an outsider
 * who has since joined: neither trading side is "you", so both are named
 * directly and pinned to a fixed side, and only the KAM's own messages come
 * back as "me".
 */
function toThreadMessages(messages: ConversationMessage[], viewer: ChatParty) {
  return messages.filter((message) => canSee(message, viewer)).map((message) => ({
    from:
      message.from === "system"
        ? ("system" as const)
        : viewer === "kam"
          ? message.from === "kam"
            ? ("me" as const)
            : (message.from as "buyer" | "seller")
          : message.from === viewer
            ? ("me" as const)
            : message.from === "kam"
              ? ("kam" as const)
              : ("them" as const),
    text: message.text,
    diff: message.diff,
    card: message.card,
    senderName: message.fromName,
  }))
}

export {
  useConversations,
  seedConversationsIfEmpty,
  startConversation,
  sendMessage,
  postCard,
  replaceCard,
  logListingChange,
  logSystemMessage,
  logSystemMessageForConversation,
  toThreadMessages,
  canSee,
  containsContactInfo,
  conversationId,
}
