"use client"

import type { AccountKind } from "@/features/auth/local-auth"
import { createPersistentStore, localId } from "@/features/local-db/persistent-store"

export type TicketKind = "support" | "catalog-request"
export type TicketStatus = "open" | "waiting" | "resolved"

export type TicketAuthor = { kind: "staff" | "user" | "system"; id: string; name: string; title?: string }

export type TicketComment = { id: string; author: TicketAuthor; text: string; at: string }

/**
 * Anything someone raises that isn't a KYC application: a question from a
 * page ("this shipment's ETA looks wrong"), or a product the catalog
 * doesn't have yet. Each carries where it was raised from — the page, the
 * record it was about — so whoever picks it up has the context without
 * asking.
 */
export type SupportTicket = {
  id: string
  kind: TicketKind
  title: string
  description: string
  tags: string[]
  metadata: {
    page: string
    pageTitle: string
    /** Records the page was about — `{ trade: "TRD-0042" }`. */
    refs: Record<string, string>
  }
  raisedBy: { id: string; name: string; kind: AccountKind }
  status: TicketStatus
  assigneeId: string | null
  createdAt: string
  comments: TicketComment[]
}

const system: TicketAuthor = { kind: "system", id: "system", name: "amama" }

function seedTickets(): SupportTicket[] {
  return [
    {
      id: "TKT-1042",
      kind: "catalog-request",
      title: "New product: Moringa powder",
      description: "Typed during onboarding; not in the catalog yet.",
      tags: ["Catalog request", "Buyer"],
      metadata: { page: "/buyer/onboarding/sourcing", pageTitle: "What do you buy?", refs: {} },
      raisedBy: { id: "buyer@amama.in", name: "Vikram Shah", kind: "buyer" },
      status: "open",
      assigneeId: null,
      createdAt: "2026-10-10T08:00:00.000Z",
      comments: [{ id: "TKT-1042-c0", author: system, text: "Added to Vikram Shah's interests while we review it", at: "2026-10-10T08:00:00.000Z" }],
    },
    {
      id: "TKT-1043",
      kind: "support",
      title: "Shipment ETA doesn't match the carrier",
      description: "The Malabar pepper shipment shows arrival on the 18th, but the carrier's site says the 21st.",
      tags: ["Shipments", "Seller"],
      metadata: { page: "/seller/dashboard/shipments", pageTitle: "Shipments", refs: {} },
      raisedBy: { id: "seller@amama.in", name: "Ravi Kumar", kind: "seller" },
      status: "waiting",
      assigneeId: "arun@amama.com",
      createdAt: "2026-10-11T05:30:00.000Z",
      comments: [
        { id: "TKT-1043-c0", author: system, text: "Raised from Shipments", at: "2026-10-11T05:30:00.000Z" },
        {
          id: "TKT-1043-c1",
          author: { kind: "staff", id: "arun@amama.com", name: "Arun Das", title: "KAM · Logistics" },
          text: "Checking with Maersk — could you share the booking reference?",
          at: "2026-10-11T07:10:00.000Z",
        },
      ],
    },
  ]
}

const store = createPersistentStore<SupportTicket[]>("amama.tickets", seedTickets, [])

const now = () => new Date().toISOString()

function nextTicketId(tickets: SupportTicket[]) {
  const highest = tickets.reduce((max, ticket) => Math.max(max, Number(ticket.id.replace(/\D/g, "")) || 0), 1000)
  return `TKT-${highest + 1}`
}

function raiseTicket(input: Omit<SupportTicket, "id" | "status" | "assigneeId" | "createdAt" | "comments">): SupportTicket {
  const at = now()
  const ticket: SupportTicket = {
    ...input,
    id: nextTicketId(store.get()),
    status: "open",
    assigneeId: null,
    createdAt: at,
    comments: [{ id: localId("c"), author: system, text: `Raised from ${input.metadata.pageTitle}`, at }],
  }
  store.set((tickets) => [ticket, ...tickets])
  return ticket
}

function update(id: string, change: (ticket: SupportTicket) => SupportTicket) {
  store.set((tickets) => tickets.map((ticket) => (ticket.id === id ? change(ticket) : ticket)))
}

/** A reply. From staff, the ticket now waits on the person who raised it;
 *  from them, it goes back to staff. */
function commentOnTicket(id: string, author: TicketAuthor, text: string) {
  update(id, (ticket) => ({
    ...ticket,
    status: ticket.status === "resolved" ? ticket.status : author.kind === "staff" ? "waiting" : "open",
    comments: [...ticket.comments, { id: localId("c"), author, text: text.trim(), at: now() }],
  }))
}

function setTicketStatus(id: string, status: TicketStatus, by: TicketAuthor) {
  update(id, (ticket) => ({
    ...ticket,
    status,
    comments: [...ticket.comments, { id: localId("c"), author: system, text: `${by.name} marked this ${status === "resolved" ? "resolved" : status === "open" ? "open" : "waiting"}`, at: now() }],
  }))
}

function assignSupportTicket(id: string, assignee: { id: string; name: string } | null, by: TicketAuthor) {
  update(id, (ticket) => ({
    ...ticket,
    assigneeId: assignee?.id ?? null,
    comments: [
      ...ticket.comments,
      { id: localId("c"), author: system, text: assignee ? `${by.name} assigned this to ${assignee.name}` : `${by.name} unassigned this`, at: now() },
    ],
  }))
}

function useTickets(): SupportTicket[] {
  return store.use()
}

export { raiseTicket, commentOnTicket, setTicketStatus, assignSupportTicket, useTickets }
