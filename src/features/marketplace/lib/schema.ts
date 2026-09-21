import { doublePrecision, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { appUsers } from "@/features/identity/lib/schema"
import type { ChatParty, ConversationCard, ListingDiff } from "@/features/marketplace/conversation-store"
import type { ModerationStatus } from "@/features/marketplace/listing-store"

/** Mirrors `Listing` 1:1 — see `listing-store.ts`. */
const listings = pgTable("listings", {
  id: text("id").primaryKey(),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => appUsers.id),
  sellerName: text("seller_name").notNull(),
  cropId: text("crop_id").notNull(),
  variety: text("variety").notNull(),
  grade: text("grade").notNull(),
  quantityMt: doublePrecision("quantity_mt").notNull(),
  pricePerTonneUsd: doublePrecision("price_per_tonne_usd").notNull(),
  country: text("country").notNull(),
  region: text("region").notNull(),
  description: text("description").notNull(),
  photo: text("photo").notNull(),
  pinX: doublePrecision("pin_x").notNull().default(50),
  pinY: doublePrecision("pin_y").notNull().default(50),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  moderationStatus: text("moderation_status").$type<ModerationStatus>().notNull().default("unverified"),
  moderationNote: text("moderation_note"),
  moderatedBy: text("moderated_by"),
  moderatedAt: timestamp("moderated_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
})

const conversations = pgTable("conversations", {
  id: text("id").primaryKey(),
  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => appUsers.id),
  buyerName: text("buyer_name").notNull(),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => appUsers.id),
  sellerName: text("seller_name").notNull(),
  listingId: text("listing_id")
    .notNull()
    .references(() => listings.id),
  listingTitle: text("listing_title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
})

const conversationMessages = pgTable("conversation_messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  fromParty: text("from_party").$type<ChatParty | "system">().notNull(),
  fromName: text("from_name"),
  text: text("text").notNull(),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  diff: jsonb("diff").$type<ListingDiff | null>(),
  card: jsonb("card").$type<ConversationCard | null>(),
  visibleTo: text("visible_to").array().$type<ChatParty[] | null>(),
})

const wishlistItems = pgTable("wishlist_items", {
  personId: uuid("person_id")
    .notNull()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  listingId: text("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
})

/** Port of `kam-thread-store.ts` — one channel per buyer/seller account,
 *  the two-message canned welcome stays a client-side fallback rather than
 *  a seeded row (see the service). */
const kamThreadMessages = pgTable("kam_thread_messages", {
  id: text("id").primaryKey(),
  personId: uuid("person_id")
    .notNull()
    .references(() => appUsers.id, { onDelete: "cascade" }),
  fromKam: text("from_kam").notNull(),
  text: text("text").notNull(),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
})

export { listings, conversations, conversationMessages, wishlistItems, kamThreadMessages }
