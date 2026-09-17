"use client"

import * as React from "react"

import type { Listing } from "@/features/marketplace/listing-store"

export type ListingDiff = { before: Listing; after: Listing }

export type ConversationMessage = {
  /** `system` is the platform itself speaking — a listing-change log line,
   *  not either party — so it renders (and reads) differently from a
   *  message either side actually typed. */
  from: "buyer" | "seller" | "system"
  text: string
  at: string
  diff?: ListingDiff
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
 */
function startConversation(input: {
  buyerId: string
  buyerName: string
  sellerId: string
  sellerName: string
  listingId: string
  listingTitle: string
  openingMessage: string
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
      { from: "buyer", text: input.openingMessage, at: new Date().toISOString() },
    ],
  }
  write([conversation, ...snapshot])
  return id
}

function sendMessage(id: string, from: "buyer" | "seller", text: string) {
  restoreOnce()
  write(
    snapshot.map((conversation) =>
      conversation.id === id
        ? {
            ...conversation,
            messages: [...conversation.messages, { from, text, at: new Date().toISOString() }],
          }
        : conversation
    )
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
function logSystemMessageForConversation(id: string, text: string) {
  restoreOnce()
  write(
    snapshot.map((conversation) =>
      conversation.id === id
        ? {
            ...conversation,
            messages: [...conversation.messages, { from: "system", text, at: new Date().toISOString() }],
          }
        : conversation
    )
  )
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

/** Reframes a conversation's messages around "me" vs. "them" for whichever
 *  side is reading — the one bit of interpretation every UI that renders a
 *  thread needs, so it lives here instead of being reimplemented at each
 *  call site. */
function toThreadMessages(messages: ConversationMessage[], mine: "buyer" | "seller") {
  return messages.map((message) => ({
    from: message.from === "system" ? ("system" as const) : message.from === mine ? ("me" as const) : ("them" as const),
    text: message.text,
    diff: message.diff,
  }))
}

export {
  useConversations,
  seedConversationsIfEmpty,
  startConversation,
  sendMessage,
  logListingChange,
  logSystemMessage,
  logSystemMessageForConversation,
  toThreadMessages,
  containsContactInfo,
  conversationId,
}
