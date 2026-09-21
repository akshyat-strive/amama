import { doublePrecision, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { appUsers } from "@/features/identity/lib/schema"
import { conversations, listings } from "@/features/marketplace/lib/schema"
import type {
  Deal,
  DealStage,
  DealStatus,
  LogisticsMode,
  OrderStage,
  RoundOutcome,
  ShipmentEventType,
  ShipmentStatus,
} from "@/features/marketplace/deal-store"

/** Mirrors `Deal` — the nested `costing`/`contracting`/`compliance`/
 *  `payment` objects stay `jsonb` rather than four more tables: they're
 *  never queried by their own fields, only read/written whole alongside
 *  the deal they belong to, so normalizing them would add joins with no
 *  matching benefit. Everything the app actually filters or orders by
 *  (rounds, comments, history, shipments, events) gets a real table below. */
const deals = pgTable("deals", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id),
  listingId: text("listing_id")
    .notNull()
    .references(() => listings.id),
  listingTitle: text("listing_title").notNull(),
  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => appUsers.id),
  buyerName: text("buyer_name").notNull(),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => appUsers.id),
  sellerName: text("seller_name").notNull(),

  status: text("status").$type<DealStatus>().notNull(),
  proposedBy: text("proposed_by").$type<"buyer" | "seller">().notNull(),
  agreedPricePerTonneUsd: doublePrecision("agreed_price_per_tonne_usd").notNull(),
  agreedQuantityMt: doublePrecision("agreed_quantity_mt").notNull(),
  proposedAt: timestamp("proposed_at", { withTimezone: true }).notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  declineReason: text("decline_reason"),

  orderStage: text("order_stage").$type<OrderStage | null>(),
  stage: text("stage").$type<DealStage | null>(),

  assignedKamId: text("assigned_kam_id"),
  assignedKamName: text("assigned_kam_name"),

  costing: jsonb("costing").$type<Deal["costing"]>().notNull(),
  contracting: jsonb("contracting").$type<Deal["contracting"]>().notNull(),
  compliance: jsonb("compliance").$type<Deal["compliance"]>().notNull(),
  payment: jsonb("payment").$type<Deal["payment"]>().notNull(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

const negotiationRounds = pgTable("negotiation_rounds", {
  id: text("id").primaryKey(),
  dealId: text("deal_id")
    .notNull()
    .references(() => deals.id, { onDelete: "cascade" }),
  by: text("by").$type<"buyer" | "seller">().notNull(),
  byName: text("by_name").notNull(),
  pricePerTonneUsd: doublePrecision("price_per_tonne_usd").notNull(),
  quantityMt: doublePrecision("quantity_mt").notNull(),
  incoterm: text("incoterm"),
  deliveryWindow: text("delivery_window"),
  note: text("note"),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  outcome: text("outcome").$type<RoundOutcome>().notNull().default("pending"),
  outcomeBy: text("outcome_by"),
  outcomeAt: timestamp("outcome_at", { withTimezone: true }),
  outcomeNote: text("outcome_note"),
})

const roundComments = pgTable("round_comments", {
  id: text("id").primaryKey(),
  roundId: text("round_id")
    .notNull()
    .references(() => negotiationRounds.id, { onDelete: "cascade" }),
  by: text("by").notNull(),
  byName: text("by_name").notNull(),
  text: text("text").notNull(),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
})

const dealStageHistory = pgTable("deal_stage_history", {
  id: text("id").primaryKey(),
  dealId: text("deal_id")
    .notNull()
    .references(() => deals.id, { onDelete: "cascade" }),
  stage: text("stage").$type<DealStage>().notNull(),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  by: text("by").notNull(),
  note: text("note"),
})

const dealAssignmentHistory = pgTable("deal_assignment_history", {
  id: text("id").primaryKey(),
  dealId: text("deal_id")
    .notNull()
    .references(() => deals.id, { onDelete: "cascade" }),
  kamId: text("kam_id").notNull(),
  kamName: text("kam_name").notNull(),
  assignedBy: text("assigned_by").notNull(),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
})

const shipments = pgTable("shipments", {
  id: text("id").primaryKey(),
  dealId: text("deal_id")
    .notNull()
    .references(() => deals.id, { onDelete: "cascade" }),
  mode: text("mode").$type<LogisticsMode>().notNull(),
  carrier: text("carrier").notNull(),
  documentNumber: text("document_number").notNull(),
  status: text("status").$type<ShipmentStatus>().notNull(),
  origin: text("origin"),
  destination: text("destination"),
  currentLocation: text("current_location"),
  eta: timestamp("eta", { withTimezone: true }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

const shipmentEvents = pgTable("shipment_events", {
  id: text("id").primaryKey(),
  shipmentId: text("shipment_id")
    .notNull()
    .references(() => shipments.id, { onDelete: "cascade" }),
  type: text("type").$type<ShipmentEventType>().notNull(),
  label: text("label").notNull(),
  location: text("location"),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  note: text("note"),
})

export {
  deals,
  negotiationRounds,
  roundComments,
  dealStageHistory,
  dealAssignmentHistory,
  shipments,
  shipmentEvents,
}
