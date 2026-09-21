import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"

import { appUsers } from "@/features/identity/lib/schema"
import { conversations } from "@/features/marketplace/lib/schema"
import { deals } from "@/features/marketplace/lib/deal-schema"
import type {
  Contract,
  ContractStage,
  PartyApproval,
  ShipmentDatePoll,
  TermSheetFieldType,
} from "@/features/contracts/contract-store"
import type { ChatParty } from "@/features/marketplace/conversation-store"

/** Mirrors `Contract` — `terms`/`approvals`/`signatures`/`shipmentDates`
 *  stay `jsonb` for the same reason `deals.costing` does (see
 *  `marketplace/lib/deal-schema.ts`): read/written whole, never queried by
 *  an inner field. */
const contracts = pgTable("contracts", {
  id: text("id").primaryKey(),
  reference: text("reference").notNull(),
  dealId: text("deal_id")
    .notNull()
    .references(() => deals.id),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => conversations.id),
  listingTitle: text("listing_title").notNull(),

  buyerId: uuid("buyer_id")
    .notNull()
    .references(() => appUsers.id),
  buyerName: text("buyer_name").notNull(),
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => appUsers.id),
  sellerName: text("seller_name").notNull(),
  kamId: text("kam_id").notNull(),
  kamName: text("kam_name").notNull(),

  stage: text("stage").$type<ContractStage>().notNull(),

  terms: jsonb("terms").$type<Contract["terms"]>().notNull(),
  draftBody: text("draft_body"),
  draftVersion: integer("draft_version").notNull().default(0),
  approvals: jsonb("approvals").$type<{ buyer: PartyApproval; seller: PartyApproval }>().notNull(),
  signatures: jsonb("signatures").$type<{ buyer: PartyApproval; seller: PartyApproval }>().notNull(),
  shipmentDates: jsonb("shipment_dates").$type<ShipmentDatePoll | null>(),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

const contractStageHistory = pgTable("contract_stage_history", {
  id: text("id").primaryKey(),
  contractId: text("contract_id")
    .notNull()
    .references(() => contracts.id, { onDelete: "cascade" }),
  stage: text("stage").$type<ContractStage>().notNull(),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  by: text("by").notNull(),
  note: text("note"),
})

const termSheetRequests = pgTable("term_sheet_requests", {
  id: text("id").primaryKey(),
  contractId: text("contract_id")
    .notNull()
    .references(() => contracts.id, { onDelete: "cascade" }),
  party: text("party").$type<"buyer" | "seller">().notNull(),
  title: text("title").notNull(),
  note: text("note"),
  status: text("status").$type<"open" | "submitted">().notNull().default("open"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

const termSheetFields = pgTable("term_sheet_fields", {
  id: text("id").primaryKey(),
  requestId: text("request_id")
    .notNull()
    .references(() => termSheetRequests.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  type: text("type").$type<TermSheetFieldType>().notNull(),
  required: boolean("required").notNull().default(false),
  options: jsonb("options").$type<string[] | null>(),
  help: text("help"),
  value: text("value"),
})

const requestedDocuments = pgTable("requested_documents", {
  id: text("id").primaryKey(),
  requestId: text("request_id")
    .notNull()
    .references(() => termSheetRequests.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  required: boolean("required").notNull().default(false),
  help: text("help"),
})

/** `storageKey` points into the `uploads` bucket — see
 *  `src/lib/storage/files.ts`. Replaces the old metadata-only
 *  `UploadedFile` (name/size, no actual bytes anywhere). */
const uploadedFiles = pgTable("uploaded_files", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => requestedDocuments.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  size: integer("size").notNull(),
  storageKey: text("storage_key").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
})

const contractAmendments = pgTable("contract_amendments", {
  id: text("id").primaryKey(),
  contractId: text("contract_id")
    .notNull()
    .references(() => contracts.id, { onDelete: "cascade" }),
  raisedBy: text("raised_by").$type<ChatParty>().notNull(),
  raisedByName: text("raised_by_name").notNull(),
  text: text("text").notNull(),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
})

export {
  contracts,
  contractStageHistory,
  termSheetRequests,
  termSheetFields,
  requestedDocuments,
  uploadedFiles,
  contractAmendments,
}
